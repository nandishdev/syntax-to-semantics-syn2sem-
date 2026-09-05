const {
    namedChildren,
    childField,
    firstNamedOfTypes,
    unwrapParens,
    normOp,
    parseStringLiteral,
    isBlockType,
} = require('./util');

function emptyProgram() {
    return { functions: [], statements: [] };
}

function extractProgram(root, lang) {
    const prog = emptyProgram();
    switch (lang) {
        case 'python':
            extractPython(root, prog);
            break;
        case 'javascript':
            extractJs(root, prog);
            break;
        case 'java':
            extractJava(root, prog);
            break;
        case 'c':
        case 'cpp':
            extractCFamily(root, prog);
            break;
        default: {
            const _exhaustive = lang;
            throw new Error(`Unsupported source language: ${_exhaustive}`);
        }
    }
    flattenMainGuards(prog);
    return prog;
}

function flattenMainGuards(prog) {
    const stmts = [];
    for (const s of prog.statements) {
        if (s.kind === 'if' && isDunderMain(s.cond)) {
            stmts.push(...s.then);
        } else {
            stmts.push(s);
        }
    }
    prog.statements = stmts;
}

function isDunderMain(expr) {
    if (!expr || expr.kind !== 'bin' || expr.op !== '==') return false;
    const left = expr.left;
    const right = expr.right;
    const id = (n) => n && n.kind === 'id' && n.name === '__name__';
    const lit = (n) => n && n.kind === 'str' && (n.value === '__main__');
    return (id(left) && lit(right)) || (id(right) && lit(left));
}

function extractExpr(node) {
    if (!node) return { kind: 'num', value: 0 };
    node = unwrapParens(node);
    const t = node.type;

    if (t === 'identifier' || t === 'property_identifier' || t === 'type_identifier') {
        const name = node.text;
        if (name === 'True' || name === 'true') return { kind: 'bool', value: true };
        if (name === 'False' || name === 'false') return { kind: 'bool', value: false };
        if (name === 'None' || name === 'null' || name === 'NULL') return { kind: 'id', name: 'null' };
        return { kind: 'id', name };
    }
    if (t === 'true') return { kind: 'bool', value: true };
    if (t === 'false') return { kind: 'bool', value: false };
    if (t === 'none' || t === 'null' || t === 'null_literal') return { kind: 'id', name: 'null' };

    if (t === 'integer' || t === 'float' || t === 'number' || t === 'number_literal'
        || t === 'decimal_integer_literal' || t === 'decimal_floating_point_literal'
        || t === 'integer_literal' || t === 'floating_point_literal' || t === 'hex_integer_literal') {
        const raw = node.text.replace(/[lLfF]$/, '');
        return { kind: 'num', value: raw.includes('.') ? Number(raw) : parseInt(raw, 10) };
    }

    if (t === 'string' || t === 'string_literal' || t === 'character_literal' || t === 'template_string') {
        return { kind: 'str', value: parseStringLiteral(node.text) };
    }

    if (t === 'binary_operator' || t === 'boolean_operator' || t === 'comparison_operator'
        || t === 'binary_expression') {
        return binFromNode(node);
    }

    if (t === 'unary_operator' || t === 'not_operator' || t === 'unary_expression' || t === 'update_expression') {
        const opNode = [...Array(node.childCount)].map((_, i) => node.child(i)).find((c) => !c.isNamed);
        const inner = namedChildren(node)[0];
        let op = normOp(opNode ? opNode.text : (t === 'not_operator' ? '!' : '+'));
        if (op === '++' || op === '--') {
            return extractExpr(inner);
        }
        return { kind: 'un', op, expr: extractExpr(inner) };
    }

    if (t === 'call' || t === 'call_expression') {
        return extractCall(node);
    }
    if (t === 'method_invocation') {
        return extractJavaCall(node);
    }

    if (t === 'list' || t === 'array' || t === 'array_initializer') {
        return { kind: 'list', items: namedChildren(node).map(extractExpr) };
    }

    if (t === 'subscript' || t === 'subscript_expression' || t === 'array_access') {
        const obj = childField(node, 'object') || childField(node, 'value') || namedChildren(node)[0];
        const idx = childField(node, 'index') || childField(node, 'subscript') || namedChildren(node)[1];
        return { kind: 'index', obj: extractExpr(obj), index: extractExpr(idx) };
    }

    if (t === 'assignment' || t === 'assignment_expression') {
        return extractExpr(childField(node, 'right') || namedChildren(node)[1]);
    }

    if (t === 'cast_expression') {
        return extractExpr(childField(node, 'value') || namedChildren(node)[namedChildren(node).length - 1]);
    }

    if (t === 'qualified_identifier' || t === 'scoped_identifier' || t === 'field_access' || t === 'member_expression') {
        const text = node.text.replace(/\s+/g, '');
        if (text === 'std::endl' || text === 'endl') return { kind: 'id', name: 'endl' };
        if (text === 'std::cout' || text === 'cout') return { kind: 'id', name: 'cout' };
        if (text === 'System.out') return { kind: 'id', name: 'System.out' };
        return { kind: 'id', name: node.text };
    }

    if (t === 'argument_list' || t === 'arguments') {
        const items = namedChildren(node);
        if (items.length === 1) return extractExpr(items[0]);
        return { kind: 'list', items: items.map(extractExpr) };
    }

    const inner = namedChildren(node);
    if (inner.length === 1 && node.childCount <= 3) return extractExpr(inner[0]);
    return { kind: 'id', name: node.text };
}

