const fs = require('fs').promises;
const path = require('path');

async function setupProduction() {
    console.log('🚀 Setting up production environment...');
    
    // Create production directories
    const prodDirs = [
        'logs',
        'data/saves/production',
        'data/backups',
        'data/exports',
        'monitoring'
    ];
    
    for (const dir of prodDirs) {
        try {
            await fs.mkdir(path.join(process.cwd(), dir), { recursive: true });
            console.log(`✅ Created directory: ${dir}`);
        } catch (error) {
            if (error.code !== 'EEXIST') {
                console.error(`❌ Error creating directory ${dir}:`, error.message);
                throw error;
            }
            console.log(`ℹ️ Directory ${dir} already exists`);
        }
    }
    
    // Create production package.json scripts
    try {
        const packagePath = path.join(process.cwd(), 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'));
        
        packageJson.scripts = {
            ...packageJson.scripts,
            'start:prod': 'NODE_ENV=production node src/main.js',
            'monitor': 'node scripts/monitor.js',
            'backup': 'node scripts/backup.js',
            'restore': 'node scripts/restore.js',
            'health-check': 'node scripts/health-check.js'
        };
        
        await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2));
        console.log('✅ Updated package.json with production scripts');
    } catch (error) {
        console.error('❌ Error updating package.json:', error.message);
        throw error;
    }
    
    // Create systemd service file (Linux)
    try {
        const serviceFile = `[Unit]
Description=Advanced Dynamic Story Engine
After=network.target

[Service]
Type=simple
User=storyengine
WorkingDirectory=/opt/story-engine
ExecStart=/usr/bin/node src/main.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target`;
        
        await fs.writeFile('story-engine.service', serviceFile);
        console.log('✅ Created systemd service file');
    } catch (error) {
        console.error('❌ Error creating systemd service file:', error.message);
        throw error;
    }
    
    // Create Docker configuration
    try {
        const dockerfile = `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/
COPY config/ ./config/
COPY scripts/ ./scripts/

RUN addgroup -g 1001 -S storyengine && \
    adduser -S storyengine -u 1001

RUN chown -R storyengine:storyengine /app
USER storyengine

EXPOSE 3000

CMD ["npm", "run", "start:prod"]`;
        
        await fs.writeFile('Dockerfile', dockerfile);
        console.log('✅ Created Dockerfile');
    } catch (error) {
        console.error('❌ Error creating Dockerfile:', error.message);
        throw error;
    }
    
    // Create docker-compose.yml
    try {
        const dockerCompose = `version: '3.8'

services:
  story-engine:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    
  monitoring:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    restart: unless-stopped`;
        
        await fs.writeFile('docker-compose.yml', dockerCompose);
        console.log('✅ Created Docker Compose configuration');
        
        // Create basic Prometheus config
        await fs.mkdir(path.join(process.cwd(), 'monitoring'), { recursive: true });
        const prometheusConfig = `global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'story-engine'
    static_configs:
      - targets: ['story-engine:3000']`;
        
        await fs.writeFile(
            path.join(process.cwd(), 'monitoring', 'prometheus.yml'), 
            prometheusConfig
        );
        console.log('✅ Created Prometheus configuration');
    } catch (error) {
        console.error('❌ Error creating Docker Compose configuration:', error.message);
        throw error;
    }
    
    console.log('\n🎯 Production setup complete!');
    console.log('\nNext steps:');
    console.log('1. Review configuration in config/production.js');
    console.log('2. Set up monitoring and logging');
    console.log('3. Configure backup strategy');
    console.log('4. Deploy using Docker or systemd service');
    console.log('\nFor Docker deployment:');
    console.log('  $ docker-compose up -d --build');
    console.log('\nFor systemd deployment:');
    console.log('  $ sudo cp story-engine.service /etc/systemd/system/');
    console.log('  $ sudo systemctl daemon-reload');
    console.log('  $ sudo systemctl enable story-engine');
    console.log('  $ sudo systemctl start story-engine');
}

// Run the setup
if (require.main === module) {
    setupProduction().catch(error => {
        console.error('❌ Production setup failed:', error);
        process.exit(1);
    });
}

module.exports = { setupProduction };
