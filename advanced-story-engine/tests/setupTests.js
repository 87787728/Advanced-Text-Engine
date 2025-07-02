// Mock the console methods to keep test output clean
const consoleMethods = ['log', 'warn', 'error', 'info', 'debug'];

beforeEach(() => {
    // Mock console methods
    consoleMethods.forEach(method => {
        jest.spyOn(console, method).mockImplementation(() => {});
    });
});

afterEach(() => {
    // Restore original console methods
    consoleMethods.forEach(method => {
        console[method].mockRestore();
    });
});

// Mock the process.exit to prevent tests from exiting
jest.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`Process.exit(${code})`);
});

// Set a test environment variable
process.env.NODE_ENV = 'test';
