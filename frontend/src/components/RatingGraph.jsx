import React from 'react';
import styles from './RatingGraph.module.css';
import { getRatingColor, getRankName, ratingGraphColors, getRatingInfo } from '../utils/ratingUtils';
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
          dateTimestamp: timestamp, // Keep original timestamp for sorting
        };
        return formattedItem;
      });
  };

  const data = formatData();

  // Custom tooltip that shows contest details
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      const ratingInfo = getRatingInfo(data.rating);
      return (
        <div className={styles.tooltip}>
          <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>{data.contest_name}</p>
          <p style={{ fontSize: '0.9em', color: '#666' }}>Contest #{data.contest_id}</p>
          <p style={{ fontSize: '0.9em', color: '#666' }}>{data.date}</p>
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

  // If no data available, show message
  if (!data || data.length === 0) {
    return <div className={styles.ratingChart}>No rating history available.</div>;
  }

  // Use ratingGraphColors for colored backgrounds (inclusive yaxis ranges)
  const ratingAreas = ratingGraphColors.map((band, index) => {
    const y1 = band.yaxis.from;
    // If no .to, fill to the top (for the highest band)
    const y2 = band.yaxis.to !== undefined ? band.yaxis.to : 3500;
    return {
      y1,
      y2,
      fill: band.color,
      opacity: 0.9,
    };
  });
  
  return (
    <div className={styles.ratingChart}>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
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
            domain={[0, 3000]}
            tickCount={10}
            tick={{ fill: '#333' }}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={false}
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
            type="monotone"
            dataKey="rating"
            stroke="#000"
            strokeWidth={0}
            dot={false}
            isAnimationActive={false}
            filter="url(#yellowLineShadow)"
          />
          {/* Yellow line (on top) */}
          <Line
            type="monotone"
            dataKey="rating"
            stroke="#FFD700"
            strokeWidth={2}
            name=""
            dot={ClickableDot}
            activeDot={ClickableDot}
            filter="url(#yellowLineShadow)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}