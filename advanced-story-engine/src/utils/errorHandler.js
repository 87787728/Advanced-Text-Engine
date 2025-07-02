const fs = require('fs').promises;
const path = require('path');
const { format } = require('date-fns');

class AppError extends Error {
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.timestamp = new Date().toISOString();
        
        // Capture stack trace, excluding constructor call from it
        Error.captureStackTrace(this, this.constructor);
    }
}

class ErrorHandler {
    constructor() {
        this.logFile = path.join(__dirname, '../../logs/error.log');
        this.initialize();
    }

    async initialize() {
        try {
            await fs.mkdir(path.dirname(this.logFile), { recursive: true });
            if (!await this.fileExists(this.logFile)) {
                await fs.writeFile(this.logFile, '');
            }
        } catch (error) {
            console.error('Failed to initialize error logging:', error);
        }
    }

    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    async logError(error) {
        const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
        const errorLog = `[${timestamp}] ${error.stack || error}\n`;
        
        try {
            await fs.appendFile(this.logFile, errorLog);
        } catch (logError) {
            console.error('Failed to write to error log:', logError);
        }
        
        console.error(errorLog);
    }

    handleError(error, response = null) {
        // Log the error
        this.logError(error);

        // Handle operational errors
        if (error.isOperational) {
            if (response) {
                return response.status(error.statusCode || 500).json({
                    status: 'error',
                    message: error.message
                });
            }
            return;
        }

        // Handle programming/unknown errors
        console.error('UNHANDLED ERROR:', error);
        
        if (response) {
            return response.status(500).json({
                status: 'error',
                message: 'An unexpected error occurred',
                ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
            });
        }
    }

    apiErrorHandler(err, req, res, next) {
        err.statusCode = err.statusCode || 500;
        err.status = err.status || 'error';

        this.handleError(err, res);
    }
}

// Export a singleton instance
module.exports = {
    AppError,
    errorHandler: new ErrorHandler()
};
