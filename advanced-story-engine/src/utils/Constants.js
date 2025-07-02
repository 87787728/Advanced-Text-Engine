module.exports = {
    RELATIONSHIP_TYPES: {
        TRUST: { min: 0, max: 100, default: 50 },
        FEAR: { min: 0, max: 100, default: 10 },
        RESPECT: { min: 0, max: 100, default: 50 },
        LOVE: { min: 0, max: 100, default: 0 },
        RIVALRY: { min: 0, max: 100, default: 0 },
        ALLIANCE: { min: 0, max: 100, default: 0 }
    },
    
    ENTITY_TYPES: {
        NPC: 'npc',
        FACTION: 'faction',
        LOCATION: 'location',
        ITEM: 'item',
        EVENT: 'event'
    },
    
    FACTION_TYPES: {
        POLITICAL: 'political',
        MILITARY: 'military',
        RELIGIOUS: 'religious',
        CRIMINAL: 'criminal',
        MERCHANT: 'merchant',
        ACADEMIC: 'academic'
    },
    
    LOCATION_TYPES: {
        SETTLEMENT: 'settlement',
        WILDERNESS: 'wilderness',
        STRUCTURE: 'structure',
        LANDMARK: 'landmark',
        DUNGEON: 'dungeon'
    },
    
    ITEM_TYPES: {
        WEAPON: 'weapon',
        ARMOR: 'armor',
        TOOL: 'tool',
        TREASURE: 'treasure',
        CONSUMABLE: 'consumable',
        QUEST: 'quest',
        MISC: 'misc'
    },
    
    RARITY_LEVELS: {
        COMMON: 'common',
        UNCOMMON: 'uncommon',
        RARE: 'rare',
        EPIC: 'epic',
        LEGENDARY: 'legendary'
    },
    
    IMPORTANCE_LEVELS: {
        LOW: 'low',
        MEDIUM: 'medium',
        HIGH: 'high',
        CRITICAL: 'critical'
    },
    
    VALIDATION_RULES: {
        MAX_NPCS_PER_LOCATION: 15,
        MAX_FACTIONS_PER_TERRITORY: 3,
        MIN_TRUST_FOR_ALLIANCE: 70,
        MAX_ITEMS_IN_INVENTORY: 25,
        MAX_ACTIVE_EVENTS: 10,
        MAX_RUMORS: 15
    },
    
    WORLD_PARAMETERS: {
        GLOBAL_TENSION: { min: 0, max: 100, default: 30 },
        POLITICAL_STABILITY: { min: 0, max: 100, default: 80 },
        ECONOMIC_STATE: { min: 0, max: 100, default: 50 },
        MAGICAL_ACTIVITY: { min: 0, max: 100, default: 20 }
    },
    
    PLAYER_SKILLS: {
        COMBAT: 'combat',
        DIPLOMACY: 'diplomacy',
        STEALTH: 'stealth',
        KNOWLEDGE: 'knowledge',
        MAGIC: 'magic',
        SURVIVAL: 'survival'
    },
    
    REPUTATION_TYPES: {
        HEROIC: 'heroic',
        VILLAINOUS: 'villainous',
        MYSTERIOUS: 'mysterious',
        DIPLOMATIC: 'diplomatic'
    }
};