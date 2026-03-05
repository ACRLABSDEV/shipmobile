// Usage in your printHelp.js — replace the terminal-image block with this

const chalk = require('chalk');
const { renderMascotLines_withText } = require('./mascot');

// Build the 3 header text lines that sit beside the mascot
const headerText = [
  '',                                                              // row 0  — blank (hat level)
  '',                                                              // row 1
  '',                                                              // row 2
  '',                                                              // row 3  — brim level
  chalk.hex('#3d5a6e')('ACR LABS'),                               // row 4  — head level
  chalk.bold.hex('#22d3ee')('ShipMobile'),                        // row 5  — eyes level ← main title
  '',                                                              // row 6
  chalk.hex('#5a7a8a')('v0.1.0') +
    '  ' + chalk.hex('#38bdf8')('github.com/ACRLABSDEV/shipmobile'),// row 7
];

// Zip mascot + text and print
renderMascotLines_withText(headerText).forEach(line => console.log(line));
