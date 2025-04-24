import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ResponsiveContainer } from 'recharts';
import styles from './RatingGraph.module.css';

const RANK_COLORS = {
  newbie      : '#ccc',    //   < 1200
  pupil       : '#7f7',    // 1200 – 1399
  specialist  : '#77ddbb', // 1400 – 1599
  expert      : '#aaf',    // 1600 – 1899
  candmaster  : '#f8f',    // 1900 – 2099
  master      : '#ffcc88', // 2100 – 2299
  intmaster   : '#ffbb55', // 2300 - 2399
  grandmaster : '#f77',    // 2400 – 2599
  intgrandmaster: '#f33',  // 2600 - 2999
  legend      : '#a00'     // >= 3000 (Legendary GM)
};

// Color change boundaries for Y-axis ticks
const COLOR_BOUNDARIES = [0, 1200, 1400, 1600, 1900, 2100, 2300, 2400, 2600, 3000];

const rankBands = [
  { y1: 0,    y2: 1200, color: RANK_COLORS.newbie },
  { y1: 1200, y2: 1400, color: RANK_COLORS.pupil },
  { y1: 1400, y2: 1600, color: RANK_COLORS.specialist },
  { y1: 1600, y2: 1900, color: RANK_COLORS.expert },
  { y1: 1900, y2: 2100, color: RANK_COLORS.candmaster },
  { y1: 2100, y2: 2300, color: RANK_COLORS.master },
  { y1: 2300, y2: 2400, color: RANK_COLORS.intmaster },
  { y1: 2400, y2: 2600, color: RANK_COLORS.grandmaster },
  { y1: 2600, y2: 3000, color: RANK_COLORS.intgrandmaster },
  { y1: 3000,          color: RANK_COLORS.legend } // y2 determined dynamically
];

// Function to get the color for a rating value
const getColorForRating = (rating) => {
  for (const band of rankBands) {
    if (rating >= band.y1 && (band.y2 === undefined || rating < band.y2)) {
      return band.color;
    }
  }
  // Default fallback color (should never reach here)
  return RANK_COLORS.newbie;
};

// Function to get rank name based on rating
const getRankName = (rating) => {
  if (rating < 1200) return "Newbie";
  if (rating < 1400) return "Pupil";
  if (rating < 1600) return "Specialist";
  if (rating < 1900) return "Expert";
  if (rating < 2100) return "Candidate Master";
  if (rating < 2300) return "Master";
  if (rating < 2400) return "International Master";
  if (rating < 2600) return "Grandmaster";
  if (rating < 3000) return "International Grandmaster";
  return "Legendary Grandmaster";
};

// Only generate ticks for the first day of each year
const generateYearlyTicks = (dataMin, dataMax) => {
  const ticks = [];
  const startDate = new Date(dataMin);
  const endDate = new Date(dataMax);
  
  // Start with January 1st of the starting year
  let currentYear = startDate.getFullYear();
  const firstTick = new Date(currentYear, 0, 1).getTime();
  
  // If the first tick is before the data range, start with next year
  if (firstTick < dataMin) {
    currentYear += 1;
  }
  
  // Generate ticks for January 1st of each year
  while (currentYear <= endDate.getFullYear()) {
    const tick = new Date(currentYear, 0, 1).getTime();
    ticks.push(tick);
    currentYear += 1;
  }
  
  return ticks;
};

const formatDateTick = (timestamp) => {
  const date = new Date(timestamp);
  return date.getFullYear().toString();
};

const formatTooltipLabel = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

// Gold/yellow color for the rating line
const RATING_LINE_COLOR = '#FFD700'; // Golden color

// Custom dot component that wraps the circle in a link
const ClickableDot = (props) => {
  const { cx, cy, stroke, strokeWidth, r, fill, payload } = props;
  const { contest_id } = payload;
  const link = contest_id ? `/contest/${contest_id}` : '#'; // Link to contest or fallback

  // We wrap the circle in an SVG <a> element
  return (
    <a href={link} target="_blank" rel="noopener noreferrer">
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </a>
  );
};

// Custom active dot component (larger circle for hover, also linked)
const ClickableActiveDot = (props) => {
  const { cx, cy, stroke, strokeWidth, r, fill, payload } = props;
  const { contest_id } = payload;
  const link = contest_id ? `/contest/${contest_id}` : '#';

  return (
    <a href={link} target="_blank" rel="noopener noreferrer">
      <circle
        cx={cx}
        cy={cy}
        r={r} // Use the larger radius passed by activeDot prop
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </a>
  );
};

