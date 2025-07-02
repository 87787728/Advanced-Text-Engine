const { VALIDATION_RULES, ENTITY_TYPES } = require('../utils/Constants');

class ValidationSystem {
    constructor() {
        this.rules = VALIDATION_RULES;
        this.customValidators = new Map();
    }
    
    addCustomValidator(entityType, validatorName, validatorFunction) {
        if (!this.customValidators.has(entityType)) {
            this.customValidators.set(entityType, new Map());
        }
        this.customValidators.get(entityType).set(validatorName, validatorFunction);
    }
    
    async validateNPCCreation(npcData, gameState) {
        const validation = { valid: true, warnings: [], requirements: [] };
        
        // Check location capacity
        if (npcData.location) {
            const locationNPCs = Object.values(gameState.entities[ENTITY_TYPES.NPC] || {})
                .filter(npc => npc.location === npcData.location);
            
            if (locationNPCs.length >= this.rules.MAX_NPCS_PER_LOCATION) {
                validation.valid = false;
                validation.warnings.push(`Location ${npcData.location} has reached maximum NPC capacity (${this.rules.MAX_NPCS_PER_LOCATION})`);
                return validation;
            }
        }
        
        // Validate name uniqueness
        const existingNPCs = Object.values(gameState.entities[ENTITY_TYPES.NPC] || {});
        if (existingNPCs.some(npc => npc.name === npcData.name)) {
            validation.warnings.push(`NPC with name "${npcData.name}" already exists`);
        }
        
        // Validate age constraints
        if (npcData.age !== undefined) {
            if (npcData.age < 1 || npcData.age > 1000) {
                validation.valid = false;
                validation.warnings.push('NPC age must be between 1 and 1000');
                return validation;
            }
        }
        
        // Validate occupation consistency
        if (npcData.occupation && npcData.location) {
            const locationData = gameState.entities[ENTITY_TYPES.LOCATION]?.[npcData.location];
            if (locationData) {
                const compatibilityCheck = this.checkOccupationLocationCompatibility(npcData.occupation, locationData);
                if (!compatibilityCheck.compatible) {
                    validation.warnings.push(compatibilityCheck.reason);
                }
            }
        }
        
        // Run custom validators
        await this.runCustomValidators(ENTITY_TYPES.NPC, npcData, gameState, validation);
        
        return validation;
    }
    
    async validateFactionCreation(factionData, gameState) {
        const validation = { valid: true, warnings: [], requirements: [] };
        
        // Check territory control limits
        if (factionData.territory) {
            for (const territoryId of factionData.territory) {
                const controllingFactions = Object.values(gameState.entities[ENTITY_TYPES.FACTION] || {})
                    .filter(faction => faction.territory.includes(territoryId));
                
                if (controllingFactions.length >= this.rules.MAX_FACTIONS_PER_TERRITORY) {
                    validation.valid = false;
                    validation.warnings.push(`Territory ${territoryId} has reached maximum faction control (${this.rules.MAX_FACTIONS_PER_TERRITORY})`);
                    return validation;
                }
            }
        }
        
        // Validate faction name uniqueness
        const existingFactions = Object.values(gameState.entities[ENTITY_TYPES.FACTION] || {});
        if (existingFactions.some(faction => faction.name === factionData.name)) {
            validation.warnings.push(`Faction with name "${factionData.name}" already exists`);
        }
        
        // Validate influence range
        if (factionData.influence !== undefined) {
            if (factionData.influence < 0 || factionData.influence > 100) {
                validation.valid = false;
                validation.warnings.push('Faction influence must be between 0 and 100');
                return validation;
            }
        }
        
        // Validate leadership exists
        if (factionData.leadership) {
            for (const leaderId of factionData.leadership) {
                if (!gameState.entities[ENTITY_TYPES.NPC]?.[leaderId]) {
                    validation.warnings.push(`Leadership NPC ${leaderId} does not exist`);
                }
            }
        }
        
        // Validate allies and enemies don't overlap
        if (factionData.allies && factionData.enemies) {
            const overlap = factionData.allies.filter(ally => factionData.enemies.includes(ally));
            if (overlap.length > 0) {
                validation.valid = false;
                validation.warnings.push(`Factions cannot be both allies and enemies: ${overlap.join(', ')}`);
                return validation;
            }
        }
        
        await this.runCustomValidators(ENTITY_TYPES.FACTION, factionData, gameState, validation);
        
        return validation;
    }
    
