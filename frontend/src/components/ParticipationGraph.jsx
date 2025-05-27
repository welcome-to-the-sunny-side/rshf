import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ResponsiveContainer, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import styles from './ParticipationGraph.module.css';

// Color scheme
const PARTICIPATION_LINE_COLOR = '#4CAF50'; // Green color for participation
const STRENGTH_LINE_COLOR = '#2196F3';      // Blue color for group strength
const BACKGROUND_COLOR = 'rgb(255, 255, 255)'; // White background color
const HOVER_COLOR = '#ff7300'; // Orange color for hover state (same as RatingGraph)

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
  const { 
    cx, cy, payload, index,
    r: defaultR = 3,
    fill: defaultFill = '#4CAF50',
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
};

// Use the same ClickableDot component for active dots

// Strength dot component with similar styling to the rating graph dots - also clickable
const StrengthDot = (props) => {
  const { 
    cx, cy, payload, index,
    r: defaultR = 3,
    fill: defaultFill = '#2196F3',
    stroke: defaultStroke = '#000',
    strokeWidth: defaultStrokeWidth = 1,
  } = props;
  
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
    <g key={`strength-dot-${index}`}>
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
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    return (
      <div className={styles.tooltip}>
        <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>{formatTooltipLabel(label)}</p>
        
        {/* Add contest name if available */}
        {data.contest_id && (
          <>
            <p style={{ fontSize: '0.9em', color: '#666' }}>Contest #{data.contest_id}</p>
            <p style={{ fontSize: '0.9em', color: '#666' }}>{data.group_id ? `Group: ${data.group_id}` : ''}</p>
          </>
        )}
        
        {/* Display the data values */}
        {payload.map((entry, index) => (
          <p key={`tooltip-${index}`} style={{ 
            fontWeight: 'bold',
            color: entry.color,
            marginTop: '4px'
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
    group_id: groupName, // Add group ID for links
  })).sort((a, b) => a.timestamp - b.timestamp); // Ensure data is sorted by time

  // Find max values for Y-axis
  const maxParticipation = Math.max(...chartData.map(p => p.participation), 0);
  const maxStrength = Math.max(...chartData.map(p => p.strength), 0);
  const currentMaxDataValue = Math.max(maxParticipation, maxStrength);
  const padding = Math.max(10, currentMaxDataValue * 0.1); // Add 5% padding, or at least 10
  const yMaxWithPadding = Math.ceil((currentMaxDataValue + padding) / 10) * 10; // Round to nearest 10
  const yMax = Math.max(100, yMaxWithPadding); // Ensure yMax is at least 100

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

          <defs>
            <filter id="lineShadow" x="-10" y="-10" width="200" height="200">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.3" />
            </filter>
          </defs>
          
          {/* Participation line (clickable) */}
          <Line
            type="linear"
            dataKey="participation"
            name="Participation"
            stroke={PARTICIPATION_LINE_COLOR}
            strokeWidth={2}
            dot={ClickableDot}
            activeDot={ClickableDot}
            isAnimationActive={false}
            connectNulls={true}
            style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }}
          />

          {/* Strength line (clickable) */}
          <Line
            type="linear"
            dataKey="strength"
            name="Group Strength"
            stroke={STRENGTH_LINE_COLOR}
            strokeWidth={2}
            dot={StrengthDot}
            activeDot={StrengthDot}
            isAnimationActive={false}
            connectNulls={true}
            style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 