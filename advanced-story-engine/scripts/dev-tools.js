const StoryEngine = require('../src/core/StoryEngine');
const fs = require('fs').promises;

class DevTools {
    constructor() {
        this.engine = null;
    }
    
    async createTestWorld() {
        console.log('🔧 Creating comprehensive test world...');
        
        this.engine = new StoryEngine('test_api_key');
        
        // Create diverse NPCs
        const testNPCs = [
            {
                id: 'merchant_sarah',
                name: 'Sarah the Merchant',
                occupation: 'trader',
                age: 35,
                location: 'market_district',
                traits: ['shrewd', 'ambitious', 'well_connected'],
                importance: 'medium'
            },
            {
                id: 'guard_captain_marcus',
                name: 'Captain Marcus',
                occupation: 'guard_captain',
                age: 45,
                location: 'barracks',
                traits: ['loyal', 'stern', 'experienced'],
                importance: 'high'
            },
            {
                id: 'mage_elara',
                name: 'Elara the Wise',
                occupation: 'court_mage',
                age: 120,
                location: 'tower',
                traits: ['ancient', 'mysterious', 'powerful'],
                importance: 'critical'
            }
        ];
        
        testNPCs.forEach(npcData => {
            this.engine.entityManager.createEntity('npc', npcData.id, npcData);
        });
        
        // Create factions
        const testFactions = [
            {
                id: 'merchants_guild',
                name: "Merchant's Guild",
                type: 'merchant',
                influence: 70,
                territory: ['market_district', 'trade_routes'],
                leadership: ['merchant_sarah']
            },
            {
                id: 'royal_guard',
                name: 'Royal Guard',
                type: 'military',
                influence: 85,
                territory: ['castle', 'barracks', 'city_walls'],
                leadership: ['guard_captain_marcus']
            }
        ];
        
        testFactions.forEach(factionData => {
            this.engine.entityManager.createEntity('faction', factionData.id, factionData);
            this.engine.relationshipGraph.setPlayerStanding(factionData.id, { value: 0 });
        });
        
        // Create locations
        const testLocations = [
            {
                id: 'market_district',
                name: 'Market District',
                type: 'settlement',
                safety: 85,
                population: 200,
                controlledBy: 'merchants_guild'
            },
            {
                id: 'tower',
                name: "Mage's Tower",
                type: 'structure',
                safety: 95,
                population: 5,
                connectedTo: ['village_square']
            }
        ];
        
        testLocations.forEach(locationData => {
            this.engine.entityManager.createEntity('location', locationData.id, locationData);
        });
        
        // Create relationships
        this.engine.relationshipGraph.setRelationship('merchant_sarah', 'guard_captain_marcus', {
            type: 'neutral',
            strength: 60,
            reason: 'professional cooperation'
        });
        
        this.engine.relationshipGraph.setRelationship('mage_elara', 'guard_captain_marcus', {
            type: 'ally',
            strength: 75,
            reason: 'served together in past conflicts'
        });
        
        // Add world events
        this.engine.worldState.addEvent({
            name: 'Festival of Lights',
            type: 'social',
            scope: 'local',
            description: 'Annual celebration bringing the community together'
        });
        
        this.engine.worldState.addEvent({
            name: 'Bandit Activity Reports',
            type: 'political',
            scope: 'regional',
            description: 'Increased bandit activity on trade routes'
        });
        
        // Adjust world parameters
        this.engine.worldState.updateGlobalParameter('tension', 15, 'Test world setup');
        this.engine.worldState.updateGlobalParameter('economicState', 10, 'Test world setup');
        
        // Save test world
        await this.engine.saveGame('test-world.json');
        
        console.log('✅ Test world created and saved to test-world.json');
        console.log('📊 World statistics:');
        console.log(`   NPCs: ${Object.keys(this.engine.entityManager.entities.npc).length}`);
        console.log(`   Factions: ${Object.keys(this.engine.entityManager.entities.faction).length}`);
        console.log(`   Locations: ${Object.keys(this.engine.entityManager.entities.location).length}`);
        console.log(`   Active Events: ${this.engine.worldState.events.current.length}`);
    }
    
