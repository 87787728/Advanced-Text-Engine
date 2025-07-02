const EntityManager = require('./EntityManager');
const RelationshipGraph = require('./RelationshipGraph');
const WorldState = require('./WorldState');
const AIInterface = require('./AIInterface');
const CreationSystem = require('../systems/CreationSystem');
const ValidationSystem = require('../systems/ValidationSystem');
const { PLAYER_SKILLS, REPUTATION_TYPES, ENTITY_TYPES } = require('../utils/Constants');
const logger = require('../utils/logger');
const { AppError, errorHandler } = require('../utils/errorHandler');

/**
 * Main engine class that orchestrates the dynamic storytelling system.
 * Manages game state, entity interactions, and AI-driven narrative generation.
 * 
 * @class StoryEngine
 * @example
 * const engine = new StoryEngine('your-api-key');
 * await engine.initialize();
 */
class StoryEngine {
    /**
     * Creates a new StoryEngine instance.
     * @param {string} apiKey - The API key for the AI service.
     * @param {Object} [options] - Configuration options.
     * @param {boolean} [options.enableLogging=true] - Whether to enable logging.
     * @param {Object} [options.aiOptions] - Options to pass to the AIInterface.
     * @param {boolean} [options.enableValidation=true] - Whether to enable input validation.
     * @throws {AppError} If API key is not provided or invalid.
     */
    constructor(apiKey, options = {}) {
        try {
            if (!apiKey) {
                throw new AppError('API key is required', 400);
            }

            const { 
                enableLogging = true, 
                aiOptions = {},
                enableValidation = true
            } = options;
            
            logger.info('Initializing StoryEngine...', { enableLogging, enableValidation });
            
            // Initialize core systems
            this.entityManager = new EntityManager();
            this.relationshipGraph = new RelationshipGraph();
            this.worldState = new WorldState();
            this.aiInterface = new AIInterface(apiKey, aiOptions);
            
            // Initialize systems with dependencies
            this.validationSystem = enableValidation ? new ValidationSystem() : null;
            this.creationSystem = new CreationSystem(
                this.entityManager, 
                this.relationshipGraph, 
                this.worldState,
                this.validationSystem
            );
            
            // Game state
            this.playerState = {
                skills: {},
                inventory: [],
                reputation: {},
                flags: new Set()
            };
            
            // Initialize player skills and reputation
            Object.values(PLAYER_SKILLS).forEach(skill => {
                this.playerState.skills[skill] = 0; // Default skill level
            });
            
            Object.values(REPUTATION_TYPES).forEach(type => {
                this.playerState.reputation[type] = 50; // Neutral reputation
            });
            
            // Game state tracking
            this.gameState = {
                isInitialized: false,
                isPaused: false,
                currentScene: null,
                previousScenes: [],
                gameTime: 0,
                saveSlots: {},
                currentSaveSlot: null
            };
            
            // Event system
            this.eventListeners = new Map();
            
            logger.info('StoryEngine initialized successfully');
            
        } catch (error) {
            const errorMsg = `Failed to initialize StoryEngine: ${error.message}`;
            logger.error(errorMsg, { error });
            
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(errorMsg, 500, false);
        }
    }
    
    /**
     * Initializes the game world with starting data.
     * 
     * @param {Object} [initialData] - Optional initial game data
     * @returns {Promise<void>}
     * @throws {AppError} If initialization fails
     */
    async initialize(initialData = {}) {
        try {
            if (this.gameState.isInitialized) {
                logger.warn('StoryEngine already initialized');
                return;
            }
            
            logger.info('Initializing game world...');
            
            // Apply initial data if provided
            if (initialData.entities) {
                await this._loadEntities(initialData.entities);
            }
            
            if (initialData.relationships) {
                await this._loadRelationships(initialData.relationships);
            }
            
            if (initialData.worldState) {
                await this._loadWorldState(initialData.worldState);
            }
            
            // Set up initial game state
            this.gameState.isInitialized = true;
            this.gameState.startTime = Date.now();
            
            logger.info('Game world initialized successfully');
            
        } catch (error) {
            const errorMsg = `Failed to initialize game world: ${error.message}`;
            logger.error(errorMsg, { error });
            
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(errorMsg, 500, false);
        }
    }
    
