const readline = require('readline');
const StoryEngine = require('./core/StoryEngine');

class GameInterface {
    constructor() {
        this.engine = null;
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        this.commands = {
            'help': this.showHelp.bind(this),
            'stats': this.showStats.bind(this),
            'status': this.showStatus.bind(this),
            'save': this.saveGame.bind(this),
            'load': this.loadGame.bind(this),
            'analyze': this.analyzeWorld.bind(this),
            'relationships': this.showRelationships.bind(this),
            'inventory': this.showInventory.bind(this),
            'quit': this.quit.bind(this),
            'exit': this.quit.bind(this)
        };
    }
    
    async initialize() {
        console.log("🎭 Advanced Dynamic Story Engine v2.0");
        console.log("🌟 A sophisticated world that grows and evolves with every choice!");
        console.log("═".repeat(70));
        
        const apiKey = await this.askQuestion("🔑 Enter your Gemini API key: ");
        
        if (!apiKey.trim()) {
            console.log("❌ API key required to run the advanced story engine!");
            process.exit(1);
        }
        
        console.log("\n⚡ Initializing advanced systems...");
        this.engine = new StoryEngine(apiKey);
        
        console.log("✅ All systems operational!");
        console.log("\nType 'help' for commands or start your adventure!\n");
        
        // Check for existing save
        const loadSave = await this.askQuestion("📁 Load existing save? (y/N): ");
        if (loadSave.toLowerCase().startsWith('y')) {
            const success = await this.engine.loadGame();
            if (!success) {
                console.log("🆕 Starting new adventure instead!");
            }
        }
        
        // Generate initial story if new game
        if (this.engine.meta.choiceCount === 0) {
            await this.generateInitialStory();
        }
    }
    
    async generateInitialStory() {
        console.log("\n🎲 Generating your opening story...\n");
        
        const response = await this.engine.processPlayerChoice(
            "I find myself in the village square, taking in my surroundings and considering my opportunities in this new place. I want to understand the local dynamics and find my place in this community."
        );
        
        console.log(response.narrative);
        
        if (response.newEntitiesCount > 0) {
            console.log(`\n✨ ${response.newEntitiesCount} new entities added to your world!`);
        }
    }
    
    async gameLoop() {
        while (true) {
            try {
                const input = await this.askQuestion("\n> What do you choose? ");
                
                if (this.commands[input.toLowerCase()]) {
                    await this.commands[input.toLowerCase()]();
                    continue;
                }
                
                // Process as story choice
                console.log("\n🎲 Processing your choice...\n");
                const response = await this.engine.processPlayerChoice(input);
                
                console.log(response.narrative);
                
                // Show creation results if any
                if (response.newEntitiesCount > 0) {
                    console.log(`\n✨ ${response.newEntitiesCount} new entities added to your world!`);
                    
                    if (response.creationResults.warnings.length > 0) {
                        console.log("\n⚠️ Warnings:");
                        response.creationResults.warnings.forEach(warning => 
                            console.log(`  • ${warning}`)
                        );
                    }
                }
                
                // Auto-save every few choices
                if (this.engine.meta.choiceCount % 5 === 0) {
                    await this.engine.saveGame();
                }
                
            } catch (error) {
                console.error("\n💥 Error processing input:", error.message);
                console.log("🔧 The world stabilizes as reality reasserts itself...\n");
            }
        }
    }
    
    async showHelp() {
        console.log("\n📜 ADVANCED STORY ENGINE COMMANDS");
        console.log("═".repeat(50));
        console.log("🎮 GAMEPLAY:");
        console.log("  help          - Show this help");
        console.log("  stats         - Display comprehensive world state");
        console.log("  status        - Show engine system status");
        console.log("  relationships - Show detailed relationship networks");
        console.log("  inventory     - Show player inventory and items");
        console.log("  analyze       - Analyze current world state");
        console.log("");
        console.log("💾 SAVE/LOAD:");
        console.log("  save          - Save current game state");
        console.log("  load          - Load saved game state");
        console.log("  quit/exit     - Save and quit game");
        console.log("");
        console.log("🌟 ADVANCED FEATURES:");
        console.log("  • Multi-dimensional relationship tracking (trust, fear, respect, love)");
        console.log("  • Dynamic faction politics and territorial control");
        console.log("  • Skill-based choice consequences with progression");
        console.log("  • Complex world events with lasting global impact");
        console.log("  • Advanced memory and narrative consistency engine");
        console.log("  • Procedural world expansion with intelligent validation");
        console.log("  • Sophisticated reputation system across multiple domains");
        console.log("  • Real-time world state analysis and trend prediction");
        console.log("═".repeat(50));
    }
    
