const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
const regex = /<div className="flex-1 overflow-y-auto overflow-x-hidden relative bg-\[#131922\]">[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?\)\s*:\s*\(/;
console.log(code.match(regex) ? "Match" : "No match");