function binFromNode(node) {
    const named = namedChildren(node);
    let op = null;
    for (let i = 0; i < node.childCount; i++) {
        const c = node.child(i);
        if (!c.isNamed && !['(', ')', ',', '[', ']'].includes(c.type)) op = c.text;
    }
    if (named.length >= 3 && node.type === 'comparison_operator') {
        let acc = extractExpr(named[0]);
        for (let i = 1; i < named.length; i++) {
            const opNode = node.child(i * 2 - 1);
            const nextOp = normOp(opNode && !opNode.isNamed ? opNode.text : '<');
            acc = { kind: 'bin', op: nextOp, left: acc, right: extractExpr(named[i]) };
        }
        return acc;
    }
    if (named.length >= 2) {
        return {
            kind: 'bin',
            op: normOp(op || '+'),
            left: extractExpr(named[0]),
            right: extractExpr(named[1]),
        };
    }
    return extractExpr(named[0] || node);
}

function calleeName(expr) {
    if (!expr) return '';
    if (expr.kind === 'id') return expr.name;
    return '';
}

function extractCall(node) {
    const fn = childField(node, 'function') || namedChildren(node)[0];
    const argsNode = childField(node, 'arguments') || childField(node, 'arguments') || firstNamedOfTypes(node, ['argument_list', 'arguments']);
    const args = argsNode ? namedChildren(argsNode).map(extractExpr) : [];
    const fnExpr = extractExpr(fn);
    return { kind: 'call', callee: fnExpr, args };
}

function extractJavaCall(node) {
    const nameNode = childField(node, 'name') || firstNamedOfTypes(node, ['identifier']);
    const obj = childField(node, 'object');
    const argsNode = childField(node, 'arguments') || firstNamedOfTypes(node, ['argument_list']);
    const args = argsNode ? namedChildren(argsNode).map(extractExpr) : [];
    const name = nameNode ? nameNode.text : 'call';
    if (obj) {
        const objText = obj.text.replace(/\s+/g, '');
        const callee = { kind: 'id', name: `${objText}.${name}` };
        return { kind: 'call', callee, args };
    }
    return { kind: 'call', callee: { kind: 'id', name }, args };
}

function isPrintCall(expr) {
    if (!expr || expr.kind !== 'call') return false;
    const n = calleeName(expr.callee);
    if (n === 'print' || n === 'printf' || n === 'println' || n === 'console.log') return true;
    if (n === 'System.out.println' || n === 'System.out.print') return true;
    return false;
}

