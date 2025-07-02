# Advanced Dynamic Story Engine

A sophisticated, AI-powered storytelling engine that generates dynamic narratives based on player choices and world state.

## 🚀 Features

- Dynamic story generation using AI
- Rich world state management
- Player choice impact system
- Modular architecture for easy extension
- Comprehensive testing suite

## 🛠️ Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/advanced-story-engine.git
   cd advanced-story-engine
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Add your GEMINI_API_KEY

## 🏃‍♂️ Quick Start

```bash
# Start the application
npm start

# Run in development mode with hot-reload
npm run dev

# Run tests
npm test
```

## 📚 Documentation

### API Reference

Run the following to generate API documentation:
```bash
npm run docs
```

The documentation will be available in the `docs/` directory.

### Configuration

Edit `config/default.json` to customize game settings.

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run health check
npm run health-check
```

## 📦 Deployment

### Production Build
```bash
npm run build
```

### Docker
```dockerfile
# Build the image
docker build -t story-engine .

# Run the container
docker run -p 3000:3000 -d story-engine
```

## 📝 Logs

Application logs are stored in the `logs/` directory with daily rotation.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