// Custom tooltip component (removed the contest link)
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const { rating } = payload[0].payload;
    const bandColor = getColorForRating(rating);
    const rankName = getRankName(rating);
    
    return (
      <div className="custom-tooltip" style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.8)', 
        border: '1px solid #ccc',
        padding: '8px'
      }}>
        <p style={{ margin: 0 }}>{formatTooltipLabel(label)}</p>
        <p style={{ 
          margin: 0, 
          color: bandColor,
          fontWeight: 'bold'
        }}>
          {`Rating: ${rating} (${rankName})`}
        </p>
        {/* Contest link removed from here */}
      </div>
    );
  }

  return null;
};

export default function RatingGraph({ ratingHistory }) {
  if (!ratingHistory || ratingHistory.length === 0) {
    return <div className={styles.ratingChart}>No rating history available.</div>;
  }

  // Prepare data for Recharts: convert date strings to timestamps
  const chartData = ratingHistory.map(p => ({
    ...p,
    timestamp: Date.parse(p.date), // Ensure date is valid for Date.parse
    rating: p.rating,
    contest_id: p.contest_id // Include contest_id from input data
  })).sort((a, b) => a.timestamp - b.timestamp); // Ensure data is sorted by time

  // Simple Y-axis max calculation
  const ratings = chartData.map(p => p.rating);
  const maxRating = Math.max(...ratings, 0);
  const yMax = Math.max(1500, Math.ceil((maxRating + 100) / 100) * 100); // Ensure minimum 1500, round up

  // Determine X-axis min/max timestamps
  const minTimestamp = chartData[0].timestamp;
  const maxTimestamp = chartData[chartData.length - 1].timestamp;
  
  // Generate ticks for January 1st of each year
  const yearlyTicks = generateYearlyTicks(minTimestamp, maxTimestamp);

  // Add y2 to the last rank band, pointing to the new simple yMax
  const finalRankBands = rankBands.map((band, index) => {
      if (index === rankBands.length - 1) {
          // Make the last band cover up to yMax
          return { ...band, y2: yMax };
      }
      return band;
  });

  // Generate Y-axis ticks: include color boundaries below yMax, plus yMax itself
  const yAxisTicks = COLOR_BOUNDARIES.filter(tick => tick <= yMax);
  if (!yAxisTicks.includes(yMax)) {
    yAxisTicks.push(yMax);
  }
  yAxisTicks.sort((a, b) => a - b);

  return (
    <div className={styles.ratingChart}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 5, right: 30, left: 0, bottom: 5, // Adjusted margins slightly
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="timestamp"
            type="number" // Use number type for timestamps
            domain={['dataMin', 'dataMax']} // Auto-detect min/max timestamp
            tickFormatter={formatDateTick}
            scale="time" // Tell Recharts it's time scale
            ticks={yearlyTicks} // Use the yearly ticks for January 1st each year
          />
          <YAxis
            domain={[0, yMax]} // Simple domain from 0 to calculated yMax
            allowDataOverflow={true} // Allow rendering overflow again
            ticks={yAxisTicks} // Ticks at color boundaries within range
          />
          
          {/* Using custom tooltip component (no contest link) */}
          <Tooltip content={<CustomTooltip />} />

          {/* Render the rank background bands */}
          {finalRankBands.map((band) => (
            <ReferenceArea
                key={`${band.y1}-${band.y2}`}
                y1={band.y1}
                y2={band.y2} // Use band's direct y2 value
                ifOverflow="extendDomain" // Ensures band covers axis if data is outside band
                fill={band.color}
                fillOpacity={0.6} // Solid but slightly light to show grid lines
                strokeOpacity={0} // No border for the bands
            />
          ))}

          <Line
            type="linear" // Straight line segments instead of curves
            dataKey="rating"
            stroke={RATING_LINE_COLOR} // Golden color line
            strokeWidth={1.5} // Slightly thicker line
            // Use the custom ClickableDot component for rendering dots
            dot={(
                <ClickableDot 
                    stroke='#000000' 
                    strokeWidth={1} 
                    r={3} 
                    fill={RATING_LINE_COLOR} 
                />
            )} 
            // Use the custom ClickableActiveDot component for rendering active dots (hover)
            activeDot={(
                <ClickableActiveDot 
                    stroke='#000000' 
                    strokeWidth={1.5} 
                    r={5} 
                    fill={RATING_LINE_COLOR} 
                />
            )}
            isAnimationActive={false} // Disable animation
            strokeLinecap="square" // Sharp line ends
            strokeLinejoin="miter" // Sharp line joins
            style={{ 
              filter: 'drop-shadow(0 0 1px black)' // This adds a black border effect to the line
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 