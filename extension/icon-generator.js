// Simple script to generate placeholder icons for the extension
const fs = require('fs');
const path = require('path');

// Create icons directory if it doesn't exist
const iconDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

// Function to create a very basic PNG icon (1x1 pixel)
function createSimpleIcon(size, filename) {
  // This is a minimal valid PNG file with a green pixel
  // Reference: http://www.libpng.org/pub/png/spec/1.2/PNG-Structure.html
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // "IHDR" 
    0x00, 0x00, 0x00, size >> 8, size & 0xff, // width
    0x00, 0x00, 0x00, size >> 8, size & 0xff, // height
    0x08, // bit depth
    0x02, // color type (RGB)
    0x00, // compression method
    0x00, // filter method
    0x00, // interlace method
    0x00, 0x00, 0x00, 0x00, // CRC
    0x00, 0x00, 0x00, 0x03, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // "IDAT"
    0x08, 0xd7, 0x63, // Green RGB pixel data (compressed)
    0x00, 0x00, 0x00, 0x00, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4e, 0x44, // "IEND"
    0xae, 0x42, 0x60, 0x82  // CRC
  ]);

  fs.writeFileSync(path.join(iconDir, filename), pngHeader);
  console.log(`Created ${filename}`);
}

// Create the required icon sizes
createSimpleIcon(16, 'icon16.png');
createSimpleIcon(48, 'icon48.png');
createSimpleIcon(128, 'icon128.png');

console.log('Icons created successfully!');
