require('express-async-errors');
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const app = express();
const UssdMenu = require('ussd-builder');
const {
  withdrawFromContract,
  getCurrentPrices,
} = require('./utils/contractFunctions');

const {
  verifyUser,
  payoutRecipient,
  getBanks,
} = require('./utils/paystackFunctions');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let nigerianBanks;
const getNigerianBanks = async () => {
  banks = await getBanks('nigeria');
  nigerianBanks = banks;

  return banks;
};

let togoBanks;
const getTogoBanks = async () => {
  banks = await getBanks('togo');
  togoBanks = banks;
};

let ghanaianBanks;
const getGhanaianBanks = async () => {
  banks = await getBanks('ghana');
  ghanaianBanks = banks;
};

const userDetails = {
  currency: '',
  accountNumber: '',
  amount: 0,
  bank: '',
  accountName: '',
  walletAddress: '',
  tokenPasscode: 0,
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
      return `\n${userDetails.currentIndex+ i}. ${x.name}`;
    });
    userDetails.currentIndex += 5;
    const exchangeRate = await getCurrentPrices('naira');
    menu.con(
      `This is our current exchange rate from usd to naira: ${exchangeRate}. \nPlease select the destination bank \n ${bankArr}` +
        '\n\n\n00.  Back'+
        '\n000. Next'
    );
  },
  next: {
    '00': 'back',
    '000': 'naira',
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
      return `\n${userDetails.currentIndex + i}. ${x.name}`;
    });
    userDetails.currentIndex += 4;
    const exchangeRate = await getCurrentPrices('cedis');
    menu.con(
      `This is our current exchange rate from usd to cedis: ${exchangeRate}. \nPlease select the destination bank \n ${bankArr}` +
      '\n\n\n00.  Next'
    );
  },
  next: {
    '00': 'cedis',
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
      return `\n${userDetails.currentIndex + i}. ${x.name}`;
    });
    userDetails.currentIndex += 4;
    const exchangeRate = await getCurrentPrices('cefa');
    menu.con(
      `This is our current exchange rate from usd to cefa: ${exchangeRate}. \nPlease select the destination bank \n ${bankArr}` +
      '\n\n\n00.  Next'
    );
  },
  next: {
    '00': 'cefa',
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
    '*\\d+': 'amount',
  },
});

menu.state('usdt', {
  run: async () => {
    menu.con('Please enter the destination wallet address');
  },
  next: {
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
    '*\\d+': 'amount',
  },
});

menu.state('amount', {
  run: async () => {
    userDetails.amount = menu.val;
    let account_name;
    if (userDetails.accountNumber && userDetails.currency !== 'cefa') {
      account_name = await verifyUser(
        userDetails.accountNumber.toString(),
        userDetails.bankCode.toString()
      );
      userDetails.accountName = account_name;
    }
    menu.con(
      `User details verified successfully. ${
        account_name ? `Transfer recipient is ${account_name}` : ''
      }` + `\nPlease enter your token passcode`
    );
  },
  next: {
    '*\\d+': 'tokenPasscode',
  },
});

menu.state('tokenPasscode', {
  run: async () => {
    userDetails.tokenPasscode = menu.val;
    menu.con(`${getRandomQuestion()}`);
  },
  next: {
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
    try {
      await withdrawFromContract(
        userDetails.tokenPasscode,
        userDetails.currency,
        userDetails.amount
      );
      // if (userDetails.accountNumber) {
      //   await payoutRecipient(userDetails.accountName, userDetails.amount, userDetails.accountNumber, userDetails.bankCode, userDetails.currency)
      // }
    } catch (error) {
      return error;
    }

    menu.end(
      `Awesome! Your payment to ${
        userDetails.accountNumber || userDetails.walletAddress
      } was successful`
    );
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

menu.on('error', (err) => {
  console.log('err', err);
  menu.end(`An error occured. Please try again later: ${err}`);
});

menu.state('quit', {
  run: () => {
    menu.end('Goodbye :)');
  },
});

app.post('/ussd', (req, res) => {
  menu.run(req.body, (ussdResult) => {
    res.send(ussdResult);
  });
});

app.get('/contract', async (req, res) => {
  try {
    const resp = await withdrawFromContract(
      userDetails.tokenPasscode,
      userDetails.currency,
      userDetails.amount
    );
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



menu.state('currency', {
  run: async () => {
    const currency = menu.val == 1 ? 'naira' : menu.val == 2? 'cedis' : 'cefa' 
    const banks = await getBanks(currency);
    userDetails.currency = 'cedis';
    const banksToArray = banks.slice(
      userDetails.currentIndex,
      userDetails.currentIndex + 5
    );
    const bankArr = banksToArray.map((x, i) => {
      return `\n${userDetails.currentIndex + i}. ${x.name}`;
    });
    userDetails.currentIndex += 4;
    const exchangeRate = await getCurrentPrices('cedis');
    menu.con(
      `This is our current exchange rate from usd to cedis: ${exchangeRate}. \nPlease select the destination bank \n ${bankArr}` +
      '\n\n\n00.  Next'
    );
  },
  next: {
    '00': 'cedis',
    '*\\d+': 'bank',
  },
});