const StoryEngine = require('../src/core/StoryEngine');

async function testGameRun() {
    console.log('🚀 Starting game engine test...');
    
    try {
        // Initialize the engine with a test API key
        const engine = new StoryEngine('test_api_key');
        
        console.log('✅ Engine initialized successfully');
        
        // Check basic player state
        console.log('\n👤 Player State:');
        console.log(`   Name: ${engine.player.name}`);
        console.log(`   Location: ${engine.player.currentLocation}`);
        console.log(`   Level: ${engine.player.level}`);
        
        // Check world state
        console.log('\n🌍 World State:');
        console.log(`   Current time: ${engine.worldState.currentTime}`);
        console.log(`   Global tension: ${engine.worldState.globalParameters.tension}`);
        
        // Try to get current location
        const currentLocation = engine.entityManager.getEntity('location', engine.player.currentLocation);
        if (currentLocation) {
            console.log(`\n📍 Current Location: ${currentLocation.name}`);
            console.log(`   Description: ${currentLocation.description || 'No description available'}`);
        } else {
            console.warn('⚠️ Could not find current location data');
        }
        
        // Try to compile game state
        console.log('\n🔄 Compiling game state...');
        const gameState = engine.compileGameState();
        console.log('✅ Game state compiled successfully');
        console.log(`   Total entities: ${Object.keys(gameState.entities).length}`);
        
        // Test saving and loading
        console.log('\n💾 Testing save/load functionality...');
        await engine.saveGame('test-save.json');
        console.log('✅ Game saved successfully');
        
        const newEngine = new StoryEngine('test_api_key');
        await newEngine.loadGame('test-save.json');
        console.log('✅ Game loaded successfully');
        
        console.log('\n🎉 Engine test completed successfully!');
        
    } catch (error) {
        console.error('❌ Engine test failed:', error);
        process.exit(1);
    }
}

// Run the test
testGameRun();
