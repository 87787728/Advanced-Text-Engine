const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIInterface {
    constructor(apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
        
        this.prompts = {
            entityDetection: this.buildEntityDetectionPrompt.bind(this),
            storyGeneration: this.buildStoryGenerationPrompt.bind(this),
            consequenceAnalysis: this.buildConsequenceAnalysisPrompt.bind(this),
            worldAnalysis: this.buildWorldAnalysisPrompt.bind(this)
        };
    }
    
    async detectEntities(playerInput, narrative, worldState) {
        try {
            const prompt = this.prompts.entityDetection(playerInput, narrative, worldState);
            const result = await this.model.generateContent(prompt);
            const response = await result.response.text();
            
            return this.parseEntityDetectionResponse(response);
        } catch (error) {
            console.error('Entity detection error:', error);
            return { entities: {}, relationships: [], worldUpdates: {} };
        }
    }
    
    async generateStory(playerInput, worldState) {
        try {
            const prompt = this.prompts.storyGeneration(playerInput, worldState);
            const result = await this.model.generateContent(prompt);
            const response = await result.response.text();
            return response;
        } catch (error) {
            console.error('Story generation error:', error);
            return "The fabric of reality seems to waver as mystical forces interfere with the flow of time and space... (Error in narrative generation)";
        }
    }
    
    async analyzeConsequences(playerInput, choice, worldState) {
        try {
            const prompt = this.prompts.consequenceAnalysis(playerInput, choice, worldState);
            const result = await this.model.generateContent(prompt);
            const response = await result.response.text();
            
            return this.parseConsequenceResponse(response);
        } catch (error) {
            console.error('Consequence analysis error:', error);
            return { consequences: {}, impacts: [] };
        }
    }
    
    buildEntityDetectionPrompt(playerInput, narrative, worldState) {
        const existingEntities = {
            npcs: Object.keys(worldState.entities.npcs || {}),
            factions: Object.keys(worldState.entities.factions || {}),
            locations: Object.keys(worldState.entities.locations || {}),
            items: Object.keys(worldState.entities.items || {}),
            events: worldState.worldState.events.current.map(e => e.name) || []
        };
        
        return `Analyze this interaction for sophisticated entity creation and relationship dynamics.

PLAYER ACTION: "${playerInput}"
NARRATIVE CONTEXT: "${narrative}"

EXISTING WORLD STATE:
${JSON.stringify(existingEntities, null, 2)}

CURRENT WORLD PARAMETERS:
- Global Tension: ${worldState.worldState.globalParameters.tension}/100
- Political Stability: ${worldState.worldState.globalParameters.politicalStability}/100
- Current Location: ${worldState.player.currentLocation}
- Active Events: ${worldState.worldState.events.current.length}

DETECTION REQUIREMENTS:
- Only detect entities that are explicitly mentioned or clearly implied
- Ensure logical consistency with existing world state
- Consider geographical and political relationships
- Account for power dynamics and social hierarchies
- Validate against current world parameters

Return ONLY valid JSON:
{
  "entities": {
    "npcs": [
      {
        "id": "unique_id",
        "name": "Display Name",
        "occupation": "role/job",
        "location": "current_location",
        "traits": ["trait1", "trait2"],
        "age": 30,
        "importance": "low/medium/high",
        "relationship_to_player": "neutral/positive/negative",
        "goals": ["goal1"],
        "secrets": ["secret1"],
        "backstory": "brief background"
      }
    ],
    "factions": [
      {
        "id": "faction_id",
        "name": "Faction Name",
        "type": "political/military/religious/criminal/merchant",
        "influence": 40,
        "territory": ["location1"],
        "goals": ["primary_goal"],
        "allies": ["ally_faction"],
        "enemies": ["enemy_faction"],
        "leadership": ["leader_npc_id"]
      }
    ],
    "locations": [
      {
        "id": "location_id",
        "name": "Location Name",
        "type": "settlement/wilderness/structure/landmark",
        "safety": 70,
        "population": 100,
        "controlledBy": "faction_id",
        "connectedTo": ["other_location"],
        "resources": ["resource1"],
        "description": "detailed description"
      }
    ],
    "items": [
      {
        "id": "item_id",
        "name": "Item Name",
        "type": "weapon/armor/tool/treasure/consumable",
        "value": 50,
        "rarity": "common/uncommon/rare/legendary",
        "properties": ["magical", "heavy"],
        "location": "where_found"
      }
    ],
    "events": [
      {
        "id": "event_id",
        "name": "Event Name",
        "type": "political/social/natural/magical",
        "scope": "local/regional/global",
        "duration": "ongoing/temporary",
        "consequences": ["effect1"]
      }
    ]
  },
  "relationships": [
    {
      "entity1": "id1",
      "entity2": "id2", 
      "type": "ally/enemy/neutral/subordinate",
      "strength": 50,
      "reason": "why they have this relationship"
    }
  ],
  "worldUpdates": {
    "tension": 0,
    "politicalStability": 0,
    "economicState": 0,
    "magicalActivity": 0,
    "rumors": ["new_rumor"],
    "news": ["news_item"]
  }
}`;
    }
    
    buildStoryGenerationPrompt(playerInput, worldState) {
        return `You are an advanced AI storyteller managing a complex, dynamic narrative world. Create immersive responses that reflect the sophisticated relationship dynamics and world state.

COMPREHENSIVE WORLD STATE:
${JSON.stringify(this.compileWorldStateForPrompt(worldState), null, 2)}

ADVANCED STORYTELLING DIRECTIVES:
- Maintain narrative consistency with established facts, relationships, and world events
- Reference specific relationship metrics (trust, fear, respect, love) naturally in character interactions
- Consider faction politics, territorial control, and economic factors in your narrative
- Account for time of day, weather, season, and current world tension in scene setting
- Build on established character goals, secrets, and backstories
- Reflect player reputation and skill levels in how NPCs react and what options are available
- Introduce new entities only when narratively justified and logically consistent
- Consider the cumulative impact of recent player choices on the world state

DYNAMIC WORLD BUILDING GUIDELINES:
- New NPCs should have logical occupations, relationships, and motivations
- New factions should fit the established political landscape
- New locations should connect geographically and politically to existing areas
- New events should emerge from existing tensions and character goals
- Maintain cause-and-effect relationships between player actions and world changes

PLAYER INPUT: "${playerInput}"

Generate a sophisticated narrative response (200-350 words) that:
1. Acknowledges the player's action with appropriate NPC/faction reactions based on relationship metrics
2. Incorporates relevant world state elements (tension, political situation, current events)
3. Advances character goals and ongoing narrative arcs
4. Reflects the consequences of previous choices
5. Provides 3-4 meaningful choice options that could significantly impact relationships, world events, or story progression

Each choice should indicate potential consequences and require different skill sets or approaches.

Format:
[RICH NARRATIVE DESCRIPTION]

CHOICES:
1. [Skill-based or relationship-dependent option]
2. [Political/faction-oriented option] 
3. [Personal/character development option]
4. [Risk/reward or moral dilemma option]`;
    }
    
    buildConsequenceAnalysisPrompt(playerInput, choice, worldState) {
        return `Analyze the consequences of this player choice in the context of the current world state.

PLAYER INPUT: "${playerInput}"
CHOSEN ACTION: "${choice}"

CURRENT WORLD STATE:
${JSON.stringify(this.compileWorldStateForPrompt(worldState), null, 2)}

Analyze the potential consequences across multiple dimensions:

Return ONLY valid JSON:
{
  "consequences": {
    "immediate": {
      "npcReactions": {
        "npc_id": {
          "trust": 0,
          "fear": 0,
          "respect": 0,
          "love": 0,
          "mood": "new_mood"
        }
      },
      "factionStandings": {
        "faction_id": 5
      },
      "playerEffects": {
        "health": 0,
        "reputation": {
          "heroic": 0,
          "villainous": 0
        },
        "skills": {
          "combat": 0
        }
      }
    },
    "worldEffects": {
      "tension": 0,
      "politicalStability": 0,
      "economicState": 0,
      "magicalActivity": 0
    },
    "longTerm": {
      "newEvents": ["event_id"],
      "changedRelationships": [
        {
          "entity1": "id1",
          "entity2": "id2",
          "newRelationship": "ally"
        }
      ],
      "rumors": ["rumor_text"],
      "futureOpportunities": ["opportunity_text"]
    }
  },
  "riskAssessment": {
    "severity": "low/medium/high",
    "domains": ["political", "social", "personal"],
    "mitigationOptions": ["option1"]
  }
}`;
    }
    
    buildWorldAnalysisPrompt(worldState) {
        return `Analyze the current world state and provide insights about ongoing trends, potential conflicts, and emerging opportunities.

WORLD STATE:
${JSON.stringify(this.compileWorldStateForPrompt(worldState), null, 2)}

Provide analysis in JSON format:
{
  "trends": [
    {
      "type": "political/social/economic/magical",
      "description": "trend description",
      "direction": "rising/falling/stable",
      "significance": "low/medium/high"
    }
  ],
  "conflicts": [
    {
      "parties": ["entity1", "entity2"],
      "type": "political/territorial/ideological",
      "likelihood": "low/medium/high",
      "impact": "local/regional/global"
    }
  ],
  "opportunities": [
    {
      "type": "diplomatic/economic/magical/adventure",
      "description": "opportunity description",
      "requirements": ["requirement1"],
      "rewards": ["reward1"]
    }
  ],
  "warnings": [
    {
      "concern": "concern description",
      "severity": "low/medium/high",
      "timeframe": "immediate/short/long"
    }
  ]
}`;
    }
    
    compileWorldStateForPrompt(worldState) {
        return {
            player: {
                name: worldState.player.name,
                level: worldState.player.level,
                location: worldState.player.currentLocation,
                health: worldState.player.health,
                reputation: worldState.player.reputation,
                skills: worldState.player.skills,
                recentChoices: worldState.player.choiceHistory?.slice(-3) || []
            },
            worldParameters: worldState.worldState.globalParameters,
            timeContext: worldState.worldState.temporal,
            entities: {
                knownNPCs: Object.fromEntries(
                    Object.entries(worldState.entities?.npcs || {})
                        .filter(([_, npc]) => npc.met)
                        .map(([id, npc]) => [id, {
                            name: npc.name,
                            occupation: npc.occupation,
                            location: npc.location,
                            trust: npc.trust,
                            fear: npc.fear,
                            respect: npc.respect,
                            love: npc.love,
                            mood: npc.mood,
                            importance: npc.importance
                        }])
                ),
                activeFactions: Object.fromEntries(
                    Object.entries(worldState.entities?.factions || {}).map(([id, faction]) => [id, {
                        name: faction.name,
                        type: faction.type,
                        influence: faction.influence,
                        attitude: faction.attitude,
                        territory: faction.territory
                    }])
                ),
                knownLocations: Object.fromEntries(
                    Object.entries(worldState.entities?.locations || {})
                        .filter(([_, loc]) => loc.visited)
                        .map(([id, loc]) => [id, {
                            name: loc.name,
                            type: loc.type,
                            safety: loc.safety,
                            controlledBy: loc.controlledBy
                        }])
                )
            },
            currentEvents: worldState.worldState.events.current,
            playerStandings: worldState.relationships?.playerStandings || {},
            recentRumors: worldState.worldState.information.rumorMill.slice(-3)
        };
    }
    
    parseEntityDetectionResponse(response) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.error('Failed to parse entity detection response:', error);
        }
        
        return { entities: {}, relationships: [], worldUpdates: {} };
    }
    
    parseConsequenceResponse(response) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.error('Failed to parse consequence response:', error);
        }
        
        return { consequences: {}, riskAssessment: {} };
    }
}

module.exports = AIInterface;