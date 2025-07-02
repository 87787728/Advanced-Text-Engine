const EntityManager = require('./EntityManager');
const RelationshipGraph = require('./RelationshipGraph');
const WorldState = require('./WorldState');
const AIInterface = require('./AIInterface');
const CreationSystem = require('../systems/CreationSystem');
const ValidationSystem = require('../systems/ValidationSystem');
const { PLAYER_SKILLS, REPUTATION_TYPES } = require('../utils/Constants');

class StoryEngine {
    constructor(apiKey) {
        // Initialize core systems
        this.entityManager = new EntityManager();
        this.relationshipGraph = new RelationshipGraph();
        this.worldState = new WorldState();
        this.aiInterface = new AIInterface(apiKey);
        this.validationSystem = new ValidationSystem();
        this.creationSystem = new CreationSystem(
            this.entityManager, 
            this.relationshipGraph, 
            this.worldState, 
            this.validationSystem
        );
        
        // Player state
        this.player = {
            name: "Traveler",
            level: 1,
            health: 100,
            maxHealth: 100,
            experience: 0,
            reputation: Object.fromEntries(
                Object.values(REPUTATION_TYPES).map(type => [type, 0])
            ),
            traits: ["curious", "determined"],
            skills: Object.fromEntries(
                Object.values(PLAYER_SKILLS).map(skill => [skill, 10])
            ),
            currentLocation: "village_square",
            mood: "neutral",
            goals: ["explore_world"],
            secrets: [],
            choiceHistory: []
        };
        
        // Story context
        this.storyContext = {
            currentScene: "introduction",
            sceneHistory: [],
            tension: 30,
            mystery: 50,
            romance: 0,
            comedy: 20,
            horror: 5,
            lastChoiceConsequences: [],
            narrativeArcs: ["mysterious_arrival"],
            plottedEvents: [],
            characterDevelopment: {}
        };
        
        // Session metadata
        this.meta = {
            version: "2.0",
            sessionId: Date.now(),
            totalPlayTime: 0,
            choiceCount: 0,
            lastSave: null
        };
        
        this.initializeStartingWorld();
    }
    
    initializeStartingWorld() {
        // Create initial entities
        this.entityManager.createEntity('npc', 'village_elder', {
            name: 'Elder Thane',
            occupation: 'village_leader',
            age: 68,
            location: 'village_square',
            traits: ['wise', 'patient', 'respected', 'old'],
            backstory: 'Long-serving elder who has guided the village through many crises',
            goals: ['protect_village', 'maintain_peace'],
            secrets: ['knows_ancient_prophecy'],
            importance: 'high'
        });
        
        this.entityManager.createEntity('faction', 'village_council', {
            name: 'Village Council',
            type: 'political',
            influence: 60,
            wealth: 40,
            militaryPower: 20,
            attitude: 'neutral',
            territory: ['village_square'],
            goals: ['maintain_order', 'protect_citizens'],
            leadership: ['village_elder'],
            reputation: 'respected'
        });
        
        this.entityManager.createEntity('location', 'village_square', {
            name: 'Village Square',
            type: 'settlement',
            visited: true,
            safety: 90,
            description: 'A peaceful cobblestone square with an ancient well at its center',
            atmosphere: 'busy',
            controlledBy: 'village_council',
            secrets: ['hidden_passage_under_well'],
            resources: ['fresh_water', 'meeting_place'],
            population: 50,
            wealth: 'moderate'
        });
        
        this.entityManager.createEntity('item', 'rusty_sword', {
            name: 'Rusty Iron Sword',
            type: 'weapon',
            subtype: 'sword',
            value: 15,
            weight: 3,
            durability: 40,
            description: 'An old sword showing signs of age but still functional',
            location: 'player_inventory',
            rarity: 'common'
        });
        
        // Set initial player standing with village council
        this.relationshipGraph.setPlayerStanding('village_council', {
            value: 10,
            established: new Date().toISOString()
        });
    }
    
    async processPlayerChoice(input) {
        try {
            // Record choice
            this.recordPlayerChoice(input);
            
            // Generate story response
            const narrative = await this.aiInterface.generateStory(input, this.compileGameState());
            
            // Detect and create new entities
            const detectionResult = await this.aiInterface.detectEntities(input, narrative, this.compileGameState());
            const creationResults = await this.creationSystem.processEntityCreation(detectionResult);
            
            // Analyze and apply consequences
            const consequences = await this.analyzeChoiceConsequences(input);
            this.applyConsequences(consequences);
            
            // Update story context
            this.updateStoryContext(input, consequences);
            
            return {
                narrative: narrative,
                creationResults: creationResults,
                consequences: consequences,
                newEntitiesCount: this.countNewEntities(creationResults)
            };
            
        } catch (error) {
            console.error('Error processing player choice:', error);
            return {
                narrative: "The world seems to pause as mysterious forces interfere with reality... (Error in story processing)",
                creationResults: { created: {}, failed: {}, warnings: [] },
                consequences: {},
                newEntitiesCount: 0
            };
        }
    }
    
