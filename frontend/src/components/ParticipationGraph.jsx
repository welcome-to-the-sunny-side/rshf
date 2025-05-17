import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ResponsiveContainer, Legend } from 'recharts';
import { Link } from 'react-router-dom';
import styles from './ParticipationGraph.module.css';

// Color scheme
const PARTICIPATION_LINE_COLOR = '#FF6B6B'; // Red color for participation
const STRENGTH_LINE_COLOR = '#4ECDC4';      // Teal color for group strength
const BACKGROUND_COLOR = 'rgba(224, 255, 255, 0.6)'; // Cyan background color

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

// Custom clickable dot component for participation (links to contest page)
const ClickableDot = (props) => {
  const { cx, cy, stroke, strokeWidth, r, fill, payload } = props;
  const { contest_id, groupName } = payload;
  const link = contest_id ? `/group/${groupName}/contest/${contest_id}` : '#';

  return (
    <Link to={link}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </Link>
  );
};

// Custom active dot component for participation (larger circle for hover, also linked)
const ClickableActiveDot = (props) => {
  const { cx, cy, stroke, strokeWidth, r, fill, payload } = props;
  const { contest_id, groupName } = payload;
  const link = contest_id ? `/group/${groupName}/contest/${contest_id}` : '#';

  return (
    <Link to={link}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </Link>
  );
};

// Regular non-clickable dot for strength line
const RegularDot = (props) => {
  const { cx, cy, stroke, strokeWidth, r, fill } = props;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    return (
      <div className="custom-tooltip" style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.8)', 
        border: '1px solid #ccc',
        padding: '8px'
      }}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>{formatTooltipLabel(label)}</p>
        
        {/* Add contest name if available */}
        {data.contest_id && (
          <p style={{ 
            margin: '4px 0', 
            color: '#333',
            fontSize: '0.95rem'
          }}>
            Contest: <span style={{ fontStyle: 'italic' }}>Contest #{data.contest_id}</span>
          </p>
        )}
        
        {/* Display the data values */}
        {payload.map((entry, index) => (
          <p key={`tooltip-${index}`} style={{ 
            margin: '2px 0', 
            color: entry.color,
            fontWeight: 'bold'
          }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }

  return null;
};

export default function ParticipationGraph({ participationData, groupName }) {
  if (!participationData || participationData.length === 0) {
    return <div className={styles.participationChart}>No participation data available.</div>;
  }

  // Prepare data for Recharts: convert date strings to timestamps
  const chartData = participationData.map(p => ({
    ...p,
    timestamp: Date.parse(p.date),
    groupName: groupName, // Add group name for links
  })).sort((a, b) => a.timestamp - b.timestamp); // Ensure data is sorted by time

  // Find max values for Y-axis
  const maxParticipation = Math.max(...chartData.map(p => p.participation), 0);
  const maxStrength = Math.max(...chartData.map(p => p.strength), 0);
  const yMax = Math.max(100, Math.ceil((Math.max(maxParticipation, maxStrength) + 10) / 10) * 10);

  // Determine X-axis min/max timestamps
  const minTimestamp = chartData[0].timestamp;
  const maxTimestamp = chartData[chartData.length - 1].timestamp;

  // Generate ticks for January 1st of each year
  const yearlyTicks = generateYearlyTicks(minTimestamp, maxTimestamp);

  return (
    <div className={styles.participationChart}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 5, right: 30, left: 10, bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatDateTick}
            scale="time"
            ticks={yearlyTicks}
          />
          <YAxis
            domain={[0, yMax]}
            allowDataOverflow={true}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Background reference area for the entire chart */}
          <ReferenceArea
            y1={0}
            y2={yMax}
            ifOverflow="extendDomain"
            fill={BACKGROUND_COLOR}
            fillOpacity={1}
            strokeOpacity={0}
          />

          {/* Participation line (clickable) */}
          <Line
            type="linear"
            dataKey="participation"
            name="Participation"
            stroke={PARTICIPATION_LINE_COLOR}
            strokeWidth={1.5}
            dot={(
              <ClickableDot
                stroke='#000000'
                strokeWidth={1}
                r={3}
                fill={PARTICIPATION_LINE_COLOR}
              />
            )}
            activeDot={(
              <ClickableActiveDot
                stroke='#000000'
                strokeWidth={1.5}
                r={5}
                fill={PARTICIPATION_LINE_COLOR}
              />
            )}
            isAnimationActive={false}
            strokeLinecap="square"
            strokeLinejoin="miter"
            style={{
              filter: 'drop-shadow(0 0 1px black)'
            }}
          />

          {/* Strength line (non-clickable) */}
          <Line
            type="linear"
            dataKey="strength"
            name="Group Strength"
            stroke={STRENGTH_LINE_COLOR}
            strokeWidth={1.5}
            dot={(
              <RegularDot
                stroke='#000000'
                strokeWidth={1}
                r={3}
                fill={STRENGTH_LINE_COLOR}
              />
            )}
            activeDot={{
              stroke: '#000000',
              strokeWidth: 1.5,
              r: 5,
              fill: STRENGTH_LINE_COLOR
            }}
            isAnimationActive={false}
            strokeLinecap="square"
            strokeLinejoin="miter"
            style={{
              filter: 'drop-shadow(0 0 1px black)'
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 