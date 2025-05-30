const fs = require('fs');
const { createCanvas } = require('canvas');

function generatePNG(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#242424';
  ctx.fillRect(0, 0, size, size);

  // Trail marker triangle
  ctx.fillStyle = '#43D633';
  const centerX = size / 2;
  const centerY = size / 2;
  const triangleHeight = size * 0.6;
  
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - triangleHeight/2);
  ctx.lineTo(centerX - triangleHeight/2, centerY + triangleHeight/2);
  ctx.lineTo(centerX + triangleHeight/2, centerY + triangleHeight/2);
  ctx.closePath();
  ctx.fill();

  // Center dot
  ctx.beginPath();
  ctx.arc(centerX, centerY, size * 0.1, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toBuffer();
}

// Generate logos
[192, 512].forEach(size => {
  const buffer = generatePNG(size);
  fs.writeFileSync(`public/logo${size}.png`, buffer);
}); 