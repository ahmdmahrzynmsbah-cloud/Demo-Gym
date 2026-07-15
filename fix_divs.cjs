const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace(/<\/form>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\s*:\s*\(/, `            </form>\n          </div>\n        </div>\n      </div>\n    ) : (`);
fs.writeFileSync('src/App.tsx', code);