    /**
     * Processes player input and updates the game state accordingly.
     * 
     * @param {string} input - The player's input
     * @param {Object} [options] - Additional options
     * @param {boolean} [options.allowPartial=false] - Whether to allow partial matches
     * @returns {Promise<Object>} The result of processing the input
     * @throws {AppError} If input processing fails
     */
    async processInput(input, options = {}) {
        try {
            if (!this.gameState.isInitialized) {
                throw new AppError('StoryEngine not initialized', 400);
            }
            
            if (this.gameState.isPaused) {
                throw new AppError('Game is paused', 400);
            }
            
            if (typeof input !== 'string' || !input.trim()) {
                throw new AppError('Input must be a non-empty string', 400);
            }
            
            logger.info('Processing player input', { 
                input: input.substring(0, 100),
                options 
            });
            
            // Step 1: Validate input
            if (this.validationSystem) {
                const validationResult = this.validationSystem.validateInput(input);
                if (!validationResult.isValid) {
                    throw new AppError(`Invalid input: ${validationResult.message}`, 400);
                }
            }
            
            // Step 2: Detect entities in the input
            const { entities, relationships, worldUpdates } = await this.aiInterface.detectEntities(
                input,
                this._getCurrentNarrativeContext(),
                this.worldState.getWorldSummary()
            );
            
            // Step 3: Update world state based on detected entities
            await this._applyWorldUpdates(worldUpdates);
            
            // Step 4: Generate story response
            const storyResponse = await this.aiInterface.generateStory(
                input,
                this.worldState.getWorldSummary()
            );
            
            // Step 5: Update game state
            this.gameState.gameTime++;
            this.gameState.previousScenes.push({
                input,
                response: storyResponse,
                timestamp: Date.now(),
                worldState: this.worldState.getWorldSummary()
            });
            
            // Step 6: Return the result
            const result = {
                success: true,
                response: storyResponse,
                entities,
                relationships,
                worldUpdates,
                timestamp: new Date().toISOString()
            };
            
            logger.info('Input processed successfully', {
                responseLength: storyResponse?.length || 0,
                entitiesCount: Object.keys(entities || {}).length,
                relationshipsCount: (relationships || []).length,
                worldUpdatesCount: Object.keys(worldUpdates || {}).length
            });
            
            return result;
            
        } catch (error) {
            const errorMsg = `Failed to process input: ${error.message}`;
            logger.error(errorMsg, { 
                error, 
                input: input?.substring(0, 100) || 'No input',
                options 
            });
            
            if (error instanceof AppError) {
                throw error;
            }
            
            // Return a fallback response if processing fails
            return {
                success: false,
                error: errorMsg,
                isFallback: true,
                response: "The story seems to have taken an unexpected turn. Let's try that again..."
            };
        }
    }
    
    /**
     * Saves the current game state to a slot.
     * 
     * @param {string} slotName - The name of the save slot
     * @returns {Promise<Object>} The saved game state
     * @throws {AppError} If saving fails
     */
    async saveGame(slotName = 'default') {
        try {
            if (!this.gameState.isInitialized) {
                throw new AppError('StoryEngine not initialized', 400);
            }
            
            if (typeof slotName !== 'string' || !slotName.trim()) {
                throw new AppError('Slot name must be a non-empty string', 400);
            }
            
            logger.info(`Saving game to slot: ${slotName}`);
            
            const saveData = {
                metadata: {
                    saveTime: new Date().toISOString(),
                    gameTime: this.gameState.gameTime,
                    version: '1.0.0'
                },
                playerState: { ...this.playerState },
                worldState: this.worldState.getWorldSummary(),
                entities: this._getAllEntitiesForSave(),
                relationships: this._getAllRelationshipsForSave(),
                gameState: {
                    currentScene: this.gameState.currentScene,
                    previousScenes: [...this.gameState.previousScenes]
                }
            };
            
            // Store the save data
            this.gameState.saveSlots[slotName] = saveData;
            this.gameState.currentSaveSlot = slotName;
            
            logger.info(`Game saved successfully to slot: ${slotName}`);
            
            return saveData;
            
        } catch (error) {
            const errorMsg = `Failed to save game to slot '${slotName}': ${error.message}`;
            logger.error(errorMsg, { error, slotName });
            
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(errorMsg, 500, false);
        }
    }
    
