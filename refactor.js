const fs = require('fs');
const path = require('path');

const appsDir = path.join(__dirname, 'apps');
const apps = ['coach-ncaa', 'coach-standard', 'player-ncaa', 'player-standard'];

const filesToDelete = [
  'src/lib/types.ts',
  'src/lib/firebase.ts',
  'src/lib/firestoreService.ts',
  'src/lib/storageService.ts',
  'src/lib/store.ts',
  'src/lib/store.ts.backup',
  'src/lib/AuthContext.tsx'
];

function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx'))) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      let changed = false;

      // Import replacements
      const replacements = [
        { regex: /import\s+{(.*?)}\s+from\s+['"]@\/lib\/types['"];?/g, replace: "import {$1} from '@coach-pocket/core';" },
        { regex: /import\s+{(.*?)}\s+from\s+['"]@\/lib\/firebase['"];?/g, replace: "import {$1} from '@coach-pocket/core';" },
        { regex: /import\s+{(.*?)}\s+from\s+['"]@\/lib\/firestoreService['"];?/g, replace: "import {$1} from '@coach-pocket/core';" },
        { regex: /import\s+{(.*?)}\s+from\s+['"]@\/lib\/storageService['"];?/g, replace: "import {$1} from '@coach-pocket/core';" },
        { regex: /import\s+{(.*?)}\s+from\s+['"]@\/lib\/store['"];?/g, replace: "import {$1} from '@coach-pocket/core';" },
        { regex: /import\s+{(.*?)}\s+from\s+['"]@\/lib\/AuthContext['"];?/g, replace: "import {$1} from '@coach-pocket/core';" },
        
        // Relative imports replacement (e.g. '../lib/types' or '../../lib/firestoreService')
        { regex: /import\s+{(.*?)}\s+from\s+['"](?:\.\.\/)+lib\/types['"];?/g, replace: "import {$1} from '@coach-pocket/core';" },
        { regex: /import\s+{(.*?)}\s+from\s+['"](?:\.\.\/)+lib\/firebase['"];?/g, replace: "import {$1} from '@coach-pocket/core';" },
        { regex: /import\s+{(.*?)}\s+from\s+['"](?:\.\.\/)+lib\/firestoreService['"];?/g, replace: "import {$1} from '@coach-pocket/core';" },
        { regex: /import\s+{(.*?)}\s+from\s+['"](?:\.\.\/)+lib\/storageService['"];?/g, replace: "import {$1} from '@coach-pocket/core';" },
        { regex: /import\s+{(.*?)}\s+from\s+['"](?:\.\.\/)+lib\/store['"];?/g, replace: "import {$1} from '@coach-pocket/core';" },
        { regex: /import\s+{(.*?)}\s+from\s+['"](?:\.\.\/)+lib\/AuthContext['"];?/g, replace: "import {$1} from '@coach-pocket/core';" },
        
        { regex: /import\s+(.*?)\s+from\s+['"]@\/lib\/types['"];?/g, replace: "import $1 from '@coach-pocket/core';" },
        { regex: /import\s+(.*?)\s+from\s+['"](?:\.\.\/)+lib\/types['"];?/g, replace: "import $1 from '@coach-pocket/core';" }
      ];

      for (const { regex, replace } of replacements) {
        if (regex.test(content)) {
          content = content.replace(regex, replace);
          changed = true;
        }
      }

      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf-8');
        console.log(`Updated imports in ${fullPath}`);
      }
    }
  }
}

for (const app of apps) {
  const appSrcDir = path.join(appsDir, app, 'src');
  if (fs.existsSync(appSrcDir)) {
    processDirectory(appSrcDir);
  }
  
  for (const delFile of filesToDelete) {
    const fullDelPath = path.join(appsDir, app, delFile);
    if (fs.existsSync(fullDelPath)) {
      try {
        fs.unlinkSync(fullDelPath);
        console.log(`Deleted ${fullDelPath}`);
      } catch (e) {
        console.error(`Could not delete ${fullDelPath}: ${e.message}`);
      }
    }
  }
}

console.log('Refactor complete.');
