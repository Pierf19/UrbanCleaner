const fs = require('fs');
const data = require('./prompt_examples.json');

// Read current ai.ts
let aiContent = fs.readFileSync('convex/ai.ts', 'utf8');

// Build new EXAMPLES array
let newExamples = 'const EXAMPLES = [\n';
data.forEach((item, i) => {
  newExamples += '  {\n';
  newExamples += `    // ${item.type} example ${i+1} - score ${item.result.score}\n`;
  newExamples += `    image: "${item.base64}",\n`;
  newExamples += `    result: { score: ${item.result.score}, category: "${item.result.category}", recommendation: "${item.result.recommendation.replace(/"/g, '\\"')}" }\n`;
  newExamples += '  },\n';
  if (i < data.length - 1) newExamples += '\n';
});
newExamples += '];\n';

// Replace the EXAMPLES array (find from "const EXAMPLES = [" to first "];")
const regex = /const EXAMPLES = \[[\s\S]*?^\];/m;
aiContent = aiContent.replace(regex, newExamples);

// Write back
fs.writeFileSync('convex/ai.ts', aiContent);
console.log('Updated ai.ts with 10 examples');