    recordPlayerChoice(input) {
        this.player.choiceHistory.push({
            choice: input,
            timestamp: new Date().toISOString(),
            location: this.player.currentLocation,
            worldState: {
                tension: this.worldState.globalParameters.tension,
                politicalStability: this.worldState.globalParameters.politicalStability
            }
        });
        
        this.meta.choiceCount++;
        
        // Keep choice history manageable
        if (this.player.choiceHistory.length > 50) {
            this.player.choiceHistory = this.player.choiceHistory.slice(-50);
        }
    }
    
    async analyzeChoiceConsequences(input) {
        // Basic keyword analysis
        const consequences = {
            npcChanges: {},
            factionStandings: {},
            playerEffects: {
                reputation: {},
                skills: {},
                health: 0
            },
            worldEffects: {},
            longTerm: {
                newEvents: [],
                changedRelationships: [],
                rumors: [],
                futureOpportunities: []
            }
        };
        
        const lowerInput = input.toLowerCase();
        
        // Analyze action type and apply consequences
        if (this.containsWords(lowerInput, ['help', 'assist', 'aid', 'support'])) {
            consequences.playerEffects.reputation[REPUTATION_TYPES.HEROIC] = 2;
            consequences.playerEffects.reputation[REPUTATION_TYPES.DIPLOMATIC] = 1;
            consequences.playerEffects.skills[PLAYER_SKILLS.DIPLOMACY] = 1;
            consequences.worldEffects.tension = -2;
        } else if (this.containsWords(lowerInput, ['attack', 'fight', 'violence', 'strike', 'kill'])) {
            consequences.playerEffects.reputation[REPUTATION_TYPES.VILLAINOUS] = 2;
            consequences.playerEffects.skills[PLAYER_SKILLS.COMBAT] = 2;
            consequences.worldEffects.tension = 5;
            consequences.worldEffects.politicalStability = -2;
        } else if (this.containsWords(lowerInput, ['sneak', 'hide', 'stealth', 'shadow'])) {
            consequences.playerEffects.skills[PLAYER_SKILLS.STEALTH] = 2;
            consequences.worldEffects.tension = 1;
            consequences.playerEffects.reputation[REPUTATION_TYPES.MYSTERIOUS] = 1;
        } else if (this.containsWords(lowerInput, ['study', 'research', 'investigate', 'examine', 'learn'])) {
            consequences.playerEffects.skills[PLAYER_SKILLS.KNOWLEDGE] = 2;
            consequences.playerEffects.reputation[REPUTATION_TYPES.MYSTERIOUS] = 1;
        } else if (this.containsWords(lowerInput, ['negotiate', 'diplomacy', 'persuade', 'convince'])) {
            consequences.playerEffects.skills[PLAYER_SKILLS.DIPLOMACY] = 2;
            consequences.playerEffects.reputation[REPUTATION_TYPES.DIPLOMATIC] = 2;
        } else if (this.containsWords(lowerInput, ['magic', 'spell', 'enchant', 'ritual'])) {
            consequences.playerEffects.skills[PLAYER_SKILLS.MAGIC] = 2;
            consequences.worldEffects.magicalActivity = 3;
        }
        
        // Use AI for deeper consequence analysis if available
        try {
            const aiConsequences = await this.aiInterface.analyzeConsequences(input, input, this.compileGameState());
            this.mergeConsequences(consequences, aiConsequences.consequences);
        } catch (error) {
            console.log('AI consequence analysis skipped:', error.message);
        }
        
        return consequences;
    }
    
    containsWords(text, words) {
        return words.some(word => text.includes(word));
    }
    
