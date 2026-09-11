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
  1: { // Copper Orange
    edge:'#3D0E00', rim1:'#FF9030', rim2:'#C05010', rim3:'#7A2800',
    f1:'#FFD090', f2:'#F07020', f3:'#B04800',
    r1:'#CC5500', r2:'#7A2800',
    nf:'#FFD080', ns:'#5A1800'
  },
  2: { // Platinum Silver
    edge:'#182030', rim1:'#FFFFFF', rim2:'#90A8C0', rim3:'#3A5060',
    f1:'#FFFFFF', f2:'#B0C8DC', f3:'#607888',
    r1:'#4868A0', r2:'#203040',
    nf:'#DCF0FF', ns:'#101820'
  },
  3: { // Imperial Gold ← matches reference image exactly
    edge:'#3A1800', rim1:'#FFE060', rim2:'#D89020', rim3:'#8B5008',
    f1:'#FFF498', f2:'#F0A818', f3:'#C07010',
    r1:'#C87818', r2:'#7A4400',
    nf:'#FFE84A', ns:'#5A2C00'
  },
  4: { // Emerald Green
    edge:'#001A08', rim1:'#80FF80', rim2:'#18B030', rim3:'#086020',
    f1:'#C0FFC0', f2:'#25C845', f3:'#0E7825',
    r1:'#0E7828', r2:'#024012',
    nf:'#C0FFD0', ns:'#012810'
  },
  5: { // Crimson Red
    edge:'#2E0000', rim1:'#FF7070', rim2:'#D01818', rim3:'#880008',
    f1:'#FFAAAA', f2:'#EC2828', f3:'#A00808',
    r1:'#B01010', r2:'#600008',
    nf:'#FFAAAA', ns:'#3A0004'
  },
  6: { // Sapphire Blue
    edge:'#000830', rim1:'#70B0FF', rim2:'#1045D8', rim3:'#082068',
    f1:'#B0D4FF', f2:'#2060F0', f3:'#0830A8',
    r1:'#0838B8', r2:'#040F68',
    nf:'#C0D8FF', ns:'#020830'
  },
  7: { // Amethyst Purple
    edge:'#140038', rim1:'#D880FF', rim2:'#7818C8', rim3:'#420078',
    f1:'#EAB8FF', f2:'#9828DC', f3:'#5808A0',
    r1:'#6818B0', r2:'#300058',
    nf:'#EEB8FF', ns:'#200040'
  },
  8: { // Ocean Cyan
    edge:'#001C28', rim1:'#50E8FF', rim2:'#0898C0', rim3:'#004A68',
    f1:'#A0F5FF', f2:'#0AAED5', f3:'#005878',
    r1:'#077898', r2:'#003848',
    nf:'#A8F8FF', ns:'#002030'
  },
  9: { // Rose Pink
    edge:'#2E0018', rim1:'#FF80C0', rim2:'#D01868', rim3:'#880040',
    f1:'#FFB8D8', f2:'#EE2878', f3:'#A81048',
    r1:'#BE1868', r2:'#680038',
    nf:'#FFB0D8', ns:'#420020'
  },
  10: { // Warm Amber
    edge:'#281000', rim1:'#FFC040', rim2:'#C07808', rim3:'#7A4800',
    f1:'#FFE098', f2:'#DE8C18', f3:'#9A5E08',
    r1:'#B07018', r2:'#603800',
    nf:'#FFE090', ns:'#3C2000'
  },
  11: { // Mint Teal
    edge:'#001818', rim1:'#50FFD8', rim2:'#10B090', rim3:'#085860',
    f1:'#A0FFE8', f2:'#18C098', f3:'#087068',
    r1:'#0A9878', r2:'#024840',
    nf:'#A8FFE8', ns:'#013030'
  },
  12: { // Coral Red
    edge:'#320010', rim1:'#FF7890', rim2:'#D02048', rim3:'#8A0828',
    f1:'#FFB0C0', f2:'#EE3060', f3:'#AA1040',
    r1:'#C02050', r2:'#700028',
    nf:'#FFB0C8', ns:'#440018'
  },
  13: { // Cobalt Navy
    edge:'#000828', rim1:'#6890F8', rim2:'#0828B8', rim3:'#060F78',
    f1:'#A8C0FF', f2:'#1840E0', f3:'#0A20A0',
    r1:'#0B28B8', r2:'#030A68',
    nf:'#B0C8FF', ns:'#020840'
  },
  14: { // Deep Violet
    edge:'#100028', rim1:'#C090FF', rim2:'#5C10C0', rim3:'#300070',
    f1:'#DCB8FF', f2:'#7C20D8', f3:'#4808A0',
    r1:'#5418B0', r2:'#200058',
    nf:'#DDB8FF', ns:'#180040'
  },
  15: { // Golden Sun
    edge:'#302000', rim1:'#FFE028', rim2:'#C09008', rim3:'#785808',
    f1:'#FFFAAA', f2:'#E8B010', f3:'#A07008',
    r1:'#B88018', r2:'#604C00',
    nf:'#FFF060', ns:'#302000'
  }
};

/**
 * @param {number}  type      - 1–15
 * @param {boolean} showLabel - show number on top coin, else crown
 * @returns {string} SVG markup
 */
export function createCoinSvg(type, showLabel = false) {
  const p   = P[type] || P[3];
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
