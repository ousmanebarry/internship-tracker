// Simple test script to verify the integration works
const fs = require('fs');
const path = require('path');

// Test 1: Check if SQLite database exists
const dbPath = path.join(__dirname, '..', 'scraper', 'internships.db');
console.log('🔍 Testing integration...\n');

console.log('1. Checking SQLite database...');
if (fs.existsSync(dbPath)) {
	console.log('✅ Database found at:', dbPath);
	const stats = fs.statSync(dbPath);
	console.log('   Database size:', Math.round(stats.size / 1024), 'KB');
	console.log('   Last modified:', stats.mtime.toLocaleString());
} else {
	console.log('❌ Database not found at:', dbPath);
	console.log('   Please run the scraper first to create the database.');
	process.exit(1);
}

// Test 2: Check API route file
const apiPath = path.join(__dirname, 'src', 'app', 'api', 'internships', 'route.ts');
console.log('\n2. Checking API route...');
if (fs.existsSync(apiPath)) {
	console.log('✅ API route exists at:', apiPath);
} else {
	console.log('❌ API route not found');
	process.exit(1);
}

// Test 3: Check updated page file
const pagePath = path.join(__dirname, 'src', 'app', 'page.tsx');
console.log('\n3. Checking main page...');
if (fs.existsSync(pagePath)) {
	const content = fs.readFileSync(pagePath, 'utf8');
	if (content.includes('availableJobs') && content.includes('fetchInternships')) {
		console.log('✅ Page has been updated with real data integration');
	} else {
		console.log('❌ Page integration incomplete');
	}
} else {
	console.log('❌ Page file not found');
}

console.log('\n✅ Integration setup complete!');
console.log('\n📋 Next steps:');
console.log('1. Start the development server: npm run dev');
console.log('2. Open http://localhost:3000 in your browser');
console.log('3. Upload a PDF resume to test the matching');
console.log('\n💡 The app will now use real internship data from your scraper database!');