    async showStats() {
        const gameState = this.engine.getDetailedGameState();
        
        console.log("\n📊 COMPREHENSIVE WORLD STATE");
        console.log("═".repeat(80));
        
        // Player Overview
        console.log("🧙 PLAYER PROFILE:");
        console.log(`   Name: ${gameState.player.name} (Level ${gameState.player.level})`);
        console.log(`   Location: ${gameState.player.currentLocation}`);
        console.log(`   Health: ${gameState.player.health}/${gameState.player.maxHealth}`);
        console.log(`   Experience: ${gameState.player.experience}`);
        console.log(`   Mood: ${gameState.player.mood}`);
        
        // Reputation
        console.log("\n👑 REPUTATION PROFILE:");
        Object.entries(gameState.player.reputation).forEach(([type, value]) => {
            const emoji = value > 10 ? "📈" : value < -10 ? "📉" : "📊";
            const status = value > 20 ? "High" : value > 5 ? "Moderate" : value < -20 ? "Very Low" : value < -5 ? "Low" : "Neutral";
            console.log(`   ${emoji} ${type.charAt(0).toUpperCase() + type.slice(1)}: ${value > 0 ? '+' : ''}${value} (${status})`);
        });
        
        // Skills with progress bars
        console.log("\n⚔️ SKILL MASTERY:");
        Object.entries(gameState.player.skills).forEach(([skill, level]) => {
            const bar = "█".repeat(Math.floor(level/5)) + "░".repeat(20 - Math.floor(level/5));
            const mastery = level >= 80 ? "Expert" : level >= 60 ? "Advanced" : level >= 40 ? "Skilled" : level >= 20 ? "Competent" : "Novice";
            console.log(`   ${skill.padEnd(12)}: ${bar} ${level}/100 (${mastery})`);
        });
        
        // Known NPCs with detailed relationships
        console.log("\n👥 CHARACTER RELATIONSHIPS:");
        Object.entries(gameState.entities.npcs).forEach(([id, npc]) => {
            if (npc.met) {
                console.log(`\n   ${npc.name} (${npc.occupation}) - ${npc.location}`);
                console.log(`     Trust: ${npc.trust}/100, Respect: ${npc.respect}/100`);
                console.log(`     Fear: ${npc.fear}/100, Love: ${npc.love}/100`);
                console.log(`     Mood: ${npc.mood}, Importance: ${npc.importance}`);
                if (npc.traits.length > 0) {
                    console.log(`     Traits: ${npc.traits.join(', ')}`);
                }
            }
        });
        
        // Faction Relations
        console.log("\n🏛️ FACTION DYNAMICS:");
        Object.entries(gameState.entities.factions).forEach(([id, faction]) => {
            const standing = gameState.relationships.playerStandings[id];
            const standingValue = standing ? standing.value : 0;
            const emoji = standingValue > 20 ? "😊" : standingValue > -20 ? "😐" : "😠";
            const relationship = standingValue > 30 ? "Allied" : standingValue > 10 ? "Friendly" : 
                               standingValue > -10 ? "Neutral" : standingValue > -30 ? "Unfriendly" : "Hostile";
            
            console.log(`\n   ${emoji} ${faction.name} (${faction.type})`);
            console.log(`     Player Standing: ${standingValue > 0 ? '+' : ''}${standingValue} (${relationship})`);
            console.log(`     Influence: ${faction.influence}/100, Attitude: ${faction.attitude}`);
            console.log(`     Territory: ${faction.territory.join(', ')}`);
            if (faction.goals.length > 0) {
                console.log(`     Goals: ${faction.goals.join(', ')}`);
            }
        });
        
        // World State
        console.log("\n🌍 GLOBAL DYNAMICS:");
        const worldParams = gameState.worldState.globalParameters;
        console.log(`   Global Tension: ${worldParams.tension}/100 ${this.getTensionDescription(worldParams.tension)}`);
        console.log(`   Political Stability: ${worldParams.politicalStability}/100 ${this.getStabilityDescription(worldParams.politicalStability)}`);
        console.log(`   Economic State: ${worldParams.economicState}/100 ${this.getEconomicDescription(worldParams.economicState)}`);
        console.log(`   Magical Activity: ${worldParams.magicalActivity}/100 ${this.getMagicalDescription(worldParams.magicalActivity)}`);
        
        // Time and Environment
        console.log("\n🕐 TEMPORAL CONTEXT:");
        const temporal = gameState.worldState.temporal;
        console.log(`   Time: ${temporal.timeOfDay}, Season: ${temporal.season}`);
        console.log(`   Weather: ${temporal.weather}, Day: ${temporal.day}`);
        console.log(`   Month: ${temporal.month}, Year: ${temporal.year}`);
        
        // Active Events
        console.log("\n📅 CURRENT EVENTS:");
        if (gameState.worldState.events.current.length > 0) {
            gameState.worldState.events.current.forEach(event => {
                console.log(`   • ${event.name} (${event.type}, ${event.scope})`);
                if (event.description) {
                    console.log(`     ${event.description}`);
                }
            });
        } else {
            console.log("   • No major events currently active");
        }
        
        // Recent Activity
        console.log("\n📈 RECENT ACTIVITY:");
        if (gameState.analysis) {
            const activity = gameState.analysis.playerProfile.recentActivity;
            console.log(`   Choices Made: ${activity.choicesLastSession}`);
            console.log(`   Locations Visited: ${activity.locationsVisited}`);
            console.log(`   Major Decisions: ${activity.majorDecisions.length}`);
        }
        
        // Creation Statistics
        console.log("\n✨ DYNAMIC WORLD STATISTICS:");
        const stats = gameState.analysis.entityStatistics;
        console.log(`   🎭 NPCs: ${stats.npcs.total} total, ${stats.npcs.met} met, ${stats.npcs.alive} alive`);
        console.log(`   🏛️ Factions: ${stats.factions.total} total, ${stats.factions.allied} allied, ${stats.factions.hostile} hostile`);
        console.log(`   🗺️ Locations: ${stats.locations.total} total, ${stats.locations.visited} visited`);
        console.log(`   📦 Items: ${stats.items.total} total, ${stats.items.inInventory} in inventory`);
        console.log(`   🎲 Total Choices: ${gameState.meta.choiceCount}`);
        console.log(`   ⏱️ Session Time: ${Math.floor((Date.now() - gameState.meta.sessionId) / 60000)} minutes`);
        
        console.log("═".repeat(80));
    }
    
