function calleeName(expr) {
    if (!expr) return '';
    if (expr.kind === 'id') return expr.name;
    return '';
}

function lowerProgram(prog) {
    return {
        functions: (prog.functions || []).map((fn) => ({
            ...fn,
            body: lowerStmts(fn.body),
        })),
        statements: lowerStmts(prog.statements || []),
    };
}

function lowerStmts(stmts) {
    return (stmts || []).map(lowerStmt).filter(Boolean);
}

function lowerStmt(stmt) {
    if (!stmt) return stmt;
    switch (stmt.kind) {
        case 'assign':
            return { ...stmt, target: stmt.target ? lowerExpr(stmt.target) : null, value: lowerExpr(stmt.value) };
        case 'multiAssign':
            return {
                ...stmt,
                targets: (stmt.targets || []).map(lowerExpr),
                values: (stmt.values || []).map(lowerExpr),
            };
        case 'print':
            return { ...stmt, args: (stmt.args || []).map(lowerExpr), end: stmt.end ? lowerExpr(stmt.end) : null };
        case 'return':
            return { ...stmt, value: stmt.value ? lowerExpr(stmt.value) : null };
        case 'expr':
            return { ...stmt, expr: lowerExpr(stmt.expr) };
        case 'if':
            return {
                ...stmt,
                cond: lowerExpr(stmt.cond),
                then: lowerStmts(stmt.then),
                else: lowerStmts(stmt.else),
            };
        case 'forRange':
            return {
                ...stmt,
                start: lowerExpr(stmt.start),
                end: lowerExpr(stmt.end),
                body: lowerStmts(stmt.body),
            };
        case 'forEach':
            return { ...stmt, iter: lowerExpr(stmt.iter), body: lowerStmts(stmt.body) };
        case 'while':
            return {
                ...stmt,
                cond: lowerExpr(stmt.cond),
                then: lowerStmts(stmt.then || stmt.body),
            };
        case 'block':
            return { ...stmt, body: lowerStmts(stmt.body) };
        default:
            return stmt;
    }
}

function lowerExpr(expr) {
    if (!expr) return expr;
    const asIn = tryInput(expr);
    if (asIn) return asIn;

    switch (expr.kind) {
        case 'bin':
            return { ...expr, left: lowerExpr(expr.left), right: lowerExpr(expr.right) };
        case 'un':
            return { ...expr, expr: lowerExpr(expr.expr) };
        case 'call':
            return {
                ...expr,
                callee: lowerExpr(expr.callee),
                args: (expr.args || []).map(lowerExpr),
            };
        case 'list':
            return { ...expr, items: (expr.items || []).map(lowerExpr) };
        case 'index':
            return { ...expr, obj: lowerExpr(expr.obj), index: lowerExpr(expr.index) };
        case 'cast':
            return { ...expr, expr: lowerExpr(expr.expr) };
        default:
            return expr;
    }
}

function tryInput(expr) {
    if (!expr || expr.kind !== 'call') return null;
    const n = calleeName(expr.callee);
    const arg0 = expr.args && expr.args[0];

    if (n === 'input' || n === 'raw_input' || n === 'prompt') {
        return {
            kind: 'input',
            type: 'string',
            prompt: arg0 ? lowerExpr(arg0) : { kind: 'str', value: '' },
        };
    }

    if (n === 'float' || n === 'int' || n === 'str' || n === 'bool' || n === 'double') {
        if (!arg0) return null;
        const inner = tryInput(arg0) || (arg0.kind === 'input' ? arg0 : null);
        if (inner && inner.kind === 'input') {
            let type = 'string';
            if (n === 'float' || n === 'double') type = 'double';
            else if (n === 'int') type = 'int';
            else if (n === 'bool') type = 'bool';
            return { kind: 'input', type, prompt: inner.prompt };
        }
        let type = 'string';
        if (n === 'float' || n === 'double') type = 'double';
        else if (n === 'int') type = 'int';
        else if (n === 'bool') type = 'bool';
        return { kind: 'cast', type, expr: lowerExpr(arg0) };
    }

    return null;
}

function programUsesInput(prog) {
    function walkStmt(s) {
        if (!s) return false;
        switch (s.kind) {
            case 'assign':
                return walkExpr(s.value);
            case 'print':
                return (s.args || []).some(walkExpr);
            case 'return':
                return walkExpr(s.value);
            case 'expr':
                return walkExpr(s.expr);
            case 'if':
                return walkExpr(s.cond) || (s.then || []).some(walkStmt) || (s.else || []).some(walkStmt);
            case 'forRange':
                return walkExpr(s.start) || walkExpr(s.end) || (s.body || []).some(walkStmt);
            case 'forEach':
                return walkExpr(s.iter) || (s.body || []).some(walkStmt);
            case 'while':
                return walkExpr(s.cond) || (s.then || s.body || []).some(walkStmt);
            case 'block':
                return (s.body || []).some(walkStmt);
            default:
                return false;
        }
    }
    function walkExpr(e) {
        if (!e) return false;
        if (e.kind === 'input') return true;
        if (e.kind === 'bin') return walkExpr(e.left) || walkExpr(e.right);
        if (e.kind === 'un' || e.kind === 'cast') return walkExpr(e.expr);
        if (e.kind === 'call') return walkExpr(e.callee) || (e.args || []).some(walkExpr);
        if (e.kind === 'list') return (e.items || []).some(walkExpr);
        if (e.kind === 'index') return walkExpr(e.obj) || walkExpr(e.index);
        return false;
    }
    return (prog.functions || []).some((fn) => (fn.body || []).some(walkStmt))
        || (prog.statements || []).some(walkStmt);
}

module.exports = { lowerProgram, programUsesInput };