    async validateLocationCreation(locationData, gameState) {
        const validation = { valid: true, warnings: [], requirements: [] };
        
        // Validate safety range
        if (locationData.safety !== undefined) {
            if (locationData.safety < 0 || locationData.safety > 100) {
                validation.valid = false;
                validation.warnings.push('Location safety must be between 0 and 100');
                return validation;
            }
        }
        
        // Validate population constraints
        if (locationData.population !== undefined) {
            if (locationData.population < 0) {
                validation.valid = false;
                validation.warnings.push('Location population cannot be negative');
                return validation;
            }
            
            // Check if population matches location type
            const populationLimits = {
                'settlement': { min: 10, max: 10000 },
                'wilderness': { min: 0, max: 50 },
                'structure': { min: 0, max: 100 },
                'landmark': { min: 0, max: 200 },
                'dungeon': { min: 0, max: 500 }
            };
            
            const limits = populationLimits[locationData.type];
            if (limits && (locationData.population < limits.min || locationData.population > limits.max)) {
                validation.warnings.push(`Population ${locationData.population} may be unrealistic for ${locationData.type} (suggested range: ${limits.min}-${limits.max})`);
            }
        }
        
        // Validate connections exist
        if (locationData.connectedTo) {
            for (const connectionId of locationData.connectedTo) {
                if (!gameState.entities[ENTITY_TYPES.LOCATION]?.[connectionId]) {
                    validation.warnings.push(`Connected location ${connectionId} does not exist`);
                }
            }
        }
        
        // Validate controlling faction exists
        if (locationData.controlledBy) {
            if (!gameState.entities[ENTITY_TYPES.FACTION]?.[locationData.controlledBy]) {
                validation.warnings.push(`Controlling faction ${locationData.controlledBy} does not exist`);
            }
        }
        
        await this.runCustomValidators(ENTITY_TYPES.LOCATION, locationData, gameState, validation);
        
        return validation;
    }
    
    async validateItemCreation(itemData, gameState) {
        const validation = { valid: true, warnings: [], requirements: [] };
        
        // Validate value
        if (itemData.value !== undefined) {
            if (itemData.value < 0) {
                validation.valid = false;
                validation.warnings.push('Item value cannot be negative');
                return validation;
            }
            
            if (itemData.value > 100000) {
                validation.warnings.push('Item value seems extremely high - may affect game balance');
            }
        }
        
        // Validate weight
        if (itemData.weight !== undefined) {
            if (itemData.weight < 0) {
                validation.valid = false;
                validation.warnings.push('Item weight cannot be negative');
                return validation;
            }
        }
        
        // Validate durability
        if (itemData.durability !== undefined) {
            if (itemData.durability < 0 || itemData.durability > 100) {
                validation.valid = false;
                validation.warnings.push('Item durability must be between 0 and 100');
                return validation;
            }
        }
        
        // Validate rarity consistency with value
        if (itemData.rarity && itemData.value !== undefined) {
            const rarityValueRanges = {
                'common': { min: 1, max: 100 },
                'uncommon': { min: 50, max: 500 },
                'rare': { min: 200, max: 2000 },
                'epic': { min: 1000, max: 10000 },
                'legendary': { min: 5000, max: 100000 }
            };
            
            const range = rarityValueRanges[itemData.rarity];
            if (range && (itemData.value < range.min || itemData.value > range.max)) {
                validation.warnings.push(`Item value ${itemData.value} may not match rarity "${itemData.rarity}" (suggested range: ${range.min}-${range.max})`);
            }
        }
        
        // Validate location exists if specified
        if (itemData.location && itemData.location !== 'player_inventory' && itemData.location !== 'world') {
            if (!gameState.entities[ENTITY_TYPES.LOCATION]?.[itemData.location]) {
                validation.warnings.push(`Item location ${itemData.location} does not exist`);
            }
        }
        
        await this.runCustomValidators(ENTITY_TYPES.ITEM, itemData, gameState, validation);
        
        return validation;
    }
    
    async validateEventCreation(eventData, gameState) {
        const validation = { valid: true, warnings: [], requirements: [] };
        
        // Check active event limit
        const activeEvents = gameState.worldState.events.current || [];
        if (activeEvents.length >= this.rules.MAX_ACTIVE_EVENTS) {
            validation.valid = false;
            validation.warnings.push(`Maximum number of active events reached (${this.rules.MAX_ACTIVE_EVENTS})`);
            return validation;
        }
        
        // Validate event duration
        if (eventData.duration && !['ongoing', 'temporary', 'permanent'].includes(eventData.duration)) {
            validation.warnings.push('Event duration should be "ongoing", "temporary", or "permanent"');
        }
        
        // Validate scope
        if (eventData.scope && !['local', 'regional', 'global'].includes(eventData.scope)) {
            validation.warnings.push('Event scope should be "local", "regional", or "global"');
        }
        
        // Validate participants exist
        if (eventData.participants) {
            for (const participantId of eventData.participants) {
                const participantExists = this.findEntityInGameState(participantId, gameState);
                if (!participantExists) {
                    validation.warnings.push(`Event participant ${participantId} does not exist`);
                }
            }
        }
        
        // Validate against world state
        if (eventData.type === 'political' && gameState.worldState.globalParameters.politicalStability < 30) {
            validation.warnings.push('Political events during low stability may cause significant unrest');
        }
        
        await this.runCustomValidators(ENTITY_TYPES.EVENT, eventData, gameState, validation);
        
        return validation;
    }
    
