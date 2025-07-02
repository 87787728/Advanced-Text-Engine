const RelationshipGraph = require('../../src/core/RelationshipGraph');

describe('RelationshipGraph', () => {
    let relationshipGraph;
    
    beforeEach(() => {
        relationshipGraph = new RelationshipGraph();
    });
    
    test('should set relationship between entities', () => {
        const relationshipData = {
            type: 'ally',
            strength: 75,
            reason: 'helped in battle'
        };
        
        const relationship = relationshipGraph.setRelationship('npc1', 'npc2', relationshipData);
        
        expect(relationship.type).toBe('ally');
        expect(relationship.strength).toBe(75);
        expect(relationship.reason).toBe('helped in battle');
    });
    
    test('should retrieve relationship', () => {
        const relationshipData = { type: 'enemy', strength: 60 };
        relationshipGraph.setRelationship('npc1', 'npc2', relationshipData);
        
        const retrieved = relationshipGraph.getRelationship('npc1', 'npc2');
        
        expect(retrieved.type).toBe('enemy');
        expect(retrieved.strength).toBe(60);
    });
    
    test('should update relationship', () => {
        relationshipGraph.setRelationship('npc1', 'npc2', { type: 'neutral', strength: 50 });
        
        const updated = relationshipGraph.updateRelationship('npc1', 'npc2', { strength: 75 });
        
        expect(updated.strength).toBe(75);
        expect(updated.history).toHaveLength(1);
    });
    
    test('should set and update player standing', () => {
        relationshipGraph.setPlayerStanding('faction1', { value: 10 });
        
        const updated = relationshipGraph.updatePlayerStanding('faction1', 15, 'completed quest');
        
        expect(updated.value).toBe(25);
        expect(updated.lastChange.reason).toBe('completed quest');
    });
    
    test('should find allies', () => {
        relationshipGraph.setRelationship('npc1', 'npc2', { type: 'ally', strength: 80 });
        relationshipGraph.setRelationship('npc1', 'npc3', { type: 'ally', strength: 60 });
        relationshipGraph.setRelationship('npc1', 'npc4', { type: 'enemy', strength: 70 });
        
        const allies = relationshipGraph.findAllies('npc1', 70);
        
        expect(allies).toHaveLength(1);
        expect(allies[0].entityId).toBe('npc2');
    });
    
    test('should analyze relationship network', () => {
        relationshipGraph.setRelationship('npc1', 'npc2', { type: 'ally', strength: 80 });
        relationshipGraph.setRelationship('npc1', 'npc3', { type: 'enemy', strength: 60 });
        relationshipGraph.setRelationship('npc1', 'npc4', { type: 'neutral', strength: 40 });
        
        const analysis = relationshipGraph.analyzeRelationshipNetwork('npc1');
        
        expect(analysis.directConnections).toBe(3);
        expect(analysis.allies).toBe(1);
        expect(analysis.enemies).toBe(1);
        expect(analysis.neutral).toBe(1);
        expect(analysis.mostTrusted).toBe('npc2');
    });
});
