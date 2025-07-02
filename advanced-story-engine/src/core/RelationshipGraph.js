const { RELATIONSHIP_TYPES } = require('../utils/Constants');

class RelationshipGraph {
    constructor() {
        this.relationships = new Map(); // entityId -> Map(targetEntityId -> relationship)
        this.playerStandings = new Map(); // entityId -> standing data
        this.relationshipHistory = [];
    }
    
    setRelationship(entity1Id, entity2Id, relationshipData) {
        if (!this.relationships.has(entity1Id)) {
            this.relationships.set(entity1Id, new Map());
        }
        
        const relationship = {
            type: relationshipData.type || 'neutral',
            strength: relationshipData.strength || 50,
            reason: relationshipData.reason || '',
            established: relationshipData.established || new Date().toISOString(),
            lastModified: new Date().toISOString(),
            history: relationshipData.history || []
        };
        
        this.relationships.get(entity1Id).set(entity2Id, relationship);
        
        // Record in history
        this.relationshipHistory.push({
            entity1: entity1Id,
            entity2: entity2Id,
            action: 'established',
            relationship: relationship,
            timestamp: new Date().toISOString()
        });
        
        return relationship;
    }
    
    updateRelationship(entity1Id, entity2Id, changes) {
        if (!this.relationships.has(entity1Id) || !this.relationships.get(entity1Id).has(entity2Id)) {
            throw new Error(`Relationship between ${entity1Id} and ${entity2Id} does not exist`);
        }
        
        const relationship = this.relationships.get(entity1Id).get(entity2Id);
        const oldRelationship = { ...relationship };
        
        // Apply changes
        Object.assign(relationship, changes);
        relationship.lastModified = new Date().toISOString();
        
        // Add to history
        relationship.history.push({
            change: changes,
            previousState: oldRelationship,
            timestamp: new Date().toISOString()
        });
        
        this.relationshipHistory.push({
            entity1: entity1Id,
            entity2: entity2Id,
            action: 'updated',
            changes: changes,
            timestamp: new Date().toISOString()
        });
        
        return relationship;
    }
    
    getRelationship(entity1Id, entity2Id) {
        if (this.relationships.has(entity1Id)) {
            return this.relationships.get(entity1Id).get(entity2Id) || null;
        }
        return null;
    }
    
    getAllRelationships(entityId) {
        if (this.relationships.has(entityId)) {
            return Object.fromEntries(this.relationships.get(entityId));
        }
        return {};
    }
    
    setPlayerStanding(entityId, standing) {
        this.playerStandings.set(entityId, {
            value: standing.value || 0,
            history: standing.history || [],
            lastChange: standing.lastChange || null,
            established: standing.established || new Date().toISOString()
        });
    }
    
    updatePlayerStanding(entityId, change, reason = '') {
        if (!this.playerStandings.has(entityId)) {
            this.setPlayerStanding(entityId, { value: 0 });
        }
        
        const standing = this.playerStandings.get(entityId);
        const oldValue = standing.value;
        standing.value += change;
        standing.lastChange = {
            amount: change,
            reason: reason,
            timestamp: new Date().toISOString(),
            previousValue: oldValue
        };
        
        standing.history.push(standing.lastChange);
        
        // Keep history manageable
        if (standing.history.length > 50) {
            standing.history = standing.history.slice(-50);
        }
        
        return standing;
    }
    
    getPlayerStanding(entityId) {
        return this.playerStandings.get(entityId) || { value: 0, history: [], lastChange: null };
    }
    
    getAllPlayerStandings() {
        return Object.fromEntries(this.playerStandings);
    }
    
    calculateRelationshipStrength(entity1Id, entity2Id) {
        const directRelationship = this.getRelationship(entity1Id, entity2Id);
        if (directRelationship) {
            return directRelationship.strength;
        }
        
        // Calculate indirect relationship through mutual connections
        let indirectStrength = 0;
        let connectionCount = 0;
        
        if (this.relationships.has(entity1Id)) {
            for (const [intermediateId, relationship1] of this.relationships.get(entity1Id)) {
                const relationship2 = this.getRelationship(intermediateId, entity2Id);
                if (relationship2) {
                    indirectStrength += (relationship1.strength * relationship2.strength) / 100;
                    connectionCount++;
                }
            }
        }
        
        return connectionCount > 0 ? indirectStrength / connectionCount : 0;
    }
    
    findAllies(entityId, minimumStrength = 70) {
        const allies = [];
        if (this.relationships.has(entityId)) {
            for (const [targetId, relationship] of this.relationships.get(entityId)) {
                if (relationship.type === 'ally' && relationship.strength >= minimumStrength) {
                    allies.push({
                        entityId: targetId,
                        relationship: relationship
                    });
                }
            }
        }
        return allies;
    }
    
    findEnemies(entityId, minimumHostility = 30) {
        const enemies = [];
        if (this.relationships.has(entityId)) {
            for (const [targetId, relationship] of this.relationships.get(entityId)) {
                if (relationship.type === 'enemy' && relationship.strength >= minimumHostility) {
                    enemies.push({
                        entityId: targetId,
                        relationship: relationship
                    });
                }
            }
        }
        return enemies;
    }
    
    analyzeRelationshipNetwork(entityId) {
        const analysis = {
            directConnections: 0,
            allies: 0,
            enemies: 0,
            neutral: 0,
            averageStrength: 0,
            mostTrusted: null,
            mostFeared: null,
            networkInfluence: 0
        };
        
        if (!this.relationships.has(entityId)) {
            return analysis;
        }
        
        const relationships = this.relationships.get(entityId);
        analysis.directConnections = relationships.size;
        
        let totalStrength = 0;
        let maxTrust = 0;
        let maxFear = 0;
        
        for (const [targetId, relationship] of relationships) {
            totalStrength += relationship.strength;
            
            switch (relationship.type) {
                case 'ally':
                    analysis.allies++;
                    break;
                case 'enemy':
                    analysis.enemies++;
                    break;
                default:
                    analysis.neutral++;
            }
            
            if (relationship.strength > maxTrust && relationship.type === 'ally') {
                maxTrust = relationship.strength;
                analysis.mostTrusted = targetId;
            }
            
            if (relationship.strength > maxFear && relationship.type === 'enemy') {
                maxFear = relationship.strength;
                analysis.mostFeared = targetId;
            }
        }
        
        analysis.averageStrength = relationships.size > 0 ? totalStrength / relationships.size : 0;
        analysis.networkInfluence = (analysis.allies * 2) - analysis.enemies + analysis.neutral;
        
        return analysis;
    }
    
    exportRelationships() {
        return {
            relationships: Object.fromEntries(
                Array.from(this.relationships.entries()).map(([key, value]) => [
                    key,
                    Object.fromEntries(value)
                ])
            ),
            playerStandings: Object.fromEntries(this.playerStandings),
            relationshipHistory: this.relationshipHistory.slice(-100), // Keep recent history
            timestamp: new Date().toISOString()
        };
    }
    
    importRelationships(data) {
        // Reconstruct relationships Map
        this.relationships = new Map();
        if (data.relationships) {
            for (const [entityId, entityRelationships] of Object.entries(data.relationships)) {
                this.relationships.set(entityId, new Map(Object.entries(entityRelationships)));
            }
        }
        
        // Reconstruct player standings
        this.playerStandings = new Map(Object.entries(data.playerStandings || {}));
        this.relationshipHistory = data.relationshipHistory || [];
    }
}

module.exports = RelationshipGraph;