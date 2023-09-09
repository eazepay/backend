require('express-async-errors');
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const app = express();
const UssdMenu = require('ussd-builder');
const Provider = require('@truffle/hdwallet-provider');
const { ChainId } = require('@biconomy/core-types');
const SmartAccount = require('@biconomy/smart-account').default;

const rpcurl = 'https://goerli.gateway.tenderly.co';
const { ethers } = require('ethers');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const getBanks = async (country) => {
  const resp = await fetch(`https://api.paystack.co/bank?country=${country}`, {
    methods: 'post',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
    },
  });
  const response = await resp.json();
  if (response.status === false) {
    throw new Error(response.message);
  }
  return response.data;
};

let nigerianBanksLength;
let nigerianBanks;
const getNigerianBanks = async () => {
  banks = await getBanks('nigeria');
  nigerianBanks = banks;
  nigerianBanksLength = banks.length;

  return banks;
};

let togoBanks;
let togoBanksLength;
const getTogoBanks = async () => {
  banks = await getBanks('togo');
  togoBanks = banks;
  togoBanksLength = banks.length;
};

let ghanaianBanksLength;
let ghanaianBanks;
const getGhanaianBanks = async () => {
  banks = await getBanks('ghana');
  ghanaianBanks = banks;
  ghanaianBanksLength = banks.length;
};

const userDetails = {
  currency: 'cedis',
  accountNumber: '',
  amount: 0,
  bank: '',
  walletAddress: '',
  tokenPasscode: 1000,
  randomQuestion: '',
  randomQuestionAnswer: '',
  bankCode: '',
  currentIndex: 0,
};

const secretQuestions = [
  "What's your first pet name?",
  "What's your mother's maiden name?",
  "What's your childhood best friend's name",
];

const getRandomQuestion = () => {
  const random = Math.floor(Math.random() * 3);
  return secretQuestions[random];
};

let menu = new UssdMenu();
menu.startState({
  run: () => {
    menu.con(
      'Welcome to Eaze. we currently supoort these currencies' +
        '\n1. Naira' +
        '\n2. Cedis' +
        '\n3. Cefa' +
        '\n4. USDT'
    );
  },
  next: {
    1: 'naira',
    2: 'cedis',
    3: 'cefa',
    4: 'usdt',
  },
});

menu.state('naira', {
  run: async () => {
    await getNigerianBanks();
    userDetails.currency = 'naira';
    const banksToArray = nigerianBanks.slice(
      userDetails.currentIndex,
      userDetails.currentIndex + 5
    );
    const bankArr = banksToArray.map((x, i) => {
      return `\n${i}. ${x.name}`;
    });
    userDetails.currentIndex += 4;
    menu.con(`Please select the destination bank \n ${bankArr}` + '\n99. Next');
  },
  next: {
    // using regex to match user input to next state
    99: 'naira',
    '*\\d+': 'bank',
  },
});

menu.state('cedis', {
  run: async () => {
    await getGhanaianBanks();
    userDetails.currency = 'cedis';
    const banksToArray = ghanaianBanks.slice(
      userDetails.currentIndex,
      userDetails.currentIndex + 5
    );
    const bankArr = banksToArray.map((x, i) => {
      return `\n${i}. ${x.name}`;
    });
    userDetails.currentIndex += 4;
    menu.con(`Please select the destination bank \n ${bankArr}`  + '\n99. Next');
  },
  next: {
    // using regex to match user input to next state
    99: 'cedis',
    '*\\d+': 'bank',
  },
});

menu.state('cefa', {
  run: async () => {
    await getTogoBanks();
    userDetails.currency = 'cefa';
    const banksToArray = togoBanks.slice(
      userDetails.currentIndex,
      userDetails.currentIndex + 5
    );
    const bankArr = banksToArray.map((x, i) => {
      return `\n${i}. ${x.name}`;
    });
    userDetails.currentIndex += 4;
    menu.con(`Please select the destination bank \n ${bankArr}`  + '\n99. Next');
  },
  next: {
    // using regex to match user input to next state
    99: 'cefa',
    '*\\d+': 'bank',
  },
});