    mergeConsequences(base, additional) {
        if (!additional) return;
        
        // Merge immediate consequences
        if (additional.immediate) {
            Object.assign(base.npcChanges, additional.immediate.npcReactions || {});
            Object.assign(base.factionStandings, additional.immediate.factionStandings || {});
            
            if (additional.immediate.playerEffects) {
                if (additional.immediate.playerEffects.reputation) {
                    Object.assign(base.playerEffects.reputation, additional.immediate.playerEffects.reputation);
                }
                if (additional.immediate.playerEffects.skills) {
                    Object.assign(base.playerEffects.skills, additional.immediate.playerEffects.skills);
                }
                if (additional.immediate.playerEffects.health) {
                    base.playerEffects.health += additional.immediate.playerEffects.health;
                }
            }
        }
        
        // Merge world effects
        if (additional.worldEffects) {
            Object.assign(base.worldEffects, additional.worldEffects);
        }
        
        // Merge long-term effects
        if (additional.longTerm) {
            base.longTerm.newEvents.push(...(additional.longTerm.newEvents || []));
            base.longTerm.changedRelationships.push(...(additional.longTerm.changedRelationships || []));
            base.longTerm.rumors.push(...(additional.longTerm.rumors || []));
            base.longTerm.futureOpportunities.push(...(additional.longTerm.futureOpportunities || []));
        }
    }
    
    applyConsequences(consequences) {
        // Apply NPC relationship changes
        Object.entries(consequences.npcChanges).forEach(([npcId, changes]) => {
            const npc = this.entityManager.getEntity('npc', npcId);
            if (npc) {
                Object.entries(changes).forEach(([metric, change]) => {
                    if (typeof change === 'number' && npc.hasOwnProperty(metric)) {
                        npc.adjustRelationship(metric, change);
                    } else if (metric === 'mood' && typeof change === 'string') {
                        npc.mood = change;
                    }
                });
            }
        });
        
        // Apply faction standing changes
        Object.entries(consequences.factionStandings).forEach(([factionId, change]) => {
            this.relationshipGraph.updatePlayerStanding(factionId, change, 'Player choice consequence');
        });
        
        // Apply player effects
        if (consequences.playerEffects) {
            // Reputation changes
            Object.entries(consequences.playerEffects.reputation).forEach(([type, change]) => {
                if (this.player.reputation.hasOwnProperty(type)) {
                    this.player.reputation[type] += change;
                }
            });
            
            // Skill improvements
            Object.entries(consequences.playerEffects.skills).forEach(([skill, gain]) => {
                if (this.player.skills.hasOwnProperty(skill)) {
                    this.player.skills[skill] += gain;
                    this.player.skills[skill] = Math.min(100, this.player.skills[skill]); // Cap at 100
                }
            });
            
            // Health changes
            if (consequences.playerEffects.health) {
                this.player.health += consequences.playerEffects.health;
                this.player.health = Math.max(0, Math.min(this.player.maxHealth, this.player.health));
            }
        }
        
        // Apply world effects
        Object.entries(consequences.worldEffects).forEach(([parameter, change]) => {
            if (this.worldState.globalParameters.hasOwnProperty(parameter)) {
                this.worldState.updateGlobalParameter(parameter, change, 'Player choice consequence');
            }
        });
        
        // Apply long-term effects
        if (consequences.longTerm) {
            // Add new events
            consequences.longTerm.newEvents.forEach(eventName => {
                this.worldState.addEvent({
                    name: eventName,
                    type: 'social',
                    scope: 'local',
                    description: `Event triggered by player choice`
                });
            });
            
            // Add rumors
            consequences.longTerm.rumors.forEach(rumor => {
                this.worldState.addRumor(rumor);
            });
            
            // Process relationship changes
            consequences.longTerm.changedRelationships.forEach(rel => {
                this.relationshipGraph.setRelationship(rel.entity1, rel.entity2, {
                    type: rel.newRelationship,
                    strength: 50,
                    reason: 'Player action consequence'
                });
            });
        }
    }
    
    updateStoryContext(input, consequences) {
        // Update scene if location changed
        const newLocation = this.extractLocationFromInput(input);
        if (newLocation && newLocation !== this.player.currentLocation) {
            this.player.currentLocation = newLocation;
            this.storyContext.currentScene = `arrival_at_${newLocation}`;
            
            // Mark location as visited
            const location = this.entityManager.getEntity('location', newLocation);
            if (location) {
                location.visited = true;
            }
        }
        
        // Update tension based on consequences
        if (consequences.worldEffects.tension) {
            this.storyContext.tension += consequences.worldEffects.tension;
            this.storyContext.tension = Math.max(0, Math.min(100, this.storyContext.tension));
        }
        
        // Track narrative arcs
        this.updateNarrativeArcs(input, consequences);
        
        // Record choice consequences
        this.storyContext.lastChoiceConsequences.push({
            choice: input,
            effects: consequences,
            timestamp: new Date().toISOString()
        });
        
        // Keep history manageable
        if (this.storyContext.lastChoiceConsequences.length > 10) {
            this.storyContext.lastChoiceConsequences = this.storyContext.lastChoiceConsequences.slice(-10);
        }
    }
    
