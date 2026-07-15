const fs = require('fs');
let code = fs.readFileSync('src/lib/realm.ts', 'utf-8');

// The best way to prevent automatic backup download is to modify the triggerBackupDownload function to return early if it's not manual.
code = code.replace(
  /export function triggerBackupDownload\(customLabel\?: 'daily' \| 'weekly' \| 'monthly'\) \{/g,
  "export function triggerBackupDownload(customLabel?: 'daily' | 'weekly' | 'monthly') {\n  if (customLabel) return; // Disable automatic downloads\n"
);

fs.writeFileSync('src/lib/realm.ts', code);
