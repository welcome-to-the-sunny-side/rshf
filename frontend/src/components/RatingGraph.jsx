import React, { useState } from 'react';
import styles from './RatingGraph.module.css';
import { getRatingColor, getRankName, ratingGraphColors, getRatingInfo, RANK_BANDS } from '../utils/ratingUtils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea
} from 'recharts';



// Custom clickable dot component
const ClickableDot = (props) => {
  const { 
    cx, cy, payload, index,
    r: defaultR = 3,
    fill: defaultFill = '#FFD700',
    stroke: defaultStroke = '#000',
    strokeWidth: defaultStrokeWidth = 1,
  } = props;
  
  // Early return if we don't have valid coordinates
  if (typeof cx !== 'number' || typeof cy !== 'number') return null;

  // Get contest and group info from payload
  const groupId = payload?.group_id;
  const contestId = payload?.contest_id;
  const url = groupId && contestId ? `/group/${groupId}/contest/${contestId}` : null;
  

  // Handle click event
  const handleClick = (e) => {
    e.stopPropagation();
    if (url) {
      window.open(url, '_blank', 'noopener');
    } else {
    }
  };

  // Determine if this is an active dot
  const isActive = props.type === 'active';
  
  // Set properties based on active state
  const r = isActive ? 7 : defaultR;
  const fill = isActive ? '#ff7300' : defaultFill;
  const stroke = defaultStroke;
  const strokeWidth = isActive ? 2 : defaultStrokeWidth;

  return (
    <g key={`dot-${index}`}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        style={{ cursor: url ? 'pointer' : 'default' }}
        onClick={url ? handleClick : undefined}
        tabIndex={url ? 0 : -1}
        onKeyDown={url ? (e) => { if (e.key === 'Enter') handleClick(e); } : undefined}
      />
    </g>
  );
}

