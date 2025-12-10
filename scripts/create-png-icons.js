const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// SVG content for icons
const createSVG = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#2563EB"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-size="${Math.floor(size * 0.42)}" font-family="Arial, sans-serif"
        fill="white" font-weight="bold">ASG</text>
</svg>
`;

async function generateIcons() {
  const sizes = [192, 512];

  for (const size of sizes) {
    const svgBuffer = Buffer.from(createSVG(size));
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);

    await sharp(svgBuffer)
      .png()
      .toFile(outputPath);

    console.log(`Created ${outputPath}`);
  }

  console.log('All PNG icons created successfully!');
}

generateIcons().catch(console.error);
