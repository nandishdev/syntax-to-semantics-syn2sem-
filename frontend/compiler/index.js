const { parseSource } = require('./parse');
const { extractProgram } = require('./extract');
const { emitProgram } = require('./emit');

function translate(code, sourceLang, targetLang) {
    if (!code || !code.trim()) return '';
    if (sourceLang === targetLang) return code;
    const tree = parseSource(code, sourceLang);
    const ir = extractProgram(tree.rootNode, sourceLang);
    const has = (ir.functions && ir.functions.length) || (ir.statements && ir.statements.length);
    if (!has) {
        throw new Error('IR compiler produced an empty program');
    }
    return emitProgram(ir, targetLang);
}

module.exports = { translate, extractProgram, emitProgram, parseSource };
