const fs = require('fs');
console.log(fs.readFileSync('src/App.tsx', 'utf-8').split('\n').slice(390, 420).join('\n'));
