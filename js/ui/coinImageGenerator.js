/**
 * Ultra-HD Photorealistic 3D Coin Image Generator (Canvas Engine)
 * Renders high-resolution 3D metallic casino coin PNG images programmatically.
 * Features:
 * - Ultra-clean 3D physical side edge wall (0 black offset artifacts!)
 * - Double polished gold beveled outer rims
 * - Specular gloss glare reflections
 * - Filigree milled teeth rings & gold accent borders
 * - Embossed golden 3D serif numbers (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15)
 */

const COIN_THEMES = {
  1: { faceLight: '#fff7ed', faceMid: '#f97316', faceDark: '#c2410c', faceBase: '#451a03', sideTop: '#ea580c', sideDark: '#451a03' }, // Burnt Amber
  2: { faceLight: '#ffffff', faceMid: '#cbd5e1', faceDark: '#64748b', faceBase: '#0f172a', sideTop: '#94a3b8', sideDark: '#0f172a' }, // Platinum Silver
  3: { faceLight: '#ffffea', faceMid: '#fde047', faceDark: '#ca8a04', faceBase: '#451a03', sideTop: '#eab308', sideDark: '#3f1704' }, // Imperial Gold
  4: { faceLight: '#f0fdf4', faceMid: '#22c55e', faceDark: '#15803d', faceBase: '#052e16', sideTop: '#16a34a', sideDark: '#022c22' }, // Emerald Green
  5: { faceLight: '#fef2f2', faceMid: '#ef4444', faceDark: '#b91c1c', faceBase: '#450a0a', sideTop: '#dc2626', sideDark: '#450a0a' }, // Ruby Red
  6: { faceLight: '#eff6ff', faceMid: '#3b82f6', faceDark: '#1d4ed8', faceBase: '#091e42', sideTop: '#2563eb', sideDark: '#091e42' }, // Sapphire Blue
  7: { faceLight: '#faf5ff', faceMid: '#a855f7', faceDark: '#7e22ce', faceBase: '#2e1065', sideTop: '#9333ea', sideDark: '#2e1065' }, // Amethyst Purple
  8: { faceLight: '#ecfeff', faceMid: '#06b6d4', faceDark: '#0e7490', faceBase: '#042f2e', sideTop: '#0891b2', sideDark: '#042f2e' }, // Ocean Cyan
  9: { faceLight: '#fdf2f8', faceMid: '#ec4899', faceDark: '#be185d', faceBase: '#4c0519', sideTop: '#db2777', sideDark: '#4c0519' }, // Rose Pink
  10: { faceLight: '#fffbeb', faceMid: '#f59e0b', faceDark: '#b45309', faceBase: '#361705', sideTop: '#d97706', sideDark: '#361705' }, // Amber Bronze
  11: { faceLight: '#f0fdf4', faceMid: '#10b981', faceDark: '#047857', faceBase: '#022c22', sideTop: '#059669', sideDark: '#022c22' }, // Mint Green
  12: { faceLight: '#fff1f2', faceMid: '#f43f5e', faceDark: '#be123c', faceBase: '#4c0519', sideTop: '#e11d48', sideDark: '#4c0519' }, // Coral Red
  13: { faceLight: '#eff6ff', faceMid: '#2563eb', faceDark: '#1e40af', faceBase: '#0f172a', sideTop: '#1d4ed8', sideDark: '#0f172a' }, // Navy Blue
  14: { faceLight: '#faf5ff', faceMid: '#8b5cf6', faceDark: '#6b21a8', faceBase: '#2e1065', sideTop: '#7e22ce', sideDark: '#2e1065' }, // Violet Purple
  15: { faceLight: '#fffbeb', faceMid: '#eab308', faceDark: '#854d0e', faceBase: '#451a03', sideTop: '#ca8a04', sideDark: '#451a03' }  // Golden Sun
};

const imageCache = new Map();

/**
 * Generates an Ultra-HD 3D metallic coin PNG image Data-URL.
 * @param {number} type - Coin level (1 to 15)
 * @param {boolean} showNumber - Whether to display the 3D embossed golden number
 * @returns {string} PNG Data-URL
 */
