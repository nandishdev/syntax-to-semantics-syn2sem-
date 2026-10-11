const { assertNever } = require('./util');
const { programUsesInput } = require('./lower');

function emitProgram(prog, tgt) {
    const ctx = {
        tgt,
        env: new Map(),
        declared: new Set(),
        lines: [],
        fnReturn: new Map(),
        usesInput: programUsesInput(prog),
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
        if (!s) continue;
        if (s.kind === 'return') {
            if (s.value) return inferExprType(s.value, ctx);
            return 'void';
        }
        if (s.kind === 'if') {
            const tThen = inferReturnType(s.then, ctx);
            if (tThen && tThen !== 'void') return tThen;
            const tElse = inferReturnType(s.else, ctx);
            if (tElse && tElse !== 'void') return tElse;
        }
        if (s.kind === 'forRange' || s.kind === 'forEach' || s.kind === 'while') {
            const t = inferReturnType(s.body || s.then, ctx);
            if (t && t !== 'void') return t;
        }
        if (s.kind === 'block') {
            const t = inferReturnType(s.body, ctx);
            if (t && t !== 'void') return t;
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
            if (n === 'float' || n === 'double') return 'double';
            if (n === 'int') return 'int';
            if (n === 'str' || n === 'input') return 'string';
            const ret = ctx.fnReturn.get(n);
            return (ret && ret !== 'void') ? ret : 'int';
        }
        case 'input':
            return expr.type || 'string';
        case 'cast':
            return expr.type || inferExprType(expr.expr, ctx);
        case 'list':
            return 'list';
        case 'index': {
            if (expr.obj && expr.obj.kind === 'id') {
                const elemTy = ctx.env.get(expr.obj.name + '_elem');
                if (elemTy) return elemTy;
            }
            return 'int';
        }
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
            if (n === 'len' && expr.args && expr.args.length === 1) {
                const arg = emitExpr(expr.args[0], ctx);
                if (tgt === 'java') return `${arg}.length`;
                if (tgt === 'c') return `(sizeof(${arg})/sizeof(${arg}[0]))`;
                if (tgt === 'cpp') return `${arg}.size()`;
                if (tgt === 'javascript') return `${arg}.length`;
                if (tgt === 'python') return `len(${arg})`;
            }
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
        case 'input':
            return emitInputExpr(expr, ctx);
        case 'cast':
            return emitCastExpr(expr, ctx);
        default:
            return '0';
    }
}

function emitInputExpr(expr, ctx) {
    const tgt = ctx.tgt;
    const prompt = emitExpr(expr.prompt || { kind: 'str', value: '' }, ctx);
    const ty = expr.type || 'string';
    if (tgt === 'python') {
        const inner = `input(${prompt})`;
        if (ty === 'double') return `float(${inner})`;
        if (ty === 'int') return `int(${inner})`;
        if (ty === 'bool') return `bool(${inner})`;
        return inner;
    }
    if (tgt === 'javascript') {
        if (ty === 'double') return `parseFloat(input(${prompt}))`;
        if (ty === 'int') return `parseInt(input(${prompt}), 10)`;
        return `input(${prompt})`;
    }
    if (tgt === 'java') {
        if (ty === 'double') return `readDouble(${prompt})`;
        if (ty === 'int') return `readInt(${prompt})`;
        return `readLine(${prompt})`;
    }
    if (tgt === 'c') {
        if (ty === 'double') return `read_double(${prompt})`;
        if (ty === 'int') return `read_int(${prompt})`;
        return `read_line(${prompt})`;
    }
    if (tgt === 'cpp') {
        if (ty === 'double') return `read_double(${prompt})`;
        if (ty === 'int') return `read_int(${prompt})`;
        return `read_line(${prompt})`;
    }
    assertNever(tgt);
    return '0';
}

