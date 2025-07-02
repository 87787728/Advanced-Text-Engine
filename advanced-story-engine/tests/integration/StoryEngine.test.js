const StoryEngine = require('../../src/core/StoryEngine');

describe('StoryEngine Integration', () => {
    let engine;
    
    beforeEach(() => {
        // Use a test API key - in a real scenario, this would be mocked
        engine = new StoryEngine('test_api_key');
    });
    
    test('should initialize with default world state', () => {
        expect(engine.player.name).toBe('Traveler');
        expect(engine.player.currentLocation).toBe('village_square');
        
        const villageSquare = engine.entityManager.getEntity('location', 'village_square');
        expect(villageSquare).toBeDefined();
        expect(villageSquare.name).toBe('Village Square');
        
        const villageElder = engine.entityManager.getEntity('npc', 'village_elder');
        expect(villageElder).toBeDefined();
        expect(villageElder.name).toBe('Elder Thane');
    });
    
    test('should compile comprehensive game state', () => {
        const gameState = engine.compileGameState();
        
        expect(gameState.player).toBeDefined();
        expect(gameState.entities).toBeDefined();
        expect(gameState.relationships).toBeDefined();
        expect(gameState.worldState).toBeDefined();
        expect(gameState.storyContext).toBeDefined();
        expect(gameState.meta).toBeDefined();
    });
    
    test('should analyze player profile', () => {
        // Simulate some choices and reputation changes
        engine.player.reputation.heroic = 15;
        engine.player.reputation.diplomatic = 10;
        engine.player.skills.combat = 25;
        engine.player.skills.diplomacy = 30;
        
        const profile = engine.analyzePlayerProfile();
        
        expect(profile.dominantReputation.type).toBe('heroic');
        expect(profile.strongestSkills[0].skill).toBe('diplomacy');
        expect(profile.strongestSkills[0].level).toBe(30);
    });
    
    test('should track choice consequences', () => {
        const initialTension = engine.worldState.globalParameters.tension;
        
        const consequences = {
            worldEffects: { tension: 5 },
            playerEffects: { 
                reputation: { heroic: 2 },
                skills: { combat: 1 }
            }
        };
        
        engine.applyConsequences(consequences);
        
        expect(engine.worldState.globalParameters.tension).toBe(initialTension + 5);
        expect(engine.player.reputation.heroic).toBe(2);
        expect(engine.player.skills.combat).toBe(11);
    });
    
    test('should export and import game state', async () => {
        // Modify some state
        engine.player.name = 'Test Hero';
        engine.player.level = 5;
        engine.worldState.globalParameters.tension = 75;
        
        // Export
        const exportedState = engine.getDetailedGameState();
        
        // Create new engine and import
        const newEngine = new StoryEngine('test_api_key');
        newEngine.restoreGameState(exportedState);
        
        expect(newEngine.player.name).toBe('Test Hero');
        expect(newEngine.player.level).toBe(5);
        expect(newEngine.worldState.globalParameters.tension).toBe(75);
    });
    
    test('should validate save file integrity', () => {
        const validSaveFile = {
            player: engine.player,
            entities: engine.entityManager.entities,
            worldState: engine.worldState,
            meta: engine.meta
        };
        
        expect(engine.validateSaveFile(validSaveFile)).toBe(true);
        
        const invalidSaveFile = {
            player: engine.player
            // missing required sections
        };
        
        expect(engine.validateSaveFile(invalidSaveFile)).toBe(false);
    });
});
