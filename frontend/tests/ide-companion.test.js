const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { createCompanionServer } = require('../ide-companion');

function request(port, { method = 'GET', url = '/health', origin = 'https://syn2sem.vercel.app', body, headers = {} } = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            host: '127.0.0.1',
            port,
            method,
            path: url,
            headers: {
                Host: `127.0.0.1:${port}`,
                Origin: origin,
                ...headers
            }
        }, (response) => {
            let responseBody = '';
            response.setEncoding('utf8');
            response.on('data', chunk => { responseBody += chunk; });
            response.on('end', () => resolve({
                status: response.statusCode,
                headers: response.headers,
                body: responseBody ? JSON.parse(responseBody) : null
            }));
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function main() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'syn2sem-helper-test-'));
    const launched = [];
    const server = createCompanionServer({
        tempDir,
        launchIde: async (ide, filePath) => launched.push({ ide, filePath }),
    });

    try {
        await new Promise((resolve, reject) => {
            server.once('error', reject);
            server.listen(0, '127.0.0.1', resolve);
        });
        const port = server.address().port;

        const health = await request(port);
        assert.strictEqual(health.status, 200);
        assert.deepStrictEqual(health.body, { ready: true });

        const denied = await request(port, { origin: 'https://example.invalid' });
        assert.strictEqual(denied.status, 403);

        const invalid = await request(port, {
            method: 'POST',
            url: '/open',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ide: 'unknown', language: 'python', code: 'print(1)' })
        });
        assert.strictEqual(invalid.status, 400);
        assert.strictEqual(launched.length, 0);

        const opened = await request(port, {
            method: 'POST',
            url: '/open',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ide: 'vscode', language: 'python', code: 'print("hello")' })
        });
        assert.strictEqual(opened.status, 200);
        assert.strictEqual(launched.length, 1);
        assert.strictEqual(launched[0].ide, 'vscode');
        assert.strictEqual(path.extname(launched[0].filePath), '.py');
        assert.strictEqual(fs.readFileSync(launched[0].filePath, 'utf8'), 'print("hello")');

        const openedInAntigravity = await request(port, {
            method: 'POST',
            url: '/open',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ide: 'antigravity', language: 'cpp', code: 'int main() { return 0; }' })
        });
        assert.strictEqual(openedInAntigravity.status, 200);
        assert.strictEqual(launched.length, 2);
        assert.strictEqual(launched[1].ide, 'antigravity');
        assert.strictEqual(path.extname(launched[1].filePath), '.cpp');
        assert.strictEqual(fs.readFileSync(launched[1].filePath, 'utf8'), 'int main() { return 0; }');

        console.log('IDE companion tests passed.');
    } finally {
        await new Promise(resolve => server.close(resolve));
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