function emitCastExpr(expr, ctx) {
    const tgt = ctx.tgt;
    const inner = emitExpr(expr.expr, ctx);
    const ty = expr.type || 'int';
    if (tgt === 'python') {
        if (ty === 'double') return `float(${inner})`;
        if (ty === 'int') return `int(${inner})`;
        if (ty === 'string') return `str(${inner})`;
        return inner;
    }
    if (tgt === 'javascript') {
        if (ty === 'double') return `Number(${inner})`;
        if (ty === 'int') return `parseInt(${inner}, 10)`;
        if (ty === 'string') return `String(${inner})`;
        return inner;
    }
    if (tgt === 'java') {
        if (ty === 'double') return `Double.parseDouble(String.valueOf(${inner}))`;
        if (ty === 'int') return `((int) ${inner})`;
        if (ty === 'string') return `String.valueOf(${inner})`;
        return inner;
    }
    if (tgt === 'c') {
        if (ty === 'double') return `((double) ${inner})`;
        if (ty === 'int') return `((int) ${inner})`;
        return inner;
    }
    if (tgt === 'cpp') {
        if (ty === 'double') return `static_cast<double>(${inner})`;
        if (ty === 'int') return `static_cast<int>(${inner})`;
        if (ty === 'string') return `std::to_string(${inner})`;
        return inner;
    }
    return inner;
}

function emitPrint(args, d, ctx, endExpr) {
    const tgt = ctx.tgt;
    const posArgs = (args || []).filter((a) => a && a.kind !== 'kwarg');
    const parts = posArgs.map((a) => emitExpr(a, ctx));
    const endVal = endExpr ? emitExpr(endExpr, ctx) : null;
    const hasSpaceEnd = endVal === '" "' || endVal === "' '";

    if (tgt === 'python') {
        if (endVal) ctx.lines.push(indent(d) + `print(${parts.join(', ')}, end=${endVal})`);
        else ctx.lines.push(indent(d) + `print(${parts.join(', ')})`);
        return;
    }
    if (tgt === 'javascript') {
        if (hasSpaceEnd) ctx.lines.push(indent(d) + `process.stdout.write(${parts.join(' + " " + ')} + " ");`);
        else ctx.lines.push(indent(d) + `console.log(${parts.join(', ')});`);
        return;
    }
    if (tgt === 'java') {
        if (parts.length === 0) {
            ctx.lines.push(indent(d) + (hasSpaceEnd ? 'System.out.print(" ");' : 'System.out.println();'));
        } else if (hasSpaceEnd) {
            ctx.lines.push(indent(d) + `System.out.print(${parts.join(' + " " + ')} + " ");`);
        } else if (parts.length === 1) {
            ctx.lines.push(indent(d) + `System.out.println(${parts[0]});`);
        } else {
            ctx.lines.push(indent(d) + `System.out.println(${parts.join(' + " " + ')});`);
        }
        return;
    }
    if (tgt === 'cpp') {
        const chain = parts.length ? parts.join(' << " " << ') : '""';
        if (hasSpaceEnd) ctx.lines.push(indent(d) + `std::cout << ${chain} << " ";`);
        else ctx.lines.push(indent(d) + `std::cout << ${chain} << std::endl;`);
        return;
    }
    if (tgt === 'c') {
        if (parts.length === 0) {
            ctx.lines.push(indent(d) + (hasSpaceEnd ? 'printf(" ");' : 'printf("\\n");'));
            return;
        }
        for (let i = 0; i < posArgs.length; i++) {
            const ty = inferExprType(posArgs[i], ctx);
            const fmt = ty === 'string' ? '%s' : (ty === 'double' ? '%f' : '%d');
            const nl = (i === posArgs.length - 1 && !hasSpaceEnd) ? '\\n' : ' ';
            ctx.lines.push(indent(d) + `printf("${fmt}${nl}", ${parts[i]});`);
        }
        return;
    }
    assertNever(tgt);
}