function printArgsFromCall(expr) {
    const n = calleeName(expr.callee);
    let args = expr.args.slice();
    if (n === 'printf' && args.length >= 1 && args[0].kind === 'str') {
        args = args.slice(1);
        if (args.length === 0) return [{ kind: 'str', value: expr.args[0].value.replace(/\n/g, '') }];
    }
    return args;
}

function isCoutExpr(expr) {
    if (!expr || expr.kind !== 'bin' || expr.op !== '<<') return false;
    return true;
}

function flattenCout(expr) {
    const parts = [];
    function walk(n) {
        if (!n) return;
        if (n.kind === 'bin' && n.op === '<<') {
            walk(n.left);
            walk(n.right);
            return;
        }
        if (n.kind === 'id' && (n.name === 'cout' || n.name === 'std::cout' || n.name === 'endl' || n.name === 'std::endl')) return;
        parts.push(n);
    }
    walk(expr);
    return parts;
}

function extractStmt(node, opts) {
    if (!node) return null;
    const inMain = !!(opts && opts.inMain);
    const t = node.type;

    if (t === 'comment' || t === 'line_comment' || t === 'block_comment') return null;
    if (t === 'pass_statement' || t === 'pass') return null;
    if (t === 'import_statement' || t === 'import_from_statement' || t === 'import_declaration'
        || t === 'package_declaration' || t === 'preproc_include' || t === 'preproc_def'
        || t === 'using_declaration' || t === 'using_directive' || t === 'modifiers') return null;

    if (isBlockType(t) || t === 'module' || t === 'program' || t === 'translation_unit' || t === 'compilation_unit') {
        return { kind: 'block', body: extractStmtList(node, opts) };
    }

    if (t === 'expression_statement' || t === 'expression_statement') {
        const inner = namedChildren(node)[0];
        if (!inner) return null;
        return extractStmt(inner, opts) || exprStmtFrom(inner);
    }

    if (t === 'assignment' || t === 'assignment_expression' || t === 'assignment_statement') {
        return assignFrom(node);
    }

    if (t === 'augmented_assignment' || t === 'augmented_assignment_expression') {
        const left = childField(node, 'left') || namedChildren(node)[0];
        const right = childField(node, 'right') || namedChildren(node)[1];
        let op = '+';
        for (let i = 0; i < node.childCount; i++) {
            const c = node.child(i);
            if (!c.isNamed && c.text.includes('=')) op = c.text.replace('=', '') || '+';
        }
        const name = left ? left.text : 'x';
        return {
            kind: 'assign',
            name,
            value: { kind: 'bin', op: normOp(op), left: extractExpr(left), right: extractExpr(right) },
        };
    }

    if (t === 'lexical_declaration' || t === 'variable_declaration' || t === 'local_variable_declaration' || t === 'declaration') {
        return declToAssign(node);
    }

    if (t === 'if_statement') return extractIf(node, opts);

    if (t === 'for_statement' || t === 'for_in_statement') return extractFor(node, opts);

    if (t === 'while_statement') {
        const condNode = childField(node, 'condition') || firstNamedOfTypes(node, ['parenthesized_expression', 'comparison_operator', 'binary_expression', 'boolean_operator', 'identifier']);
        const bodyNode = childField(node, 'body') || firstNamedOfTypes(node, ['block', 'statement_block', 'compound_statement']);
        return { kind: 'while', cond: extractExpr(unwrapParens(condNode)), then: extractStmtList(bodyNode, opts) };
    }

    if (t === 'return_statement') {
        const inner = childField(node, 'value') || namedChildren(node)[0];
        if (inMain && inner && inner.type && /^(number|integer|number_literal|decimal_integer_literal)$/.test(inner.type) && inner.text === '0') {
            return null;
        }
        if (!inner) return { kind: 'return', value: null };
        return { kind: 'return', value: extractExpr(inner) };
    }

    if (t === 'call' || t === 'call_expression' || t === 'method_invocation' || t === 'binary_expression') {
        const expr = extractExpr(node);
        if (isPrintCall(expr)) return { kind: 'print', args: printArgsFromCall(expr) };
        if (isCoutExpr(expr)) return { kind: 'print', args: flattenCout(expr) };
        return { kind: 'expr', expr };
    }

    if (t === 'function_definition' || t === 'function_declaration' || t === 'method_declaration') {
        return null;
    }

    const inner = namedChildren(node);
    if (inner.length === 1) return extractStmt(inner[0], opts);
    return null;
}

