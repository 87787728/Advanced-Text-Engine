const fs = require('fs');
const path = require('path');

const requiredFiles = [
    'src/main.js',
    'src/core/StoryEngine.js',
    'src/core/EntityManager.js',
    'src/core/RelationshipGraph.js',
    'src/core/WorldState.js',
    'src/core/AIInterface.js',
    'src/systems/CreationSystem.js',
    'src/systems/ValidationSystem.js',
    'src/utils/Constants.js',
    'src/utils/DataStructures.js',
    'package.json'
];

const requiredDirs = [
    'src/core',
    'src/systems',
    'src/utils',
    'data/templates',
    'data/saves',
    'tests/unit',
    'tests/integration',
    'docs'
];

console.log('🔍 Validating Advanced Story Engine Installation...\n');

// Check directories
console.log('📁 Checking directories:');
requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        console.log(`✅ ${dir}`);
    } else {
        console.log(`❌ ${dir} - MISSING`);
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created ${dir}`);
    }
});

// Check files
console.log('\n📄 Checking required files:');
let missingFiles = 0;
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - MISSING`);
        missingFiles++;
    }
});

// Check dependencies
console.log('\n📦 Checking dependencies:');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = ['@google/generative-ai'];
    
    requiredDeps.forEach(dep => {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
            console.log(`✅ ${dep}`);
        } else {
            console.log(`❌ ${dep} - MISSING`);
        }
    });
} catch (error) {
    console.log('❌ package.json - Cannot read or parse');
}

// Final validation
console.log('\n🎯 VALIDATION SUMMARY:');
if (missingFiles === 0) {
    console.log('✅ Installation appears complete!');
    console.log('🚀 Ready to run: npm start');
} else {
    console.log(`❌ ${missingFiles} files missing. Please ensure all files are created as per the guide.`);
}

console.log('\n📖 For full setup instructions, see the implementation guide.');