export default function RatingGraph({ ratingHistory }) {
  const [currentTooltipData, setCurrentTooltipData] = useState(null);
  const HOVER_RADIUS = 15; // pixels; adjust as needed
  // Prepare data for the chart
  const formatData = () => {
    if (!ratingHistory || ratingHistory.length === 0) {
      return [];
    }

    // Process and sort rating history data
    return [...ratingHistory]
      .sort((a, b) => {
        // Handle both timestamps and date strings
        const dateA = typeof a.date === 'number' ? a.date : Date.parse(a.date);
        const dateB = typeof b.date === 'number' ? b.date : Date.parse(b.date);
        return dateA - dateB;
      })
      .map(item => {
        // Ensure date is properly formatted
        const timestamp = typeof item.date === 'number' ? item.date : Date.parse(item.date);
        const dateObj = new Date(timestamp);
        
        const formattedItem = {
          date: dateObj.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          }),
          rating: item.rating || 0,
          contest_id: item.contest_id,
          group_id: item.group_id, // Include group_id
          contest_name: item.contest_name || 'Contest',
          rank: item.rank, // Include rank
          rating_delta: item.rating_delta, // Include rating_delta
          dateTimestamp: timestamp, // Keep original timestamp for sorting
        };
        return formattedItem;
      });
  };

  const data = formatData();

  // If no data, use default y-axis domain and ticks
  let ratings = data.map(d => d.rating);
  let minRating, maxRating;
  if (ratings.length > 0) {
    minRating = Math.min(...ratings);
    maxRating = Math.max(...ratings);
  } else {
    // Default rating bounds (e.g., 0 to 5000)
    minRating = 0;
    maxRating = 4500;
    ratings = [minRating, maxRating];
  }

  // Initial data-driven y-axis view boundaries
  const yAxisViewMin = Math.max(0, Math.floor(0.5 * minRating));
  const yAxisViewMax = Math.ceil(1.1 * maxRating);

  // Initialize final domain with the data-driven view
  let finalDomainMin = yAxisViewMin;
  let finalDomainMax = yAxisViewMax;

  // Adjust domain to fully include overlapping rating bands
  ratingGraphColors.forEach(band => {
    const bandY1 = band.yaxis.from;
    // Use a large fixed upper bound for open-ended top bands (e.g., rating >= 3000)
    const bandEffectiveY2 = band.yaxis.to !== undefined ? band.yaxis.to : 4000;

    // Check if the band (bandY1, bandEffectiveY2) overlaps with the initial data-driven view [yAxisViewMin, yAxisViewMax]
    const overlapsInitialView = bandY1 < yAxisViewMax && bandEffectiveY2 > yAxisViewMin;

    if (overlapsInitialView) {
      finalDomainMin = Math.min(finalDomainMin, bandY1);
      finalDomainMax = Math.max(finalDomainMax, bandEffectiveY2);
    }
  });
  
  // Ensure the final domain still covers the original data-driven view extent
  finalDomainMin = Math.min(finalDomainMin, yAxisViewMin);
  finalDomainMax = Math.max(finalDomainMax, yAxisViewMax);

  // Get rating boundaries for ticks from RANK_BANDS
  const uniqueBoundaries = Array.from(new Set([
    0, // Always consider 0 as a potential boundary
    ...RANK_BANDS.map(b => b.y1),
    ...RANK_BANDS.map(b => b.y2).filter(y => y !== undefined) // Include defined 'y2' values
  ])).sort((a, b) => a - b);

  // Filter ticks to be within the final adjusted domain
  let yTicks = uniqueBoundaries.filter(v => v >= finalDomainMin && v <= finalDomainMax);
  
  // Add domain extremities to the ticks array if they are not already present.
  if (!yTicks.includes(finalDomainMin)) {
    yTicks.push(finalDomainMin);
  }
  if (!yTicks.includes(finalDomainMax)) {
    yTicks.push(finalDomainMax);
  }
  
  // Sort and remove duplicates again after adding extremities.
  yTicks = Array.from(new Set(yTicks)).sort((a,b)=>a-b);

  // Handle edge cases for ticks
  if (finalDomainMin === finalDomainMax) {
    yTicks = [finalDomainMin]; // Single tick if domain has no range
  } else if (yTicks.length < 2 && finalDomainMin !== finalDomainMax) {
     // Ensure at least two ticks if there's a range, using domain ends
     yTicks = Array.from(new Set([finalDomainMin, finalDomainMax])).sort((a,b)=>a-b);
  }

  // Custom tooltip that shows contest details
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      const ratingInfo = getRatingInfo(data.rating);
      return (
        <div className={styles.tooltip}>
          <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>{data.contest_name}</p>
          {/* <p style={{ fontSize: '0.9em', color: '#666' }}>Contest #{data.contest_id}</p> */}
          <p style={{ fontSize: '0.9em', color: '#666' }}>{data.date}</p>
          
          {typeof data.rank === 'number' && <p style={{ fontSize: '0.9em', color: '#666' }}>Rank: {data.rank}</p>}
          {typeof data.rating_delta === 'number' && 
            <p style={{
              fontSize: '0.9em', 
              color: data.rating_delta > 0 ? 'green' : (data.rating_delta < 0 ? 'red' : '#666')
            }}>
              Δ: {data.rating_delta > 0 ? '+' : ''}{data.rating_delta}
            </p>
          }
          <p style={{ 
            fontWeight: 'bold',
            color: ratingInfo.color,
            marginTop: '4px'
          }}>
            {data.rating} ({ratingInfo.name})
          </p>
        </div>
      );
    }
    return null;
  };


  // Use ratingGraphColors for colored backgrounds (inclusive yaxis ranges)
  const ratingAreas = ratingGraphColors.map((band, index) => {
    const y1 = band.yaxis.from;
    // If no .to, fill to the top (for the highest band)
    const y2 = band.yaxis.to !== undefined ? band.yaxis.to : 3500;
    return {
      y1,
      y2,
      fill: band.color,
      opacity: 0.75,
    }; 
  });
  
  return (
    <div className={styles.ratingChart}>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
          onMouseMove={(chartState) => {
            if (chartState.isTooltipActive && chartState.activePayload && chartState.activePayload.length > 0) {
              const pointCoordinate = chartState.activeCoordinate; // { x, y } of the data point on chart
              const mouseCoordinate = { x: chartState.chartX, y: chartState.chartY }; // Mouse position on chart

              if (!pointCoordinate || typeof pointCoordinate.x !== 'number' || typeof pointCoordinate.y !== 'number') {
                if (currentTooltipData) setCurrentTooltipData(null);
                return;
              }

              const distance = Math.sqrt(
                Math.pow(mouseCoordinate.x - pointCoordinate.x, 2) +
                Math.pow(mouseCoordinate.y - pointCoordinate.y, 2)
              );

              if (distance < HOVER_RADIUS) {
                setCurrentTooltipData({
                  active: true,
                  payload: chartState.activePayload,
                  label: chartState.activeLabel,
                  coordinate: pointCoordinate,
                });
              } else {
                if (currentTooltipData) setCurrentTooltipData(null);
              }
            } else {
              if (currentTooltipData) setCurrentTooltipData(null);
            }
          }}
          onMouseLeave={() => {
            setCurrentTooltipData(null);
          }}
        >
          <defs>
            <filter id="yellowLineShadow" x="-10" y="-10" width="200" height="200">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.6" />
            </filter>
          </defs>
          <CartesianGrid vertical={false} horizontal={true} />
          <XAxis 
            dataKey="date"
            tick={{ fill: '#333' }}
          />
          <YAxis 
            domain={[finalDomainMin, finalDomainMax]}
            ticks={yTicks}
            allowDecimals={false}
            tick={{ fill: '#333' }}
          />
          <Tooltip
            // Control visibility and data via state
            active={!!(currentTooltipData && currentTooltipData.active)}
            payload={currentTooltipData ? currentTooltipData.payload : undefined}
            label={currentTooltipData ? currentTooltipData.label : undefined}
            coordinate={currentTooltipData ? currentTooltipData.coordinate : undefined}
            // Pass all necessary props to CustomTooltip
            content={<CustomTooltip />}
            cursor={false} // Disable default Recharts cursor line
          />
          
          {/* Add colored backgrounds for rating bands */}
          {ratingAreas.map((area, index) => (
            <ReferenceArea
              key={index}
              y1={area.y1}
              y2={area.y2}
              fill={area.fill}
              fillOpacity={area.opacity}
              strokeOpacity={0}
            />
          ))}
          
          {/* Black border line (underneath) */}
          <Line
            type="linear"
            dataKey="rating"
            stroke="#000"
            strokeWidth={0}
            dot={false}
            isAnimationActive={false}
            filter="url(#yellowLineShadow)"
          />
          {/* Yellow line (on top) */}
          <Line
            type="linear"
            dataKey="rating"
            stroke="#FFD700"
            strokeWidth={2}
            name=""
            dot={ClickableDot}
            activeDot={ClickableDot}
            filter="url(#yellowLineShadow)"
          />
          {/* Show a subtle message if no data points */}
          {/*
          {data.length === 0 && (
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#888"
              fontSize="1.2rem"
              opacity="0.7"
            >
                No rating data yet
            </text>
          )}
          */}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}