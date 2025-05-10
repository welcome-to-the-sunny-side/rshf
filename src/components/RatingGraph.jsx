import React, { useEffect, useRef } from 'react';
import styles from './RatingGraph.module.css';
import { getRatingColor, getRankName } from '../utils/ratingUtils';



export default function RatingGraph({ ratingHistory }) {
  const chartRef = useRef(null);
  const chartInitialized = useRef(false);
  
  useEffect(() => {
    // Early return if no data or DOM elements not ready
    if (!ratingHistory || ratingHistory.length === 0 || !chartRef.current) {
      return;
    }
    
    // Ensure we don't initialize multiple times
    if (chartInitialized.current) {
      updateChart();
      return;
    }
    
    // Function to initialize and draw the chart
    function initChart() {
      if (!window.jQuery || !window.jQuery.plot) {
        console.log("jQuery or Flot not loaded yet, retrying in 100ms...");
        setTimeout(initChart, 100);
        return;
      }
      
      chartInitialized.current = true;
      updateChart();
    }
    
    // Function to actually create/update the chart
    function updateChart() {
    
    // Sort and prepare data
    const sortedHistory = [...ratingHistory].sort((a, b) => {
      return Date.parse(a.date) - Date.parse(b.date);
    });
    
    // Format data for Flot chart
    const data = [];
    const mainData = [];
    
    // Main contest data series with all details
    for (let i = 0; i < sortedHistory.length; i++) {
      const item = sortedHistory[i];
      const timestamp = Date.parse(item.date);
      const rating = item.rating || 0;
      const title = getRankName(rating);
      const contestId = item.contest_id || '';
      const rank = item.rank || 0;
      const change = item.change || 0;
      
      // Format date in a more readable format for tooltip
      const date = new Date(timestamp);
      const formattedDate = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      
      // Ensure timestamp is a proper JS timestamp (milliseconds since epoch)
      if (timestamp < 10000000000) {
        timestamp = timestamp * 1000; // Convert seconds to milliseconds if needed
      }
      
      // Add data point with all metadata for tooltip
      mainData.push([
        timestamp,
        rating,
        contestId,
        item.contest_name || 'Contest',
        '',
        change,
        rank,
        `/contest/${contestId}`,
        title,
        title,
        contestId,
        item.contest_name || 'Contest',
        formattedDate,
        `#`
      ]);
    }
    data.push(mainData);
    
    // Current rating point
    if (mainData.length > 0) {
      const lastPoint = mainData[mainData.length - 1];
      data.push([
        [lastPoint[0], lastPoint[1]]
      ]);
    }
    
    // Unrated contests (we filter out any with rank < 0)
    const unratedData = mainData
      .map(point => [point[0], point[1], point[6]])
      .filter(point => point[2] < 0);
    data.push(unratedData);
    
    // Create data series configurations
    const datas = [
      { 
        label: "negative-xp", 
        data: data[0],
        lines: { 
          show: true,
          lineWidth: 1.5,
          fill: false,
          shadowSize: 0
        },
        points: {
          show: true,
          radius: 3,
          fill: true,
          fillColor: "#FFD700", // Gold color for dots
          lineWidth: 1.5,
          symbol: "circle"
        }
      },
      { clickable: false, hoverable: false, color: "red", data: data[1] },
      { clickable: false, hoverable: false, color: "gray", data: data[2], lines: { show: false } }
    ];
    
    // Rating band colors
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
      { color: '#ccc', lineWidth: 1, yaxis: { from: 0, to: 1199 } }
    ];
    
    // Calculate x-axis time range
    let minTimestamp = Infinity;
    let maxTimestamp = -Infinity;
    for (let i = 0; i < data[0].length; i++) {
      minTimestamp = Math.min(minTimestamp, data[0][i][0]);
      maxTimestamp = Math.max(maxTimestamp, data[0][i][0]);
    }
    
    // If no data or invalid range, set defaults
    if (minTimestamp > maxTimestamp || !isFinite(minTimestamp)) {
      minTimestamp = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
      maxTimestamp = Date.now();
    }
    
    // Calculate y-axis range based on ratings
    const ratings = mainData.map(item => item[1]);
    let minRating = Math.min(...ratings) - 300; // Adjust to show 300 points below minimum
    let maxRating = Math.max(...ratings) + 300; // Adjust to show 300 points above maximum
    
    // Ensure reasonable default ranges
    minRating = Math.max(0, Math.floor(minRating / 100) * 100);
    maxRating = Math.min(3000, Math.ceil(maxRating / 100) * 100);
    
    // Ensure timestamps are in milliseconds 
    if (minTimestamp < 10000000000) minTimestamp *= 1000;
    if (maxTimestamp < 10000000000) maxTimestamp *= 1000;
    
    // Configure time format based on date range
    const deltaMillis = maxTimestamp - minTimestamp;
    const days = deltaMillis / (1000 * 60 * 60 * 24);
    const months = days / 30;
    const years = deltaMillis / (1000 * 60 * 60 * 24 * 365);
    
    let timeFormat;
    if (years >= 7) {
      timeFormat = "%Y";
    } else if (years < 1 && months <= 7) {
      timeFormat = "%d %b %Y";
    } else {
      timeFormat = "%b %Y";
    }
    
    // Chart options
    const options = {
      series: {
        lines: { 
          show: true,
          lineWidth: 1.5,
          fill: false
        },
        points: { 
          show: true,
          radius: 3.5,
          lineWidth: 1,
          fillColor: "#FFD700",
          symbol: "circle"
        },
        shadowSize: 0
      },
      xaxis: {
        mode: "time",
        timezone: "browser",
        zoomRange: [172800000, null],
        panRange: [minTimestamp, maxTimestamp],
        timeformat: timeFormat,
        tickLength: 5,
        minTickSize: [1, "day"], // Show at least day-level ticks
        minorTickFrequency: null, // Disable minor ticks
        tickSize: null, // Let Flot auto-determine tick size
        tickDecimals: 0,
        showTickLabels: "major" // Only show labels for major ticks
      },
      yaxis: {
        min: minRating,
        max: maxRating,
        ticks: [1200, 1400, 1600, 1900, 2100, 2300, 2400, 2600, 3000],
        zoomRange: [500, null],
        panRange: [minRating, maxRating],
        tickLength: 5,
        minorTickFrequency: null, // Disable minor ticks
        showTickLabels: "major" // Only show labels for major ticks
      },
      grid: {
        hoverable: true,
        markings: markings,
        backgroundColor: null,
        borderWidth: 1,
        borderColor: "#000", // Black border for the graph box
        borderRadius: 0,
        clickable: true
      },
      zoom: {
        interactive: false
      },
      pan: {
        interactive: false
      },
      colors: ["#FFD700"], // Gold color for the line
      shadowSize: 0
    };
    
    // Create the plot
    const plot = window.jQuery.plot(window.jQuery(chartRef.current), datas, options);
    
    // Handle resize
    const handleResize = () => {
      plot.resize();
      plot.setupGrid();
      plot.draw();
    };
    
    window.jQuery(window).resize(handleResize);
    
    // Tooltip functionality
    let prev = -1;
    
    const showTooltip = (x, y, contents) => {
      window.jQuery('<div id="tooltip">' + contents + '</div>').css({
        position: 'absolute',
        display: 'none',
        top: y - 20,
        left: x + 10,
        border: '1px solid #fdd',
        padding: '2px',
        'font-size': '11px',
        'background-color': '#fee',
        opacity: 0.80
      }).appendTo("body").fadeIn(200);
    };
    
    window.jQuery(chartRef.current).bind("plothover", (event, pos, item) => {
      if (item) {
        if (prev !== item.dataIndex) {
          window.jQuery("#tooltip").remove();
          const params = data[item.seriesIndex][item.dataIndex];
          
          const total = params[1]; // Rating
          const change = params[5] > 0 ? "+" + params[5] : params[5]; // Rating change
          const contestName = params[11]; // Contest name
          const contestStartTimeFormatted = `<a href='${params[13]}'>${params[12]}</a>`;
          const contestId = params[2]; // Contest ID
          const contestUrl = params[7]; // Contest URL
          const rank = params[6]; // Rank
          const title = params[8]; // Title (rating category)
          
          let changeText = change;
          if (rank < 0) {
            changeText = "unrated";
          }
          
          let html = `= ${total} (${changeText}), ${title}<br/>`;
          if (rank >= 0) {
            html += `Rank: ${rank}<br/>`;
          }
          html += `<a href='${contestUrl}'>${contestName}</a><br>${contestStartTimeFormatted}`;
          
          if (change > 0) {
            html += `<br/><a style='font-weight: bold;' href="/bestRatingChanges/${params[10]}">Share it!</a>`;
          }
          
          showTooltip(item.pageX, item.pageY, html);
          
          setTimeout(() => {
            $("#tooltip").fadeOut(200);
            prev = -1;
          }, 4000);
          
          prev = item.dataIndex;
        }
      }
    });
    
    // Enable zoom on click
    window.jQuery(chartRef.current).click(() => {
      options.zoom = { interactive: true };
      options.pan = { interactive: true };
      
      const plot = window.jQuery.plot(window.jQuery(chartRef.current), datas, options);
      
      // Add scroll handling
      window.jQuery(chartRef.current).bind("plotpan plotzoom", (event, plot) => {
        const axes = plot.getAxes();
        plot.getOptions().xaxes[0].min = axes.xaxis.min;
        plot.getOptions().xaxes[0].max = axes.xaxis.max;
        plot.getOptions().yaxes[0].min = axes.yaxis.min;
        plot.getOptions().yaxes[0].max = axes.yaxis.max;
        plot.setupGrid();
        plot.draw();
      });
      
      window.jQuery(chartRef.current).unbind("click");
      // No need for zoom tip fadeout since we're simplifying
    });
    
    // Mouse wheel event handling for zoom tip
    let wheelEventsCount = 0;
    window.jQuery(chartRef.current).on("mousewheel", () => {
      wheelEventsCount += 1;
      if (wheelEventsCount > 3) {
        window.jQuery('.zoomTip').fadeIn();
        window.jQuery(chartRef.current).off("mousewheel");
      }
    });
    
    // Cleanup function
    return () => {
      window.jQuery(window).off("resize", handleResize);
      window.jQuery(chartRef.current).unbind("plothover");
      window.jQuery(chartRef.current).unbind("click");
      window.jQuery("#tooltip").remove();
    };
    }
    
    // Start the initialization process
    initChart();
  }, [ratingHistory]);
  
  if (!ratingHistory || ratingHistory.length === 0) {
    return <div className={styles.ratingChart}>No rating history available.</div>;
  }
  
  // Add required script tags for jQuery and Flot
  React.useEffect(() => {
    // Only add scripts if they don't already exist
    if (!document.getElementById('jquery-script')) {
      const jqueryScript = document.createElement('script');
      jqueryScript.id = 'jquery-script';
      jqueryScript.src = 'https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js';
      jqueryScript.async = true;
      document.body.appendChild(jqueryScript);
      
      // Add Flot after jQuery loads
      jqueryScript.onload = () => {
        const flotScript = document.createElement('script');
        flotScript.id = 'flot-script';
        flotScript.src = 'https://cdn.jsdelivr.net/npm/flot@4.2.6/dist/es5/jquery.flot.min.js';
        flotScript.async = true;
        document.body.appendChild(flotScript);
        
        // Add Flot time plugin after Flot loads
        flotScript.onload = () => {
          const flotTimeScript = document.createElement('script');
          flotTimeScript.id = 'flot-time-script';
          flotTimeScript.src = 'https://cdn.jsdelivr.net/npm/flot@4.2.6/dist/es5/jquery.flot.time.min.js';
          flotTimeScript.async = true;
          document.body.appendChild(flotTimeScript);
          
          // Also add the mousewheel plugin
          flotTimeScript.onload = () => {
            const mouseWheelScript = document.createElement('script');
            mouseWheelScript.id = 'jquery-mousewheel-script';
            mouseWheelScript.src = 'https://cdn.jsdelivr.net/npm/jquery-mousewheel@3.1.13/jquery.mousewheel.min.js';
            mouseWheelScript.async = true;
            document.body.appendChild(mouseWheelScript);
            
            // Add extra Flot plugins for better chart handling
            const flotNavigateScript = document.createElement('script');
            flotNavigateScript.id = 'flot-navigate-script';
            flotNavigateScript.src = 'https://cdn.jsdelivr.net/npm/flot@4.2.6/dist/es5/jquery.flot.navigate.min.js';
            flotNavigateScript.async = true;
            document.body.appendChild(flotNavigateScript);
          };
        };
      };
    }
    
    // Cleanup function to remove scripts
    return () => {
      // We're not removing scripts on unmount as they might be needed elsewhere
    };
  }, []);
  
  return (
    <div className={styles.ratingChart}>
      <div 
        ref={chartRef} 
        className={styles.ratingGraphContainer} 
        style={{ width: '100%', height: '100%' }}
      ></div>
      <div className={styles.zoomTip} style={{ display: 'none' }}>
        Click to enable zoom/pan
      </div>
    </div>
  );
}