function exprStmtFrom(node) {
    const expr = extractExpr(node);
    if (isPrintCall(expr)) return { kind: 'print', args: printArgsFromCall(expr) };
    if (isCoutExpr(expr)) return { kind: 'print', args: flattenCout(expr) };
    if (node.type === 'assignment' || node.type === 'assignment_expression') return assignFrom(node);
    return { kind: 'expr', expr };
}

function assignFrom(node) {
    const left = childField(node, 'left') || namedChildren(node)[0];
    const right = childField(node, 'right') || namedChildren(node)[1];
    const name = left ? (left.type === 'identifier' ? left.text : left.text) : 'x';
    return { kind: 'assign', name, value: extractExpr(right) };
}

function declToAssign(node) {
    const declarators = [];
    function findDecl(n) {
        if (!n) return;
        if (n.type === 'variable_declarator' || n.type === 'init_declarator') declarators.push(n);
        for (const c of namedChildren(n)) findDecl(c);
    }
    findDecl(node);
    if (declarators.length === 0) {
        const ids = namedChildren(node).filter((c) => c.type === 'identifier');
        const vals = namedChildren(node).filter((c) => c.type !== 'identifier' && c.type !== 'integral_type' && c.type !== 'primitive_type' && c.type !== 'type_identifier');
        if (ids.length && vals.length) return { kind: 'assign', name: ids[ids.length - 1].text, value: extractExpr(vals[0]) };
        return null;
    }
    const d = declarators[0];
    const name = (childField(d, 'declarator') || childField(d, 'name') || namedChildren(d)[0]);
    const value = childField(d, 'value') || namedChildren(d)[1];
    const nm = name && name.type === 'identifier' ? name.text : (name ? name.text.replace(/^\*+/, '') : 'x');
    if (!value) return { kind: 'assign', name: nm, value: { kind: 'num', value: 0 } };
    return { kind: 'assign', name: nm, value: extractExpr(value) };
}

function extractStmtList(node, opts) {
    if (!node) return [];
    if (!isBlockType(node.type) && node.type !== 'module' && node.type !== 'program'
        && node.type !== 'class_body' && node.type !== 'translation_unit') {
        const one = extractStmt(node, opts);
        return one ? (one.kind === 'block' ? one.body : [one]) : [];
    }
    const out = [];
    for (const c of namedChildren(node)) {
        const s = extractStmt(c, opts);
        if (!s) continue;
        if (s.kind === 'block') out.push(...s.body);
        else out.push(s);
    }
    return out;
}

function extractElseStmts(elseClause, opts) {
    if (!elseClause) return [];
    if (elseClause.type === 'if_statement') return [extractIf(elseClause, opts)];
    if (elseClause.type === 'else_clause') {
        const innerIf = firstNamedOfTypes(elseClause, ['if_statement']);
        if (innerIf) return [extractIf(innerIf, opts)];
        const body = childField(elseClause, 'body')
            || firstNamedOfTypes(elseClause, ['block', 'statement_block', 'compound_statement']);
        return extractStmtList(body || elseClause, opts);
    }
    return extractStmtList(elseClause, opts);
}

