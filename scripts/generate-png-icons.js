import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

function createPng(width, height, getPixelRgba) {
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(rowBytes * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // None filter
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixelRgba(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const typeAndData = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData), 0);
    return Buffer.concat([len, typeAndData, crc]);
  }

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdrData),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

function renderMochi(x, y, w, h) {
  // Normalize coordinates to [0, 1]
  const nx = x / w;
  const ny = y / h;

  // Background cream color: #FAF6EE (250, 246, 238)
  let r = 250, g = 246, b = 238, a = 255;

  // Outer circle center (0.5, 0.5), radius 0.46
  const dx = nx - 0.5;
  const dy = ny - 0.5;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist <= 0.46) {
    // Circle fill #FFEFE8 (255, 239, 232)
    r = 255; g = 239; b = 232;

    // Circle border #FED7C5 (254, 215, 197)
    if (dist >= 0.435) {
      r = 254; g = 215; b = 197;
    }

    // Sprout leaf at top (nx around 0.5, ny around 0.28 to 0.36)
    const sproutDx = nx - 0.5;
    const sproutDy = ny - 0.31;
    if (Math.sqrt(sproutDx * sproutDx + sproutDy * sproutDy) < 0.045) {
      // Green #66BB6A
      r = 102; g = 187; b = 106;
    }
    const leafDx = nx - 0.44;
    const leafDy = ny - 0.27;
    if (Math.sqrt(leafDx * leafDx + leafDy * leafDy) < 0.038) {
      r = 129; g = 199; b = 132;
    }

    // Mochi Body ellipse center (0.5, 0.57), rx 0.30, ry 0.24
    const bodyX = (nx - 0.5) / 0.30;
    const bodyY = (ny - 0.57) / 0.24;
    const bodyDist = bodyX * bodyX + bodyY * bodyY;
    if (bodyDist <= 1.0) {
      // Body color #FFFFFF
      r = 255; g = 255; b = 255;

      // Body border #EAE4DC
      if (bodyDist >= 0.90) {
        r = 234; g = 228; b = 220;
      }

      // Eyes: Left (0.40, 0.52), Right (0.60, 0.52), rx 0.03, ry 0.042
      const eyeL = Math.sqrt(Math.pow((nx - 0.40) / 0.03, 2) + Math.pow((ny - 0.52) / 0.042, 2));
      const eyeR = Math.sqrt(Math.pow((nx - 0.60) / 0.03, 2) + Math.pow((ny - 0.52) / 0.042, 2));
      if (eyeL <= 1.0 || eyeR <= 1.0) {
        // Pupil #2E2E3A
        r = 46; g = 46; b = 58;

        // Eye reflections
        const glintL = Math.sqrt(Math.pow(nx - 0.388, 2) + Math.pow(ny - 0.505, 2));
        const glintR = Math.sqrt(Math.pow(nx - 0.588, 2) + Math.pow(ny - 0.505, 2));
        if (glintL < 0.012 || glintR < 0.012) {
          r = 255; g = 255; b = 255;
        }
      }

      // Cheeks: Left (0.32, 0.58), Right (0.68, 0.58), rx 0.045, ry 0.028, #F4A261
      const cheekL = Math.sqrt(Math.pow((nx - 0.32) / 0.045, 2) + Math.pow((ny - 0.58) / 0.028, 2));
      const cheekR = Math.sqrt(Math.pow((nx - 0.68) / 0.045, 2) + Math.pow((ny - 0.58) / 0.028, 2));
      if (cheekL <= 1.0 || cheekR <= 1.0) {
        // Blend pastel blush
        r = Math.round(255 * 0.45 + 244 * 0.55);
        g = Math.round(255 * 0.45 + 162 * 0.55);
        b = Math.round(255 * 0.45 + 97 * 0.55);
      }

      // Smile mouth (nx between 0.46 and 0.54, ny ~ 0.59)
      if (nx >= 0.46 && nx <= 0.54) {
        const mouthCurveY = 0.575 + Math.pow((nx - 0.5) / 0.04, 2) * 0.025;
        if (Math.abs(ny - mouthCurveY) < 0.008) {
          r = 46; g = 46; b = 58;
        }
      }

      // Little paws (0.5, 0.73), (0.43, 0.71), (0.57, 0.71)
      const pawM = Math.sqrt(Math.pow(nx - 0.5, 2) + Math.pow(ny - 0.73, 2));
      const pawL = Math.sqrt(Math.pow(nx - 0.43, 2) + Math.pow(ny - 0.71, 2));
      const pawR = Math.sqrt(Math.pow(nx - 0.57, 2) + Math.pow(ny - 0.71, 2));
      if (pawM < 0.025 || pawL < 0.02 || pawR < 0.02) {
        r = 255; g = 227; b = 214;
      }
    }
  }

  return [r, g, b, a];
}

const buf192 = createPng(192, 192, renderMochi);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), buf192);
console.log('✓ Generated icon-192.png (' + buf192.length + ' bytes)');

const buf512 = createPng(512, 512, renderMochi);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), buf512);
console.log('✓ Generated icon-512.png (' + buf512.length + ' bytes)');
