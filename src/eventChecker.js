import logger from './logger';
const chalk = require('chalk');
const fetch = require('node-fetch');
const _ = require('underscore');

const postRequest = async (URL,postBody) => {
    return await fetch(URL, {
        method: 'post',
        body:    JSON.stringify(postBody),
        headers: { 'Content-Type': 'application/json' },
    });
}


const timeoutAsync = async (ms) =>{
    return new Promise(resolve => setTimeout(resolve, ms));
}

const promiseResolve = (resolve) => { fetch(url, {
    method: 'post',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },   
}).then(resolve()) };

const fetchPromise = (url, body) => { 
    return () => new Promise( (resolve) => { 
                fetch('http://localhost:3000/api/sync/'+url,
                {
                    method: 'post',
                    body: JSON.stringify(body),
                    headers: { 'Content-Type': 'application/json' },   
                 }).then(
                     () => {
                        console.log(chalk.red("CALLED: ...." + url));
                        console.log(chalk.red("POST BODY..." + JSON.stringify(body)))
                     }
                 ).catch( (e) => {
                    console.log(chalk.red("ERRORR: ...." + e));
                 })
        });     
}

const DELAYED_UPDATE = 5000;
const ENABLED_EVENTS = [
            'NEW_CAMPAIGN', 
            'STATE_CHANGE',
            'VOTED', 
            'PARTICIPATED',
            'TRUST_DISBURSEMENT',
        ];

const EVENT_ORDER_RANK = {
    'NEW_CAMPAIGN': 1,
    'STATE_CHANGE': 2, 
    'VOTED': 3,
    'PARTICIPATED': 4,
    'TRUST_DISBURSEMENT': 5
}


const setAsyncTimeout = (cb, timeout = 0) => new Promise(resolve => {
    setTimeout(() => {
        cb();
        resolve();
    }, timeout);
});

export default async (data,instances) => {

    if(data.decodedLogs){
        
        let txObj  = {
            blockNumber: data.transaction.blockNumber,
            from: data.transaction.from,
            to: data.transaction.to,
            txHash: data.transaction.transactionHash,
        }

        let logs = _.sortBy(data.decodedLogs, (log) => {
            return EVENT_ORDER_RANK[log.name]
        });

        if(logs.length > 1){
            console.log(chalk.blue("Checking LOG Contents>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"))
            console.log(JSON.stringify(logs));
        }
        console.log()

        let promisesFunctions = [];
        for (const log of logs) {
            let name = log.name;
            let seed =  Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            if(log.length > 1){
                console.log(chalk.blue("GUNIT>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"))
                console.log(JSON.stringify(log));
            }
            console.log(chalk.blue("START PROCESSING:",name));
            if(!ENABLED_EVENTS.includes(name)) {
                console.log(chalk.blue("NOT ENABLED PROCESSING:",name));
                continue;
            }


            console.log(chalk.red(">>>>><<><><><>><><><"))
            console.log(chalk.red(name));
            console.log(chalk.red(">>>>><<><><><>><><><"))

            let event =  log.events.reduce((acc,event) => 
                                            {  
                                                acc[event.name] = event.value;
                                                return acc;
                                            },{});

            let postBody = { ...txObj };
                        
        try {
            switch(name){
 
                case 'NEW_CAMPAIGN':
                        console.log(chalk.green("NEW_CAMPAIGN:"));          
                        postBody.campaignAddress = event.campaignAddress;
                        console.log(chalk.yellow("POST BODY",JSON.stringify(postBody)));
                        promisesFunctions.push(fetchPromise('syncDBCampaignFromBlockchain',postBody));
                    break;
                case 'VOTED':
                        console.log(chalk.green("VOTED:"));
                        postBody.votedKey = event.votedKey;
                        console.log(chalk.yellow(JSON.stringify(postBody)));
                        promisesFunctions.push(fetchPromise('syncDBVoteFromBlockchain',postBody));
                    break;
                case 'PARTICIPATED':
                        console.log(chalk.green("PARTICIPATED:"));
                        postBody = { ...postBody, ...event}
                        console.log(chalk.yellow(JSON.stringify(postBody)));
                        promisesFunctions.push(fetchPromise('syncDBParticipantFromBlockchain',postBody));
                    break;
                case 'TRUST_DISBURSEMENT':
                        console.log(chalk.green("TRUST_DISBURSEMENT:"));
                        postBody = { ...postBody, ...event}
                        console.log(chalk.yellow(JSON.stringify(postBody)));
                        promisesFunctions.push(fetchPromise('synDBDisbursementFromBlockchain',postBody));
                    break;
                case 'STATE_CHANGE':
                    console.log(chalk.green("STATE_CHANGE:"));
                    postBody = { ...postBody, ...event}
                    console.log(chalk.yellow(JSON.stringify(postBody)));
                    promisesFunctions.push(fetchPromise('synDBCampaignStateChangeFromBlockchain',postBody));           
                    break;
                default:
                    console.log(chalk.red(`EVENT NOT HANDLED: ${name}`));
            }

        } catch (e)  {
            console.log("EEORORORORO",e)
        }
    } //End Of For Loop

            

    //Guarantees calls in sequential order
    for (let promiseFunction of promisesFunctions) {
        await setAsyncTimeout(() => { promiseFunction()  }, DELAYED_UPDATE);
        }

    logger.log('info','eventChecker: <<<<<<<<<<<<<<<<<<<<<<<<<');
}


}