function extractIf(node, opts) {
    const condNode = childField(node, 'condition') || firstNamedOfTypes(node, [
        'parenthesized_expression', 'comparison_operator', 'binary_expression', 'boolean_operator', 'identifier',
    ]);
    const thenNode = childField(node, 'consequence') || childField(node, 'body')
        || firstNamedOfTypes(node, ['block', 'statement_block', 'compound_statement', 'return_statement', 'expression_statement']);
    const elifs = namedChildren(node).filter((c) => c.type === 'elif_clause');
    const elseClause = firstNamedOfTypes(node, ['else_clause']) || childField(node, 'alternative');

    let elseStmts = extractElseStmts(elseClause, opts);
    for (let i = elifs.length - 1; i >= 0; i--) {
        const e = elifs[i];
        const econd = childField(e, 'condition') || firstNamedOfTypes(e, [
            'comparison_operator', 'binary_expression', 'boolean_operator', 'identifier', 'parenthesized_expression',
        ]);
        const ebody = childField(e, 'consequence') || childField(e, 'body') || firstNamedOfTypes(e, ['block']);
        elseStmts = [{
            kind: 'if',
            cond: extractExpr(unwrapParens(econd)),
            then: extractStmtList(ebody, opts),
            else: elseStmts,
        }];
    }

    return {
        kind: 'if',
        cond: extractExpr(unwrapParens(condNode)),
        then: extractStmtList(thenNode, opts),
        else: elseStmts,
    };
}

function extractFor(node, opts) {
    const bodyNode = childField(node, 'body') || firstNamedOfTypes(node, ['block', 'statement_block', 'compound_statement']);
    const body = extractStmtList(bodyNode, opts);

    const left = childField(node, 'left');
    const right = childField(node, 'right');
    if (left && right) {
        const iter = extractExpr(right);
        const v = left.text;
        if (iter.kind === 'call' && calleeName(iter.callee) === 'range') {
            const a = iter.args;
            if (a.length === 1) return { kind: 'forRange', var: v, start: { kind: 'num', value: 0 }, end: a[0], body };
            if (a.length >= 2) return { kind: 'forRange', var: v, start: a[0], end: a[1], body };
        }
        return { kind: 'forEach', var: v, iter, body };
    }

    const initNode = childField(node, 'initializer') || childField(node, 'init');
    const condNode = childField(node, 'condition');
    const incNode = childField(node, 'increment') || childField(node, 'update');

    let init = initNode;
    let cond = condNode;
    let inc = incNode;
    if (!init || !cond) {
        const named = namedChildren(node).filter((c) => !isBlockType(c.type));
        init = init || named[0];
        cond = cond || named[1];
        inc = inc || named[2];
    }

    const initStmt = init ? (extractStmt(init, opts) || declToAssign(init)) : null;
    const condExpr = cond ? extractExpr(unwrapParens(cond)) : { kind: 'bool', value: true };
    let v = 'i';
    let start = { kind: 'num', value: 0 };
    if (initStmt && initStmt.kind === 'assign') {
        v = initStmt.name;
        start = initStmt.value;
    }
    let end = { kind: 'num', value: 0 };
    if (condExpr.kind === 'bin' && (condExpr.op === '<' || condExpr.op === '<=')) {
        end = condExpr.op === '<='
            ? { kind: 'bin', op: '+', left: condExpr.right, right: { kind: 'num', value: 1 } }
            : condExpr.right;
        if (condExpr.left.kind === 'id') v = condExpr.left.name;
    }
    return { kind: 'forRange', var: v, start, end, body };
}

function extractParams(paramsNode) {
    if (!paramsNode) return [];
    const out = [];
    for (const c of namedChildren(paramsNode)) {
        if (c.type === 'identifier') {
            if (c.text !== 'self' && c.text !== 'this') out.push(c.text);
        } else if (c.type === 'required_parameter' || c.type === 'optional_parameter' || c.type === 'formal_parameter' || c.type === 'parameter_declaration') {
            const id = firstNamedOfTypes(c, ['identifier']) || childField(c, 'name') || childField(c, 'declarator');
            const name = id ? id.text.replace(/^\*+/, '') : c.text;
            if (name && name !== 'self') out.push(name);
        }
    }
    return out;
}

