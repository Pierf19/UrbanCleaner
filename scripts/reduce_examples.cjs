const fs = require('fs');
const data = require('./prompt_examples.json');

// Keep only 7 examples: 2 clean (90,85), 2 dirty (20,15), 2 sedang (55,60), 1 clean (80)
const selectedExamples = [
  data[0],  // clean 90
  data[1],  // clean 85
  data[2],  // dirty 20
  data[3],  // dirty 15
  data[4],  // clean 80
  data[8],  // sedang 55
  data[9],  // sedang 60
];

// Build new EXAMPLES array
let newExamples = 'const EXAMPLES = [\n';
selectedExamples.forEach((item, i) => {
  newExamples += '  {\n';
  newExamples += `    // ${item.type} example ${i+1} - score ${item.result.score}\n`;
  newExamples += `    image: "${item.base64}",\n`;
  newExamples += `    result: { score: ${item.result.score}, category: "${item.result.category}", recommendation: "${item.result.recommendation.replace(/"/g, '\\"')}" }\n`;
  newExamples += '  },\n';
  if (i < selectedExamples.length - 1) newExamples += '\n';
});
newExamples += '];\n';

console.log('Generated 7 examples');
console.log('Total:', selectedExamples.length);

// Read current ai.ts
let aiContent = fs.readFileSync('convex/ai.ts', 'utf8');

// Replace the EXAMPLES array
const regex = /const EXAMPLES = \[[\s\S]*?^\];/m;
aiContent = aiContent.replace(regex, newExamples);

// Replace instruction text
aiContent = aiContent.replace(
  'Berdasarkan 10 contoh gambar sebelumnya (4 bersih, 4 kotor, 2 sedang)',
  'Berdasarkan 7 contoh gambar sebelumnya (3 bersih, 2 kotor, 2 sedang)'
);

// Remove message builder code for removed examples (indices 5, 6, 7 which were examples 6, 7, 8)
const removePatterns = [
  /Example 6 - Clean \(score 75\)[\s\S]*?EXAMPLES\[5\]\.result\][\s\S]*?},\n[\s\S]*?},\n/,
  /Example 7 - Dirty \(score 35\)[\s\S]*?EXAMPLES\[6\]\.result\][\s\S]*?},\n[\s\S]*?},\n/,
  /Example 8 - Dirty \(score 25\)[\s\S]*?EXAMPLES\[7\]\.result\][\s\S]*?},\n[\s\S]*?},\n/
];

aiContent = aiContent.replace(removePatterns[0], '').replace(removePatterns[1], '').replace(removePatterns[2], '');

// Write back
fs.writeFileSync('convex/ai.ts', aiContent);
console.log('Updated ai.ts with 7 examples');