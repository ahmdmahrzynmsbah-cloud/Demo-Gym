const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
const regex = /<\/div>\s*\)\s*:\s*\(\s*\/\/\s*----------------- MAIN REALM APP ENVIRONMENT -----------------/;
code = code.replace(regex, `          </div>\n        </div>\n      </div>\n    ) : (\n        // ----------------- MAIN REALM APP ENVIRONMENT -----------------`);
fs.writeFileSync('src/App.tsx', code);
