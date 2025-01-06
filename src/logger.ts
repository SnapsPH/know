import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs-extra';

// Ensure logs directory exists
const logDirectory = path.resolve(process.cwd(), 'logs');
fs.ensureDirSync(logDirectory);

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message} `;
    
    // Add metadata if exists
    const metadataStr = Object.keys(metadata).length 
      ? JSON.stringify(metadata) 
      : '';
    
    return msg + metadataStr;
  })
);

// Create a logger for each module
export function createLogger(moduleName: string) {
  return winston.createLogger({
    level: 'info',
    format: logFormat,
    transports: [
      // Console transport for immediate visibility
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          logFormat
        )
      }),
      
      // File transport for error logs
      new winston.transports.File({ 
        filename: path.join(logDirectory, `${moduleName}-error.log`), 
        level: 'error' 
      }),
      
      // File transport for combined logs
      new winston.transports.File({ 
        filename: path.join(logDirectory, `${moduleName}-combined.log`) 
      })
    ]
  });
}

// Utility function to log errors with additional context
export function logError(logger: winston.Logger, message: string, error?: Error, context?: Record<string, unknown>) {
  const errorLog = {
    message,
    error: error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : undefined,
    ...context
  };

  logger.error(message, errorLog);
}

// Export a default logger for cases where module-specific logger isn't created
export const defaultLogger = createLogger('default');
