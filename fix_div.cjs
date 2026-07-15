const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace("          </main>\n        </div>\n      </div>\n    )}\n", "          </main>\n        </div>\n    )}\n");
fs.writeFileSync('src/App.tsx', code);