    /**
     * Loads a game state from a slot.
     * 
     * @param {string} slotName - The name of the save slot to load
     * @returns {Promise<Object>} The loaded game state
     * @throws {AppError} If loading fails
     */
    async loadGame(slotName = 'default') {
        try {
            if (typeof slotName !== 'string' || !slotName.trim()) {
                throw new AppError('Slot name must be a non-empty string', 400);
            }
            
            logger.info(`Loading game from slot: ${slotName}`);
            
            const saveData = this.gameState.saveSlots[slotName];
            if (!saveData) {
                throw new AppError(`No save data found in slot: ${slotName}`, 404);
            }
            
            // Reset current state
            await this._resetGameState();
            
            // Load the saved state
            this.playerState = { ...saveData.playerState };
            
            // Load entities and relationships
            await this._loadEntities(saveData.entities);
            await this._loadRelationships(saveData.relationships);
            
            // Load world state
            await this._loadWorldState(saveData.worldState);
            
            // Update game state
            this.gameState = {
                ...this.gameState,
                currentScene: saveData.gameState.currentScene,
                previousScenes: [...saveData.gameState.previousScenes],
                gameTime: saveData.metadata.gameTime,
                currentSaveSlot: slotName
            };
            
            logger.info(`Game loaded successfully from slot: ${slotName}`);
            
            return saveData;
            
        } catch (error) {
            const errorMsg = `Failed to load game from slot '${slotName}': ${error.message}`;
            logger.error(errorMsg, { error, slotName });
            
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(errorMsg, 500, false);
        }
    }
    
    // ===== Helper Methods =====
    
    /**
     * Gets the current narrative context for AI processing.
     * 
     * @private
     * @returns {Object} The current narrative context
     */
    _getCurrentNarrativeContext() {
        return {
            currentScene: this.gameState.currentScene,
            previousScenes: this.gameState.previousScenes.slice(-3), // Last 3 scenes
            playerState: {
                skills: this.playerState.skills,
                reputation: this.playerState.reputation,
                inventory: this.playerState.inventory
            },
            worldState: this.worldState.getWorldSummary()
        };
    }
    
    /**
     * Applies world updates from AI processing.
     * 
     * @private
     * @param {Object} updates - The updates to apply
     * @returns {Promise<void>}
     */
    async _applyWorldUpdates(updates = {}) {
        if (!updates || typeof updates !== 'object') {
            return;
        }
        
        try {
            // Apply parameter updates
            if (updates.parameters) {
                for (const [param, value] of Object.entries(updates.parameters)) {
                    await this.worldState.updateGlobalParameter(
                        param,
                        value,
                        'Updated by AI during input processing'
                    );
                }
            }
            
            // Apply other world state updates as needed
            // ...
            
        } catch (error) {
            logger.error('Failed to apply world updates', { error, updates });
            throw new AppError(
                `Failed to apply world updates: ${error.message}`,
                500,
                false
            );
        }
    }
    
    /**
     * Loads entities into the entity manager.
     * 
     * @private
     * @param {Object} entities - The entities to load
     * @returns {Promise<void>}
     */
    async _loadEntities(entities = {}) {
        try {
            for (const [type, entitiesOfType] of Object.entries(entities)) {
                if (!Object.values(ENTITY_TYPES).includes(type)) {
                    logger.warn(`Skipping unknown entity type: ${type}`);
                    continue;
                }
                
                for (const [id, data] of Object.entries(entitiesOfType)) {
                    try {
                        await this.creationSystem.createEntity(type, id, data);
                    } catch (error) {
                        logger.error(`Failed to load entity ${type}/${id}`, { error, data });
                        // Continue loading other entities even if one fails
                    }
                }
            }
        } catch (error) {
            logger.error('Failed to load entities', { error });
            throw new AppError(
                `Failed to load entities: ${error.message}`,
                500,
                false
            );
        }
    }
    
    /**
     * Loads relationships into the relationship graph.
     * 
     * @private
     * @param {Array} relationships - The relationships to load
     * @returns {Promise<void>}
     */
    async _loadRelationships(relationships = []) {
        try {
            for (const rel of relationships) {
                try {
                    this.relationshipGraph.setRelationship(
                        rel.source,
                        rel.target,
                        {
                            type: rel.type,
                            strength: rel.strength,
                            reason: rel.reason || 'Loaded from save',
                            established: rel.established || new Date().toISOString()
                        }
                    );
                } catch (error) {
                    logger.error('Failed to load relationship', { error, relationship: rel });
                    // Continue loading other relationships even if one fails
                }
            }
        } catch (error) {
            logger.error('Failed to load relationships', { error });
            throw new AppError(
                `Failed to load relationships: ${error.message}`,
                500,
                false
            );
        }
    }
    
