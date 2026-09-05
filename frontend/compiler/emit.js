const { assertNever } = require('./util');

function emitProgram(prog, tgt) {
    const ctx = {
        tgt,
        env: new Map(),
        declared: new Set(),
        lines: [],
        fnReturn: new Map(),
    };
    for (const fn of prog.functions || []) {
        ctx.fnReturn.set(fn.name, inferReturnType(fn.body, ctx));
    }

    switch (tgt) {
        case 'python':
            emitPythonProgram(prog, ctx);
            break;
        case 'javascript':
            emitJsProgram(prog, ctx);
            break;
        case 'java':
            emitJavaProgram(prog, ctx);
            break;
        case 'c':
            emitCProgram(prog, ctx);
            break;
        case 'cpp':
            emitCppProgram(prog, ctx);
            break;
        default: {
            const _exhaustive = tgt;
            throw new Error(`Unsupported target language: ${_exhaustive}`);
        }
    }
    return ctx.lines.join('\n');
}

function inferReturnType(body, ctx) {
    for (const s of body || []) {
        if (s.kind === 'return' && s.value) return inferExprType(s.value, ctx);
        if (s.kind === 'if') {
            const t = inferReturnType(s.then, ctx) || inferReturnType(s.else, ctx);
            if (t) return t;
        }
        if (s.kind === 'forRange' || s.kind === 'forEach' || s.kind === 'while') {
            const t = inferReturnType(s.body || s.then, ctx);
            if (t) return t;
        }
    }
    return 'void';
}

function inferExprType(expr, ctx) {
    if (!expr) return 'int';
    switch (expr.kind) {
        case 'num':
            return String(expr.value).includes('.') ? 'double' : 'int';
        case 'str':
            return 'string';
        case 'bool':
            return 'bool';
        case 'id':
            return ctx.env.get(expr.name) || 'int';
        case 'bin': {
            if (['&&', '||', '==', '!=', '<', '>', '<=', '>='].includes(expr.op)) return 'bool';
            const l = inferExprType(expr.left, ctx);
            const r = inferExprType(expr.right, ctx);
            if (l === 'string' || r === 'string') return 'string';
            if (l === 'double' || r === 'double') return 'double';
            return 'int';
        }
        case 'un':
            return expr.op === '!' ? 'bool' : inferExprType(expr.expr, ctx);
        case 'call': {
            const n = expr.callee && expr.callee.kind === 'id' ? expr.callee.name : '';
            return ctx.fnReturn.get(n) || 'int';
        }
        case 'list':
            return 'list';
        case 'index':
            return 'int';
        default:
            return 'int';
    }
}

function javaType(t) {
    if (t === 'string') return 'String';
    if (t === 'bool') return 'boolean';
    if (t === 'double') return 'double';
    if (t === 'void') return 'void';
    if (t === 'list') return 'int[]';
    return 'int';
}

function cType(t) {
    if (t === 'string') return 'const char*';
    if (t === 'bool') return 'int';
    if (t === 'double') return 'double';
    if (t === 'void') return 'void';
    if (t === 'list') return 'int*';
    return 'int';
}

function cppType(t) {
    if (t === 'string') return 'std::string';
    if (t === 'bool') return 'bool';
    if (t === 'double') return 'double';
    if (t === 'void') return 'void';
    if (t === 'list') return 'std::vector<int>';
    return 'int';
}

function indent(d) {
    return '    '.repeat(d);
}

function emitOp(op, tgt) {
    if (tgt === 'python') {
        if (op === '&&') return 'and';
        if (op === '||') return 'or';
        if (op === '!') return 'not';
    }
    return op;
}

