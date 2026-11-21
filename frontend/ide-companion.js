const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { randomUUID } = require('crypto');

const PORT = Number(process.env.SYN2SEM_IDE_HELPER_PORT || 43127);
const MAX_BODY_BYTES = 1024 * 1024;
const EXTENSIONS = {
    python: '.py',
    java: '.java',
    c: '.c',
    cpp: '.cpp',
    javascript: '.js',
    text: '.txt'
};
const IDE_COMMANDS = {
    vscode: { commands: ['code'], label: 'VS Code' },
    antigravity: { commands: ['antigravity', 'antigravity-ide'], label: 'Antigravity IDE' },
    notepad: { commands: ['notepad'], label: 'Notepad' }
};
const ALLOWED_ORIGINS = new Set([
    'https://syn2sem.vercel.app',
    'https://syntax-to-semantics.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
]);

function sendJson(response, status, payload) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(payload));
}

function resolveCommand(commands, label) {
    const isWindows = process.platform === 'win32';
    const extensions = isWindows
        ? (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';')
        : [''];
    const directories = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
    const candidates = [];

    for (const command of commands) {
        for (const directory of directories) {
            for (const extension of extensions) {
                candidates.push(path.join(directory, isWindows ? `${command}${extension}` : command));
            }
        }
    }

    if (isWindows) {
        const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
        const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
        if (commands.includes('code')) {
            candidates.push(
                path.join(localAppData, 'Programs', 'Microsoft VS Code', 'bin', 'code.cmd'),
                path.join(programFiles, 'Microsoft VS Code', 'bin', 'code.cmd')
            );
        }
        if (commands.includes('antigravity') || commands.includes('antigravity-ide')) {
            candidates.push(
                path.join(localAppData, 'Programs', 'Antigravity IDE', '_', 'bin', 'antigravity-ide.cmd'),
                path.join(localAppData, 'Programs', 'Antigravity IDE', 'bin', 'antigravity-ide.cmd'),
                path.join(localAppData, 'Programs', 'Antigravity', 'bin', 'antigravity.cmd')
            );
        }
        if (commands.includes('notepad')) {
            candidates.push(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'notepad.exe'));
        }
    }

    for (const candidate of candidates) {
        try {
            fs.accessSync(candidate, isWindows ? fs.constants.F_OK : fs.constants.X_OK);
            return candidate;
        } catch {
            continue;
        }
    }

    throw new Error(`${label} command-line launcher was not found. Install the IDE or enable its launcher.`);
}

function launchIde(ide, filePath) {
    const { commands, label } = IDE_COMMANDS[ide];
    const commandPath = resolveCommand(commands, label);
    return new Promise((resolve, reject) => {
        const isWindows = process.platform === 'win32';
        const windowsCommand = `"${commandPath.replace(/"/g, '""')}" "${filePath.replace(/"/g, '""')}"`;
        const child = spawn(isWindows ? windowsCommand : commandPath, isWindows ? [] : [filePath], {
            detached: true,
            stdio: 'ignore',
            shell: isWindows,
            windowsHide: true
        });
        child.once('error', reject);
        child.once('spawn', () => {
            child.unref();
            resolve();
        });
    }).catch((error) => {
        if (error.code === 'ENOENT') {
            throw new Error(`Could not start ${label}. Check that its command-line launcher is installed.`);
        }
        throw error;
    });
}

function isLoopbackHost(hostHeader) {
    if (!hostHeader) return false;
    try {
        const hostname = new URL(`http://${hostHeader}`).hostname.toLowerCase();
        return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
    } catch {
        return false;
    }
}

function createCompanionServer(options = {}) {
    const allowedOrigins = options.allowedOrigins || ALLOWED_ORIGINS;
    const launch = options.launchIde || launchIde;
    const tempDir = options.tempDir || os.tmpdir();

    return http.createServer((request, response) => {
        if (!isLoopbackHost(request.headers.host)) {
            sendJson(response, 403, { message: 'The IDE helper only accepts local connections.' });
            return;
        }

        const origin = request.headers.origin;
        if (!origin || !allowedOrigins.has(origin)) {
            sendJson(response, 403, { message: 'This website is not allowed to use the IDE helper.' });
            return;
        }

        response.setHeader('Access-Control-Allow-Origin', origin);
        response.setHeader('Vary', 'Origin');
        response.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (request.headers['access-control-request-private-network'] === 'true') {
            response.setHeader('Access-Control-Allow-Private-Network', 'true');
        }

        if (request.method === 'OPTIONS') {
            response.writeHead(204);
            response.end();
            return;
        }
        if (request.url === '/health' && request.method === 'GET') {
            sendJson(response, 200, { ready: true });
            return;
        }
        if (request.url !== '/open' || request.method !== 'POST') {
            sendJson(response, 404, { message: 'Unknown IDE helper endpoint.' });
            return;
        }
        if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] || '')) {
            sendJson(response, 415, { message: 'Send IDE requests as JSON.' });
            return;
        }

        let body = '';
        let tooLarge = false;
        request.on('data', (chunk) => {
            if (tooLarge) return;
            body += chunk.toString('utf8');
            if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
                tooLarge = true;
                sendJson(response, 413, { message: 'The translated code is too large to open.' });
            }
        });
        request.on('end', async () => {
            if (tooLarge) return;
            let payload;
            try {
                payload = JSON.parse(body);
            } catch {
                sendJson(response, 400, { message: 'The IDE request contains invalid JSON.' });
                return;
            }

            if (!payload || !Object.prototype.hasOwnProperty.call(IDE_COMMANDS, payload.ide) ||
                !Object.prototype.hasOwnProperty.call(EXTENSIONS, payload.language) ||
                typeof payload.code !== 'string' || !payload.code.trim()) {
                sendJson(response, 400, { message: 'Choose a supported IDE and language, and translate some code first.' });
                return;
            }

            const filePath = path.join(tempDir, `syn2sem-${randomUUID()}${EXTENSIONS[payload.language]}`);
            try {
                await fs.promises.writeFile(filePath, payload.code, { flag: 'wx' });
                await launch(payload.ide, filePath);
                sendJson(response, 200, { success: true, message: `Opened in ${IDE_COMMANDS[payload.ide].label}.` });
            } catch (error) {
                await fs.promises.rm(filePath, { force: true }).catch(() => {});
                sendJson(response, 503, { message: error.message || 'The IDE could not be started.' });
            }
        });
    });
}

if (require.main === module) {
    const server = createCompanionServer();
    server.listen(PORT, '127.0.0.1', () => {
        console.log(`Syn2Sem IDE helper ready at http://127.0.0.1:${PORT}`);
        console.log('Keep this terminal running while opening code from the deployed website.');
    });
    server.on('error', (error) => {
        console.error('Could not start the Syn2Sem IDE helper:', error.message);
        process.exitCode = 1;
    });
}

module.exports = { createCompanionServer, ALLOWED_ORIGINS };
