const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
// We need to check if there is an extra </div> that needs to be removed.
console.log(code.slice(-100));
