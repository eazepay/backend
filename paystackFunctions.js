const fetch = require('node-fetch');

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

const verifyUser = async (account_number, bank_code) => {
  const config = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
  };
  const url = `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`;
  const res = await fetch(url, {
    method: 'get',
    headers: config,
  });
  const response = await res.json();
  console.log('response', response);
  if (response.status === false) {
    return '';
  }
  return response.data.account_name;
};

const createRecipient = async (name, account_number, bank_code, currency) => {
  const banks = await getBanks('nigeria')
  console.log(banks.find(x=> x.name.includes('United')))
  const type_currency = {
    naira: 'NGN',
    cedia: 'GHS',
  };
  const config = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
  };

  const type =
    currency === 'naira' ? 'nuban' : currency === 'cedis' ? 'GHS' : '';

  const body = {
    type,
    name,
    account_number,
    bank_code,
    currency: type_currency[currency],
  };
  const url = `https://api.paystack.co/transferrecipient`;
  const res = await fetch(url, {
    method: 'post',
    headers: config,
    body: JSON.stringify(body),
  });
  const response = await res.json();
  if (response.status === false) {
    throw new Error(response.message);
  }
  return response.data.recipient_code;
};

const payoutRecipient = async (
  accountName,
  amount,
  accountNumber,
  bankCode,
  currency
) => {
  const recipient = await createRecipient(
    accountName,
    accountNumber,
    bankCode,
    currency
  );
  const body = {
    amount: amount,
    source: 'balance',
    recipient,
    reason: `Sending ${amount} to ${accountName}`,
  };
  const url = 'https://api.paystack.co/transfer';
  const config = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
  };
  const res = await fetch(url, {
    method: 'post',
    headers: config,
    body: JSON.stringify(body),
  });
  const response = await res.json();
  if (response.status === false) {
    throw new Error(response.message);
  }
  return response.data;
};

module.exports = {
  verifyUser,
  payoutRecipient,
  getBanks
};
