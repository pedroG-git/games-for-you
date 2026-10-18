// Writes www/version.js from package.json so the app knows its own version (for the update check),
// and docs/version.json, which the app reads from GitHub Pages (the GitHub API has a 60/hour limit per Wi-Fi).
const fs = require('fs');
const path = require('path');
const { version } = require('../package.json');
fs.writeFileSync(path.join(__dirname, '../www/version.js'), `window.APP_VERSION = '${version}';\n`);
fs.writeFileSync(path.join(__dirname, '../docs/version.json'), JSON.stringify({ version }) + '\n');
