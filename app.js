require('express-async-errors');
require('dotenv');
const express = require('express');
const fetch = require('node-fetch');
const app = express();
const UssdMenu = require('ussd-builder');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const nigerianBanks = async ()=>{await getBanks('nigeria')}
const nigerianBanksLength = nigerianBanks.length
const togoBanks = async ()=>{await getBanks('togo')}
const togoBanksLength = togoBanks.length
const ghanaianBanks = async ()=>{await getBanks('ghana')}
const ghanaianBanksLength = ghanaianBanks.length

const userDetails = {
  currency: '',
  accountNumber: '',
  amount: '',
  bank: '',
  walletAddress: '',
  tokenPasscode: '',
  randomQuestion: '',
  randomQuestionAnswer: '',
  bankCode: '',
  currentIndex: 0
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
    userDetails.currency = 'naira';
    const banksToArray = nigerianBanks.slice(userDetails.currentIndex, userDetails.currentIndex + 5)
      const bankArr = banksToArray.map((x, i) => {
        return `\n${i}. ${x.name}`;
      });
      userDetails.currentIndex += 4
    menu.con(`Please select the destination bank \n ${bankArr}`);
  },
  next: {
    // using regex to match user input to next state
    '*\\d+': `${userDetails.currentIndex < nigerianBanksLength? 'naira' : 'bank'}`,
  },
});

menu.state('cedis', {
  run: async () => {
    userDetails.currency = 'cedis';
    const banksToArray = ghanaianBanks.slice(userDetails.currentIndex, userDetails.currentIndex + 5)
      const bankArr = banksToArray.map((x, i) => {
        return `\n${i}. ${x.name}`;
      });
      userDetails.currentIndex += 4
    menu.con(`Please select the destination bank \n ${bankArr}`);
  },
  next: {
    // using regex to match user input to next state
    '*\\d+': `${userDetails.currentIndex < ghanaianBanksLength? 'cedis' : 'bank'}`,
  },
});

menu.state('cefa', {
  run: async () => {
    userDetails.currency = 'cefa';
    const banksToArray = togoBanks.slice(userDetails.currentIndex, userDetails.currentIndex + 5)
      const bankArr = banksToArray.map((x, i) => {
        return `\n${i}. ${x.name}`;
      });
      userDetails.currentIndex += 4
    menu.con(`Please select the destination bank \n ${bankArr}`);
  },
  next: {
    // using regex to match user input to next state
    '*\\d+': `${userDetails.currentIndex < togoBanksLength? 'cefa' : 'bank'}`,
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
      `User details verified successfully` + `Please enter your token passcode`
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

app.get('*', (req, res) => {
  res.send('Hello there');
});

app.post('/ussd', (req, res) => {
  menu.run(req.body, (ussdResult) => {
    res.send(ussdResult);
  });
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