/* await setAsyncTimeout(() => {
    // Do stuff
}, 1000);

 */

/*
DATA
{ 
    transaction:
        {   
            hash:'0x7c602245b1789230b1328ec26ccfa0184f5a02be81f84c30d90ef00f12620961',
            nonce: 140,
            blockHash:
            '0xf759c95057d98115e1dc8348ea31ae1f01dea416303959f4aef1553de9420b38',
            blockNumber: 141,
            transactionIndex: 0,
            from: '0x923d1a26b64ee3219f4b32dc4f2e6d550eec7248',
            to: '0xdcb3b0c4814b7d9bda1d9fa48b322af15a72c42a',
            value: BigNumber { s: 1, e: 0, c: [Array] },
            gas: 2093250,
            gasPrice: BigNumber { s: 1, e: 10, c: [Array] },
            input:
            '0x7acf7927000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000422ac8ec4ee3acaedac99d3e22c176024e77b986797380e612c5abd9bac5e13ef6fb4eba545e4f9b7b26d412dd734bae56835e60',
            v: '0x2d45',
            r:
            '0x736f8dfa6aa8b08ae4a104d5a7d0d31f688d5162a6ef03d07bf04863f0c3ad9b',
            s:
            '0x3bfeecd41dfc5c2cd2db9ad763dbd6a208c5432dbda9db7ff1866e82ec1d4c',
            transactionHash:
            '0x7c602245b1789230b1328ec26ccfa0184f5a02be81f84c30d90ef00f12620961',
            gasUsed: 2093250,
            cumulativeGasUsed: 2093250,
            contractAddress: null,
            logs: [ [Object], [Object] ],
            status: '0x1',
            logsBloom:
            '0x00180000000000200000000000000000000000000000000000000000000000400000000000000000400000000000000004000000000000004000000200000000000000000000000000000000000000000000000000000000080000000000000000000000000000000001000000000000000000001000000000040000000000000000000000000000000000000000000000001040000000000000080000000000000000000000000000000000000000000000000080000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000010',
            networkId: '5777'
        },
    
    decodedInputDataResult:
        {   name: 'createCampaignByVotesForTerm',
            params: [ [Object], [Object], [Object] ] 
        },
    
    decodedLogs:
       [ { name: 'NewCampaign',
           events: [Array],
           address: '0x1a07890f771a98ae52043847160f9a5f76a89722' },
         { name: 'VOTED',
           events: [Array],
           address: '0x622a92caea5303299261681241d168b985ec52ef' } ]
}


*/