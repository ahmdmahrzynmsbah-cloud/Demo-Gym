const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /\/\/ \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\- MAIN REALM APP ENVIRONMENT WITH OPTIONAL WINDOW BEZEL \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-[\s\S]*?className=\{`flex\-1 flex flex\-col md:flex\-row bg-\[#131922\] text\-light\-gray overflow\-hidden transition\-all duration\-300 min\-h\-0 relative \$\{[\s\S]*?: ''[\s\S]*?\}\`\}>/;

const replace = `// ----------------- MAIN REALM APP ENVIRONMENT -----------------
        <div className="flex-1 flex flex-col md:flex-row bg-[#131922] text-light-gray overflow-hidden transition-all duration-300 min-h-0 relative">`;

code = code.replace(regex, replace);
fs.writeFileSync('src/App.tsx', code);
