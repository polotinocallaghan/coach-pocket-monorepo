const fs = require('fs');
const path = require('path');
const appsDir = path.join(__dirname, 'apps');
const apps = ['coach-ncaa', 'coach-standard', 'player-ncaa', 'player-standard'];

for (const app of apps) {
  // Fix drill-recommender
  const p = path.join(appsDir, app, 'src/lib/drill-recommender.ts');
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/from '\.\/store'/g, "from '@coach-pocket/core'");
    // implicit any fixes
    content = content.replace(/\(n\)\s*=>/g, "(n: number) =>");
    content = content.replace(/\(clip\)\s*=>/g, "(clip: any) =>");
    content = content.replace(/\(ch\)\s*=>/g, "(ch: any) =>");
    content = content.replace(/tag\s*=>\s*tag\.split/g, "(tag: string) => tag.split");
    fs.writeFileSync(p, content);
  }

  // Fix TrainingPreferencesViewer prop names
  const pageP = path.join(appsDir, app, 'src/app/builder/page.tsx');
  if (fs.existsSync(pageP)) {
    let content = fs.readFileSync(pageP, 'utf8');
    content = content.replace(/prefs={currentPlayer\.trainingPreferences}/g, "preferences={currentPlayer.trainingPreferences}");
    fs.writeFileSync(pageP, content);
  }
}
console.log("Fixed drill recommender and preferences viewer");
