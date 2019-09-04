import logger from '../logger';
import grayLogFromat from './graylogFormat';
import terminalFormat from './terminalFormat';

export default (data, type = 'json') => {
  switch (type) {
    case 'terminal':
      logger.log('info', terminalFormat(data));
      break;
    case 'graylog':
      let grayLogDecodedTransaction = JSON.stringify(grayLogFromat(data.transaction,
        data.decodedInputDataResult, data.decodedLogs));
        logger.log('info',grayLogDecodedTransaction);
      return decodedTransaction;
    case 'json':
      let decodedTransaction = JSON.stringify((data.transaction,
        data.decodedInputDataResult, data.decodedLogs));
        logger.log('info',decodedTransaction);
      return decodedTransaction;  
    default:
      throw new Error(`${type} output module is undefind`);
  }
};
