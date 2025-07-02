const { ENTITY_TYPES, VALIDATION_RULES } = require('../utils/Constants');

class CreationSystem {
    constructor(entityManager, relationshipGraph, worldState, validationSystem) {
        this.entityManager = entityManager;
        this.relationshipGraph = relationshipGraph;
        this.worldState = worldState;
        this.validationSystem = validationSystem;
        
        this.creationQueue = [];
        this.processingLock = false;
    }
    
    async processEntityCreation(detectionResult) {
        if (this.processingLock) {
            this.creationQueue.push(detectionResult);
            return;
        }
        
        this.processingLock = true;
        
        try {
            const results = await this.createEntitiesFromDetection(detectionResult);
            await this.processRelationships(detectionResult.relationships || []);
            await this.applyWorldUpdates(detectionResult.worldUpdates || {});
            
            // Process queued creations
            while (this.creationQueue.length > 0) {
                const queuedResult = this.creationQueue.shift();
                await this.createEntitiesFromDetection(queuedResult);
            }
            
            return results;
        } finally {
            this.processingLock = false;
        }
    }
    
    async createEntitiesFromDetection(detection) {
        const results = {
            created: { npcs: [], factions: [], locations: [], items: [], events: [] },
            failed: { npcs: [], factions: [], locations: [], items: [], events: [] },
            warnings: []
        };
        
        if (!detection.entities) {
            return results;
        }
        
        // Create NPCs
        if (detection.entities.npcs) {
            for (const npcData of detection.entities.npcs) {
                try {
                    const validation = await this.validationSystem.validateNPCCreation(npcData, this.getGameState());
                    
                    if (validation.valid) {
                        const npc = this.entityManager.createEntity(ENTITY_TYPES.NPC, npcData.id, npcData);
                        results.created.npcs.push(npc);
                        console.log(`👤 Created NPC: ${npc.name} (${npc.occupation})`);
                    } else {
                        results.failed.npcs.push({ data: npcData, reason: validation.reason });
                        results.warnings.push(`Failed to create NPC ${npcData.name}: ${validation.reason}`);
                    }
                } catch (error) {
                    results.failed.npcs.push({ data: npcData, reason: error.message });
                    console.error(`Error creating NPC ${npcData.name}:`, error);
                }
            }
        }
        
        // Create Factions
        if (detection.entities.factions) {
            for (const factionData of detection.entities.factions) {
                try {
                    const validation = await this.validationSystem.validateFactionCreation(factionData, this.getGameState());
                    
                    if (validation.valid) {
                        const faction = this.entityManager.createEntity(ENTITY_TYPES.FACTION, factionData.id, factionData);
                        
                        // Set initial player standing
                        this.relationshipGraph.setPlayerStanding(faction.id, {
                            value: 0,
                            established: new Date().toISOString()
                        });
                        
                        results.created.factions.push(faction);
                        console.log(`🏛️ Created Faction: ${faction.name} (${faction.type})`);
                    } else {
                        results.failed.factions.push({ data: factionData, reason: validation.reason });
                        results.warnings.push(`Failed to create faction ${factionData.name}: ${validation.reason}`);
                    }
                } catch (error) {
                    results.failed.factions.push({ data: factionData, reason: error.message });
                    console.error(`Error creating faction ${factionData.name}:`, error);
                }
            }
        }
        
        // Create Locations
        if (detection.entities.locations) {
            for (const locationData of detection.entities.locations) {
                try {
                    const validation = await this.validationSystem.validateLocationCreation(locationData, this.getGameState());
                    
                    if (validation.valid) {
                        const location = this.entityManager.createEntity(ENTITY_TYPES.LOCATION, locationData.id, locationData);
                        results.created.locations.push(location);
                        console.log(`🗺️ Created Location: ${location.name} (${location.type})`);
                        
                        // Auto-connect to nearby locations if not specified
                        if (location.connectedTo.length === 0) {
                            this.autoConnectLocation(location);
                        }
                    } else {
                        results.failed.locations.push({ data: locationData, reason: validation.reason });
                        results.warnings.push(`Failed to create location ${locationData.name}: ${validation.reason}`);
                    }
                } catch (error) {
                    results.failed.locations.push({ data: locationData, reason: error.message });
                    console.error(`Error creating location ${locationData.name}:`, error);
                }
            }
        }
        
        // Create Items
        if (detection.entities.items) {
            for (const itemData of detection.entities.items) {
                try {
                    const validation = await this.validationSystem.validateItemCreation(itemData, this.getGameState());
                    
                    if (validation.valid) {
                        const item = this.entityManager.createEntity(ENTITY_TYPES.ITEM, itemData.id, itemData);
                        results.created.items.push(item);
                        console.log(`📦 Created Item: ${item.name} (${item.rarity})`);
                    } else {
                        results.failed.items.push({ data: itemData, reason: validation.reason });
                        results.warnings.push(`Failed to create item ${itemData.name}: ${validation.reason}`);
                    }
                } catch (error) {
                    results.failed.items.push({ data: itemData, reason: error.message });
                    console.error(`Error creating item ${itemData.name}:`, error);
                }
            }
        }
        
        // Create Events
        if (detection.entities.events) {
            for (const eventData of detection.entities.events) {
                try {
                    const validation = await this.validationSystem.validateEventCreation(eventData, this.getGameState());
                    
                    if (validation.valid) {
                        const event = this.worldState.addEvent(eventData);
                        results.created.events.push(event);
                        console.log(`📅 Created Event: ${event.name} (${event.scope})`);
                    } else {
                        results.failed.events.push({ data: eventData, reason: validation.reason });
                        results.warnings.push(`Failed to create event ${eventData.name}: ${validation.reason}`);
                    }
                } catch (error) {
                    results.failed.events.push({ data: eventData, reason: error.message });
                    console.error(`Error creating event ${eventData.name}:`, error);
                }
            }
        }
        
        return results;
    }
    