function emitExpr(expr, ctx) {
    if (!expr) return '0';
    const tgt = ctx.tgt;
    switch (expr.kind) {
        case 'num':
            return String(expr.value);
        case 'str':
            return JSON.stringify(expr.value);
        case 'bool':
            if (tgt === 'python') return expr.value ? 'True' : 'False';
            if (tgt === 'c') return expr.value ? '1' : '0';
            return expr.value ? 'true' : 'false';
        case 'id':
            if (expr.name === 'null') {
                if (tgt === 'python') return 'None';
                if (tgt === 'c' || tgt === 'cpp') return 'NULL';
                return 'null';
            }
            return expr.name;
        case 'bin': {
            const l = emitExpr(expr.left, ctx);
            const r = emitExpr(expr.right, ctx);
            return `(${l} ${emitOp(expr.op, tgt)} ${r})`;
        }
        case 'un': {
            const inner = emitExpr(expr.expr, ctx);
            if (tgt === 'python' && expr.op === '!') return `(not ${inner})`;
            return `(${emitOp(expr.op, tgt)}${inner})`;
        }
        case 'call': {
            const n = expr.callee && expr.callee.kind === 'id' ? expr.callee.name : emitExpr(expr.callee, ctx);
            return `${n}(${expr.args.map((a) => emitExpr(a, ctx)).join(', ')})`;
        }
        case 'list': {
            const items = expr.items.map((a) => emitExpr(a, ctx)).join(', ');
            if (tgt === 'python') return `[${items}]`;
            if (tgt === 'javascript') return `[${items}]`;
            if (tgt === 'java') return `new int[]{${items}}`;
            return `{${items}}`;
        }
        case 'index':
            return `${emitExpr(expr.obj, ctx)}[${emitExpr(expr.index, ctx)}]`;
        default:
            return '0';
    }
}

function emitPrint(args, d, ctx) {
    const tgt = ctx.tgt;
    const parts = (args || []).map((a) => emitExpr(a, ctx));
    if (tgt === 'python') {
        ctx.lines.push(indent(d) + `print(${parts.join(', ')})`);
        return;
    }
    if (tgt === 'javascript') {
        ctx.lines.push(indent(d) + `console.log(${parts.join(', ')});`);
        return;
    }
    if (tgt === 'java') {
        if (parts.length === 0) ctx.lines.push(indent(d) + 'System.out.println();');
        else if (parts.length === 1) ctx.lines.push(indent(d) + `System.out.println(${parts[0]});`);
        else ctx.lines.push(indent(d) + `System.out.println(${parts.join(' + " " + ')});`);
        return;
    }
    if (tgt === 'cpp') {
        const chain = parts.length ? parts.join(' << " " << ') : '""';
        ctx.lines.push(indent(d) + `std::cout << ${chain} << std::endl;`);
        return;
    }
    if (tgt === 'c') {
        if (parts.length === 0) {
            ctx.lines.push(indent(d) + 'printf("\\n");');
            return;
        }
        for (let i = 0; i < (args || []).length; i++) {
            const ty = inferExprType(args[i], ctx);
            const fmt = ty === 'string' ? '%s' : (ty === 'double' ? '%f' : '%d');
            const nl = i === args.length - 1 ? '\\n' : ' ';
            ctx.lines.push(indent(d) + `printf("${fmt}${nl}", ${parts[i]});`);
        }
        return;
    }
    assertNever(tgt);
}

function emitAssign(stmt, d, ctx) {
    const tgt = ctx.tgt;
    const ty = inferExprType(stmt.value, ctx);
    ctx.env.set(stmt.name, ty);
    const val = emitExpr(stmt.value, ctx);
    if (tgt === 'python') {
        ctx.lines.push(indent(d) + `${stmt.name} = ${val}`);
        return;
    }
    if (tgt === 'javascript') {
        if (ctx.declared.has(stmt.name)) ctx.lines.push(indent(d) + `${stmt.name} = ${val};`);
        else {
            ctx.declared.add(stmt.name);
            ctx.lines.push(indent(d) + `let ${stmt.name} = ${val};`);
        }
        return;
    }
    const typed = tgt === 'java' ? javaType(ty) : tgt === 'cpp' ? cppType(ty) : cType(ty);
    if (ctx.declared.has(stmt.name)) ctx.lines.push(indent(d) + `${stmt.name} = ${val};`);
    else {
        ctx.declared.add(stmt.name);
        ctx.lines.push(indent(d) + `${typed} ${stmt.name} = ${val};`);
    }
}