    async benchmarkEngine() {
        console.log('📊 Running engine performance benchmark...');
        
        this.engine = new StoryEngine('test_api_key');
        
        const startTime = Date.now();
        const iterations = 100;
        
        // Benchmark entity creation
        console.log('🔧 Benchmarking entity creation...');
        const entityStart = Date.now();
        
        for (let i = 0; i < iterations; i++) {
            this.engine.entityManager.createEntity('npc', `benchmark_npc_${i}`, {
                name: `Benchmark NPC ${i}`,
                occupation: 'test',
                age: 25 + (i % 50),
                location: 'test_location'
            });
        }
        
        const entityTime = Date.now() - entityStart;
        console.log(`   Created ${iterations} NPCs in ${entityTime}ms (${(entityTime/iterations).toFixed(2)}ms per entity)`);
        
        // Benchmark relationship operations
        console.log('🔗 Benchmarking relationship operations...');
        const relStart = Date.now();
        
        for (let i = 0; i < iterations - 1; i++) {
            this.engine.relationshipGraph.setRelationship(
                `benchmark_npc_${i}`, 
                `benchmark_npc_${i + 1}`, 
                { type: 'neutral', strength: 50 + (i % 50) }
            );
        }
        
        const relTime = Date.now() - relStart;
        console.log(`   Created ${iterations - 1} relationships in ${relTime}ms (${(relTime/(iterations-1)).toFixed(2)}ms per relationship)`);
        
        // Benchmark world state compilation
        console.log('🌍 Benchmarking world state compilation...');
        const compileStart = Date.now();
        
        for (let i = 0; i < 50; i++) {
            this.engine.compileGameState();
        }
        
        const compileTime = Date.now() - compileStart;
        console.log(`   Compiled world state 50 times in ${compileTime}ms (${(compileTime/50).toFixed(2)}ms per compilation)`);
        
        const totalTime = Date.now() - startTime;
        console.log(`\n⏱️ Total benchmark time: ${totalTime}ms`);
        
        // Memory usage
        const memUsage = process.memoryUsage();
        console.log(`💾 Memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
        
        console.log('✅ Benchmark complete!');
    }
    
    async validateDataIntegrity() {
        console.log('🔍 Validating data integrity...');
        
        try {
            this.engine = new StoryEngine('test_api_key');
            await this.engine.loadGame('test-world.json');
            
            const integrity = this.engine.validationSystem.validateGameStateIntegrity(this.engine.compileGameState());
            
            console.log('\n📊 INTEGRITY REPORT:');
            console.log(`   Status: ${integrity.valid ? '✅ VALID' : '❌ INVALID'}`);
            console.log(`   Errors: ${integrity.errors.length}`);
            console.log(`   Warnings: ${integrity.warnings.length}`);
            
            if (integrity.errors.length > 0) {
                console.log('\n❌ ERRORS:');
                integrity.errors.forEach(error => console.log(`   • ${error}`));
            }
            
            if (integrity.warnings.length > 0) {
                console.log('\n⚠️ WARNINGS:');
                integrity.warnings.forEach(warning => console.log(`   • ${warning}`));
            }
            
            console.log('\n📈 STATISTICS:');
            Object.entries(integrity.statistics).forEach(([key, value]) => {
                console.log(`   ${key}: ${value}`);
            });
            
        } catch (error) {
            console.error('❌ Validation failed:', error.message);
        }
    }
}

// CLI interface for dev tools
const command = process.argv[2];
const devTools = new DevTools();

switch (command) {
    case 'create-test-world':
        devTools.createTestWorld();
        break;
    case 'benchmark':
        devTools.benchmarkEngine();
        break;
    case 'validate':
        devTools.validateDataIntegrity();
        break;
    default:
        console.log('🔧 Development Tools');
        console.log('Available commands:');
        console.log('  create-test-world  - Create comprehensive test world');
        console.log('  benchmark         - Run performance benchmarks');
        console.log('  validate          - Validate data integrity');
        console.log('\nUsage: node scripts/dev-tools.js <command>');
}
