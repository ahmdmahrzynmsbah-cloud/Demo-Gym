const fs = require('fs');
let code = fs.readFileSync('src/lib/realm.ts', 'utf-8');

// Also prevent it from writing the auto-backup stuff
code = code.replace(/shouldAddDailyBackup = true;/g, 'shouldAddDailyBackup = false;');
code = code.replace(/shouldAddWeeklyBackup = true;/g, 'shouldAddWeeklyBackup = false;');
code = code.replace(/shouldAddMonthlyBackup = true;/g, 'shouldAddMonthlyBackup = false;');

fs.writeFileSync('src/lib/realm.ts', code);
