const fs = require('fs');
const path = require('path');

const serverText = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const hasOllama = /ollama|Ollama/i.test(serverText);

if (hasOllama) {
  console.error('Ollama integration still present in server.js');
  process.exit(1);
}

console.log('No Ollama integration found in server.js');
