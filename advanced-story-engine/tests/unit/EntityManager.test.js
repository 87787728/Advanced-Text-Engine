const EntityManager = require('../../src/core/EntityManager');
const { ENTITY_TYPES } = require('../../src/utils/Constants');

describe('EntityManager', () => {
    let entityManager;
    
    beforeEach(() => {
        entityManager = new EntityManager();
    });
    
    test('should create NPC entity', () => {
        const npcData = {
            name: 'Test NPC',
            occupation: 'merchant',
            age: 30,
            location: 'test_location'
        };
        
        const npc = entityManager.createEntity(ENTITY_TYPES.NPC, 'test_npc', npcData);
        
        expect(npc).toBeDefined();
        expect(npc.name).toBe('Test NPC');
        expect(npc.occupation).toBe('merchant');
        expect(npc.trust).toBe(50); // default value
    });
    
    test('should prevent duplicate entity creation', () => {
        const npcData = { name: 'Test NPC' };
        
        entityManager.createEntity(ENTITY_TYPES.NPC, 'test_npc', npcData);
        
        expect(() => {
            entityManager.createEntity(ENTITY_TYPES.NPC, 'test_npc', npcData);
        }).toThrow('Entity test_npc of type npc already exists');
    });
    
    test('should retrieve entity by type and id', () => {
        const npcData = { name: 'Test NPC' };
        const created = entityManager.createEntity(ENTITY_TYPES.NPC, 'test_npc', npcData);
        
        const retrieved = entityManager.getEntity(ENTITY_TYPES.NPC, 'test_npc');
        
        expect(retrieved).toBe(created);
    });
    
    test('should return null for non-existent entity', () => {
        const retrieved = entityManager.getEntity(ENTITY_TYPES.NPC, 'non_existent');
        
        expect(retrieved).toBeNull();
    });
    
    test('should update entity', () => {
        const npcData = { name: 'Test NPC', age: 30 };
        entityManager.createEntity(ENTITY_TYPES.NPC, 'test_npc', npcData);
        
        const updated = entityManager.updateEntity(ENTITY_TYPES.NPC, 'test_npc', { age: 35 });
        
        expect(updated.age).toBe(35);
        expect(updated.lastModified).toBeDefined();
    });
    
    test('should validate NPC creation', () => {
        const gameState = {
            entities: { npc: {} },
            player: { currentLocation: 'test_location' }
        };
        
        const npcData = {
            name: 'Test NPC',
            location: 'test_location',
            age: 25
        };
        
        const validation = entityManager.validateEntityCreation(ENTITY_TYPES.NPC, npcData, gameState);
        
        expect(validation.valid).toBe(true);
    });
});
