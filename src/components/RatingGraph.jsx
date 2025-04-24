import React, { useEffect, useRef, useCallback } from 'react';
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
  const placeholderRef = useRef(null);
  const plotRef = useRef(null); // To store the plot object
  const optionsRef = useRef(null); // To store options for click handler

  // Memoize the plot setup function to avoid recreating it on every render
  const setupPlot = useCallback(() => {
    // Ensure jQuery and flot are loaded
    if (typeof window === 'undefined' || !window.$ || !window.$.plot) {
      console.error("jQuery or Flot library not found.");
      return;
    }
    const $ = window.$; // Use global jQuery

    if (!ratingHistory || ratingHistory.length === 0) {
      $(placeholderRef.current).html('<div class="alert alert-info">No rating history available.</div>');
      return;
    }

    // --- Prepare Data ---
    // The script expects data in a specific array format:
    // [timestamp, rating, contest_id, contest_name, ?, rating_change, rank, standings_url, rank_name, ?, ?, ?, date_string_html, timeanddate_url]
    // Adapt ratingHistory to this format. Assumes ratingHistory objects have:
    // { date, rating, contest_id, contest_name, rank, rating_change }
    let minTimestamp = Infinity;
    let maxTimestamp = -Infinity;
    const flotData = ratingHistory.map(p => {
      const timestamp = Date.parse(p.date); // Convert date string to timestamp
      minTimestamp = Math.min(minTimestamp, timestamp);
      maxTimestamp = Math.max(maxTimestamp, timestamp);
      const rating = p.rating || 0; // Default rating if undefined
      const contestId = p.contest_id || 0;
      const contestName = p.contest_name || "Unknown Contest";
      const ratingChange = p.rating_change === undefined ? 'N/A' : p.rating_change; // Handle missing change
      const rank = p.rank === undefined ? -1 : p.rank; // Handle missing rank
      const contestUrl = contestId ? `/contest/${contestId}` : '#'; // Basic contest URL
      const rankName = getRankName(rating);
      const formattedDate = formatTooltipDate(timestamp);

      // Match the structure used in the script's tooltip handler (indices are important)
      return [
          timestamp,        // 0
          rating,           // 1
          contestId,        // 2
          contestName,      // 3 (used as 11 in script)
          null,             // 4 (placeholder)
          ratingChange,     // 5
          rank,             // 6
          contestUrl,       // 7
          rankName,         // 8
          null,             // 9 (placeholder)
          null,             // 10 (placeholder for bestRatingChanges ID)
          contestName,      // 11 (duplicate, as used in script)
          formattedDate,    // 12 (formatted date string)
          '#'               // 13 (placeholder for timeanddate URL)
      ];
    }).sort((a, b) => a[0] - b[0]); // Ensure data is sorted by timestamp

    if (flotData.length === 0) {
        $(placeholderRef.current).html('<div class="alert alert-info">No valid rating data to plot.</div>');
        return;
    }

    // --- Flot Options (Based on the script) ---
    const markings = [
        { color: '#a00', lineWidth: 1, yaxis: { from: 3000 } },
        { color: '#f33', lineWidth: 1, yaxis: { from: 2600, to: 2999 } },
        { color: '#f77', lineWidth: 1, yaxis: { from: 2400, to: 2599 } },
        { color: '#ffbb55', lineWidth: 1, yaxis: { from: 2300, to: 2399 } },
        { color: '#ffcc88', lineWidth: 1, yaxis: { from: 2100, to: 2299 } },
        { color: '#f8f', lineWidth: 1, yaxis: { from: 1900, to: 2099 } },
        { color: '#aaf', lineWidth: 1, yaxis: { from: 1600, to: 1899 } },
        { color: '#77ddbb', lineWidth: 1, yaxis: { from: 1400, to: 1599 } },
        { color: '#7f7', lineWidth: 1, yaxis: { from: 1200, to: 1399 } },
        { color: '#ccc', lineWidth: 1, yaxis: { from: 0, to: 1199 } },
    ];

    // Dynamic time format based on range (from script)
    const calculateTimeFormat = (minTs, maxTs) => {
        if (minTs > maxTs || !isFinite(minTs) || !isFinite(maxTs)) {
            return "%b %d %Y"; // Default format
        }
        const deltaMillis = maxTs - minTs;
        const years = deltaMillis / (1000 * 60 * 60 * 24 * 365);
        const months = deltaMillis / (1000 * 60 * 60 * 24 * 30);

        if (years >= 7) return "%Y";
        if (years < 1 && months <= 7) return "%d %b %Y";
        return "%b %Y";
    };

    const options = {
        series: {
            lines: { show: true },
            points: { show: true },
            shadowSize: 0 // Cleaner look
        },
        xaxis: {
            mode: "time",
            // Set pan range based on actual data
            panRange: (minTimestamp === maxTimestamp)
                ? [minTimestamp - 86400000, maxTimestamp + 86400000] // Add a day buffer if only one point
                : [minTimestamp, maxTimestamp],
            zoomRange: [172800000, null], // Minimum zoom interval (2 days)
            timeformat: calculateTimeFormat(minTimestamp, maxTimestamp),
            // Ticks can be managed automatically by flot's time mode,
            // or you can provide specific ticks if needed.
            // ticks: generateYearlyTicks(minTimestamp, maxTimestamp) // Example if you need yearly ticks
        },
        yaxis: {
            // Use fixed range and ticks from script
            min: 709,
            max: 2385,
            ticks: [1200, 1400, 1600, 1900, 2100, 2300, 2400, 2600, 3000],
            // Dynamic range calculation (alternative to fixed min/max)
            // min: Math.floor(Math.min(...ratings) / 100) * 100 - 100,
            // max: Math.ceil(Math.max(...ratings) / 100) * 100 + 100,
            zoomRange: [500, null],
            panRange: [709, 2385] // Match fixed min/max
        },
        grid: {
            hoverable: true,
            clickable: true, // Enable click for zoom/pan activation
            markings: markings,
            borderWidth: { top: 0, right: 0, bottom: 1, left: 1 },
            borderColor: '#bbb', // Softer border color
            backgroundColor: '#fff'
        },
        zoom: {
            interactive: false // Initially disabled
        },
        pan: {
            interactive: false // Initially disabled
        },
        legend: {
            show: false // No legend needed for a single series
        }
    };
    optionsRef.current = options; // Store options for click handler

    // --- Plotting ---
    const datas = [
        { label: "Rating", data: flotData, color: '#FFD700' } // Use gold color like recharts version
        // Ignore data[1] and data[2] (unrated) from the original script as requested
    ];

    plotRef.current = $.plot(placeholderRef.current, datas, options);

    // --- Tooltip Logic (Adapted from script) ---
    let previousPoint = null;
    $(placeholderRef.current).bind("plothover", function (event, pos, item) {
      if (item) {
        if (previousPoint !== item.dataIndex) {
          previousPoint = item.dataIndex;
          $("#tooltip").remove();

          const params = item.series.data[item.dataIndex];
          // params indices based on our flotData structure:
          // 0: ts, 1: rating, 2: cId, 3: cName, 5: change, 6: rank, 7: cUrl, 8: rankName, 12: dateStr

          const rating = params[1];
          const change = params[5];
          const rankName = params[8];
          const rank = params[6];
          const contestName = params[3];
          const contestUrl = params[7];
          const dateStr = params[12];

          let changeStr = "";
          if (typeof change === 'number') {
              changeStr = change > 0 ? `+${change}` : `${change}`;
          } else if (change !== 'N/A') {
              changeStr = change; // Display 'unrated' or other string if passed
          }


          let html = `<div style="font-weight: bold;">Rating: ${rating} (${changeStr}) - ${rankName}</div>`;
          if (rank >= 0) {
              html += `<div>Rank: ${rank}</div>`;
          }
          html += `<div><a href="${contestUrl}" target="_blank" rel="noopener noreferrer">${contestName}</a></div>`;
          html += `<div>${dateStr}</div>`;

          // Show tooltip using jQuery
          $('<div id="tooltip"></div>').html(html).css({
            position: 'absolute',
            display: 'none',
            top: item.pageY - 40, // Position relative to point
            left: item.pageX + 10,
            border: '1px solid #ccc',
            padding: '5px',
            'background-color': 'rgba(255, 255, 255, 0.9)',
            'font-size' : '11px',
            opacity: 0.9,
            'z-index': 100, // Ensure tooltip is on top
            'border-radius': '4px',
            'box-shadow': '0 1px 3px rgba(0,0,0,0.1)'
          }).appendTo("body").fadeIn(100);
        }
      } else {
        $("#tooltip").remove();
        previousPoint = null;
      }
    });

    // --- Click to Enable Zoom/Pan (Adapted from script) ---
    $(placeholderRef.current).bind("plotclick", function (event, pos, item) {
        if (plotRef.current && optionsRef.current) {
            // Enable zoom/pan on the stored options object
            optionsRef.current.zoom.interactive = true;
            optionsRef.current.pan.interactive = true;

            // Re-plot with updated options
            plotRef.current = $.plot(placeholderRef.current, datas, optionsRef.current);

            // Re-bind pan/zoom handlers if necessary (some flot versions might need this)
            addScrollHandlers(plotRef.current);

            // Unbind the initial click handler to prevent re-enabling
            $(placeholderRef.current).unbind("plotclick");
            // Optionally hide any "click to zoom" tip
            // $(".zoomTip").fadeOut();
            console.log("Zoom/Pan enabled.");
        }
    });

    // --- Resize Handler ---
    const resizeHandler = () => {
        if (plotRef.current) {
            plotRef.current.resize();
            plotRef.current.setupGrid();
            plotRef.current.draw();
        }
    };
    $(window).resize(resizeHandler);


    // Return cleanup function
    return () => {
        console.log("Cleaning up flot graph...");
        // Unbind all handlers attached to the placeholder
        $(placeholderRef.current).unbind("plothover").unbind("plotclick");
        $("#tooltip").remove(); // Remove tooltip if present
        $(window).off('resize', resizeHandler); // Use namespaced or specific handler removal if needed
        // Optionally destroy the plot instance if flot provides a method
        if (plotRef.current && typeof plotRef.current.destroy === 'function') {
            plotRef.current.destroy();
        }
        $(placeholderRef.current).empty(); // Clear the placeholder content
        plotRef.current = null;
        optionsRef.current = null;
    };

  }, [ratingHistory]); // Dependency array

  // Effect to run the plot setup
  useEffect(() => {
    if (placeholderRef.current) {
        const cleanup = setupPlot(); // Run setup and get cleanup function
        return cleanup; // Return cleanup function
    }
  }, [setupPlot]); // Re-run if setupPlot function changes (due to ratingHistory change)


  // Helper function to bind pan/zoom handlers (needed after enabling interaction)
  const addScrollHandlers = (plotInstance) => {
      if (!plotInstance || !window.$) return;
      const $ = window.$;

      $(placeholderRef.current).bind("plotpan plotzoom", function (event, plot) {
          // This logic might not be strictly necessary if flot updates axes automatically
          // but included here for closer adherence to the original script's intent.
          var axes = plot.getAxes();
          // Update options based on current view (optional, flot might handle this)
          // plot.getOptions().xaxes[0].min = axes.xaxis.min;
          // plot.getOptions().xaxes[0].max = axes.xaxis.max;
          // plot.getOptions().yaxes[0].min = axes.yaxis.min;
          // plot.getOptions().yaxes[0].max = axes.yaxis.max;

          // Just redraw if needed
          // plot.setupGrid();
          // plot.draw();
      });
  };

  return (
    // Ensure the container has a defined height, otherwise Flot might not render correctly.
    <div className={styles.ratingChart} style={{ width: '100%', height: '400px' }}>
      <div ref={placeholderRef} id="usersRatingGraphPlaceholder" style={{ width: '100%', height: '100%' }}>
        {/* Flot will render here */}
      </div>
      {/* Add a tooltip container maybe? Flot appends to body by default */}
      {/* <div className={styles.zoomTip} style={{display: 'none'}}>Click graph to enable zoom & pan</div> */}
    </div>
  );
} 