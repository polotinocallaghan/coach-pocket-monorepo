const fs = require('fs');
const apps = [
    { dir: 'coach-standard', name: '@coach-pocket/coach-standard', port: 3000 },
    { dir: 'coach-ncaa', name: '@coach-pocket/coach-ncaa', port: 3001 },
    { dir: 'player-standard', name: '@coach-pocket/player-standard', port: 3002 },
    { dir: 'player-ncaa', name: '@coach-pocket/player-ncaa', port: 3003 }
];
for (const app of apps) {
    const p = `apps/${app.dir}/package.json`;
    const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
    pkg.name = app.name;
    pkg.scripts.dev = `next dev -p ${app.port}`;
    fs.writeFileSync(p, JSON.stringify(pkg, null, 2));
}