function emitStmt(stmt, d, ctx) {
    if (!stmt) return;
    const tgt = ctx.tgt;
    const braced = tgt !== 'python';
    switch (stmt.kind) {
        case 'assign':
            emitAssign(stmt, d, ctx);
            break;
        case 'print':
            emitPrint(stmt.args, d, ctx);
            break;
        case 'return':
            if (!stmt.value) ctx.lines.push(indent(d) + (tgt === 'python' ? 'return' : 'return;'));
            else ctx.lines.push(indent(d) + (tgt === 'python' ? `return ${emitExpr(stmt.value, ctx)}` : `return ${emitExpr(stmt.value, ctx)};`));
            break;
        case 'expr':
            ctx.lines.push(indent(d) + emitExpr(stmt.expr, ctx) + (tgt === 'python' ? '' : ';'));
            break;
        case 'if': {
            const cond = emitExpr(stmt.cond, ctx);
            if (tgt === 'python') ctx.lines.push(indent(d) + `if ${cond}:`);
            else ctx.lines.push(indent(d) + `if (${cond}) {`);
            const saved = snapshotDecl(ctx);
            for (const s of stmt.then || []) emitStmt(s, d + 1, ctx);
            restoreDecl(ctx, saved);
            if (stmt.else && stmt.else.length === 1 && stmt.else[0].kind === 'if') {
                if (tgt === 'python') {
                    const elif = stmt.else[0];
                    ctx.lines.push(indent(d) + `elif ${emitExpr(elif.cond, ctx)}:`);
                    const saved2 = snapshotDecl(ctx);
                    for (const s of elif.then || []) emitStmt(s, d + 1, ctx);
                    restoreDecl(ctx, saved2);
                    if (elif.else && elif.else.length) {
                        emitElseChain(elif.else, d, ctx);
                    }
                } else {
                    ctx.lines[ctx.lines.length - 1] = ctx.lines[ctx.lines.length - 1];
                    ctx.lines.push(indent(d) + '} else {');
                    emitStmt(stmt.else[0], d + 1, ctx);
                    ctx.lines.push(indent(d) + '}');
                }
            } else if (stmt.else && stmt.else.length) {
                if (tgt === 'python') ctx.lines.push(indent(d) + 'else:');
                else ctx.lines.push(indent(d) + '} else {');
                const saved2 = snapshotDecl(ctx);
                for (const s of stmt.else) emitStmt(s, d + 1, ctx);
                restoreDecl(ctx, saved2);
                if (braced) ctx.lines.push(indent(d) + '}');
            } else if (braced) {
                ctx.lines.push(indent(d) + '}');
            }
            break;
        }
        case 'forRange': {
            const v = stmt.var;
            const start = emitExpr(stmt.start, ctx);
            const end = emitExpr(stmt.end, ctx);
            if (tgt === 'python') ctx.lines.push(indent(d) + `for ${v} in range(${start === '0' ? end : `${start}, ${end}`}):`);
            else if (tgt === 'javascript') ctx.lines.push(indent(d) + `for (let ${v} = ${start}; ${v} < ${end}; ${v}++) {`);
            else ctx.lines.push(indent(d) + `for (int ${v} = ${start}; ${v} < ${end}; ${v}++) {`);
            ctx.declared.add(v);
            ctx.env.set(v, 'int');
            const saved = snapshotDecl(ctx);
            for (const s of stmt.body || []) emitStmt(s, d + 1, ctx);
            restoreDecl(ctx, saved);
            if (braced) ctx.lines.push(indent(d) + '}');
            break;
        }
        case 'forEach': {
            const v = stmt.var;
            const iter = emitExpr(stmt.iter, ctx);
            if (tgt === 'python') ctx.lines.push(indent(d) + `for ${v} in ${iter}:`);
            else if (tgt === 'javascript') ctx.lines.push(indent(d) + `for (const ${v} of ${iter}) {`);
            else if (tgt === 'java') ctx.lines.push(indent(d) + `for (int ${v} : ${iter}) {`);
            else ctx.lines.push(indent(d) + `for (int ${v}_i = 0; ; ${v}_i++) {`);
            const saved = snapshotDecl(ctx);
            for (const s of stmt.body || []) emitStmt(s, d + 1, ctx);
            restoreDecl(ctx, saved);
            if (braced) ctx.lines.push(indent(d) + '}');
            break;
        }
        case 'while': {
            const cond = emitExpr(stmt.cond, ctx);
            if (tgt === 'python') ctx.lines.push(indent(d) + `while ${cond}:`);
            else ctx.lines.push(indent(d) + `while (${cond}) {`);
            const saved = snapshotDecl(ctx);
            for (const s of stmt.then || stmt.body || []) emitStmt(s, d + 1, ctx);
            restoreDecl(ctx, saved);
            if (braced) ctx.lines.push(indent(d) + '}');
            break;
        }
        case 'block':
            for (const s of stmt.body || []) emitStmt(s, d, ctx);
            break;
        default:
            break;
    }
}

function emitElseChain(elseStmts, d, ctx) {
    if (elseStmts.length === 1 && elseStmts[0].kind === 'if') {
        const elif = elseStmts[0];
        ctx.lines.push(indent(d) + `elif ${emitExpr(elif.cond, ctx)}:`);
        for (const s of elif.then || []) emitStmt(s, d + 1, ctx);
        if (elif.else && elif.else.length) emitElseChain(elif.else, d, ctx);
        return;
    }
    ctx.lines.push(indent(d) + 'else:');
    for (const s of elseStmts) emitStmt(s, d + 1, ctx);
}

