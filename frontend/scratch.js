const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');

function calculateComplexity(node) {
    let maxLoopDepth = 0;
    let hasArray = false;

    function traverse(n, currentDepth) {
        if (!n) return;

        let nextDepth = currentDepth;
        const type = n.type.toLowerCase();

        // Check for loops
        if (type.includes('for_statement') || type.includes('while_statement') || type === 'do_statement') {
            nextDepth++;
            if (nextDepth > maxLoopDepth) maxLoopDepth = nextDepth;
        }

        // Check for arrays / collections (Space complexity proxy)
        if (type.includes('array') || type.includes('list') || type.includes('vector') || type.includes('map') || type.includes('dict')) {
            hasArray = true;
        }

        for (let i = 0; i < n.childCount; i++) {
            traverse(n.child(i), nextDepth);
        }
    }

    traverse(node, 0);

    // Format Time Complexity
    let timeComplexity = "O(1)";
    if (maxLoopDepth === 1) timeComplexity = "O(N)";
    else if (maxLoopDepth === 2) timeComplexity = "O(N²)";
    else if (maxLoopDepth >= 3) timeComplexity = `O(N^${maxLoopDepth})`;

    // Format Space Complexity
    let spaceComplexity = hasArray ? "O(N)" : "O(1)";

    return { timeComplexity, spaceComplexity };
}

const parser = new Parser();
parser.setLanguage(JavaScript);
const code = `
let arr = [];
for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
        console.log(i, j);
    }
}
`;
const tree = parser.parse(code);
console.log(calculateComplexity(tree.rootNode));