    getTensionDescription(tension) {
        if (tension > 80) return "(🔥 Extreme Crisis)";
        if (tension > 60) return "(⚡ High Tension)";
        if (tension > 40) return "(⚠️ Moderate Tension)";
        if (tension > 20) return "(😌 Low Tension)";
        return "(☮️ Peaceful)";
    }
    
    getStabilityDescription(stability) {
        if (stability > 80) return "(🏛️ Very Stable)";
        if (stability > 60) return "(📊 Stable)";
        if (stability > 40) return "(⚖️ Uncertain)";
        if (stability > 20) return "(⚠️ Unstable)";
        return "(💥 Chaos)";
    }
    
    getEconomicDescription(economic) {
        if (economic > 80) return "(💰 Prosperous)";
        if (economic > 60) return "(📈 Growing)";
        if (economic > 40) return "(📊 Stable)";
        if (economic > 20) return "(📉 Declining)";
        return "(💸 Depressed)";
    }
    
    getMagicalDescription(magical) {
        if (magical > 80) return "(🌟 Highly Active)";
        if (magical > 60) return "(✨ Active)";
        if (magical > 40) return "(🔮 Moderate)";
        if (magical > 20) return "(💫 Low)";
        return "(🚫 Dormant)";
    }
    
    async showStatus() {
        const status = this.engine.getSystemStatus();
        
        console.log("\n🔧 SYSTEM STATUS");
        console.log("═".repeat(50));
        console.log(`Engine: ${status.engine}`);
        console.log(`Status: ${status.status.toUpperCase()}`);
        console.log("");
        console.log("🖥️ CORE SYSTEMS:");
        Object.entries(status.systems).forEach(([system, state]) => {
            const emoji = state === 'active' ? '✅' : '❌';
            console.log(`   ${emoji} ${system}: ${state}`);
        });
        console.log("");
        console.log("📊 PERFORMANCE METRICS:");
        console.log(`   Total Choices Processed: ${status.performance.totalChoices}`);
        console.log(`   Session Duration: ${status.performance.sessionTime} minutes`);
        console.log(`   Entities Created: ${status.performance.entitiesCreated}`);
        console.log(`   Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
        console.log("═".repeat(50));
    }
    
    async showRelationships() {
        const gameState = this.engine.getDetailedGameState();
        
        console.log("\n🕸️ RELATIONSHIP NETWORKS");
        console.log("═".repeat(60));
        
        // Player relationship summary
        const summary = gameState.analysis.playerProfile.relationships;
        
        console.log("👤 YOUR RELATIONSHIPS:");
        console.log("");
        
        if (summary.allies.length > 0) {
            console.log("😊 ALLIES:");
            summary.allies.forEach(ally => {
                console.log(`   • ${ally.name}: ${ally.standing > 0 ? '+' : ''}${ally.standing}`);
            });
            console.log("");
        }
        
        if (summary.enemies.length > 0) {
            console.log("😠 ENEMIES:");
            summary.enemies.forEach(enemy => {
                console.log(`   • ${enemy.name}: ${enemy.standing}`);
            });
            console.log("");
        }
        
        if (summary.neutral.length > 0) {
            console.log("😐 NEUTRAL:");
            summary.neutral.forEach(neutral => {
                console.log(`   • ${neutral.name}: ${neutral.standing > 0 ? '+' : ''}${neutral.standing}`);
            });
            console.log("");
        }
        
        // NPC relationship networks
        console.log("🔗 NPC NETWORKS:");
        Object.entries(gameState.analysis.relationshipNetworks).forEach(([npcId, network]) => {
            const npc = gameState.entities.npcs[npcId];
            if (npc && npc.met && network.directConnections > 0) {
                console.log(`\n   ${npc.name}:`);
                console.log(`     Connections: ${network.directConnections}`);
                console.log(`     Allies: ${network.allies}, Enemies: ${network.enemies}`);
                console.log(`     Network Influence: ${network.networkInfluence}`);
                if (network.mostTrusted) {
                    const trusted = gameState.entities.npcs[network.mostTrusted];
                    console.log(`     Most Trusted: ${trusted ? trusted.name : 'Unknown'}`);
                }
            }
        });
        
        console.log("═".repeat(60));
    }
    
    async showInventory() {
        const gameState = this.engine.getDetailedGameState();
        
        console.log("\n🎒 INVENTORY & ITEMS");
        console.log("═".repeat(50));
        
        const inventoryItems = Object.values(gameState.entities.items)
            .filter(item => item.location === 'player_inventory');
        
        if (inventoryItems.length === 0) {
            console.log("Your inventory is empty.");
        } else {
            console.log("📦 CARRYING:");
            inventoryItems.forEach(item => {
                console.log(`\n   ${item.name} (${item.rarity})`);
                console.log(`     Type: ${item.type}${item.subtype ? ` (${item.subtype})` : ''}`);
                console.log(`     Value: ${item.value} gold, Weight: ${item.weight} lbs`);
                console.log(`     Durability: ${item.durability}/100`);
                if (item.description) {
                    console.log(`     ${item.description}`);
                }
                if (item.enchantments && item.enchantments.length > 0) {
                    console.log(`     Enchantments: ${item.enchantments.join(', ')}`);
                }
            });
        }
        
        // Show available items in current location
        const locationItems = Object.values(gameState.entities.items)
            .filter(item => item.location === gameState.player.currentLocation);
        
        if (locationItems.length > 0) {
            console.log("\n🔍 AVAILABLE IN AREA:");
            locationItems.forEach(item => {
                console.log(`   • ${item.name} (${item.rarity}) - ${item.value} gold`);
            });
        }
        
        console.log("═".repeat(50));
    }
    
    async analyzeWorld() {
        console.log("\n🔮 ANALYZING WORLD STATE...\n");
        
        const analysis = await this.engine.aiInterface.analyzeConsequences(
            "", 
            "analyze current world state", 
            this.engine.compileGameState()
        );
        
        if (analysis && analysis.trends) {
            console.log("📈 IDENTIFIED TRENDS:");
            analysis.trends.forEach(trend => {
                const emoji = trend.direction === 'rising' ? '⬆️' : trend.direction === 'falling' ? '⬇️' : '➡️';
                console.log(`   ${emoji} ${trend.description} (${trend.significance} significance)`);
            });
        }
        
        if (analysis && analysis.conflicts) {
            console.log("\n⚔️ POTENTIAL CONFLICTS:");
            analysis.conflicts.forEach(conflict => {
                const riskEmoji = conflict.likelihood === 'high' ? '🔴' : conflict.likelihood === 'medium' ? '🟡' : '🟢';
                console.log(`   ${riskEmoji} ${conflict.parties.join(' vs ')} (${conflict.type})`);
                console.log(`       Likelihood: ${conflict.likelihood}, Impact: ${conflict.impact}`);
            });
        }
        
        if (analysis && analysis.opportunities) {
            console.log("\n💎 OPPORTUNITIES:");
            analysis.opportunities.forEach(opp => {
                console.log(`   • ${opp.description}`);
                if (opp.requirements.length > 0) {
                    console.log(`     Requirements: ${opp.requirements.join(', ')}`);
                }
                if (opp.rewards.length > 0) {
                    console.log(`     Potential Rewards: ${opp.rewards.join(', ')}`);
                }
            });
        }
        
        console.log("\n🎯 Analysis complete!");
    }
    
    async saveGame() {
        const success = await this.engine.saveGame();
        if (success) {
            console.log("💾 Game saved successfully!");
        } else {
            console.log("❌ Failed to save game.");
        }
    }
    
    async loadGame() {
        const success = await this.engine.loadGame();
        if (success) {
            console.log("📁 Game loaded successfully!");
        } else {
            console.log("❌ Failed to load game.");
        }
    }
    
    async quit() {
        console.log("\n👋 Preparing to exit...");
        
        const save = await this.askQuestion("💾 Save before quitting? (Y/n): ");
        if (!save.toLowerCase().startsWith('n')) {
            await this.engine.saveGame();
        }
        
        console.log("\n🎭 Thank you for experiencing the Advanced Dynamic Story Engine!");
        console.log("Your world awaits your return...");
        
        this.rl.close();
        process.exit(0);
    }
    
    askQuestion(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer);
            });
        });
    }
}

// Main execution
async function main() {
    const gameInterface = new GameInterface();
    
    try {
        await gameInterface.initialize();
        await gameInterface.gameLoop();
    } catch (error) {
        console.error("💥 Critical error occurred:", error.message);
        console.log("🔧 Attempting graceful shutdown...");
        process.exit(1);
    }
}

// Enhanced shutdown handling
process.on('SIGINT', () => {
    console.log("\n\n👋 Graceful shutdown initiated...");
    console.log("🎭 Until next time, adventurer!");
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    console.log('🔧 Emergency shutdown...');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    console.log('🔧 Emergency shutdown...');
    process.exit(1);
});

if (require.main === module) {
    main();
}

module.exports = GameInterface;