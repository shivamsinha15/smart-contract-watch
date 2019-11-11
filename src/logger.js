const { createLogger, format, transports } = require('winston');
import { getCommandVars } from './command';
const fs = require('fs');
const path = require('path');


const env = process.env.NODE_ENV || 'development';
const logDir = process.env.LOG_DIR;

const filename = path.join(logDir, 'results.log');

// Create the log directory if it does not exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const loggerConsoleOptions = {
  timestamp: false,
  colorize: false,
  formatter: options => `${options.message}`,
};


const parseLogAttributes = format(info => {
  if(info.message){
    let splitMessage = info.message.split(',');
    for (let i = 0; i < splitMessage.length; i++) {
        let keyValue = splitMessage[i].split('=')
        if(keyValue.length == 2){
        let key = keyValue[0];
          info[key] = keyValue[1]; 
      }
    }
  }
  return info;
});


const logger = createLogger({
  level: env === 'production' ? 'info' : 'debug',
  transports: [
    new transports.Console({
      format: format.combine(
        format.printf((info) => {
          return `${info.message}`;
        })
      )
    }),  
       new transports.File({
      filename,
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        parseLogAttributes(),
        format.json()
      )
    }) 
  ] });


/**
* sets logger level
* @param {string}
*/
export const setLoggerLevel = (logLevel) => {
  logger.level = logLevel;
};
/**
 * This will print out the error as json formatted
 * @param {*} error
 * @param {*} customMessage
 */
export const logError = (error, customMessage = null, isStack = true) => {
  switch (getCommandVars('outputType')) {
    case 'terminal':
      logger.error(customMessage);
      logger.error(error.message);
      logger.error(error.stack);
      break;
    case 'graylog':
    default:
      logger.error(JSON.stringify({ type: 'Error',
        message: error.message,
        stack: isStack ? error.stack : null,
        details: customMessage }));
      break;
  }
};

export default logger;