    extractLocationFromInput(input) {
        // Simple location extraction - can be enhanced with more sophisticated parsing
        const locationKeywords = {
            'tavern': 'tavern',
            'market': 'market',
            'forest': 'forest',
            'temple': 'temple',
            'barracks': 'barracks',
            'inn': 'inn',
            'dock': 'docks',
            'castle': 'castle'
        };
        
        const lowerInput = input.toLowerCase();
        for (const [keyword, location] of Object.entries(locationKeywords)) {
            if (lowerInput.includes(keyword)) {
                return location;
            }
        }
        
        return null;
    }
    
    updateNarrativeArcs(input, consequences) {
        // Track major story developments
        if (consequences.longTerm && consequences.longTerm.newEvents.length > 0) {
            this.storyContext.narrativeArcs.push(`event_${consequences.longTerm.newEvents[0]}`);
        }
        
        // Detect relationship milestones
        Object.entries(consequences.npcChanges).forEach(([npcId, changes]) => {
            const npc = this.entityManager.getEntity('npc', npcId);
            if (npc && changes.trust) {
                if (npc.trust >= 80 && !this.storyContext.narrativeArcs.includes(`alliance_${npcId}`)) {
                    this.storyContext.narrativeArcs.push(`alliance_${npcId}`);
                } else if (npc.trust <= 20 && !this.storyContext.narrativeArcs.includes(`conflict_${npcId}`)) {
                    this.storyContext.narrativeArcs.push(`conflict_${npcId}`);
                }
            }
        });
        
        // Keep arc list manageable
        if (this.storyContext.narrativeArcs.length > 15) {
            this.storyContext.narrativeArcs = this.storyContext.narrativeArcs.slice(-15);
        }
    }
    
    countNewEntities(creationResults) {
        let count = 0;
        if (creationResults.created) {
            Object.values(creationResults.created).forEach(entityList => {
                count += entityList.length;
            });
        }
        return count;
    }
    
    compileGameState() {
        return {
            player: this.player,
            entities: {
                npcs: this.entityManager.entities.npc,
                factions: this.entityManager.entities.faction,
                locations: this.entityManager.entities.location,
                items: this.entityManager.entities.item
            },
            relationships: {
                playerStandings: this.relationshipGraph.getAllPlayerStandings(),
                entityRelationships: this.relationshipGraph.exportRelationships()
            },
            worldState: this.worldState,
            storyContext: this.storyContext,
            meta: this.meta
        };
    }
    
    getDetailedGameState() {
        const gameState = this.compileGameState();
        
        // Add analysis
        gameState.analysis = {
            worldStateAnalysis: this.worldState.analyzeWorldState(),
            playerProfile: this.analyzePlayerProfile(),
            entityStatistics: this.getEntityStatistics(),
            relationshipNetworks: this.getRelationshipNetworks()
        };
        
        return gameState;
    }
    
    analyzePlayerProfile() {
        const profile = {
            dominantReputation: this.getDominantReputation(),
            strongestSkills: this.getStrongestSkills(),
            recentActivity: this.getRecentActivity(),
            relationships: this.getPlayerRelationshipSummary()
        };
        
        return profile;
    }
    
    getDominantReputation() {
        let dominant = { type: 'neutral', value: 0 };
        Object.entries(this.player.reputation).forEach(([type, value]) => {
            if (Math.abs(value) > Math.abs(dominant.value)) {
                dominant = { type, value };
            }
        });
        return dominant;
    }
    
