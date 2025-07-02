const { ENTITY_TYPES, RELATIONSHIP_TYPES } = require('./Constants');

class Entity {
    constructor(id, type, data = {}) {
        this.id = id;
        this.type = type;
        this.created = new Date().toISOString();
        this.lastModified = new Date().toISOString();
        this.metadata = data.metadata || {};
        
        // Entity-specific properties will be added by subclasses
    }
    
    update(data) {
        this.lastModified = new Date().toISOString();
        Object.assign(this, data);
    }
    
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            created: this.created,
            lastModified: this.lastModified,
            ...this
        };
    }
}

class NPC extends Entity {
    constructor(id, data) {
        super(id, ENTITY_TYPES.NPC, data);
        
        this.name = data.name || 'Unknown';
        this.displayName = data.displayName || this.name;
        this.occupation = data.occupation || 'unknown';
        this.age = data.age || 30;
        this.location = data.location || null;
        this.traits = data.traits || [];
        this.backstory = data.backstory || '';
        this.goals = data.goals || [];
        this.secrets = data.secrets || [];
        this.mood = data.mood || 'neutral';
        this.importance = data.importance || 'medium';
        
        // Relationship metrics
        this.trust = data.trust || RELATIONSHIP_TYPES.TRUST.default;
        this.fear = data.fear || RELATIONSHIP_TYPES.FEAR.default;
        this.respect = data.respect || RELATIONSHIP_TYPES.RESPECT.default;
        this.love = data.love || RELATIONSHIP_TYPES.LOVE.default;
        
        // Status
        this.met = data.met || false;
        this.alive = data.alive !== false;
        this.health = data.health || 100;
        this.lastSeen = data.lastSeen || null;
        
        // Relationships with other entities
        this.relationships = data.relationships || {};
    }
    
    adjustRelationship(metric, change) {
        if (RELATIONSHIP_TYPES[metric.toUpperCase()]) {
            const bounds = RELATIONSHIP_TYPES[metric.toUpperCase()];
            this[metric] = Math.max(bounds.min, Math.min(bounds.max, this[metric] + change));
            this.lastModified = new Date().toISOString();
        }
    }
}

class Faction extends Entity {
    constructor(id, data) {
        super(id, ENTITY_TYPES.FACTION, data);
        
        this.name = data.name || 'Unknown Faction';
        this.displayName = data.displayName || this.name;
        this.type = data.type || 'political';
        this.influence = data.influence || 40;
        this.wealth = data.wealth || 50;
        this.militaryPower = data.militaryPower || 30;
        this.attitude = data.attitude || 'neutral';
        this.territory = data.territory || [];
        this.goals = data.goals || [];
        this.allies = data.allies || [];
        this.enemies = data.enemies || [];
        this.secrets = data.secrets || [];
        this.leadership = data.leadership || [];
        this.foundedYear = data.foundedYear || 'unknown';
        this.reputation = data.reputation || 'unknown';
    }
}

class Location extends Entity {
    constructor(id, data) {
        super(id, ENTITY_TYPES.LOCATION, data);
        
        this.name = data.name || 'Unknown Location';
        this.displayName = data.displayName || this.name;
        this.type = data.type || 'settlement';
        this.visited = data.visited || false;
        this.safety = data.safety || 70;
        this.description = data.description || '';
        this.atmosphere = data.atmosphere || 'neutral';
        this.connectedTo = data.connectedTo || [];
        this.controlledBy = data.controlledBy || null;
        this.events = data.events || [];
        this.secrets = data.secrets || [];
        this.resources = data.resources || [];
        this.population = data.population || 0;
        this.wealth = data.wealth || 'poor';
    }
}

class Item extends Entity {
    constructor(id, data) {
        super(id, ENTITY_TYPES.ITEM, data);
        
        this.name = data.name || 'Unknown Item';
        this.displayName = data.displayName || this.name;
        this.type = data.type || 'misc';
        this.subtype = data.subtype || '';
        this.value = data.value || 50;
        this.weight = data.weight || 1;
        this.durability = data.durability || 100;
        this.description = data.description || '';
        this.enchantments = data.enchantments || [];
        this.history = data.history || 'unknown';
        this.location = data.location || 'world';
        this.rarity = data.rarity || 'common';
        this.properties = data.properties || [];
    }
}

class GameEvent extends Entity {
    constructor(id, data) {
        super(id, ENTITY_TYPES.EVENT, data);
        
        this.name = data.name || 'Unknown Event';
        this.displayName = data.displayName || this.name;
        this.type = data.type || 'social';
        this.scope = data.scope || 'local';
        this.duration = data.duration || 'ongoing';
        this.consequences = data.consequences || [];
        this.startTime = data.startTime || new Date().toISOString();
        this.participants = data.participants || [];
        this.completed = data.completed || false;
    }
}

module.exports = {
    Entity,
    NPC,
    Faction,
    Location,
    Item,
    GameEvent
};