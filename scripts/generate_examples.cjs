const fs = require('fs');
const data = require('./prompt_examples.json');

let examplesCode = 'const EXAMPLES = [\n';
data.forEach((item, i) => {
  examplesCode += '  {\n';
  examplesCode += `    // ${item.type} example ${i+1} - score ${item.result.score}\n`;
  examplesCode += `    image: "${item.base64}",\n`;
  examplesCode += `    result: { score: ${item.result.score}, category: "${item.result.category}", recommendation: "${item.result.recommendation.replace(/"/g, '\\"')}" }\n`;
  examplesCode += '  },\n';
  if (i < data.length - 1) examplesCode += '\n';
});
examplesCode += '];\n';

fs.writeFileSync('scripts/examples_output.txt', examplesCode);
console.log('Written examples to examples_output.txt');
console.log('Length:', examplesCode.length);