    getStrongestSkills() {
        return Object.entries(this.player.skills)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([skill, level]) => ({ skill, level }));
    }
    
    getRecentActivity() {
        return {
            choicesLastSession: this.player.choiceHistory.slice(-5).length,
            locationsVisited: new Set(this.player.choiceHistory.slice(-10).map(c => c.location)).size,
            majorDecisions: this.storyContext.lastChoiceConsequences.slice(-3)
        };
    }
    
    getPlayerRelationshipSummary() {
        const standings = this.relationshipGraph.getAllPlayerStandings();
        const summary = {
            allies: [],
            enemies: [],
            neutral: []
        };
        
        Object.entries(standings).forEach(([entityId, standing]) => {
            const entity = this.findEntity(entityId);
            if (entity) {
                if (standing.value > 20) {
                    summary.allies.push({ id: entityId, name: entity.name, standing: standing.value });
                } else if (standing.value < -20) {
                    summary.enemies.push({ id: entityId, name: entity.name, standing: standing.value });
                } else {
                    summary.neutral.push({ id: entityId, name: entity.name, standing: standing.value });
                }
            }
        });
        
        return summary;
    }
    
    getEntityStatistics() {
        return {
            npcs: {
                total: Object.keys(this.entityManager.entities.npc).length,
                met: Object.values(this.entityManager.entities.npc).filter(npc => npc.met).length,
                alive: Object.values(this.entityManager.entities.npc).filter(npc => npc.alive).length
            },
            factions: {
                total: Object.keys(this.entityManager.entities.faction).length,
                allied: Object.entries(this.relationshipGraph.getAllPlayerStandings()).filter(([,s]) => s.value > 20).length,
                hostile: Object.entries(this.relationshipGraph.getAllPlayerStandings()).filter(([,s]) => s.value < -20).length
            },
            locations: {
                total: Object.keys(this.entityManager.entities.location).length,
                visited: Object.values(this.entityManager.entities.location).filter(loc => loc.visited).length
            },
            items: {
                total: Object.keys(this.entityManager.entities.item).length,
                inInventory: Object.values(this.entityManager.entities.item).filter(item => item.location === 'player_inventory').length
            }
        };
    }
    
    getRelationshipNetworks() {
        const networks = {};
        Object.keys(this.entityManager.entities.npc).forEach(npcId => {
            networks[npcId] = this.relationshipGraph.analyzeRelationshipNetwork(npcId);
        });
        return networks;
    }
    
    findEntity(entityId) {
        for (const entityType of ['npc', 'faction', 'location', 'item']) {
            const entity = this.entityManager.getEntity(entityType, entityId);
            if (entity) return entity;
        }
        return null;
    }
    
    async saveGame(filename = 'gamestate.json') {
        try {
            const gameState = this.getDetailedGameState();
            gameState.meta.lastSave = new Date().toISOString();
            
            const fs = require('fs').promises;
            await fs.writeFile(filename, JSON.stringify(gameState, null, 2));
            
            console.log(`💾 Game saved successfully to ${filename}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to save game:', error.message);
            return false;
        }
    }
    
    async loadGame(filename = 'gamestate.json') {
        try {
            const fs = require('fs').promises;
            const data = await fs.readFile(filename, 'utf8');
            const gameState = JSON.parse(data);
            
            // Validate and load game state
            if (this.validateSaveFile(gameState)) {
                this.restoreGameState(gameState);
                console.log(`📁 Game loaded successfully from ${filename}`);
                console.log(`🕐 Last saved: ${new Date(gameState.meta.lastSave).toLocaleString()}`);
                return true;
            } else {
                console.error('❌ Save file validation failed');
                return false;
            }
        } catch (error) {
            console.error('❌ Failed to load game:', error.message);
            return false;
        }
    }
    
    validateSaveFile(gameState) {
        const requiredSections = ['player', 'entities', 'worldState', 'meta'];
        return requiredSections.every(section => gameState.hasOwnProperty(section));
    }
    
    restoreGameState(gameState) {
        // Restore player state
        this.player = gameState.player;
        
        // Restore entities
        this.entityManager.importEntities({ entities: gameState.entities });
        
        // Restore relationships
        if (gameState.relationships) {
            this.relationshipGraph.importRelationships(gameState.relationships.entityRelationships);
            Object.entries(gameState.relationships.playerStandings).forEach(([entityId, standing]) => {
                this.relationshipGraph.setPlayerStanding(entityId, standing);
            });
        }
        
        // Restore world state
        this.worldState.importWorldState(gameState.worldState);
        
        // Restore story context
        this.storyContext = gameState.storyContext;
        
        // Restore metadata
        this.meta = gameState.meta;
    }
    
    getSystemStatus() {
        return {
            engine: 'Advanced Dynamic Story Engine v2.0',
            status: 'operational',
            systems: {
                entityManager: 'active',
                relationshipGraph: 'active',
                worldState: 'active',
                aiInterface: 'active',
                creationSystem: 'active',
                validationSystem: 'active'
            },
            statistics: this.getEntityStatistics(),
            performance: {
                totalChoices: this.meta.choiceCount,
                sessionTime: Math.floor((Date.now() - this.meta.sessionId) / 60000),
                entitiesCreated: this.entityManager.creationHistory.npc.length + 
                               this.entityManager.creationHistory.faction.length +
                               this.entityManager.creationHistory.location.length +
                               this.entityManager.creationHistory.item.length
            }
        };
    }
}

module.exports = StoryEngine;