    /**
     * Loads world state from saved data.
     * 
     * @private
     * @param {Object} worldState - The world state to load
     * @returns {Promise<void>}
     */
    async _loadWorldState(worldState = {}) {
        try {
            // Apply global parameters
            if (worldState.parameters) {
                for (const [param, value] of Object.entries(worldState.parameters)) {
                    try {
                        await this.worldState.updateGlobalParameter(
                            param,
                            value,
                            'Loaded from save'
                        );
                    } catch (error) {
                        logger.error(`Failed to load world parameter ${param}`, { error, value });
                        // Continue loading other parameters even if one fails
                    }
                }
            }
            
            // Apply other world state properties as needed
            // ...
            
        } catch (error) {
            logger.error('Failed to load world state', { error });
            throw new AppError(
                `Failed to load world state: ${error.message}`,
                500,
                false
            );
        }
    }
    
    /**
     * Gets all entities for saving.
     * 
     * @private
     * @returns {Object} All entities organized by type
     */
    _getAllEntitiesForSave() {
        const result = {};
        
        for (const type of Object.values(ENTITY_TYPES)) {
            result[type] = this.entityManager.getAllEntities(type);
        }
        
        return result;
    }
    
    /**
     * Gets all relationships for saving.
     * 
     * @private
     * @returns {Array} All relationships
     */
    _getAllRelationshipsForSave() {
        const result = [];
        
        // This is a simplified example - in a real implementation, you'd need to
        // collect all relationships from the relationship graph
        
        return result;
    }
    
    /**
     * Resets the game state to its initial state.
     * 
     * @private
     * @returns {Promise<void>}
     */
    async _resetGameState() {
        try {
            // Clear entities
            for (const type of Object.values(ENTITY_TYPES)) {
                const entities = this.entityManager.getAllEntities(type);
                for (const id of Object.keys(entities)) {
                    this.entityManager.deleteEntity(type, id);
                }
            }
            
            // Clear relationships
            // (Implementation depends on your RelationshipGraph API)
            
            // Reset world state
            // (Implementation depends on your WorldState API)
            
            // Reset player state
            this.playerState = {
                skills: {},
                inventory: [],
                reputation: {},
                flags: new Set()
            };
            
            // Reset game state
            this.gameState = {
                ...this.gameState,
                isInitialized: false,
                currentScene: null,
                previousScenes: [],
                gameTime: 0,
                currentSaveSlot: null
            };
            
            logger.info('Game state reset successfully');
            
        } catch (error) {
            logger.error('Failed to reset game state', { error });
            throw new AppError(
                `Failed to reset game state: ${error.message}`,
                500,
                false
            );
        }
    }
    
    // ===== Event System =====
    
    /**
     * Adds an event listener.
     * 
     * @param {string} eventName - The name of the event to listen for
     * @param {Function} callback - The callback function
     * @returns {Function} A function to remove the event listener
     */
    on(eventName, callback) {
        if (typeof eventName !== 'string' || !eventName.trim()) {
            throw new AppError('Event name must be a non-empty string', 400);
        }
        
        if (typeof callback !== 'function') {
            throw new AppError('Callback must be a function', 400);
        }
        
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, new Set());
        }
        
        const listeners = this.eventListeners.get(eventName);
        listeners.add(callback);
        
        // Return a function to remove this listener
        return () => {
            listeners.delete(callback);
            if (listeners.size === 0) {
                this.eventListeners.delete(eventName);
            }
        };
    }
    
    /**
     * Emits an event to all registered listeners.
     * 
     * @param {string} eventName - The name of the event to emit
     * @param {*} [data] - Optional data to pass to listeners
     * @returns {Promise<void>}
     */
    async emit(eventName, data) {
        if (!this.eventListeners.has(eventName)) {
            return;
        }
        
        const listeners = this.eventListeners.get(eventName);
        const promises = [];
        
        for (const listener of listeners) {
            try {
                const result = listener(data);
                if (result instanceof Promise) {
                    promises.push(result.catch(error => {
                        logger.error(`Error in event listener for ${eventName}`, { error, data });
                    }));
                }
            } catch (error) {
                logger.error(`Error in event listener for ${eventName}`, { error, data });
            }
        }
        
        if (promises.length > 0) {
            await Promise.all(promises);
        }
    }
    
    /**
     * Removes all event listeners for a specific event.
     * 
     * @param {string} eventName - The name of the event
     */
    removeAllListeners(eventName) {
        this.eventListeners.delete(eventName);
    }
}

module.exports = StoryEngine;
