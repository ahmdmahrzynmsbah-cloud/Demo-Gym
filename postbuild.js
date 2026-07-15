import fs from 'fs';
import path from 'path';

// Function to recursively get all files in a directory
function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, fileList);
    } else {
      fileList.push(name);
    }
  }
  return fileList;
}

const distDir = path.resolve('dist');
if (fs.existsSync(distDir)) {
  const allFiles = getFiles(distDir);
  // Get relative paths for files under dist/ and replace backslashes (Windows) with forward slashes
  const cacheFiles = allFiles
    .map(file => path.relative(distDir, file).replace(/\\/g, '/'))
    // Exclude service worker file itself, source maps, and metadata/firebase configs
    .filter(file => {
      const lower = file.toLowerCase();
      return (
        file !== 'sw.js' &&
        !lower.endsWith('.map') &&
        file !== 'firebase-applet-config.json' &&
        file !== 'firebase-blueprint.json' &&
        file !== 'firestore.rules'
      );
    });

  console.log('Postbuild SW Optimizer - Files to cache:', cacheFiles);

  // Read the copied dist/sw.js
  const swPath = path.join(distDir, 'sw.js');
  if (fs.existsSync(swPath)) {
    let swContent = fs.readFileSync(swPath, 'utf8');
    
    // Inject exact file array into ASSETS_TO_CACHE
    // Ensure Paths are absolute to root '/' or formatted properly for the cache keys
    const cachePaths = ['/', '/index.html', ...cacheFiles.map(f => '/' + f)];
    const replacementStr = `const ASSETS_TO_CACHE = ${JSON.stringify(cachePaths, null, 2)};`;
    
    // We want to replace the line starting with "const ASSETS_TO_CACHE = [" up to the closing "];"
    swContent = swContent.replace(/const ASSETS_TO_CACHE = \[[^\]]*\];/s, replacementStr);
    
    fs.writeFileSync(swPath, swContent, 'utf8');
    console.log('Postbuild SW Optimizer - Successfully updated dist/sw.js with local assets!');
  } else {
    console.warn('Postbuild SW Optimizer - dist/sw.js not found!');
  }
} else {
  console.warn('Postbuild SW Optimizer - dist folder does not exist!');
}