    checkOccupationLocationCompatibility(occupation, locationData) {
        const compatibilityMap = {
            'merchant': ['settlement', 'structure'],
            'guard': ['settlement', 'structure'],
            'farmer': ['settlement', 'wilderness'],
            'bandit': ['wilderness'],
            'scholar': ['settlement', 'structure'],
            'noble': ['settlement', 'structure'],
            'priest': ['settlement', 'structure'],
            'hermit': ['wilderness', 'landmark'],
            'blacksmith': ['settlement'],
            'tavern_keeper': ['settlement'],
            'soldier': ['settlement', 'structure'],
            'mage': ['settlement', 'structure', 'landmark'],
            'thief': ['settlement', 'wilderness']
        };
        
        const compatibleTypes = compatibilityMap[occupation] || ['settlement', 'wilderness', 'structure', 'landmark'];
        
        if (compatibleTypes.includes(locationData.type)) {
            return { compatible: true };
        } else {
            return { 
                compatible: false, 
                reason: `Occupation "${occupation}" may not be suitable for location type "${locationData.type}"` 
            };
        }
    }
    
    findEntityInGameState(entityId, gameState) {
        for (const entityType of Object.values(ENTITY_TYPES)) {
            if (gameState.entities[entityType]?.[entityId]) {
                return gameState.entities[entityType][entityId];
            }
        }
        return null;
    }
    
    async runCustomValidators(entityType, entityData, gameState, validation) {
        if (this.customValidators.has(entityType)) {
            const validators = this.customValidators.get(entityType);
            
            for (const [validatorName, validatorFunction] of validators) {
                try {
                    const result = await validatorFunction(entityData, gameState, validation);
                    if (result && typeof result === 'object') {
                        Object.assign(validation, result);
                    }
                } catch (error) {
                    validation.warnings.push(`Custom validator "${validatorName}" failed: ${error.message}`);
                }
            }
        }
    }
    
    validateGameStateIntegrity(gameState) {
        const integrity = {
            valid: true,
            errors: [],
            warnings: [],
            statistics: {}
        };
        
        // Check for orphaned references
        this.checkOrphanedReferences(gameState, integrity);
        
        // Check relationship consistency
        this.checkRelationshipConsistency(gameState, integrity);
        
        // Check world parameter bounds
        this.checkWorldParameterBounds(gameState, integrity);
        
        // Generate statistics
        this.generateIntegrityStatistics(gameState, integrity);
        
        return integrity;
    }
    
    checkOrphanedReferences(gameState, integrity) {
        // Check NPC locations
        Object.entries(gameState.entities[ENTITY_TYPES.NPC] || {}).forEach(([npcId, npc]) => {
            if (npc.location && !gameState.entities[ENTITY_TYPES.LOCATION]?.[npc.location]) {
                integrity.errors.push(`NPC ${npc.name} (${npcId}) references non-existent location: ${npc.location}`);
            }
        });
        
        // Check faction leadership
        Object.entries(gameState.entities[ENTITY_TYPES.FACTION] || {}).forEach(([factionId, faction]) => {
            faction.leadership.forEach(leaderId => {
                if (!gameState.entities[ENTITY_TYPES.NPC]?.[leaderId]) {
                    integrity.errors.push(`Faction ${faction.name} (${factionId}) references non-existent leader: ${leaderId}`);
                }
            });
        });
        
        // Check location connections
        Object.entries(gameState.entities[ENTITY_TYPES.LOCATION] || {}).forEach(([locationId, location]) => {
            location.connectedTo.forEach(connectedId => {
                if (!gameState.entities[ENTITY_TYPES.LOCATION]?.[connectedId]) {
                    integrity.errors.push(`Location ${location.name} (${locationId}) references non-existent connection: ${connectedId}`);
                }
            });
        });
    }
    
    checkRelationshipConsistency(gameState, integrity) {
        // This would integrate with the RelationshipGraph
        // For now, basic placeholder
        integrity.statistics.relationshipConsistency = 'checked';
    }
    
    checkWorldParameterBounds(gameState, integrity) {
        Object.entries(gameState.worldState.globalParameters || {}).forEach(([param, value]) => {
            if (value < 0 || value > 100) {
                integrity.errors.push(`World parameter ${param} is out of bounds: ${value}`);
            }
        });
    }
    
    generateIntegrityStatistics(gameState, integrity) {
        integrity.statistics = {
            totalNPCs: Object.keys(gameState.entities[ENTITY_TYPES.NPC] || {}).length,
            totalFactions: Object.keys(gameState.entities[ENTITY_TYPES.FACTION] || {}).length,
            totalLocations: Object.keys(gameState.entities[ENTITY_TYPES.LOCATION] || {}).length,
            totalItems: Object.keys(gameState.entities[ENTITY_TYPES.ITEM] || {}).length,
            activeEvents: gameState.worldState.events.current.length,
            errors: integrity.errors.length,
            warnings: integrity.warnings.length
        };
    }
}

module.exports = ValidationSystem;