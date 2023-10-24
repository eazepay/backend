const Provider = require('@truffle/hdwallet-provider');
const { ChainId } = require('@biconomy/core-types');
const SmartAccount = require('@biconomy/smart-account').default;

const rpcurl = `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`;
const { ethers } = require('ethers');
const SmartContractAddress = process.env.CONTRACT;
const abi = require('./abi.json');

const provider = new Provider(process.env.PRIVATE_KEY, rpcurl);
const walletProvider = new ethers.providers.Web3Provider(provider);
const wallet = new SmartAccount(walletProvider, {
  activeNetworkId: ChainId.GOERLI,
  supportedNetworksIds: [
    ChainId.GOERLI,
    ChainId.POLYGON_MAINNET,
    ChainId.POLYGON_MUMBAI,
  ],
  networkConfig: [
    {
      chainId: ChainId.GOERLI,
      dappAPIKey: process.env.API_KEY,
      providerUrl: rpcurl,
    },
    {
      chainId: ChainId.POLYGON_MUMBAI,
      dappAPIKey: process.env.API_KEY,
      providerUrl: rpcurl,
    },
    {
      chainId: ChainId.POLYGON_MAINNET,
      dappAPIKey: process.env.API_KEY,
      providerUrl: rpcurl,
    },
  ],
});

const withdrawFromContract = async (tokenPasscode, currency, amount) => {
  const smartAccount = await wallet.init();
  const inter = new ethers.utils.Interface([
    'function withdraw(uint256 id, string memory currencySymbol, uint256 amount) external',
  ]);

  const encodedData = inter.encodeFunctionData('withdraw', [
    tokenPasscode,
    currency,
    amount,
  ]);

  const tx = {
    to: SmartContractAddress, // destination smart contract address
    data: encodedData,
  };
  try {
    await smartAccount.sendTransaction({ transaction: tx });
  } catch (error) {
    throw new Error(error);
  }
};

const getCurrentPrices = async (string) => {
  let gethProvider = new ethers.providers.InfuraProvider(
    'goerli',
    process.env.INFURA_API_KEY
  );
  let contract = new ethers.Contract(SmartContractAddress, abi, gethProvider);
  const currentPrice = await contract.currencyPrices(string);

  return currentPrice.toString();
};

module.exports = {
  withdrawFromContract,
  getCurrentPrices,
};
