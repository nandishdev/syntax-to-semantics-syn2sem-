const Parser = require('tree-sitter');

const languages = {
    javascript: require('tree-sitter-javascript'),
    python: require('tree-sitter-python'),
    java: require('tree-sitter-java'),
    c: require('tree-sitter-c'),
    cpp: require('tree-sitter-cpp'),
};

function parseSource(code, lang) {
    const grammar = languages[lang];
    if (!grammar) {
        throw new Error(`No parser for language: ${lang}`);
    }
    const parser = new Parser();
    parser.setLanguage(grammar);
    return parser.parse(code);
}

module.exports = { parseSource, languages };
