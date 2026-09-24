/**
 * Casual Mobile Game Coin — Exact Reference Match
 *
 * Reference design layers (inner → outer):
 *   1. Dark outer border ring
 *   2. Bright colored rim with milled ridges
 *   3. Main face — vibrant radial gradient (top-left bright)
 *   4. Inner recessed darker circle (sunken depth)
 *   5. Bold number or crown inside recess
 *   6. Glossy white specular highlight pill — top-left
 *   7. Soft ground shadow ellipse
 */

/* ─── Color Palettes ─────────────────────────────────────────────────────── */
const P = {
  1: { // Orange
    edge:'#3D0E00', rim1:'#FF9030', rim2:'#C05010', rim3:'#7A2800',
    f1:'#FFD090', f2:'#F07020', f3:'#B04800', r1:'#CC5500', r2:'#7A2800', nf:'#FFD080', ns:'#5A1800'
  },
  2: { // Silver
    edge:'#182030', rim1:'#FFFFFF', rim2:'#90A8C0', rim3:'#3A5060',
    f1:'#FFFFFF', f2:'#B0C8DC', f3:'#607888', r1:'#4868A0', r2:'#203040', nf:'#DCF0FF', ns:'#101820'
  },
  3: { // Gold
    edge:'#3A1800', rim1:'#FFE060', rim2:'#D89020', rim3:'#8B5008',
    f1:'#FFF498', f2:'#F0A818', f3:'#C07010', r1:'#C87818', r2:'#7A4400', nf:'#FFE84A', ns:'#5A2C00'
  },
  4: { // Green
    edge:'#001A08', rim1:'#80FF80', rim2:'#18B030', rim3:'#086020',
    f1:'#C0FFC0', f2:'#25C845', f3:'#0E7825', r1:'#0E7828', r2:'#024012', nf:'#C0FFD0', ns:'#012810'
  },
  5: { // Red
    edge:'#2E0000', rim1:'#FF7070', rim2:'#D01818', rim3:'#880008',
    f1:'#FFAAAA', f2:'#EC2828', f3:'#A00808', r1:'#B01010', r2:'#600008', nf:'#FFAAAA', ns:'#3A0004'
  },
  6: { // Blue
    edge:'#000830', rim1:'#70B0FF', rim2:'#1045D8', rim3:'#082068',
    f1:'#B0D4FF', f2:'#2060F0', f3:'#0830A8', r1:'#0838B8', r2:'#040F68', nf:'#C0D8FF', ns:'#020830'
  },
  7: { // Purple
    edge:'#140038', rim1:'#D880FF', rim2:'#7818C8', rim3:'#420078',
    f1:'#EAB8FF', f2:'#9828DC', f3:'#5808A0', r1:'#6818B0', r2:'#300058', nf:'#EEB8FF', ns:'#200040'
  },
  8: { // Cyan
    edge:'#001C28', rim1:'#50E8FF', rim2:'#0898C0', rim3:'#004A68',
    f1:'#A0F5FF', f2:'#0AAED5', f3:'#005878', r1:'#077898', r2:'#003848', nf:'#A8F8FF', ns:'#002030'
  },
  9: { // Pink
    edge:'#2E0018', rim1:'#FF80C0', rim2:'#D01868', rim3:'#880040',
    f1:'#FFB8D8', f2:'#EE2878', f3:'#A81048', r1:'#BE1868', r2:'#680038', nf:'#FFB0D8', ns:'#420020'
  },
  10: { // Brown/Bronze
    edge:'#241004', rim1:'#C08050', rim2:'#804020', rim3:'#4A2010',
    f1:'#E0B090', f2:'#905030', f3:'#5A2C18', r1:'#804020', r2:'#4A2010', nf:'#FFD0B0', ns:'#3A1A0C'
  },
  11: { // Lime
    edge:'#1A2800', rim1:'#D0FF40', rim2:'#80D010', rim3:'#407A00',
    f1:'#E8FFB0', f2:'#98E018', f3:'#5A9008', r1:'#88C818', r2:'#407A00', nf:'#E8FF90', ns:'#2A4800'
  },
  12: { // Navy
    edge:'#040018', rim1:'#8060FF', rim2:'#3010B0', rim3:'#180468',
    f1:'#C0A8FF', f2:'#4020D0', f3:'#200888', r1:'#3818A8', r2:'#180468', nf:'#D8C8FF', ns:'#100040'
  },
  13: { // Maroon
    edge:'#180004', rim1:'#F04070', rim2:'#901030', rim3:'#500018',
    f1:'#FFB0C8', f2:'#A01840', f3:'#600820', r1:'#901030', r2:'#500018', nf:'#FFC0D8', ns:'#300010'
  },
  14: { // Black
    edge:'#000000', rim1:'#A0A0A0', rim2:'#404040', rim3:'#1A1A1A',
    f1:'#C0C0C0', f2:'#505050', f3:'#202020', r1:'#404040', r2:'#1A1A1A', nf:'#E0E0E0', ns:'#000000'
  },
  15: { // Peach
    edge:'#301010', rim1:'#FFC0B0', rim2:'#F08060', rim3:'#A04028',
    f1:'#FFE0D8', f2:'#FF9880', f3:'#C05840', r1:'#E88068', r2:'#903820', nf:'#FFD8C8', ns:'#702010'
  }
};