function emitAssign(stmt, d, ctx) {
    const tgt = ctx.tgt;
    const ty = inferExprType(stmt.value, ctx);
    const targetStr = stmt.target ? emitExpr(stmt.target, ctx) : stmt.name;

    if (stmt.value && stmt.value.kind === 'list') {
        const elemTy = stmt.value.items && stmt.value.items.length
            ? inferExprType(stmt.value.items[0], ctx)
            : 'int';
        const idName = stmt.target ? (stmt.target.kind === 'id' ? stmt.target.name : null) : stmt.name;
        if (idName) {
            ctx.env.set(idName + '_elem', elemTy);
            ctx.env.set(idName, 'list');
        }
    } else {
        const idName = stmt.target ? (stmt.target.kind === 'id' ? stmt.target.name : null) : stmt.name;
        if (idName) ctx.env.set(idName, ty);
    }

    const val = emitExpr(stmt.value, ctx);

    if (tgt === 'python') {
        ctx.lines.push(indent(d) + `${targetStr} = ${val}`);
        return;
    }

    const isIdentifier = (stmt.target ? stmt.target.kind === 'id' : /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(targetStr));
    const isDecl = isIdentifier && !targetStr.includes('[') && !targetStr.includes('.') && !ctx.declared.has(targetStr);

    if (tgt === 'javascript') {
        if (isDecl) {
            ctx.declared.add(targetStr);
            ctx.lines.push(indent(d) + `let ${targetStr} = ${val};`);
        } else {
            ctx.lines.push(indent(d) + `${targetStr} = ${val};`);
        }
        return;
    }

    const safeTy = (ty === 'void' || !ty) ? 'int' : ty;
    const typed = tgt === 'java' ? javaType(safeTy) : tgt === 'cpp' ? cppType(safeTy) : cType(safeTy);
    if (isDecl) {
        ctx.declared.add(targetStr);
        ctx.lines.push(indent(d) + `${typed} ${targetStr} = ${val};`);
    } else {
        ctx.lines.push(indent(d) + `${targetStr} = ${val};`);
    }
}

