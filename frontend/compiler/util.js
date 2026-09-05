function assertNever(x) {
    throw new Error(`Unhandled variant: ${JSON.stringify(x)}`);
}

function namedChildren(node) {
    const out = [];
    if (!node) return out;
    for (let i = 0; i < node.namedChildCount; i++) out.push(node.namedChild(i));
    return out;
}

function childField(node, name) {
    if (!node) return null;
    return node.childForFieldName(name);
}

function firstNamedOfTypes(node, types) {
    const set = new Set(types);
    for (const c of namedChildren(node)) {
        if (set.has(c.type)) return c;
    }
    return null;
}

function unwrapParens(node) {
    let n = node;
    while (n && n.type === 'parenthesized_expression') {
        n = childField(n, 'inner') || namedChildren(n)[0] || n;
        if (n === node) break;
    }
    return n;
}

function normOp(op) {
    const t = String(op || '').trim();
    if (t === 'and' || t === '&&') return '&&';
    if (t === 'or' || t === '||') return '||';
    if (t === 'not' || t === '!') return '!';
    if (t === '===') return '==';
    if (t === '!==') return '!=';
    return t;
}

function parseStringLiteral(text) {
    const s = String(text || '').trim();
    if (s.length >= 2 && ((s[0] === '"' && s[s.length - 1] === '"') || (s[0] === "'" && s[s.length - 1] === "'"))) {
        const inner = s.slice(1, -1);
        return inner.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    }
    return s;
}

function isBlockType(type) {
    return type === 'block' || type === 'statement_block' || type === 'compound_statement' || type === 'suite';
}

module.exports = {
    assertNever,
    namedChildren,
    childField,
    firstNamedOfTypes,
    unwrapParens,
    normOp,
    parseStringLiteral,
    isBlockType,
};
