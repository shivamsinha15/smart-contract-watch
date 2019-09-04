import { ContractManager } from 'smart-contract-loader';

const loadContractInstances = (CAMPAIGN_LOAD_ABIS) => {
    let contractManager = new ContractManager(process.env.CONTRACTS_PATH, process.env.PRIVATE_KEY, process.env.BLOCKCHAIN_URL, process.env.NETWORK_ID);
    let instances = contractManager.getContractsInstances(CAMPAIGN_LOAD_ABIS);
    return instances;
}

module.exports = {
    loadContractInstances
}