/**
 * @param {number}  type      - 1–15 and beyond
 * @param {boolean} showLabel - show number on top coin, else crown
 * @returns {string} SVG markup
 */
export function createCoinSvg(type, showLabel = false) {
  let p = P[type];
  if (!p) {
    // Mathematically generate infinitely distinct colors using the Golden Angle (137.5 degrees)
    const hue = (type * 137.5) % 360;
    p = {
      edge: `hsl(${hue}, 80%, 10%)`,
      rim1: `hsl(${hue}, 100%, 80%)`,
      rim2: `hsl(${hue}, 90%, 45%)`,
      rim3: `hsl(${hue}, 90%, 20%)`,
      f1:   `hsl(${hue}, 100%, 85%)`,
      f2:   `hsl(${hue}, 80%, 50%)`,
      f3:   `hsl(${hue}, 90%, 25%)`,
      r1:   `hsl(${hue}, 80%, 40%)`,
      r2:   `hsl(${hue}, 90%, 15%)`,
      nf:   `hsl(${hue}, 100%, 90%)`,
      ns:   `hsl(${hue}, 80%, 10%)`
    };
  }

  const uid = `c${type}_${(Math.random()*1e7)|0}`;
  const num = String(type);
  const fs  = num.length > 1 ? 32 : 40; // font size (reduced)

  // 2.5D Isometric Geometry - Reduced Thickness
  const bx = 50, by = 46; // Back ellipse (top edge extrusion base)
  const fx = 50, fy = 54; // Front ellipse (main face)
  const rx = 46, ry = 36; // Outer coin dimensions
  const irx = 29, iry = 23; // Inner recess dimensions
  const th = fy - by;       // Thickness (14)

  return `<svg class="coin-svg" viewBox="0 0 100 100"
     xmlns="http://www.w3.org/2000/svg"
     width="100%" height="100%"
     style="overflow:visible;display:block;">
  <defs>
    <!-- Top Edge Extrusion Gradient (Horizontal) - Added Metallic Reflection Texture -->
    <linearGradient id="edgeGrad_${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="${p.edge}"/>
      <stop offset="15%"  stop-color="${p.rim3}"/>
      <stop offset="28%"  stop-color="${p.rim1}"/> <!-- Bright metallic reflection line -->
      <stop offset="36%"  stop-color="${p.rim2}"/>
      <stop offset="65%"  stop-color="${p.rim3}"/>
      <stop offset="85%"  stop-color="${p.rim2}"/>
      <stop offset="100%" stop-color="${p.edge}"/>
    </linearGradient>
    
    <!-- Front Face Gradient (Diagonal) -->
    <linearGradient id="rimGrad_${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="${p.rim1}"/>
      <stop offset="50%"  stop-color="${p.rim2}"/>
      <stop offset="100%" stop-color="${p.rim3}"/>
    </linearGradient>

    <!-- Inner Recess Gradient -->
    <linearGradient id="recessGrad_${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="${p.r2}"/>
      <stop offset="100%" stop-color="${p.r1}"/>
    </linearGradient>

    <!-- Drop Shadows -->
    <filter id="ds_${uid}" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="6" stdDeviation="4" flood-color="${p.edge}" flood-opacity="0.65"/>
    </filter>

    <filter id="inShad_${uid}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="1.5" dy="3" stdDeviation="2" flood-color="${p.edge}" flood-opacity="0.9"/>
    </filter>

    <clipPath id="recessClip_${uid}">
      <ellipse cx="${fx}" cy="${fy}" rx="${irx}" ry="${iry}"/>
    </clipPath>
  </defs>

  <!-- 1. Ground Shadow -->
  <ellipse cx="50" cy="62" rx="42" ry="32" fill="${p.edge}" opacity="0.4" filter="url(#ds_${uid})"/>

  <!-- 2. Top Edge Extrusion (Shows coin thickness at the top) -->
  <ellipse cx="${bx}" cy="${by}" rx="${rx}" ry="${ry}" fill="url(#edgeGrad_${uid})"/>
  <rect x="${bx - rx}" y="${by}" width="${rx * 2}" height="${th}" fill="url(#edgeGrad_${uid})"/>

  <!-- 3. Fine Ribbed Texture on Top Edge -->
  <ellipse cx="${bx}" cy="${by}" rx="${rx - 0.5}" ry="${ry - 0.5}" fill="none" stroke="${p.edge}" stroke-width="2" stroke-dasharray="1 2.5" opacity="0.4"/>
  <ellipse cx="${bx}" cy="${by}" rx="${rx - 0.5}" ry="${ry - 0.5}" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-dasharray="1 2.5" stroke-dashoffset="1" opacity="0.4"/>

  <!-- 4. Front Face (Main Coin) -->
  <!-- Dark outline to separate face from extrusion -->
  <ellipse cx="${fx}" cy="${fy}" rx="${rx}" ry="${ry}" fill="${p.edge}"/>
  <ellipse cx="${fx}" cy="${fy}" rx="${rx - 1.5}" ry="${ry - 1.5}" fill="url(#rimGrad_${uid})"/>
  
  <!-- Outer Bevel Highlights (Makes face look 3D and raised) -->
  <ellipse cx="${fx}" cy="${fy}" rx="${rx - 2.5}" ry="${ry - 2.5}" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/>
  <ellipse cx="${fx}" cy="${fy}" rx="${rx - 2.5}" ry="${ry - 2.5}" fill="none" stroke="${p.edge}" stroke-width="1" opacity="0.5"/>

  <!-- 5. Inner Recess (Sunken Hole) -->
  <ellipse cx="${fx}" cy="${fy}" rx="${irx}" ry="${iry}" fill="${p.edge}"/>
  
  <g clip-path="url(#recessClip_${uid})">
    <ellipse cx="${fx}" cy="${fy}" rx="${irx}" ry="${iry}" fill="url(#recessGrad_${uid})"/>
    <!-- 3D Shadow (Top-Left) -->
    <ellipse cx="${fx}" cy="${fy}" rx="${irx}" ry="${iry}" fill="none" stroke="${p.edge}" stroke-width="2" filter="url(#inShad_${uid})"/>
    <!-- 3D Highlight (Bottom-Right) -->
    <ellipse cx="${fx - 2}" cy="${fy - 2}" rx="${irx}" ry="${iry}" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2.5"/>
  </g>

  <ellipse cx="${fx}" cy="${fy}" rx="${irx}" ry="${iry}" fill="none" stroke="${p.edge}" stroke-width="1.5" opacity="0.6"/>

  <!-- 6. Content (Number) -->
  <text x="${fx}" y="${fy + 3}"
       text-anchor="middle" dominant-baseline="middle"
       font-family="'Outfit','Nunito Black','Arial Rounded MT Bold',sans-serif"
       font-size="${fs}" font-weight="900" letter-spacing="-0.5"
       fill="${p.nf}"
       stroke="${p.ns}" stroke-width="3"
       paint-order="stroke fill">${num}</text>

  <!-- 7. Specular Gloss (Top-Left on Front Face) -->
  <ellipse cx="22" cy="35" rx="8" ry="3" transform="rotate(-30 22 35)" fill="#FFFFFF" opacity="0.5"/>

</svg>`;
}
