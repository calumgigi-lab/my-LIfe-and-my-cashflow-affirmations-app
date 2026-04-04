const data = require('./affirmations_template.json');

console.log('\n📚 AFFIRMATIONS TEMPLATE OVERVIEW\n');
console.log('='.repeat(70));

// Show first booklet details
const firstBooklet = data[0];
console.log(`\nBooklet: ${firstBooklet.title}`);
console.log(`Month: ${firstBooklet.month}, Year: ${firstBooklet.year}`);
console.log(`Description: ${firstBooklet.description}`);
console.log(`Total Days: ${firstBooklet.affirmations.length}\n`);

console.log('First 5 Days:\n');
firstBooklet.affirmations.slice(0, 5).forEach(aff => {
  console.log(`\nDay ${aff.dayNumber}: ${aff.title}`);
  console.log(`─`.repeat(70));
  console.log(`${aff.content}\n`);
});

console.log('='.repeat(70));
console.log(`\nTotal Booklets: ${data.length}`);
const totalAff = data.reduce((sum, b) => sum + b.affirmations.length, 0);
console.log(`Total Affirmations: ${totalAff}`);

console.log(`\nAll 24 Booklets:`);
data.forEach((b, i) => {
  console.log(`  [${i + 1}] ${b.title} (${b.affirmations.length} days)`);
});

console.log(`\n${totalAff} affirmations ready to seed! 🚀\n`);
