const fs = require('fs');
const { createCanvas } = require('canvas');

// Function to create an icon
function createIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background color (Green)
  ctx.fillStyle = '#4CAF50';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2, true);
  ctx.fill();
  
  // Text
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.5}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CF', size/2, size/2);
  
  // Save to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`./public/icons/icon${size}.png`, buffer);
  console.log(`Created icon${size}.png`);
}

// Create icons of different sizes
createIcon(16);
createIcon(48);
createIcon(128);
