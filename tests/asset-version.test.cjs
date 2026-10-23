const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const scripts = fs.readdirSync(path.join(root, 'js')).filter(file => file.endsWith('.js')).sort().map(file => 'js/' + file);
const withoutVersion = text => text.replace(/((?:\.js|\.css|\.csv))\?v=[a-zA-Z0-9_-]+/g, '$1');

test('all pages and nested modules use the same current content-derived asset version', () => {
    const hash = crypto.createHash('sha256');
    for (const file of [...scripts, 'style.css', 'game_ranking.csv']) {
        hash.update(file + '\n' + withoutVersion(fs.readFileSync(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n'));
    }
    const expected = hash.digest('hex').slice(0, 12);
    for (const file of fs.readdirSync(root).filter(file => file.endsWith('.html'))) {
        const html = fs.readFileSync(path.join(root, file), 'utf8');
        assert(html.includes(`href="style.css?v=${expected}"`), file + ': CSS version is stale');
        assert(html.includes(`src="js/bootstrap.js?v=${expected}"`), file + ': loader version is stale');
    }
    for (const file of scripts) {
        const source = fs.readFileSync(path.join(root, file), 'utf8');
        for (const match of source.matchAll(/(["'])(\.{1,2}\/[^"']+\.js|game_ranking\.csv)(?:\?v=([^"']+))?\1/g)) {
            assert.equal(match[3], expected, file + ': unversioned or stale dependency ' + match[2]);
        }
    }
});
