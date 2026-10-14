// Writes www/version.js from package.json so the app knows its own version (for the update check)
const fs = require('fs');
const path = require('path');
const { version } = require('../package.json');
fs.writeFileSync(path.join(__dirname, '../www/version.js'), `window.APP_VERSION = '${version}';\n`);
