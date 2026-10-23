// Run before committing changes to JavaScript, CSS or ranking data.
// All module imports and HTML entry points use one content-derived release ID.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const scripts = fs.readdirSync(path.join(root, 'js')).filter(file => file.endsWith('.js')).sort().map(file => 'js/' + file);
const files = [...scripts, 'style.css', 'game_ranking.csv'];
const withoutVersion = text => text.replace(/((?:\.js|\.css|\.csv))\?v=[a-zA-Z0-9_-]+/g, '$1');
const hash = crypto.createHash('sha256');
for (const file of files) hash.update(file + '\n' + withoutVersion(fs.readFileSync(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n'));
const version = hash.digest('hex').slice(0, 12);

for (const file of scripts) {
    const original = fs.readFileSync(path.join(root, file), 'utf8');
    const updated = withoutVersion(original).replace(/(["'])(\.{1,2}\/[^"']+\.js|game_ranking\.csv)\1/g,
        (match, quote, asset) => `${quote}${asset}?v=${version}${quote}`);
    if (updated !== original) fs.writeFileSync(path.join(root, file), updated);
}
for (const file of fs.readdirSync(root).filter(file => file.endsWith('.html'))) {
    const original = fs.readFileSync(path.join(root, file), 'utf8');
    const updated = withoutVersion(original)
        .replace(/href="style\.css"/g, `href="style.css?v=${version}"`)
        .replace(/src="js\/(?:app|bootstrap)\.js"/g, `src="js/bootstrap.js?v=${version}"`);
    if (updated !== original) fs.writeFileSync(path.join(root, file), updated);
}
console.log(`Asset version: ${version}`);