function extractFunction(node, nameField) {
    const nameNode = childField(node, 'name') || nameField || firstNamedOfTypes(node, ['identifier']);
    const paramsNode = childField(node, 'parameters') || firstNamedOfTypes(node, ['parameters', 'formal_parameters', 'parameter_list']);
    const bodyNode = childField(node, 'body') || firstNamedOfTypes(node, ['block', 'statement_block', 'compound_statement']);
    const name = nameNode ? nameNode.text : 'fn';
    return {
        name,
        params: extractParams(paramsNode),
        body: extractStmtList(bodyNode, { inMain: false }),
    };
}

function extractPython(root, prog) {
    for (const c of namedChildren(root)) {
        if (c.type === 'function_definition') {
            const fn = extractFunction(c);
            if (fn.name !== 'main') prog.functions.push(fn);
            else prog.statements.push(...fn.body);
        } else if (c.type === 'class_definition') {
            const body = childField(c, 'body') || firstNamedOfTypes(c, ['block']);
            if (body) extractPython(body, prog);
        } else {
            const s = extractStmt(c, { inMain: true });
            if (s) {
                if (s.kind === 'block') prog.statements.push(...s.body);
                else prog.statements.push(s);
            }
        }
    }
}

function extractJs(root, prog) {
    for (const c of namedChildren(root)) {
        if (c.type === 'function_declaration') {
            const fn = extractFunction(c);
            if (fn.name !== 'main') prog.functions.push(fn);
            else prog.statements.push(...fn.body);
        } else if (c.type === 'class_declaration') {
            const body = childField(c, 'body') || firstNamedOfTypes(c, ['class_body']);
            if (!body) continue;
            for (const m of namedChildren(body)) {
                if (m.type === 'method_definition') {
                    const fn = extractFunction(m);
                    if (fn.name !== 'constructor') prog.functions.push(fn);
                }
            }
        } else {
            const s = extractStmt(c, { inMain: true });
            if (s) {
                if (s.kind === 'block') prog.statements.push(...s.body);
                else prog.statements.push(s);
            }
        }
    }
}

function extractJava(root, prog) {
    function walk(n) {
        if (!n) return;
        if (n.type === 'method_declaration') {
            const fn = extractFunction(n);
            if (fn.name === 'main') prog.statements.push(...fn.body);
            else prog.functions.push(fn);
            return;
        }
        if (n.type === 'constructor_declaration') return;
        for (const c of namedChildren(n)) walk(c);
    }
    walk(root);
}

function extractCFamily(root, prog) {
    for (const c of namedChildren(root)) {
        if (c.type === 'function_definition') {
            const decl = childField(c, 'declarator') || firstNamedOfTypes(c, ['function_declarator']);
            let funcDecl = decl;
            while (funcDecl && funcDecl.type !== 'function_declarator') {
                funcDecl = childField(funcDecl, 'declarator') || firstNamedOfTypes(funcDecl, ['function_declarator']);
                if (!funcDecl) break;
            }
            const nameNode = funcDecl
                ? (childField(funcDecl, 'declarator') || firstNamedOfTypes(funcDecl, ['identifier']))
                : firstNamedOfTypes(c, ['identifier']);
            const name = nameNode ? nameNode.text.replace(/^\*+/, '') : 'fn';
            const paramsNode = funcDecl ? childField(funcDecl, 'parameters') || firstNamedOfTypes(funcDecl, ['parameter_list']) : null;
            const bodyNode = childField(c, 'body') || firstNamedOfTypes(c, ['compound_statement']);
            const fn = {
                name,
                params: extractParams(paramsNode),
                body: extractStmtList(bodyNode, { inMain: name === 'main' }),
            };
            if (name === 'main') prog.statements.push(...fn.body);
            else prog.functions.push(fn);
        }
    }
}

module.exports = { extractProgram };