function emitMultiAssign(stmt, d, ctx) {
    const tgt = ctx.tgt;
    const tStrs = (stmt.targets || []).map((t) => emitExpr(t, ctx));
    const vStrs = (stmt.values || []).map((v) => emitExpr(v, ctx));

    if (tgt === 'python') {
        ctx.lines.push(indent(d) + `${tStrs.join(', ')} = ${vStrs.join(', ')}`);
        return;
    }

    const semi = ';';

    if (tStrs.length === 2 && vStrs.length === 2) {
        const elemTy = inferExprType(stmt.targets[0], ctx) || inferExprType(stmt.values[0], ctx) || 'int';
        const typed = tgt === 'java' ? javaType(elemTy) : tgt === 'cpp' ? cppType(elemTy) : tgt === 'javascript' ? 'let' : cType(elemTy);

        let tempDecl = 'temp';
        if (!ctx.declared.has('temp')) {
            ctx.declared.add('temp');
            tempDecl = `${typed} temp`;
        }

        ctx.lines.push(indent(d) + `${tempDecl} = ${tStrs[0]}${semi}`);
        ctx.lines.push(indent(d) + `${tStrs[0]} = ${vStrs[0]}${semi}`);
        ctx.lines.push(indent(d) + `${tStrs[1]} = temp${semi}`);
        return;
    }

    const tempVars = [];
    for (let i = 0; i < tStrs.length; i++) {
        const elemTy = inferExprType(stmt.values[i] || stmt.targets[i], ctx) || 'int';
        const typed = tgt === 'java' ? javaType(elemTy) : tgt === 'cpp' ? cppType(elemTy) : tgt === 'javascript' ? 'let' : cType(elemTy);
        const tempName = `temp_${i}`;
        let tempDecl = tempName;
        if (!ctx.declared.has(tempName)) {
            ctx.declared.add(tempName);
            tempDecl = `${typed} ${tempName}`;
        }
        tempVars.push(tempName);
        ctx.lines.push(indent(d) + `${tempDecl} = ${vStrs[i] || '0'}${semi}`);
    }

    for (let i = 0; i < tStrs.length; i++) {
        ctx.lines.push(indent(d) + `${tStrs[i]} = ${tempVars[i]}${semi}`);
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
        case 'multiAssign':
            emitMultiAssign(stmt, d, ctx);
            break;
        case 'print':
            emitPrint(stmt.args, d, ctx, stmt.end);
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
            const saved = snapshotDecl(ctx);
            ctx.declared.add(v);
            ctx.env.set(v, 'int');
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
            ctx.declared.add(v);
            ctx.env.set(v, 'int');
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

function inferParamType(paramName, body) {
    let isList = false;
    function walk(s) {
        if (!s) return;
        if (s.kind === 'forRange' || s.kind === 'forEach' || s.kind === 'while' || s.kind === 'if' || s.kind === 'block') {
            (s.body || s.then || []).forEach(walk);
            if (s.else) s.else.forEach(walk);
        }
        if (s.kind === 'assign' || s.kind === 'multiAssign') {
            if (s.value) walkExpr(s.value);
            if (s.values) s.values.forEach(walkExpr);
            if (s.target) walkExpr(s.target);
            if (s.targets) s.targets.forEach(walkExpr);
        }
        if (s.kind === 'expr') walkExpr(s.expr);
        if (s.kind === 'print') (s.args || []).forEach(walkExpr);
        if (s.kind === 'return') walkExpr(s.value);
    }
    function walkExpr(e) {
        if (!e) return;
        if (e.kind === 'index' && e.obj && e.obj.kind === 'id' && e.obj.name === paramName) {
            isList = true;
        }
        if (e.kind === 'call' && e.callee && e.callee.kind === 'id' && e.callee.name === 'len') {
            if (e.args && e.args[0] && e.args[0].kind === 'id' && e.args[0].name === paramName) {
                isList = true;
            }
        }
        if (e.kind === 'bin') { walkExpr(e.left); walkExpr(e.right); }
        if (e.kind === 'un' || e.kind === 'cast') walkExpr(e.expr);
        if (e.kind === 'index') { walkExpr(e.obj); walkExpr(e.index); }
    }
    (body || []).forEach(walk);
    return isList ? 'list' : 'int';
}

function emitFnParams(fn, ctx) {
    const tgt = ctx.tgt;
    return fn.params.map((p) => {
        const pType = inferParamType(p, fn.body);
        if (pType === 'list') {
            ctx.env.set(p + '_elem', 'int');
            ctx.env.set(p, 'list');
        } else {
            ctx.env.set(p, pType);
        }
        ctx.declared.add(p);
        if (tgt === 'python' || tgt === 'javascript') return p;
        const typed = tgt === 'java' ? javaType(pType) : tgt === 'cpp' ? cppType(pType) : cType(pType);
        return `${typed} ${p}`;
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
    if (ctx.usesInput) {
        ctx.lines.push('const fs = require("fs");');
        ctx.lines.push('let __in = [];');
        ctx.lines.push('try { __in = fs.readFileSync(0, "utf8").split(/\\r?\\n/); } catch (e) { __in = ["85"]; }');
        ctx.lines.push('if (!__in.length || (__in.length === 1 && __in[0] === "")) __in = ["85"];');
        ctx.lines.push('let __ip = 0;');
        ctx.lines.push('function input(msg) {');
        ctx.lines.push('    if (msg) process.stdout.write(String(msg));');
        ctx.lines.push('    const line = __in[__ip++] ?? "85";');
        ctx.lines.push('    return line;');
        ctx.lines.push('}');
        ctx.lines.push('');
    }
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
    if (ctx.usesInput) ctx.lines.push('import java.util.Scanner;');
    ctx.lines.push('public class Demo {');
    if (ctx.usesInput) {
        ctx.lines.push('    static Scanner sc = new Scanner(System.in);');
        ctx.lines.push('    static String readLine(String p) { System.out.print(p); return sc.nextLine(); }');
        ctx.lines.push('    static int readInt(String p) { System.out.print(p); return sc.nextInt(); }');
        ctx.lines.push('    static double readDouble(String p) { System.out.print(p); return sc.nextDouble(); }');
        ctx.lines.push('');
    }
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
    if (ctx.usesInput) {
        ctx.lines.push('int read_int(const char* p) { int x = 0; printf("%s", p); scanf("%d", &x); return x; }');
        ctx.lines.push('double read_double(const char* p) { double x = 0; printf("%s", p); scanf("%lf", &x); return x; }');
        ctx.lines.push('');
    }
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
    if (ctx.usesInput) {
        ctx.lines.push('int read_int(const std::string& p) { int x = 0; std::cout << p; std::cin >> x; return x; }');
        ctx.lines.push('double read_double(const std::string& p) { double x = 0; std::cout << p; std::cin >> x; return x; }');
        ctx.lines.push('std::string read_line(const std::string& p) { std::string x; std::cout << p; std::getline(std::cin, x); return x; }');
        ctx.lines.push('');
    }
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
