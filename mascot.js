// mascot.js — drop into your CLI project, require and call renderMascot()
// Zero image dependencies. Pure chalk + Unicode blocks.
// npm install chalk@4

const chalk = require('chalk');

// ── Palette ──────────────────────────────────────────────────
const PAL = {
  0: null,          // transparent
  1: '#071018',     // deep outline
  2: '#0e4f6a',     // dark teal body
  3: '#0891b2',     // mid cyan
  4: '#22d3ee',     // bright cyan highlight
  5: '#e8f7ff',     // eye white
  6: '#0d1f4a',     // hat dark
  7: '#1a3a8a',     // hat mid
  8: '#3b82f6',     // hat bright
  9: '#2dd4bf',     // claw teal tips
  10: '#0c3d52',    // shadow
};

// ── Pixel grid (16 wide x 20 tall) ───────────────────────────
// Each number = palette key above. 0 = transparent (space)
const GRID = [
  [ 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0 ], // hat top
  [ 0, 0, 0, 0, 1, 7, 7, 8, 7, 1, 0, 0, 0, 0, 0, 0 ], // hat
  [ 0, 0, 0, 1, 6, 6, 7, 7, 6, 6, 1, 0, 0, 0, 0, 0 ], // hat
  [ 0, 0, 1, 6, 6, 6, 6, 6, 6, 6, 6, 1, 0, 0, 0, 0 ], // brim
  [ 0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0 ], // head
  [ 0, 0, 1, 3, 3, 5, 3, 3, 5, 3, 3, 1, 0, 0, 0, 0 ], // eyes
  [ 0, 0, 1, 3, 4, 5, 3, 3, 5, 4, 3, 1, 0, 0, 0, 0 ], // eye shine
  [ 0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0 ], // chin
  [ 0, 1, 9, 1, 2, 3, 3, 3, 3, 2, 1, 9, 1, 0, 0, 0 ], // shoulders
  [ 1, 9, 9, 1, 3, 3, 4, 4, 3, 3, 1, 9, 9, 1, 0, 0 ], // chest / claws
  [ 1, 9,10, 1, 3, 4, 3, 3, 4, 3, 1,10, 9, 1, 0, 0 ], // chest detail
  [ 0, 1, 9, 1, 2, 3, 3, 3, 3, 2, 1, 9, 1, 0, 0, 0 ], // lower chest
  [ 0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 1, 1, 0, 0, 0, 0 ], // waist
  [ 0, 0, 0, 1, 2, 2, 3, 3, 2, 2, 1, 0, 0, 0, 0, 0 ], // hips
  [ 0, 0, 1, 2, 1, 0, 2, 2, 0, 1, 2, 1, 0, 0, 0, 0 ], // upper legs
  [ 0, 0, 0, 1, 2, 0, 2, 2, 0, 2, 1, 0, 0, 0, 0, 0 ], // lower legs
  [ 0, 0, 0, 1, 9, 1, 2, 2, 1, 9, 1, 0, 0, 0, 0, 0 ], // feet
  [ 0, 0, 1, 9, 9, 1, 0, 0, 1, 9, 9, 1, 0, 0, 0, 0 ], // feet spread
  [ 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0 ], // base
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], // padding
];

// ── Renderer ─────────────────────────────────────────────────
// Returns array of strings (one per row) — each "pixel" = 2 chars wide
// so the sprite looks square in a monospace terminal
function renderMascotLines() {
  return GRID.map(row =>
    row.map(cell => {
      const hex = PAL[cell];
      if (!hex) return '  '; // transparent = 2 spaces
      return chalk.bgHex(hex)('  '); // 2 spaces with bg color = square pixel
    }).join('')
  );
}

// ── Usage ─────────────────────────────────────────────────────
// Option A: standalone — just print the mascot
function printMascot() {
  renderMascotLines().forEach(line => console.log(line));
}

// Option B: inline with text — returns lines array so you can
// zip it with header text lines side by side
// Example:
//   const mascot = renderMascotLines();
//   const text = ['ACR LABS', 'ShipMobile', 'v0.1.0 ...'];
//   mascot.forEach((pixelRow, i) => {
//     console.log(pixelRow + '  ' + (text[i] || ''));
//   });
function renderMascotLines_withText(textLines = []) {
  const mascotLines = renderMascotLines();
  const height = Math.max(mascotLines.length, textLines.length);
  const result = [];
  for (let i = 0; i < height; i++) {
    const left  = mascotLines[i] || ' '.repeat(32); // 16 cols * 2 chars
    const right = textLines[i]   || '';
    result.push(left + '  ' + right);
  }
  return result;
}

module.exports = { renderMascotLines, renderMascotLines_withText, printMascot };