    async processRelationships(relationships) {
        for (const rel of relationships) {
            try {
                // Verify both entities exist
                const entity1 = this.findEntity(rel.entity1);
                const entity2 = this.findEntity(rel.entity2);
                
                if (entity1 && entity2) {
                    this.relationshipGraph.setRelationship(rel.entity1, rel.entity2, {
                        type: rel.type,
                        strength: rel.strength,
                        reason: rel.reason,
                        established: new Date().toISOString()
                    });
                    
                    console.log(`🔗 Established relationship: ${rel.entity1} → ${rel.entity2} (${rel.type})`);
                } else {
                    console.warn(`Cannot establish relationship between ${rel.entity1} and ${rel.entity2}: one or both entities not found`);
                }
            } catch (error) {
                console.error(`Error establishing relationship between ${rel.entity1} and ${rel.entity2}:`, error);
            }
        }
    }
    
    async applyWorldUpdates(updates) {
        if (updates.tension) {
            this.worldState.updateGlobalParameter('tension', updates.tension, 'AI-generated consequence');
        }
        
        if (updates.politicalStability) {
            this.worldState.updateGlobalParameter('politicalStability', updates.politicalStability, 'AI-generated consequence');
        }
        
        if (updates.economicState) {
            this.worldState.updateGlobalParameter('economicState', updates.economicState, 'AI-generated consequence');
        }
        
        if (updates.magicalActivity) {
            this.worldState.updateGlobalParameter('magicalActivity', updates.magicalActivity, 'AI-generated consequence');
        }
        
        if (updates.rumors) {
            updates.rumors.forEach(rumor => this.worldState.addRumor(rumor));
        }
        
        if (updates.news) {
            updates.news.forEach(newsItem => this.worldState.addNews(newsItem));
        }
    }
    
    autoConnectLocation(location) {
        // Find nearby locations based on type and existing connections
        const allLocations = this.entityManager.getAllEntities(ENTITY_TYPES.LOCATION);
        const playerLocation = this.getGameState().player.currentLocation;
        
        // Connect to player's current location if logical
        if (playerLocation && location.id !== playerLocation) {
            const currentLoc = this.entityManager.getEntity(ENTITY_TYPES.LOCATION, playerLocation);
            if (currentLoc && this.areLocationsConnectable(location, currentLoc)) {
                location.connectedTo.push(playerLocation);
                currentLoc.connectedTo.push(location.id);
            }
        }
        
        // Connect to other nearby locations
        for (const otherLocation of allLocations) {
            if (otherLocation.id !== location.id && 
                location.connectedTo.length < 3 && 
                this.areLocationsConnectable(location, otherLocation)) {
                
                location.connectedTo.push(otherLocation.id);
                otherLocation.connectedTo.push(location.id);
                break; // Only make one additional connection automatically
            }
        }
    }
    
    areLocationsConnectable(loc1, loc2) {
        // Simple logic - can be enhanced with geographical constraints
        const compatibleTypes = {
            'settlement': ['settlement', 'structure', 'landmark'],
            'wilderness': ['wilderness', 'settlement', 'landmark'],
            'structure': ['settlement', 'structure'],
            'landmark': ['settlement', 'wilderness'],
            'dungeon': ['wilderness', 'structure']
        };
        
        return compatibleTypes[loc1.type]?.includes(loc2.type) || false;
    }
    
    findEntity(entityId) {
        // Search across all entity types
        for (const entityType of Object.values(ENTITY_TYPES)) {
            const entity = this.entityManager.getEntity(entityType, entityId);
            if (entity) {
                return entity;
            }
        }
        return null;
    }
    
    getGameState() {
        return {
            entities: this.entityManager.entities,
            relationships: this.relationshipGraph,
            worldState: this.worldState,
            player: this.getPlayerState()
        };
    }
    
    getPlayerState() {
        // This should be provided by the main engine
        // Placeholder implementation
        return {
            currentLocation: 'village_square',
            level: 1,
            reputation: { heroic: 0, villainous: 0, mysterious: 0, diplomatic: 0 }
        };
    }
    
    getCreationStatistics() {
        return {
            totalCreated: {
                npcs: this.entityManager.creationHistory[ENTITY_TYPES.NPC]?.length || 0,
                factions: this.entityManager.creationHistory[ENTITY_TYPES.FACTION]?.length || 0,
                locations: this.entityManager.creationHistory[ENTITY_TYPES.LOCATION]?.length || 0,
                items: this.entityManager.creationHistory[ENTITY_TYPES.ITEM]?.length || 0,
                events: this.entityManager.creationHistory[ENTITY_TYPES.EVENT]?.length || 0
            },
            queueLength: this.creationQueue.length,
            processingLock: this.processingLock
        };
    }
}

module.exports = CreationSystem;