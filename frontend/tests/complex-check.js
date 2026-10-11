const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, execSync } = require('child_process');
const Parser = require('tree-sitter');
const { translate } = require('../compiler');
const { languages } = require('../compiler/parse');

const LANGS = ['javascript', 'java', 'c', 'cpp'];
const GCC = 'C:\\msys64\\ucrt64\\bin\\gcc.exe';
const GPP = 'C:\\msys64\\ucrt64\\bin\\g++.exe';

const programs = {
    nestedLoops: {
        python: `n = 3
total = 0
for i in range(n):
    for j in range(n):
        total = total + i + j
print(total)
`,
        expect: '18',
    },
    gradeIf: {
        python: `score = 82
if score >= 90:
    print("A")
elif score >= 75:
    print("B")
elif score >= 50:
    print("C")
else:
    print("F")
`,
        expect: 'B',
    },
    factorial: {
        python: `def fact(n):
    if n <= 1:
        return 1
    return n * fact(n - 1)
print(fact(5))
`,
        expect: '120',
    },
    max3: {
        python: `def biggest(a, b, c):
    if a >= b:
        if a >= c:
            return a
        return c
    if b >= c:
        return b
    return c
print(biggest(4, 9, 2))
`,
        expect: '9',
    },
    whileSum: {
        python: `n = 5
s = 0
i = 1
while i <= n:
    s = s + i
    i = i + 1
print(s)
`,
        expect: '15',
    },
    reuseLoopVar: {
        python: `n = 3
for i in range(n):
    print(i)
i = 1
s = 0
while i <= 3:
    s = s + i
    i = i + 1
print(s)
`,
        expect: '0\n1\n2\n6',
    },
    inputGrade: {
        python: `marks = float(input("Enter marks: "))
if marks >= 40:
    print("pass")
else:
    print("fail")
`,
        expect: 'pass',
        stdin: '85\n',
        compileOnlyOnFailRun: true,
    },
};

function countParseErrors(code, lang) {
    const parser = new Parser();
    parser.setLanguage(languages[lang]);
    const tree = parser.parse(code);
    let n = 0;
    function walk(node) {
        if (!node) return;
        if (node.isMissing || node.type === 'ERROR') n++;
        for (let i = 0; i < node.childCount; i++) walk(node.child(i));
    }
    walk(tree.rootNode);
    return n;
}

function normalizeOut(s) {
    return String(s || '').replace(/\r\n/g, '\n').trim();
}

function runCode(lang, code, stdin) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stos_cx_'));
    try {
        if (lang === 'python') {
            const f = path.join(dir, 't.py');
            fs.writeFileSync(f, code);
            return execFileSync('python', [f], { encoding: 'utf8', timeout: 8000, input: stdin || undefined });
        }
        if (lang === 'javascript') {
            const f = path.join(dir, 't.js');
            fs.writeFileSync(f, code);
            return execFileSync(process.execPath, [f], { encoding: 'utf8', timeout: 8000, input: stdin || undefined });
        }
        if (lang === 'java') {
            const f = path.join(dir, 'Demo.java');
            fs.writeFileSync(f, code);
            execSync(`javac "${f}"`, { encoding: 'utf8', timeout: 15000 });
            return execSync(`java -cp "${dir}" Demo`, {
                encoding: 'utf8',
                timeout: 8000,
                input: stdin || undefined,
            });
        }
        if (lang === 'c' || lang === 'cpp') {
            const ext = lang === 'c' ? '.c' : '.cpp';
            const src = path.join(dir, 't' + ext);
            const exe = path.join(dir, 't.exe');
            fs.writeFileSync(src, code);
            const cc = lang === 'c' ? GCC : GPP;
            const env = { ...process.env, PATH: 'C:\\msys64\\ucrt64\\bin;' + process.env.PATH };
            const std = lang === 'c' ? '-std=c11' : '-std=c++17';
            execFileSync(cc, [std, src, '-o', exe], { encoding: 'utf8', timeout: 15000, env });
            return execFileSync(exe, [], { encoding: 'utf8', timeout: 8000, env, input: stdin || undefined });
        }
        throw new Error('unsupported ' + lang);
    } finally {
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) { /* ignore */ }
    }
}

function snippet(code) {
    return String(code).split('\n').slice(0, 6).join(' | ').slice(0, 180);
}

function main() {
    const rows = [];
    for (const [name, spec] of Object.entries(programs)) {
        for (const tgt of LANGS) {
            const id = `${name}:python->${tgt}`;
            try {
                const translated = translate(spec.python, 'python', tgt);
                const syntaxErrors = countParseErrors(translated, tgt);
                const syntaxOk = syntaxErrors === 0;
                let semantic = 'not-run';
                try {
                    const out = normalizeOut(runCode(tgt, translated, spec.stdin));
                    const expect = spec.expect;
                    semantic = out === expect || out.endsWith(expect) || out.includes(expect)
                        ? 'match'
                        : `mismatch:${JSON.stringify(out)}`;
                } catch (e) {
                    semantic = 'run-fail:' + String(e.stderr || e.message || e).split('\n')[0].slice(0, 100);
                }
                rows.push({
                    id,
                    syntaxOk,
                    syntaxErrors,
                    semantic,
                    ok: syntaxOk && semantic === 'match',
                    preview: snippet(translated),
                });
            } catch (e) {
                rows.push({
                    id,
                    syntaxOk: false,
                    syntaxErrors: -1,
                    semantic: 'translate-fail:' + String(e.message || e).slice(0, 80),
                    ok: false,
                    preview: '',
                });
            }
        }
    }
    const n = rows.length;
    const syn = rows.filter((r) => r.syntaxOk).length;
    const sem = rows.filter((r) => r.semantic === 'match').length;
    console.log(JSON.stringify({
        n,
        syntaxPct: Math.round((syn / n) * 1000) / 10,
        semanticPct: Math.round((sem / n) * 1000) / 10,
        failures: rows.filter((r) => !r.ok),
        passes: rows.filter((r) => r.ok).map((r) => r.id),
    }, null, 2));
}

main();