export function getCoinImageDataUrl(type, showNumber = false) {
  const cacheKey = `${type}_${showNumber}`;
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');

  const theme = COIN_THEMES[type] || COIN_THEMES[1];
  const cx = 128;
  const cy = 64;
  const rx = 112;
  const ry = 48;
  const thickness = 6; // Crisp 6px 3D side edge thickness!

  ctx.clearRect(0, 0, 256, 140);

  // 1. 3D Physical Side Edge Thickness Wall
  const sideGrad = ctx.createLinearGradient(0, cy, 0, cy + thickness);
  sideGrad.addColorStop(0, theme.sideTop);
  sideGrad.addColorStop(0.7, theme.faceDark);
  sideGrad.addColorStop(1, theme.sideDark);

  ctx.beginPath();
  ctx.ellipse(cx, cy + thickness, rx, ry, 0, 0, Math.PI);
  ctx.lineTo(cx - rx, cy);
  ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true);
  ctx.lineTo(cx + rx, cy + thickness);
  ctx.fillStyle = sideGrad;
  ctx.fill();

  // Subtle bottom edge line
  ctx.beginPath();
  ctx.ellipse(cx, cy + thickness, rx, ry, 0, 0, Math.PI);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 2. Royal Polished Gold Outer Beveled Rim Disc
  const goldRimGrad = ctx.createRadialGradient(cx - 35, cy - 20, 5, cx, cy, rx);
  goldRimGrad.addColorStop(0, '#ffffff');
  goldRimGrad.addColorStop(0.18, '#ffe066');
  goldRimGrad.addColorStop(0.45, '#d4af37');
  goldRimGrad.addColorStop(0.8, '#8a6314');
  goldRimGrad.addColorStop(1, '#3d2800');

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = goldRimGrad;
  ctx.fill();

  // Outer gold rim highlight border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Inner rim gold shadow line
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.94, ry * 0.94, 0, 0, Math.PI * 2);
  ctx.strokeStyle = '#3d2800';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 3. Colored Enamel Center Disc
  const faceGrad = ctx.createRadialGradient(cx - 30, cy - 18, 5, cx, cy, rx * 0.9);
  faceGrad.addColorStop(0, theme.faceLight);
  faceGrad.addColorStop(0.25, theme.faceMid);
  faceGrad.addColorStop(0.7, theme.faceDark);
  faceGrad.addColorStop(1, theme.faceBase);

  ctx.beginPath();
  ctx.ellipse(cx, cy + 0.5, rx * 0.9, ry * 0.9, 0, 0, Math.PI * 2);
  ctx.fillStyle = faceGrad;
  ctx.fill();
  ctx.strokeStyle = goldRimGrad;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 4. Filigree Dotted Milled Teeth Ring
  ctx.beginPath();
  ctx.ellipse(cx, cy + 0.5, rx * 0.83, ry * 0.83, 0, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffe066';
  ctx.lineWidth = 1.8;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.ellipse(cx, cy + 0.5, rx * 0.76, ry * 0.76, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Specular Gloss Glare Reflection Arc
  const glareGrad = ctx.createLinearGradient(cx - rx * 0.5, cy - ry * 0.6, cx + rx * 0.2, cy + ry * 0.4);
  glareGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
  glareGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.12)');
  glareGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.1, cy - ry * 0.15, rx * 0.65, ry * 0.55, -0.15, Math.PI * 0.9, Math.PI * 1.9);
  ctx.fillStyle = glareGrad;
  ctx.fill();

  // 5. Center Gold Shield Badge & Embossed Golden 3D Number
  if (showNumber) {
    const badgeCy = cy + 3.5;
    
    // Shield background
    const badgeGrad = ctx.createRadialGradient(cx - 10, badgeCy - 6, 3, cx, badgeCy, 45);
    badgeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    badgeGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.4)');
    badgeGrad.addColorStop(1, 'rgba(0, 0, 0, 0.8)');

    ctx.beginPath();
    ctx.ellipse(cx, badgeCy, 48, 20, 0, 0, Math.PI * 2);
    ctx.fillStyle = badgeGrad;
    ctx.fill();
    ctx.strokeStyle = goldRimGrad;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Top & Bottom Gold Crest Arcs
    ctx.beginPath();
    ctx.ellipse(cx, badgeCy - 1, 40, 15, 0, Math.PI * 1.15, Math.PI * 1.85);
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(cx, badgeCy + 1, 40, 15, 0, Math.PI * 0.15, Math.PI * 0.85);
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Golden Embossed Serif Text
    const goldTextGrad = ctx.createLinearGradient(0, badgeCy - 16, 0, badgeCy + 16);
    goldTextGrad.addColorStop(0, '#ffffff');
    goldTextGrad.addColorStop(0.35, '#fff099');
    goldTextGrad.addColorStop(0.75, '#e6b800');
    goldTextGrad.addColorStop(1, '#8a6314');

    ctx.font = '900 32px "Georgia", "Times New Roman", "Outfit", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Drop shadow under text
    ctx.fillStyle = '#1c1100';
    ctx.fillText(String(type), cx + 1.2, badgeCy + 3);

    // Text stroke outline
    ctx.strokeStyle = '#261900';
    ctx.lineWidth = 2.5;
    ctx.strokeText(String(type), cx, badgeCy + 1);

    // Text fill
    ctx.fillStyle = goldTextGrad;
    ctx.fillText(String(type), cx, badgeCy + 1);
  }

  const dataUrl = canvas.toDataURL('image/png');
  imageCache.set(cacheKey, dataUrl);
  return dataUrl;
}
