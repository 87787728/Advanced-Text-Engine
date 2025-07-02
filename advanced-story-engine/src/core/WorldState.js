const { WORLD_PARAMETERS } = require('../utils/Constants');

class WorldState {
    constructor() {
        this.globalParameters = {
            tension: WORLD_PARAMETERS.GLOBAL_TENSION.default,
            politicalStability: WORLD_PARAMETERS.POLITICAL_STABILITY.default,
            economicState: WORLD_PARAMETERS.ECONOMIC_STATE.default,
            magicalActivity: WORLD_PARAMETERS.MAGICAL_ACTIVITY.default
        };
        
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
    
    updateGlobalParameter(parameter, change, reason = '') {
        if (this.globalParameters.hasOwnProperty(parameter)) {
            const oldValue = this.globalParameters[parameter];
            const bounds = WORLD_PARAMETERS[parameter.toUpperCase()];
            
            this.globalParameters[parameter] = Math.max(
                bounds.min,
                Math.min(bounds.max, oldValue + change)
            );
            
            this.recordWorldChange({
                type: 'parameter_change',
                parameter: parameter,
                oldValue: oldValue,
                newValue: this.globalParameters[parameter],
                change: change,
                reason: reason,
                timestamp: new Date().toISOString()
            });
            
            return this.globalParameters[parameter];
        }
        
        throw new Error(`Unknown global parameter: ${parameter}`);
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
    
    recordWorldChange(change) {
        this.history.worldChanges.push(change);
        
        // Keep history manageable
        if (this.history.worldChanges.length > 100) {
            this.history.worldChanges = this.history.worldChanges.slice(-100);
        }
    }
    
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