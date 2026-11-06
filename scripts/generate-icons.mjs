import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makePng(size, drawPixelFn) {
  const width = size;
  const height = size;
  const rawBytes = Buffer.alloc((width * 4 + 1) * height);

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawBytes[offset++] = 0; // Filter type None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixelFn(x, y, size);
      rawBytes[offset++] = r;
      rawBytes[offset++] = g;
      rawBytes[offset++] = b;
      rawBytes[offset++] = a;
    }
  }

  const deflated = zlib.deflateSync(rawBytes, { level: 9 });

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', deflated);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(data.length, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lengthBuf, toCrc, crcBuf]);
}

// Draw a modern wifi + keybolt minimalist icon
function drawIcon(x, y, size) {
  const nx = (x / size) * 2 - 1; // -1 to 1
  const ny = (y / size) * 2 - 1; // -1 to 1
  const distCenter = Math.sqrt(nx * nx + ny * ny);

  // Rounded squircle background: |nx|^3.5 + |ny|^3.5 <= 0.85
  const squircle = Math.pow(Math.abs(nx), 3.2) + Math.pow(Math.abs(ny), 3.2);

  if (squircle > 0.88) {
    // Outside squircle: transparent
    return [0, 0, 0, 0];
  }

  // Border highlight
  const isBorder = squircle > 0.78;

  // Background gradient: deep dark slate / zinc
  let bgR = Math.floor(18 + (ny + 1) * 6);
  let bgG = Math.floor(22 + (ny + 1) * 7);
  let bgB = Math.floor(32 + (ny + 1) * 10);

  if (isBorder) {
    return [60, 75, 105, 255];
  }

  // Draw Wi-Fi arcs and central dot
  // Arcs are centered around (0, 0.45)
  const cy = 0.42;
  const dx = nx;
  const dy = ny - cy;
  const r = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx); // radians: -pi to pi

  // Angle range for wifi wedge: between -130 deg and -50 deg (upward spread)
  const deg = (angle * 180) / Math.PI;
  const inWedge = deg >= -135 && deg <= -45;

  let isWifi = false;

  // Central dot: r < 0.13 and ny < 0.45
  if (r < 0.12 && dy <= 0.05) {
    isWifi = true;
  }

  // Inner arc: r between 0.30 and 0.42
  if (inWedge && r >= 0.28 && r <= 0.42) {
    isWifi = true;
  }

  // Outer arc: r between 0.58 and 0.72
  if (inWedge && r >= 0.58 && r <= 0.72) {
    isWifi = true;
  }

  if (isWifi) {
    // Crisp emerald/cyan glow color: rgb(56, 189, 248) to rgb(52, 211, 153)
    const t = (nx + 1) * 0.5;
    const fgR = Math.floor(45 + t * 10);
    const fgG = Math.floor(190 + t * 25);
    const fgB = Math.floor(240 - t * 80);
    return [fgR, fgG, fgB, 255];
  }

  return [bgR, bgG, bgB, 255];
}

const iconsDir = path.resolve('icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

for (const size of [16, 32, 48, 128]) {
  const buf = makePng(size, drawIcon);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), buf);
  console.log(`Generated icon${size}.png (${buf.length} bytes)`);
}

// Also create an SVG version
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e2433"/>
      <stop offset="100%" stop-color="#121620"/>
    </linearGradient>
    <linearGradient id="wifiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#34d399"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#38bdf8" flood-opacity="0.3"/>
    </filter>
  </defs>
  <rect x="8" y="8" width="112" height="112" rx="28" fill="url(#bgGrad)" stroke="#3b4861" stroke-width="2.5"/>
  <g fill="none" stroke="url(#wifiGrad)" stroke-linecap="round" filter="url(#glow)">
    <!-- Outer Arc -->
    <path d="M 28 46 A 48 48 0 0 1 100 46" stroke-width="8"/>
    <!-- Inner Arc -->
    <path d="M 44 64 A 28 28 0 0 1 84 64" stroke-width="7"/>
    <!-- Center Dot -->
    <circle cx="64" cy="86" r="6" fill="url(#wifiGrad)" stroke="none"/>
  </g>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent, 'utf8');
console.log('Generated icon.svg');
