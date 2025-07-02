const { NPC, Faction, Location, Item, GameEvent } = require('../utils/DataStructures');
const { ENTITY_TYPES, VALIDATION_RULES } = require('../utils/Constants');

class EntityManager {
    constructor() {
        this.entities = {
            [ENTITY_TYPES.NPC]: {},
            [ENTITY_TYPES.FACTION]: {},
            [ENTITY_TYPES.LOCATION]: {},
            [ENTITY_TYPES.ITEM]: {},
            [ENTITY_TYPES.EVENT]: {}
        };
        
        this.creationHistory = {
            [ENTITY_TYPES.NPC]: [],
            [ENTITY_TYPES.FACTION]: [],
            [ENTITY_TYPES.LOCATION]: [],
            [ENTITY_TYPES.ITEM]: [],
            [ENTITY_TYPES.EVENT]: []
        };
    }
    
    createEntity(type, id, data) {
        if (this.entities[type][id]) {
            throw new Error(`Entity ${id} of type ${type} already exists`);
        }
        
        let entity;
        switch (type) {
            case ENTITY_TYPES.NPC:
                entity = new NPC(id, data);
                break;
            case ENTITY_TYPES.FACTION:
                entity = new Faction(id, data);
                break;
            case ENTITY_TYPES.LOCATION:
                entity = new Location(id, data);
                break;
            case ENTITY_TYPES.ITEM:
                entity = new Item(id, data);
                break;
            case ENTITY_TYPES.EVENT:
                entity = new GameEvent(id, data);
                break;
            default:
                throw new Error(`Unknown entity type: ${type}`);
        }
        
        this.entities[type][id] = entity;
        this.creationHistory[type].push({
            id: id,
            created: new Date().toISOString(),
            data: data
        });
        
        return entity;
    }
    
    getEntity(type, id) {
        return this.entities[type][id] || null;
    }
    
    getAllEntities(type) {
        return Object.values(this.entities[type]);
    }
    
    updateEntity(type, id, data) {
        const entity = this.getEntity(type, id);
        if (entity) {
            entity.update(data);
            return entity;
        }
        return null;
    }
    
    deleteEntity(type, id) {
        if (this.entities[type][id]) {
            delete this.entities[type][id];
            return true;
        }
        return false;
    }
    
    validateEntityCreation(type, data, currentGameState) {
        switch (type) {
            case ENTITY_TYPES.NPC:
                return this.validateNPCCreation(data, currentGameState);
            case ENTITY_TYPES.FACTION:
                return this.validateFactionCreation(data, currentGameState);
            case ENTITY_TYPES.LOCATION:
                return this.validateLocationCreation(data, currentGameState);
            case ENTITY_TYPES.ITEM:
                return this.validateItemCreation(data, currentGameState);
            case ENTITY_TYPES.EVENT:
                return this.validateEventCreation(data, currentGameState);
            default:
                return { valid: false, reason: 'Unknown entity type' };
        }
    }
    
    validateNPCCreation(data, gameState) {
        const locationEntities = this.getAllEntities(ENTITY_TYPES.NPC)
            .filter(npc => npc.location === data.location);
            
        if (locationEntities.length >= VALIDATION_RULES.MAX_NPCS_PER_LOCATION) {
            return { 
                valid: false, 
                reason: `Location ${data.location} has reached maximum NPC capacity` 
            };
        }
        
        return { valid: true };
    }
    
    validateFactionCreation(data, gameState) {
        if (data.territory) {
            for (const territory of data.territory) {
                const controllingFactions = this.getAllEntities(ENTITY_TYPES.FACTION)
                    .filter(faction => faction.territory.includes(territory));
                    
                if (controllingFactions.length >= VALIDATION_RULES.MAX_FACTIONS_PER_TERRITORY) {
                    return { 
                        valid: false, 
                        reason: `Territory ${territory} has reached maximum faction control` 
                    };
                }
            }
        }
        
        return { valid: true };
    }
    
    validateLocationCreation(data, gameState) {
        // Validate geographical consistency
        if (data.connectedTo) {
            for (const connectionId of data.connectedTo) {
                const connectedLocation = this.getEntity(ENTITY_TYPES.LOCATION, connectionId);
                if (!connectedLocation) {
                    return { 
                        valid: false, 
                        reason: `Connected location ${connectionId} does not exist` 
                    };
                }
            }
        }
        
        return { valid: true };
    }
    
    validateItemCreation(data, gameState) {
        // Basic item validation
        if (data.value < 0) {
            return { valid: false, reason: 'Item value cannot be negative' };
        }
        
        return { valid: true };
    }
    
    validateEventCreation(data, gameState) {
        const activeEvents = this.getAllEntities(ENTITY_TYPES.EVENT)
            .filter(event => !event.completed);
            
        if (activeEvents.length >= VALIDATION_RULES.MAX_ACTIVE_EVENTS) {
            return { 
                valid: false, 
                reason: 'Maximum number of active events reached' 
            };
        }
        
        return { valid: true };
    }
    
    getEntitiesByLocation(locationId) {
        return {
            npcs: this.getAllEntities(ENTITY_TYPES.NPC).filter(npc => npc.location === locationId),
            items: this.getAllEntities(ENTITY_TYPES.ITEM).filter(item => item.location === locationId)
        };
    }
    
    getEntitiesByFaction(factionId) {
        return {
            npcs: this.getAllEntities(ENTITY_TYPES.NPC).filter(npc => 
                npc.relationships[factionId] && npc.relationships[factionId].type === 'member'),
            locations: this.getAllEntities(ENTITY_TYPES.LOCATION).filter(loc => 
                loc.controlledBy === factionId)
        };
    }
    
    exportEntities() {
        return {
            entities: this.entities,
            creationHistory: this.creationHistory,
            timestamp: new Date().toISOString()
        };
    }
    
    importEntities(data) {
        this.entities = data.entities || this.entities;
        this.creationHistory = data.creationHistory || this.creationHistory;
    }
}

module.exports = EntityManager;