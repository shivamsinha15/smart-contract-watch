require('dotenv-flow').config();
import logger, { logError, setLoggerLevel } from './logger';
import command, { getCommandVars } from './command';
import Decoder from './decoder';
import { isAddress } from './web3/utils';
import JsonRpc from './jsonrpc';
import { getABI } from './etherscan';
import output from './output';
import eventChecker from './eventChecker';
import { isContractCreationTransaction } from './utils';
import { ContractManager } from 'smart-contract-loader';
const chalk = require('chalk');
var cron = require('node-cron');
import { callFetch } from './utils';


const tracer = require('dd-trace').init(
  {
    service: process.env.SERVICE_NAME,
  }
)

tracer.init({
  analytics: true
})


const CAMPAIGN_LOAD_ABIS = new Set([
  "CampaignTrust",
  "PollingBooth",
  "DistributionFactory",
  //"EDistributionFactory",
  //"CampaignByTokens",
  //"CampaignByVotes", 
  "CampaignRegistry",
  "CampaignManager",
  "CampaignManagerCBT",
  "CampaignFactory",
  //"KingTokenERC667",
  //"TestContract",
]);

/**
‹
 * 1- Get smart contract ABI from etherscan
 * 2- Store smart contract ABI locally
 * 3- Get transactions from ledger
 * 4- Decode transactions/logs asynchronously
 * 5- Send final data into output module
 *
 */

/**
 * Decode a transaction and all logs generated from it then send results to output model
 * @param {*} transaction
 */

const addressAbiMap = {};
let instances, contracts;

/* List of Addresses - Initialized By: initializeContracts */
let addressesArray = [];
/* List of Addresses - Initialized By: initializeContracts */
let addressesObj = {};

const transactionHandler = async (transaction, addresses) => {
  let decodedLogs = [];
  let decodedInputDataResult;
  //logger.debug(`Transaction To: ${transaction.to}`)
  if (isContractCreationTransaction(transaction.to)) {
    return; //Right Now Does Nothing
    try {
      decodedInputDataResult = addressAbiMap[transaction.contractAddress || transaction.creates]
        .decodeConstructor(transaction.input);
    } catch (error) {
      logError(error,
        `txHash: ${transaction.hash} ${error.message}`);
      return;
    }
  } else {
    try {

      decodedInputDataResult = addressAbiMap[transaction.to].decodeMethod(transaction.input);
    } catch (error) {

      logError(error,
        `txHash: ${transaction.hash} ${error.message}`);
      return;
    }
    try {

      decodedLogs = transaction.logs.map((log) => {
        if (addresses.some(address => address === log.address)) {
          return addressAbiMap[log.address].decodeSingleLog(log);
        }
        return { name: 'UNDECODED', events: [{ name: 'rawLogs', value: JSON.stringify(log), type: 'logs' }] };
      });

    } catch (error) {

      logError(error,
        `txHash: ${transaction.hash} ${error.message}`);
      return;
    }
  }

  let data = { transaction, decodedInputDataResult, decodedLogs }
  //let decodedTransaction  = await output(data, getCommandVars('outputType'));
  eventChecker(data,instances);
};


/**
 * The main function that has the full steps
 */
const main = async () => {

  cron.schedule('0 20 * * *', async () => {
     logger.info("Called Reminder Cron");
     await callFetch('sendReminderNotification','POST',{})
  }, {
    scheduled: true,
    timezone: "America/Chicago"
  });

  cron.schedule('58 20 * * *', async () => {
    logger.info("Called Set Campaign Winner");
    await callFetch('campaign/nextDayTest','PUT',{})
  }, {
   scheduled: true,
   timezone: "America/Chicago"
  });

  cron.schedule('00 21 * * *', async () => {
    logger.info("Called NEXT PERIOD");
    await callFetch('campaign/nextDayTest','PUT',{})
  }, {
   scheduled: true,
   timezone: "America/Chicago"
  });
   
   
  const { from, to, addresses, quickMode,
    lastBlockNumberFilePath, logLevel, blockConfirmations } = command();
  setLoggerLevel(logLevel);
  logger.info('event=STARTED');
  await initializeContracts();


  addressesArray.forEach((address) => { if (!isAddress(address)) throw new Error(`Address ${address} is not a valid ethereum address`); });
  const promisifiedAbiObjects = addressesArray.map( address => {
    return { address, abi: addressesObj[address] }
  });

   promisifiedAbiObjects.forEach((object) => {
    addressAbiMap[object.address.toLowerCase()] = new Decoder(object.abi);
  }); 

  
  const jsonRpc = new JsonRpc(addressesArray, from, to,
    blockConfirmations, lastBlockNumberFilePath, transactionHandler);

  await jsonRpc.scanBlocks(quickMode);
  logger.info('Finish scanning all the blocks');
};

const initializeContracts = async () => {
  let contractManager = new ContractManager(process.env.CONTRACTS_PATH, process.env.PRIVATE_KEY, process.env.BLOCKCHAIN_URL, process.env.NETWORK_ID);
  instances = await contractManager.getContractsInstances(CAMPAIGN_LOAD_ABIS);
  contracts = await contractManager.getContracts();
  CAMPAIGN_LOAD_ABIS.forEach( x => {  
     let address = instances[x].address
     addressesArray.push(address);
     addressesObj[address] = contracts[x].abi;
    });
}












main().catch((e) => {

  logError(e);
  process.exit(1);
});