const Constants = require('../utils/Constants');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errorHandler');

/**
 * Manages the global state of the game world, including parameters, temporal state,
 * events, and historical records.
 * 
 * @class WorldState
 * @example
 * const worldState = new WorldState();
 * worldState.updateGlobalParameter('GLOBAL_TENSION', 10, 'Player action');
 */
class WorldState {
    /**
     * Creates a new WorldState instance with default values.
     * Initializes global parameters, temporal state, events, and history.
     * 
     * @constructor
     * @throws {AppError} If there's an error initializing the world state
     */
    constructor() {
        try {
            logger.info('Initializing WorldState...');
            // Initialize global parameters with default values
            this.globalParameters = {};
        Object.entries(Constants.WORLD_PARAMETERS).forEach(([key, value]) => {
            // Convert key to camelCase for the internal object
            const paramName = key.toLowerCase().replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
            this.globalParameters[paramName] = value.default;
        });
        
        this.temporal = {
            timeOfDay: 'morning',
            season: 'spring',
            weather: 'clear',
            day: 1,
            month: 'firstmonth',
            year: 1000
        };
        
        this.events = {
            current: [],
            completed: [],
            failed: [],
            scheduled: []
        };
        
        this.information = {
            rumorMill: [],
            news: [],
            secrets: [],
            prophecies: []
        };
        
        this.history = {
            majorEvents: [],
            decisiveChoices: [],
            worldChanges: []
        };
    }
    
    /**
     * Updates a global parameter by applying the specified change.
     * The value will be clamped within the parameter's defined bounds.
     * 
     * @param {string} parameter - The name of the parameter to update (case-insensitive)
     * @param {number} change - The amount to add to the current value
     * @param {string} [reason=''] - The reason for the change (for history tracking)
     * @returns {number} The new value of the parameter
     * @throws {AppError} If the parameter is invalid or the update fails
     * @example
     * // Increase tension by 10
     * worldState.updateGlobalParameter('GLOBAL_TENSION', 10, 'Player made a difficult choice');
     */
    updateGlobalParameter(parameter, change, reason = '') {
        try {
            if (typeof parameter !== 'string' || parameter.trim() === '') {
                throw new AppError('Parameter name must be a non-empty string', 400);
            }

            if (typeof change !== 'number' || isNaN(change)) {
                throw new AppError('Change must be a valid number', 400);
            }

            logger.debug(`Updating global parameter: ${parameter} (change: ${change}, reason: ${reason})`);
        
        // First try exact match
        if (this.globalParameters.hasOwnProperty(parameter)) {
            const paramKey = Object.entries(Constants.WORLD_PARAMETERS)
                .find(([key, value]) => 
                    key.toLowerCase() === parameter.toUpperCase() || 
                    key.toLowerCase().replace(/_/g, '').toLowerCase() === parameter.toLowerCase()
                )?.[0];
            
            if (!paramKey) {
                const errorMsg = `Unknown global parameter: ${parameter}. Available parameters: ${Object.keys(Constants.WORLD_PARAMETERS).join(', ')}`;
                logger.warn(errorMsg);
                throw new AppError(errorMsg, 400);
            }
            
            const bounds = Constants.WORLD_PARAMETERS[paramKey];
            const paramName = paramKey.toLowerCase().replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
            
            const oldValue = this.globalParameters[parameter];
            const newValue = Math.max(
                bounds.min,
                Math.min(bounds.max, oldValue + change)
            );
            
            console.log(`Updating ${parameter} (${paramName}) from ${oldValue} to ${newValue}`);
            this.globalParameters[parameter] = newValue;
            
            try {
                this.recordWorldChange({
                    type: 'parameter_change',
                    parameter: parameter,
                    oldValue: oldValue,
                    newValue: newValue,
                    change: change,
                    reason: reason,
                    timestamp: new Date().toISOString()
                });
                
                logger.info(`Updated ${parameter} from ${oldValue} to ${newValue} (change: ${change})`);
                return newValue;
            }
        } catch (error) {
            logger.error(`Error in updateGlobalParameter: ${error.message}`, { error, parameter, change, reason });
            throw error;
        }
    }
    
    advanceTime(amount = 1, unit = 'hour') {
        const oldTime = { ...this.temporal };
        
        switch (unit) {
            case 'hour':
                this.advanceHours(amount);
                break;
            case 'day':
                this.advanceDays(amount);
                break;
            case 'month':
                this.advanceMonths(amount);
                break;
            case 'year':
                this.advanceYears(amount);
                break;
            default:
                throw new Error(`Unknown time unit: ${unit}`);
        }
        
        this.recordWorldChange({
            type: 'time_advancement',
            oldTime: oldTime,
            newTime: { ...this.temporal },
            amount: amount,
            unit: unit,
            timestamp: new Date().toISOString()
        });
        
        // Process time-based events
        this.processTimeBasedEvents();
    }
    
    advanceHours(hours) {
        // Simplified time system - implement full calendar logic as needed
        const timeOfDayMap = ['dawn', 'morning', 'midday', 'afternoon', 'evening', 'night'];
        let currentIndex = timeOfDayMap.indexOf(this.temporal.timeOfDay);
        
        for (let i = 0; i < hours; i++) {
            currentIndex = (currentIndex + 1) % timeOfDayMap.length;
            if (currentIndex === 0) { // New day
                this.advanceDays(1);
            }
        }
        
        this.temporal.timeOfDay = timeOfDayMap[currentIndex];
    }
    
    advanceDays(days) {
        this.temporal.day += days;
        
        // Simple month advancement (30 days per month)
        while (this.temporal.day > 30) {
            this.temporal.day -= 30;
            this.advanceMonths(1);
        }
    }
    
    advanceMonths(months) {
        const monthMap = ['firstmonth', 'secondmonth', 'thirdmonth', 'fourthmonth'];
        const seasonMap = ['spring', 'summer', 'autumn', 'winter'];
        
        let currentMonthIndex = monthMap.indexOf(this.temporal.month);
        
        for (let i = 0; i < months; i++) {
            currentMonthIndex = (currentMonthIndex + 1) % monthMap.length;
            if (currentMonthIndex === 0) { // New year
                this.advanceYears(1);
            }
        }
        
        this.temporal.month = monthMap[currentMonthIndex];
        this.temporal.season = seasonMap[Math.floor(currentMonthIndex / 1)]; // Update based on month
    }
    
    advanceYears(years) {
        this.temporal.year += years;
    }
    
    addEvent(eventData) {
        const event = {
            id: eventData.id || `event_${Date.now()}`,
            name: eventData.name,
            type: eventData.type || 'social',
            scope: eventData.scope || 'local',
            duration: eventData.duration || 'ongoing',
            startTime: eventData.startTime || new Date().toISOString(),
            endTime: eventData.endTime || null,
            participants: eventData.participants || [],
            consequences: eventData.consequences || [],
            description: eventData.description || '',
            status: 'active'
        };
        
        this.events.current.push(event);
        
        this.recordWorldChange({
            type: 'event_added',
            event: event,
            timestamp: new Date().toISOString()
        });
        
        return event;
    }
    
    completeEvent(eventId, success = true) {
        const eventIndex = this.events.current.findIndex(e => e.id === eventId);
        if (eventIndex === -1) {
            throw new Error(`Event ${eventId} not found in current events`);
        }
        
        const event = this.events.current.splice(eventIndex, 1)[0];
        event.endTime = new Date().toISOString();
        event.status = success ? 'completed' : 'failed';
        
        if (success) {
            this.events.completed.push(event);
        } else {
            this.events.failed.push(event);
        }
        
        this.recordWorldChange({
            type: 'event_completed',
            event: event,
            success: success,
            timestamp: new Date().toISOString()
        });
        
        return event;
    }
    
    addRumor(rumor) {
        this.information.rumorMill.push({
            content: rumor,
            spread: 1,
            accuracy: Math.random() * 100, // Random accuracy
            timestamp: new Date().toISOString()
        });
        
        // Keep rumor mill manageable
        if (this.information.rumorMill.length > 15) {
            this.information.rumorMill = this.information.rumorMill.slice(-15);
        }
    }
    
    spreadRumor(rumorIndex) {
        if (this.information.rumorMill[rumorIndex]) {
            this.information.rumorMill[rumorIndex].spread++;
        }
    }
    
    addNews(newsItem) {
        this.information.news.unshift({
            content: newsItem,
            importance: 'medium',
            timestamp: new Date().toISOString()
        });
        
        // Keep news list manageable
        if (this.information.news.length > 20) {
            this.information.news = this.information.news.slice(0, 20);
        }
    }
    
    processTimeBasedEvents() {
        // Process scheduled events
        const currentTime = new Date().toISOString();
        
        this.events.scheduled = this.events.scheduled.filter(scheduledEvent => {
            if (scheduledEvent.triggerTime <= currentTime) {
                this.addEvent(scheduledEvent.eventData);
                return false; // Remove from scheduled
            }
            return true;
        });
        
        // Update event durations
        this.events.current.forEach(event => {
            if (event.duration === 'temporary' && event.endTime && event.endTime <= currentTime) {
                this.completeEvent(event.id, true);
            }
        });
    }

    /**
     * Records a change to the world state in the history log.
     * 
     * @param {Object} change - The change to record
     * @param {string} change.type - The type of change (e.g., 'parameter_change')
     * @param {string} change.parameter - The parameter that was changed
     * @param {*} change.oldValue - The value before the change
     * @param {*} change.newValue - The value after the change
     * @param {*} [change.change] - The delta of the change
     * @param {string} [change.reason] - The reason for the change
     * @param {string} [change.timestamp] - When the change occurred (ISO string)
     * @throws {AppError} If the change object is invalid
     */
    recordWorldChange(change) {
        const requiredFields = ['type', 'parameter', 'oldValue', 'newValue'];
        const missingFields = requiredFields.filter(field => !(field in change));

        if (missingFields.length > 0) {
            const errorMsg = `Invalid change object. Missing required fields: ${missingFields.join(', ')}`;
            logger.error(errorMsg, { change });
            throw new AppError(errorMsg, 400);
        }

        try {
            this.history.worldChanges.push({
                ...change,
                timestamp: change.timestamp || new Date().toISOString()
            });

            // Keep history size manageable
            if (this.history.worldChanges.length > 1000) {
                this.history.worldChanges = this.history.worldChanges.slice(-1000);
            }

            logger.debug(`Recorded world change: ${change.type} for ${change.parameter}`);
        } catch (error) {
            const errorMsg = `Failed to record world change: ${error.message}`;
            logger.error(errorMsg, { error, change });
            throw new AppError(errorMsg, 500, false);
        }
    }

    /**
     * Gets a summary of the world state.
     * 
     * @returns {Object} A summary of the world state
     */
    getWorldSummary() {
        return {
            parameters: this.globalParameters,
            time: this.temporal,
            activeEvents: this.events.current.length,
            completedEvents: this.events.completed.length,
            failedEvents: this.events.failed.length,
            currentRumors: this.information.rumorMill.length,
            recentNews: this.information.news.slice(0, 3)
        };
    }
    
    analyzeWorldState() {
        const analysis = {
            stability: 'stable',
            tension: 'low',
            economicHealth: 'good',
            magicalClimate: 'normal',
            trends: [],
            concerns: [],
            opportunities: []
        };
        
        // Analyze stability
        if (this.globalParameters.politicalStability < 30) {
            analysis.stability = 'unstable';
            analysis.concerns.push('Political instability threatens the realm');
        } else if (this.globalParameters.politicalStability < 60) {
            analysis.stability = 'fragile';
        }
        
        // Analyze tension
        if (this.globalParameters.tension > 70) {
            analysis.tension = 'high';
            analysis.concerns.push('Rising tensions may lead to conflict');
        } else if (this.globalParameters.tension > 40) {
            analysis.tension = 'moderate';
        }
        
        // Analyze economy
        if (this.globalParameters.economicState < 30) {
            analysis.economicHealth = 'poor';
            analysis.concerns.push('Economic downturn affects all sectors');
        } else if (this.globalParameters.economicState > 70) {
            analysis.economicHealth = 'excellent';
            analysis.opportunities.push('Economic prosperity enables expansion');
        }
        
        // Analyze magical activity
        if (this.globalParameters.magicalActivity > 70) {
            analysis.magicalClimate = 'highly active';
            analysis.opportunities.push('Increased magical energy enables powerful rituals');
        } else if (this.globalParameters.magicalActivity < 20) {
            analysis.magicalClimate = 'dormant';
        }
        
        return analysis;
    }
    
    exportWorldState() {
        return {
            globalParameters: this.globalParameters,
            temporal: this.temporal,
            events: this.events,
            information: this.information,
            history: {
                majorEvents: this.history.majorEvents,
                decisiveChoices: this.history.decisiveChoices.slice(-20),
                worldChanges: this.history.worldChanges.slice(-50)
            },
            timestamp: new Date().toISOString()
        };
    }
    
    importWorldState(data) {
        this.globalParameters = data.globalParameters || this.globalParameters;
        this.temporal = data.temporal || this.temporal;
        this.events = data.events || this.events;
        this.information = data.information || this.information;
        this.history = data.history || this.history;
    }
}

module.exports = WorldState;