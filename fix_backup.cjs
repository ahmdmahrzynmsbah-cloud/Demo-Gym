const fs = require('fs');
let code = fs.readFileSync('src/lib/realm.ts', 'utf-8');

// Replace triggerBackupDownload calls inside checkAndTriggerScheduledReminders to do nothing
code = code.replace(/triggerBackupDownload\('daily'\);/g, '// triggerBackupDownload("daily");');
code = code.replace(/triggerBackupDownload\('weekly'\);/g, '// triggerBackupDownload("weekly");');
code = code.replace(/triggerBackupDownload\('monthly'\);/g, '// triggerBackupDownload("monthly");');

fs.writeFileSync('src/lib/realm.ts', code);
