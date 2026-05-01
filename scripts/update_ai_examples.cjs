const fs = require('fs');
const data = require('./prompt_examples.json');

console.log('const EXAMPLES = [');

data.forEach((item, i) => {
  console.log('  {');
  console.log(`    // ${item.type} example ${i+1} - score ${item.result.score}`);
  console.log(`    image: "${item.base64}",`);
  console.log(`    result: { score: ${item.result.score}, category: "${item.result.category}", recommendation: "${item.result.recommendation.replace(/"/g, '\\"')}" }`);
  console.log('  },');
  if (i < data.length - 1) console.log('');
});

console.log('];');

console.log('\n--- Message Builder Code ---');
for (let i = 0; i < data.length; i++) {
  console.log(`
      // Example ${i+1} - ${data[i].type}
      {
        role: "user",
        content: [
          { type: "text", text: "Analisis gambar ini." },
          { type: "image_url", image_url: { url: \`data:image/jpeg;base64,\${EXAMPLES[${i}].image}\` } }
        ]
      },
      {
        role: "assistant",
        content: [{ type: "text", text: JSON.stringify(EXAMPLES[${i}].result) }]
      },`);
}