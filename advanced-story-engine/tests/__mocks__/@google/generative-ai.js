// Mock implementation of the Google Generative AI client
class MockGenerativeModel {
    constructor() {
        this.generateContent = jest.fn().mockImplementation(async (prompt) => {
            // Return a mock response based on the prompt
            if (prompt.includes('analyze profile')) {
                return {
                    response: {
                        text: JSON.stringify({
                            dominantReputation: { type: 'heroic', value: 15 },
                            strongestSkills: [{ skill: 'diplomacy', level: 30 }],
                            suggestedQuests: ['quest1', 'quest2']
                        })
                    }
                };
            }
            return {
                response: {
                    text: 'Mock AI response'
                }
            };
        });
    }
}

// Mock the GoogleGenerativeAI class
class MockGoogleGenerativeAI {
    constructor() {
        this.getGenerativeModel = jest.fn().mockReturnValue(new MockGenerativeModel());
    }
}

module.exports = {
    GoogleGenerativeAI: MockGoogleGenerativeAI
};
