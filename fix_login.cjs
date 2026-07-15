const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Remove the tip text
const tipRegex = /\{\/\* Desktop Quick Installation Tip for users \*\/\}[\s\S]*?<\/div>\s*<\/div>/;
code = code.replace(tipRegex, '</div>');

// Fix the scrolling container
const scrollRegex = /<div className="flex-1 flex flex-col items-center justify-start md:justify-center p-6 py-12 md:py-6 relative bg-\[#131922\] overflow-y-auto overflow-x-hidden">/;
const scrollReplace = `<div className="flex-1 overflow-y-auto overflow-x-hidden relative bg-[#131922]">
          {/* Elegant geometric native backdrop lines inside simulated desktop screen */}
          <div className="fixed inset-0 bg-[linear-gradient(rgba(196,214,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(196,214,0,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="min-h-full flex flex-col items-center justify-center p-4 py-12 md:p-6 relative z-10">`;
          
code = code.replace(scrollRegex, scrollReplace);

// We need to remove the extra old background tags from the replaced code since we moved them to fixed positioning
const bgLinesRegex = /<div className="absolute inset-0 bg-\[linear-gradient\(rgba\(196,214,0,0.03\)_1px,transparent_1px\),linear-gradient\(90deg,rgba\(196,214,0,0.03\)_1px,transparent_1px\)\] bg-\[size:32px_32px\] pointer-events-none" \/>/;
const bgCircleRegex = /<div className="absolute top-1\/2 left-1\/2 -translate-x-1\/2 -translate-y-1\/2 w-\[500px\] h-\[500px\] bg-primary\/5 rounded-full blur-\[120px\] pointer-events-none" \/>/;

code = code.replace(bgLinesRegex, '');
code = code.replace(bgCircleRegex, '');

fs.writeFileSync('src/App.tsx', code);
