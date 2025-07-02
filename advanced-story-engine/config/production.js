module.exports = {
    engine: {
        autoSaveInterval: 5, // Auto-save every 5 choices
        maxEntityCreationPerTurn: 10,
        relationshipHistoryLimit: 100,
        worldHistoryLimit: 200,
        choiceHistoryLimit: 50
    },
    
    validation: {
        strictMode: true,
        enableIntegrityChecks: true,
        validateEntityCreation: true,
        preventDuplicateNames: true
    },
    
    performance: {
        enableCaching: true,
        cacheSize: 1000,
        garbageCollectionThreshold: 5000,
        maxMemoryUsage: '512MB'
    },
    
    logging: {
        level: 'info',
        enableFileLogging: true,
        logDirectory: './logs',
        enableErrorReporting: true
    },
    
    ai: {
        retryAttempts: 3,
        timeoutMs: 30000,
        enableFallbacks: true,
        modelSettings: {
            temperature: 0.7,
            maxTokens: 1000
        }
    }
};