menu.state('bank', {
  run: async () => {
    let bank;
    if (userDetails.currency === 'naira') bank = nigerianBanks[menu.val];
    if (userDetails.currency === 'cedis') bank = ghanaianBanks[menu.val];
    if (userDetails.currency === 'cefa') bank = togoBanks[menu.val];
    userDetails.bank = bank.name;
    userDetails.bankCode = bank.code;
    menu.con(`Please enter the destination account number`);
  },
  next: {
    // using regex to match user input to next state
    '*\\d+': 'account',
  },
});

menu.state('account', {
  run: async () => {
    let accountNumber = menu.val;
    userDetails.accountNumber = accountNumber;
    menu.con(`Please enter the amount to send`);
  },
  next: {
    // using regex to match user input to next state
    '*\\d+': 'amount',
  },
});

menu.state('usdt', {
  run: async () => {
    menu.con('Please enter the destination wallet address');
  },
  next: {
    // using regex to match user input to next state
    '*[a-zA-Z]+': 'usdt.address',
  },
});

menu.state('usdt.address', {
  run: async () => {
    let address = menu.val;
    userDetails.walletAddress = address;
    menu.con(`Please enter the amount to send`);
  },
  next: {
    // using regex to match user input to next state
    '*\\d+': 'amount',
  },
});

menu.state('amount', {
  run: async () => {
    userDetails.amount = menu.val;
    menu.con(
      `User details verified successfully.` +
        `\nPlease enter your token passcode`
    );
  },
  next: {
    // using regex to match user input to next state
    '*\\d+': 'tokenPasscode',
  },
});

menu.state('tokenPasscode', {
  run: async () => {
    userDetails.tokenPasscode = menu.val;
    menu.con(`${getRandomQuestion()}`);
  },
  next: {
    // using regex to match user input to next state
    '*[a-zA-Z]+': 'randomQuestionAnswer',
  },
});

menu.state('randomQuestionAnswer', {
  run: async () => {
    userDetails.randomQuestionAnswer = menu.val.toLowerCase();
    menu.con(
      `Your payment is about to be processed.` + '\n1. Proceed' + '\n2. Quit'
    );
  },
  next: {
    1: 'processTransaction',
    2: 'quit',
  },
});

menu.state('processTransaction', {
  run: async () => {
    //process transaction on blockchain
    // await callContract();
    console.log('yesss');
  },
  next: {
    '*\\d+': 'end',
  },
});

menu.state('end', {
  run: async () => {
    menu.end(
      `Awesome! Your payment to ${
        userDetails.accountNumber || userDetails.walletAddress
      } was successful`
    );
  },
});

menu.state('error', {
  run: async () => {
    menu.end(`An error occured. Please try again later`);
  },
});

menu.state('quit', {
  run: () => {
    menu.end('Goodbye :)');
  },
});

var SmartContractAddress = process.env.CONTRACT;

const callContract = async () => {
  var provider = new Provider(process.env.PRIVATE_KEY, rpcurl);
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

  const smartAccount = await wallet.init();

  const interface = new ethers.utils.Interface([
    'function withdraw(uint256 id, string memory currencySymbol, uint256 amount) external',
  ]);

  const encodedData = interface.encodeFunctionData('withdraw', [
    userDetails.tokenPasscode,
    userDetails.currency,
    userDetails.amount,
  ]);

  const tx = {
    to: SmartContractAddress, // destination smart contract address
    data: encodedData,
  };
  try {
    const txResponse = await smartAccount.sendTransaction({ transaction: tx });
    await txResponse.wait();
  } catch (error) {
    throw new Error(error);
  }
};

app.post('/ussd', (req, res) => {
  menu.run(req.body, (ussdResult) => {
    res.send(ussdResult);
  });
});

app.get('/contract', async (req, res) => {
  try {
    const resp = await callContract();
    res.send(resp);
  } catch (error) {
    throw new Error(error);
  }
});

app.get('*', (req, res) => {
  res.send('Hello there');
});
const start = async () => {
  const PORT = 8000;
  console.log('starting server');
  try {
    app.listen(PORT, () => console.log(`server listening on port: ${PORT}`));
  } catch (error) {
    console.log('error', error);
    throw error;
  }
};
start();
