const fs = require('fs');
const data = require('./prompt_examples.json');

const newExamples = data.slice(4); // Get examples 4-9

let output = '';
newExamples.forEach((item, i) => {
  output += `  {
    // ${item.type} example ${i+5} - score ${item.result.score}\n`;
  output += `    image: "${item.base64}",\n`;
  output += `    result: { score: ${item.result.score}, category: "${item.result.category}", recommendation: "${item.result.recommendation.replace(/"/g, '\\"')}" }\n`;
  output += `  },\n`;
  if (i < newExamples.length - 1) output += '\n';
});

console.log(output);