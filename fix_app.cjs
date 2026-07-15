const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /\? "💡 تشغيل آمن ومحلي: تطبيق الجيم يعمل بالكامل على معم[\s\S]*?(?=\{\/\* MOBILE TOP BAR \*\/)/;

const replace = `? "💡 تشغيل آمن ومحلي: تطبيق الجيم يعمل بالكامل على معمارية ديسكتوب أوفلاين لحماية وتشفير بيانات المشتركين محلياً." 
                  : "💡 SECURE DESKTOP CLIENT: Running on isolated Tauri sandbox loop. All data stays local and cryptographically secure."}
              </p>
            </div>
          </div>
        </div>
      ) : (
        
        // ----------------- MAIN REALM APP ENVIRONMENT WITH OPTIONAL WINDOW BEZEL -----------------
        <div className={\`flex-1 flex flex-col transition-all duration-300 min-h-0 \${
          windowMode === 'tauri' 
            ? 'p-3 md:p-6 bg-[#0c1015] bg-radial from-[#151c27] to-[#0a0d14]'
            : 'p-0'
        }\`}>
          
          <div className={\`flex-1 flex flex-col md:flex-row bg-[#131922] text-light-gray overflow-hidden transition-all duration-300 min-h-0 relative \${
            windowMode === 'tauri'
              ? 'rounded-2xl border border-muted-teal/25 shadow-[0_20px_50px_rgba(0,0,0,0.85)]'
              : ''
          }\`}>
            
            `;

code = code.replace(regex, replace);
fs.writeFileSync('src/App.tsx', code);