function snapshotDecl(ctx) {
    return new Set(ctx.declared);
}

function restoreDecl(ctx, saved) {
    ctx.declared = saved;
}

function withFreshDecl(ctx, fn) {
    const prevD = ctx.declared;
    const prevE = ctx.env;
    ctx.declared = new Set();
    ctx.env = new Map(prevE);
    fn();
    ctx.declared = prevD;
    ctx.env = prevE;
}

function emitFnParams(fn, ctx) {
    const tgt = ctx.tgt;
    return fn.params.map((p) => {
        ctx.env.set(p, 'int');
        ctx.declared.add(p);
        if (tgt === 'python' || tgt === 'javascript') return p;
        if (tgt === 'java') return `int ${p}`;
        if (tgt === 'cpp') return `int ${p}`;
        return `int ${p}`;
    }).join(', ');
}

function emitPythonProgram(prog, ctx) {
    for (const fn of prog.functions) {
        withFreshDecl(ctx, () => {
            ctx.lines.push(`def ${fn.name}(${emitFnParams(fn, ctx)}):`);
            if (!fn.body.length) ctx.lines.push('    pass');
            else for (const s of fn.body) emitStmt(s, 1, ctx);
        });
        ctx.lines.push('');
    }
    ctx.declared = new Set();
    for (const s of prog.statements) emitStmt(s, 0, ctx);
}

function emitJsProgram(prog, ctx) {
    for (const fn of prog.functions) {
        withFreshDecl(ctx, () => {
            ctx.lines.push(`function ${fn.name}(${emitFnParams(fn, ctx)}) {`);
            for (const s of fn.body) emitStmt(s, 1, ctx);
            ctx.lines.push('}');
        });
        ctx.lines.push('');
    }
    ctx.declared = new Set();
    for (const s of prog.statements) emitStmt(s, 0, ctx);
}

function emitJavaProgram(prog, ctx) {
    ctx.lines.push('public class Demo {');
    for (const fn of prog.functions) {
        withFreshDecl(ctx, () => {
            const ret = javaType(ctx.fnReturn.get(fn.name) || 'int');
            ctx.lines.push(`    public static ${ret} ${fn.name}(${emitFnParams(fn, ctx)}) {`);
            for (const s of fn.body) emitStmt(s, 2, ctx);
            ctx.lines.push('    }');
        });
        ctx.lines.push('');
    }
    ctx.declared = new Set();
    ctx.lines.push('    public static void main(String[] args) {');
    for (const s of prog.statements) emitStmt(s, 2, ctx);
    ctx.lines.push('    }');
    ctx.lines.push('}');
}

function emitCProgram(prog, ctx) {
    ctx.lines.push('#include <stdio.h>');
    ctx.lines.push('');
    for (const fn of prog.functions) {
        withFreshDecl(ctx, () => {
            const ret = cType(ctx.fnReturn.get(fn.name) || 'int');
            ctx.lines.push(`${ret} ${fn.name}(${emitFnParams(fn, ctx)}) {`);
            for (const s of fn.body) emitStmt(s, 1, ctx);
            ctx.lines.push('}');
        });
        ctx.lines.push('');
    }
    ctx.declared = new Set();
    ctx.lines.push('int main(void) {');
    for (const s of prog.statements) emitStmt(s, 1, ctx);
    ctx.lines.push('    return 0;');
    ctx.lines.push('}');
}

function emitCppProgram(prog, ctx) {
    ctx.lines.push('#include <iostream>');
    ctx.lines.push('#include <string>');
    ctx.lines.push('');
    for (const fn of prog.functions) {
        withFreshDecl(ctx, () => {
            const ret = cppType(ctx.fnReturn.get(fn.name) || 'int');
            ctx.lines.push(`${ret} ${fn.name}(${emitFnParams(fn, ctx)}) {`);
            for (const s of fn.body) emitStmt(s, 1, ctx);
            ctx.lines.push('}');
        });
        ctx.lines.push('');
    }
    ctx.declared = new Set();
    ctx.lines.push('int main() {');
    for (const s of prog.statements) emitStmt(s, 1, ctx);
    ctx.lines.push('    return 0;');
    ctx.lines.push('}');
}

module.exports = { emitProgram };
