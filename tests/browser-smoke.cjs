// Run with Node.js on Windows. Uses an isolated, temporary Edge profile.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'dorf-campaign-qa-'));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const browserPath = path.join(process.env['ProgramFiles(x86)'], 'Microsoft/Edge/Application/msedge.exe');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.csv': 'text/csv' };
const simulateStaleAssets = process.argv.includes('--stale-assets');
let blockApp = false;

const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    if (pathname === '/qa/block-app') { blockApp = url.searchParams.get('value') === '1'; response.writeHead(200).end('ok'); return; }
    if (blockApp && pathname === '/js/app.js') { response.writeHead(503).end('Temporarily unavailable'); return; }
    if (simulateStaleAssets && !url.searchParams.has('v')) {
        if (pathname === '/style.css') { response.writeHead(200, { 'Content-Type': 'text/css' }).end('.main-menu { display:grid; grid-template-columns:repeat(3,1fr); }'); return; }
        if (pathname.startsWith('/js/')) { response.writeHead(200, { 'Content-Type': 'text/javascript' }).end('throw new Error("Stale unversioned module was loaded");'); return; }
    }
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    fs.readFile(file, (error, data) => {
        if (error) { response.writeHead(404).end(); return; }
        response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
        response.end(data);
    });
});

async function main() {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const browser = spawn(browserPath, [
        '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
        '--remote-debugging-port=0', `--user-data-dir=${path.join(output, 'profile')}`, 'about:blank'
    ], { windowsHide: true, stdio: 'ignore' });
    let socket;
    try {
        const portFile = path.join(output, 'profile', 'DevToolsActivePort');
        for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await delay(100);
        const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
        const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then(response => response.json());
        socket = new WebSocket(target.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => { socket.addEventListener('open', resolve); socket.addEventListener('error', reject); });
        const pending = new Map();
        const errors = [];
        let sequence = 0;
        socket.addEventListener('message', event => {
            const message = JSON.parse(event.data);
            if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
            if (pending.has(message.id)) {
                const { resolve, reject } = pending.get(message.id);
                pending.delete(message.id);
                if (message.error) reject(new Error(JSON.stringify(message.error)));
                else resolve(message.result);
            }
        });
        function send(method, params = {}) {
            return new Promise((resolve, reject) => {
                const id = ++sequence;
                pending.set(id, { resolve, reject });
                socket.send(JSON.stringify({ id, method, params }));
            });
        }
        async function evaluate(expression) {
            const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
            if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
            return result.result.value;
        }
        async function wait(expression) {
            for (let i = 0; i < 100; i++) {
                if (await evaluate(expression)) return;
                await delay(50);
            }
            throw new Error('Timed out: ' + expression);
        }
        async function visit(page, ready) {
            await send('Page.navigate', { url: base + '/' + page });
            await wait(ready);
        }
        await send('Runtime.enable');
        await send('Page.enable');
        await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
        await visit('campaign-tracker.html', "document.getElementById('campaign-content')?.hidden === false");
        assert.equal(await evaluate("document.getElementById('movement-available').textContent"), '0');
        assert.equal(await evaluate("document.querySelector('.campaign-choice').disabled"), true);
        await evaluate(`localStorage.setItem('dorfExplorerGames', JSON.stringify([{id:'demo',savedAt:'2026-10-23T12:00:00Z',total:300,scores:{forest_tasks:100,harvest_points:40,flag_forest:30,long_rail:90,heart_points:30,hill_points:10,circus:0}}])); location.reload();`);
        await wait("document.getElementById('movement-available')?.textContent === '12'");
        // Activate an actual SVG circle, then use the accessible path buttons.
        await evaluate(`document.querySelector('[data-step="start-box1:1"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));`);
        for (let i = 0; i < 6; i++) await evaluate("document.querySelector('.campaign-choice').click()");
        assert.equal(await evaluate("document.getElementById('movement-spent').textContent"), '7');
        assert.equal(await evaluate("document.querySelectorAll('.campaign-choice').length"), 2);
        await evaluate("document.querySelectorAll('.campaign-choice')[0].click()");
        await evaluate("document.querySelectorAll('.campaign-choice')[1].click()");
        assert.equal(await evaluate("document.getElementById('movement-available').textContent"), '3');
        await evaluate('location.reload()');
        await wait("document.getElementById('movement-spent')?.textContent === '9'");
        await evaluate("document.getElementById('undo-movement').click()");
        assert.equal(await evaluate("document.getElementById('movement-available').textContent"), '4');
        console.log('PASS: real-browser map clicks, branching, balance, reload and undo.');

        const dimensions = await send('Page.getLayoutMetrics');
        const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 1440, height: dimensions.cssContentSize.height, scale: 1 } });
        fs.writeFileSync(path.join(output, 'campaign-desktop.png'), Buffer.from(shot.data, 'base64'));
        await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
        assert(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Mobile page overflows');
        assert.equal(await evaluate("getComputedStyle(document.querySelector('.main-menu')).gridTemplateColumns.split(' ').length"), 2);
        const mobile = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(output, 'campaign-mobile.png'), Buffer.from(mobile.data, 'base64'));
        console.log('PASS: mobile layout fits 390px; screenshots saved.');

        await visit('campaign.html', "document.querySelector('.edit-game-link') && document.getElementById('history-movement-available').textContent === '4'");
        assert(await evaluate("document.querySelector('.edit-game-link').getAttribute('href') === 'scores.html?edit=demo'"));
        await visit('scores.html?edit=demo', "document.getElementById('total_points')?.textContent === '300'");
        await evaluate("document.getElementById('forest-task-score').value=10;document.getElementById('forest-tasks-form').requestSubmit();document.getElementById('save-game').click()");
        await wait("location.pathname.endsWith('campaign.html') && document.querySelector('.saved-game-total')?.textContent.includes('310')");
        assert.equal(await evaluate("JSON.parse(localStorage.getItem('dorfExplorerGames')).length"), 1);
        await visit('campaign-tracker.html', "document.getElementById('movement-available')?.textContent === '5'");
        console.log('PASS: score editing updates ranking and movement points without duplicating the saved game.');

        await evaluate(`const games=JSON.parse(localStorage.getItem('dorfExplorerGames'));games[0].total=10;localStorage.setItem('dorfExplorerGames',JSON.stringify(games));location.reload();`);
        await wait("document.getElementById('campaign-content')?.hidden === false && document.getElementById('movement-earned').textContent === '1'");
        assert.equal(await evaluate("document.getElementById('movement-spent').textContent"), '8');
        assert.equal(await evaluate("document.getElementById('movement-available').textContent"), '0');
        assert.equal(await evaluate("document.getElementById('campaign-notice').hidden"), false);
        assert.equal(await evaluate("document.querySelectorAll('.campaign-choice:not(:disabled)').length"), 0);
        console.log('PASS: lowering a score preserves campaign progress and prevents further spending.');

        await visit('scores.html', "document.getElementById('total_points')?.textContent === '0' && document.querySelector('.next-card-button')");
        for (const invalid of ['-2', '2.5']) {
            await evaluate(`document.getElementById('long_rail').value=${JSON.stringify(invalid)};document.getElementById('long_rail').dispatchEvent(new Event('input'));document.getElementById('save-game').click()`);
            assert.equal(await evaluate("document.getElementById('score-validation-message').hidden"), false);
            assert.equal(await evaluate("document.getElementById('total_points').textContent"), '0');
            assert.equal(await evaluate("location.pathname.endsWith('scores.html')"), true);
            assert.equal(await evaluate("JSON.parse(localStorage.getItem('dorfExplorerGames')).length"), 1);
        }
        await evaluate("document.getElementById('long_rail').value='';document.getElementById('long_rail').focus()");
        await send('Input.insertText', { text: '-' });
        assert.equal(await evaluate("document.getElementById('long_rail').validity.badInput"), true);
        await evaluate("document.getElementById('save-game').click()");
        assert.equal(await evaluate("document.getElementById('score-validation-message').hidden"), false);
        await evaluate("document.getElementById('long_rail').value='';document.getElementById('long_rail').dispatchEvent(new Event('input'))");
        console.log('PASS: invalid ordinary scores and malformed browser input are excluded from totals and block saving.');
        await evaluate("document.getElementById('forest-task-score').value=400;document.getElementById('forest-tasks-form').requestSubmit();document.getElementById('save-game').click()");
        await wait("location.pathname.endsWith('campaign-tracker.html') && document.getElementById('movement-available')?.textContent === '8'");
        assert.equal(await evaluate("JSON.parse(localStorage.getItem('dorfExplorerGames')).length"), 2);
        await visit('campaign.html', "document.querySelectorAll('.delete-game-button').length === 2");
        await evaluate("window.confirm=()=>true;document.querySelectorAll('.delete-game-button')[0].click()");
        await wait("document.getElementById('history-movement-available').textContent === '0'");
        assert.equal(await evaluate("JSON.parse(localStorage.getItem('dorfExplorerGames')).length"), 1);
        await evaluate("document.querySelector('.delete-game-button').click()");
        assert.equal(await evaluate("JSON.parse(localStorage.getItem('dorfExplorerGames')).length"), 0);
        await visit('campaign-tracker.html', "document.getElementById('movement-earned')?.textContent === '0' && !document.getElementById('campaign-content').hidden");
        for (let index = 0; index < 8; index++) await evaluate("document.getElementById('undo-movement').click()");
        assert.equal(await evaluate("document.getElementById('movement-spent').textContent"), '0');
        assert.equal(await evaluate("document.getElementById('campaign-unlocked-count').textContent"), '0');
        console.log('PASS: new saves open Campaign with earned points; deleting multiple games refreshes balance and never restores deleted records.');

        await visit('scores.html', "document.getElementById('total_points')?.textContent === '0' && document.querySelector('.next-card-button')");
        await evaluate("document.getElementById('forest-task-score').value=400;document.getElementById('forest-tasks-form').requestSubmit();document.getElementById('save-game').click()");
        await wait("location.pathname.endsWith('campaign-tracker.html') && document.getElementById('movement-available')?.textContent === '15'");
        await evaluate("document.getElementById('campaign-players').value='Alex and Jo';document.getElementById('campaign-players').dispatchEvent(new Event('change'));document.querySelector('.campaign-choice').click();document.querySelector('.campaign-choice').click()");
        assert.equal(await evaluate("document.querySelectorAll('#campaign-unlocks time').length"), 1);
        await evaluate(`HTMLAnchorElement.prototype.click=function(){window.downloadName=this.download;window.downloadFile=fetch(this.href).then(response=>response.json());};document.getElementById('complete-campaign').click();document.getElementById('export-campaign').click()`);
        const exported = await evaluate('window.downloadFile');
        assert.equal(exported.campaign.playerNames, 'Alex and Jo');
        assert.equal(exported.campaign.totalGames, 1);
        assert.equal(exported.campaign.totalScore, 400);
        assert.equal(exported.campaign.highestScoringGame.score, 400);
        assert(exported.campaign.startedAt);
        assert(exported.campaign.completedAt);
        assert(exported.campaign.achievements.find(item => item.id === 'box1').unlockedAt);
        assert((await evaluate('window.downloadName')).endsWith('.json'));
        await evaluate("window.confirm=()=>true;document.getElementById('new-campaign').click()");
        assert.equal(await evaluate("document.getElementById('campaign-game-count').textContent"), '0');
        assert.equal(await evaluate("document.getElementById('movement-available').textContent"), '0');
        assert.equal(await evaluate("document.getElementById('campaign-players').value"), '');
        assert.equal(await evaluate("JSON.parse(localStorage.getItem('dorfExplorerCampaignArchives')).length"), 1);
        await evaluate("document.querySelector('#campaign-archives button').click()");
        const archived = await evaluate('window.downloadFile');
        assert.equal(archived.campaign.totalScore, 400);
        assert.equal(archived.campaign.playerNames, 'Alex and Jo');
        assert.equal(archived.campaign.completedAt, exported.campaign.completedAt);
        console.log('PASS: unlock dates, completed campaign export, starting fresh, and archived campaign download preserve all requested data.');

        await visit('scores.html', "document.getElementById('total_points')?.textContent === '0' && document.querySelector('.next-card-button')");
        await evaluate("document.getElementById('forest-task-score').value=25;document.getElementById('forest-tasks-form').requestSubmit()");
        await evaluate(`window.originalStorageWrite=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='dorfExplorerGames')throw new DOMException('Quota exceeded','QuotaExceededError');return window.originalStorageWrite.call(this,key,value);};document.getElementById('save-game').click()`);
        assert((await evaluate("document.getElementById('score-validation-message').textContent")).includes('storage is full'));
        assert.equal(await evaluate("JSON.parse(localStorage.getItem('dorfExplorerGames')).length"), 0);
        assert.equal(await evaluate("document.getElementById('total_points').textContent"), '25');
        await evaluate("Storage.prototype.setItem=window.originalStorageWrite;document.getElementById('save-game').click()");
        await wait("location.pathname.endsWith('campaign-tracker.html') && document.getElementById('movement-earned')?.textContent === '1'");
        console.log('PASS: storage-full errors preserve the scorecard and a retry saves successfully.');

        await visit('scores.html', "document.getElementById('total_points')?.textContent === '0' && document.querySelector('.next-card-button')");
        await evaluate("document.getElementById('forest-task-score').value=30;document.getElementById('forest-tasks-form').requestSubmit()");
        await evaluate(`(async()=>{const version=new URL(document.querySelector('script[src*="bootstrap.js"]').src).search;const files=await import('/js/campaign-files.js'+version);const rankings=await import('/js/rankings.js'+version);files.startNewCampaign(localStorage,await rankings.loadGameRankings());document.getElementById('save-game').click();})()`);
        assert.equal(await evaluate("JSON.parse(localStorage.getItem('dorfExplorerGames')).length"), 0);
        assert.equal(await evaluate("document.getElementById('total_points').textContent"), '30');
        assert((await evaluate("document.getElementById('score-validation-message').textContent")).includes('campaign has changed'));
        console.log('PASS: a stale scorecard cannot save into a different campaign and retains its entered scores.');

        await visit('campaign-tracker.html', "document.getElementById('campaign-content')?.hidden === false");
        const goodArchives = await evaluate("localStorage.getItem('dorfExplorerCampaignArchives')");
        await evaluate("localStorage.setItem('dorfExplorerCampaignArchives','{broken-archive');location.reload()");
        await wait("document.getElementById('campaign-content')?.hidden === false && document.getElementById('archive-status').textContent.includes('kept unchanged')");
        assert.equal(await evaluate("document.getElementById('movement-earned').textContent"), '0');
        assert.equal(await evaluate("localStorage.getItem('dorfExplorerCampaignArchives')"), '{broken-archive');
        await evaluate(`localStorage.setItem('dorfExplorerCampaignArchives',${JSON.stringify(goodArchives)});location.reload()`);
        await wait("document.getElementById('campaign-content')?.hidden === false && document.getElementById('archive-status').textContent === ''");
        console.log('PASS: a damaged archive does not block the active tracker or overwrite the archive.');

        await evaluate(`window.confirm=()=>true;const transfer=new DataTransfer();transfer.items.add(new File([${JSON.stringify(JSON.stringify(exported))}],'campaign.json',{type:'application/json'}));document.getElementById('import-campaign').files=transfer.files;document.getElementById('import-campaign').dispatchEvent(new Event('change'))`);
        await wait("document.getElementById('campaign-status').textContent.includes('Campaign restored')");
        assert.equal(await evaluate("document.getElementById('campaign-game-count').textContent"), '1');
        assert.equal(await evaluate("document.getElementById('campaign-players').value"), 'Alex and Jo');
        assert.equal(await evaluate("document.getElementById('campaign-players').disabled"), true);
        assert.equal(await evaluate("document.getElementById('undo-movement').disabled"), true);
        assert.equal(await evaluate("document.querySelectorAll('.campaign-choice:not(:disabled)').length"), 0);
        assert.equal(await evaluate("JSON.parse(localStorage.getItem('dorfExplorerCampaign')).completedAt"), exported.campaign.completedAt);
        await visit('scores.html?edit=' + encodeURIComponent(exported.campaign.games[0].id), "document.getElementById('save-game')?.disabled === true && document.querySelector('.next-card-button')");
        assert((await evaluate("document.getElementById('editing-status').textContent")).includes('campaign is complete'));
        await visit('campaign.html', "document.querySelector('.delete-game-button')");
        await evaluate("window.confirm=()=>true;document.querySelector('.delete-game-button').click()");
        assert.equal(await evaluate("JSON.parse(localStorage.getItem('dorfExplorerGames')).length"), 1);
        assert((await evaluate("document.getElementById('history-movement-note').textContent")).includes('campaign is complete'));
        await visit('campaign-tracker.html', "document.getElementById('campaign-content')?.hidden === false");
        await evaluate("document.getElementById('complete-campaign').click()");
        assert.equal(await evaluate("document.getElementById('campaign-completed').textContent"), 'In progress');
        assert.equal(await evaluate("document.getElementById('campaign-players').disabled"), false);
        console.log('PASS: uploaded campaign files restore dates and games; completed campaigns reject changes until reopened.');

        await visit('scores.html', "document.querySelector('.next-card-button')");
        await evaluate("localStorage.setItem('dorfExplorerGames','{broken-json');location.reload()");
        await wait("document.getElementById('save-game')?.disabled === true && document.querySelector('.next-card-button')");
        assert.equal(await evaluate("localStorage.getItem('dorfExplorerGames')"), '{broken-json');
        assert((await evaluate("document.getElementById('editing-status').textContent")).includes('kept unchanged'));
        console.log('PASS: damaged saved data is reported and preserved instead of being silently replaced.');

        await evaluate("localStorage.setItem('dorfExplorerGames','[]')");
        const campaignBeforeLoadFailure = await evaluate("localStorage.getItem('dorfExplorerCampaign')");
        await send('Network.enable');
        await send('Network.setCacheDisabled', { cacheDisabled: true });
        await fetch(base + '/qa/block-app?value=1');
        await visit('campaign-tracker.html', "document.getElementById('app-load-status')");
        assert((await evaluate("document.getElementById('campaign-loading').textContent")).includes('could not finish loading'));
        assert.equal(await evaluate("localStorage.getItem('dorfExplorerCampaign')"), campaignBeforeLoadFailure);
        await fetch(base + '/qa/block-app?value=0');
        await evaluate("document.querySelector('#app-load-status button').click()");
        await wait("document.getElementById('campaign-content')?.hidden === false");
        assert.equal(await evaluate("localStorage.getItem('dorfExplorerCampaign')"), campaignBeforeLoadFailure);
        console.log('PASS: failed module loading displays a reload action; retry works without clearing saved data.');
        if (simulateStaleAssets) console.log('PASS: the app works with deliberately stale unversioned JavaScript and CSS.');
        assert.deepEqual(errors, [], 'Browser JavaScript errors');
        console.log('No browser JavaScript exceptions. Screenshots: ' + output);
        await send('Browser.close').catch(() => {});
    } finally {
        socket?.close();
        browser.kill();
        server.close();
    }
}
main().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
