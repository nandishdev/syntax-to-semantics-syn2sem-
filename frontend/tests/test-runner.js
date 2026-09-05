const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, execSync } = require('child_process');
const Parser = require('tree-sitter');
const { translate } = require('../compiler');
const { languages } = require('../compiler/parse');

const LANGS = ['python', 'javascript', 'java', 'c', 'cpp'];

const GCC = 'C:\\msys64\\ucrt64\\bin\\gcc.exe';
const GPP = 'C:\\msys64\\ucrt64\\bin\\g++.exe';

const sources = {
    loop: {
        python: 'n = 3\nfor i in range(n):\n    print(i)\n',
        javascript: 'let n = 3;\nfor (let i = 0; i < n; i++) {\n  console.log(i);\n}\n',
        java: 'public class Demo {\n  public static void main(String[] args) {\n    int n = 3;\n    for (int i = 0; i < n; i++) {\n      System.out.println(i);\n    }\n  }\n}\n',
        c: '#include <stdio.h>\nint main() {\n  int n = 3;\n  for (int i = 0; i < n; i++) {\n    printf("%d\\n", i);\n  }\n  return 0;\n}\n',
        cpp: '#include <iostream>\nint main() {\n  int n = 3;\n  for (int i = 0; i < n; i++) {\n    std::cout << i << std::endl;\n  }\n  return 0;\n}\n',
        expect: '0\n1\n2',
    },
    add: {
        python: 'def add(a, b):\n    return a + b\nprint(add(2, 3))\n',
        javascript: 'function add(a, b) {\n  return a + b;\n}\nconsole.log(add(2, 3));\n',
        java: 'public class Demo {\n  static int add(int a, int b) { return a + b; }\n  public static void main(String[] args) {\n    System.out.println(add(2, 3));\n  }\n}\n',
        c: '#include <stdio.h>\nint add(int a, int b) { return a + b; }\nint main() {\n  printf("%d\\n", add(2, 3));\n  return 0;\n}\n',
        cpp: '#include <iostream>\nint add(int a, int b) { return a + b; }\nint main() {\n  std::cout << add(2, 3) << std::endl;\n  return 0;\n}\n',
        expect: '5',
    },
    ifelse: {
        python: 'x = 10\nif x > 5:\n    print("big")\nelse:\n    print("small")\n',
        javascript: 'let x = 10;\nif (x > 5) {\n  console.log("big");\n} else {\n  console.log("small");\n}\n',
        java: 'public class Demo {\n  public static void main(String[] args) {\n    int x = 10;\n    if (x > 5) {\n      System.out.println("big");\n    } else {\n      System.out.println("small");\n    }\n  }\n}\n',
        c: '#include <stdio.h>\nint main() {\n  int x = 10;\n  if (x > 5) {\n    printf("big\\n");\n  } else {\n    printf("small\\n");\n  }\n  return 0;\n}\n',
        cpp: '#include <iostream>\nint main() {\n  int x = 10;\n  if (x > 5) {\n    std::cout << "big" << std::endl;\n  } else {\n    std::cout << "small" << std::endl;\n  }\n  return 0;\n}\n',
        expect: 'big',
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

function runCode(lang, code) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stos_t_'));
    try {
        if (lang === 'python') {
            const f = path.join(dir, 't.py');
            fs.writeFileSync(f, code);
            return execFileSync('python', [f], { encoding: 'utf8', timeout: 8000 });
        }
        if (lang === 'javascript') {
            const f = path.join(dir, 't.js');
            fs.writeFileSync(f, code);
            return execFileSync(process.execPath, [f], { encoding: 'utf8', timeout: 8000 });
        }
        if (lang === 'java') {
            const f = path.join(dir, 'Demo.java');
            fs.writeFileSync(f, code);
            execSync(`javac "${f}"`, { encoding: 'utf8', timeout: 15000 });
            return execSync(`java -cp "${dir}" Demo`, { encoding: 'utf8', timeout: 8000 });
        }
        if (lang === 'c' || lang === 'cpp') {
            const ext = lang === 'c' ? '.c' : '.cpp';
            const src = path.join(dir, 't' + ext);
            const exe = path.join(dir, 't.exe');
            fs.writeFileSync(src, code);
            const cc = lang === 'c' ? GCC : GPP;
            if (!fs.existsSync(cc)) throw new Error('compiler missing: ' + cc);
            const env = { ...process.env, PATH: 'C:\\msys64\\ucrt64\\bin;' + process.env.PATH };
            const std = lang === 'c' ? '-std=c11' : '-std=c++17';
            try {
                execFileSync(cc, [std, src, '-o', exe], { encoding: 'utf8', timeout: 15000, env });
            } catch (e) {
                throw new Error((e.stderr || e.stdout || e.message || '').toString().slice(0, 400));
            }
            return execFileSync(exe, [], { encoding: 'utf8', timeout: 8000, env });
        }
        throw new Error('unsupported ' + lang);
    } finally {
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) { /* ignore */ }
    }
}

function main() {
    const rows = [];
    for (const [name, spec] of Object.entries(sources)) {
        for (const src of LANGS) {
            for (const tgt of LANGS) {
                if (src === tgt) continue;
                const id = `${name}:${src}->${tgt}`;
                let translated = '';
                let syntaxOk = false;
                let semantic = 'fail';
                try {
                    translated = translate(spec[src], src, tgt);
                    syntaxOk = countParseErrors(translated, tgt) === 0;
                    const out = normalizeOut(runCode(tgt, translated));
                    semantic = out === spec.expect ? 'match' : `mismatch:${JSON.stringify(out)}`;
                } catch (e) {
                    semantic = 'error:' + String(e.message || e).split('\n')[0].slice(0, 80);
                }
                rows.push({ id, syntaxOk, semantic, ok: syntaxOk && semantic === 'match' });
            }
        }
    }

    const n = rows.length;
    const syn = rows.filter((r) => r.syntaxOk).length;
    const sem = rows.filter((r) => r.semantic === 'match').length;
    const full = rows.filter((r) => r.ok).length;
    console.log(JSON.stringify({
        n,
        syntaxPct: Math.round((syn / n) * 1000) / 10,
        semanticPct: Math.round((sem / n) * 1000) / 10,
        fullPct: Math.round((full / n) * 1000) / 10,
        failures: rows.filter((r) => !r.ok),
    }, null, 2));
    if (full !== n) process.exitCode = 1;
}

main();
