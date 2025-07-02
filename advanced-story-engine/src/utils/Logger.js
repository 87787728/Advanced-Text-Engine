const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
const winston = require('winston');
const { combine, timestamp, printf, colorize, json } = winston.format;

// Ensure logs directory exists
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Custom log format
const logFormat = printf(({ level, message, timestamp, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
        log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
});

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        json()
    ),
    transports: [
        // Console transport
        new winston.transports.Console({
            format: combine(
                colorize(),
                timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                logFormat
            )
        }),
        // File transport with rotation
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 5,
            tailable: true
        }),
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
            tailable: true
        })
    ],
    exitOnError: false
});

// Add exception handling
process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Don't exit for uncaught exceptions in production
    if (process.env.NODE_ENV === 'production') return;
    process.exit(1);
});

// Add stream for morgan
logger.stream = {
    write: (message) => {
        logger.info(message.trim());
    }
};

module.exports = logger;