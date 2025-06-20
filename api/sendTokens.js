import Web3 from 'web3';

// Secure serverless function on Vercel
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST allowed' });

  const { toAddress } = req.body;

  if (!toAddress || !/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
    return res.status(400).json({ error: 'Invalid Ethereum address' });
  }

  const PRIVATE_KEY = process.env.FAUCET_PRIVATE_KEY;
  const FAUCET_ADDRESS = process.env.FAUCET_ADDRESS;
  const RPC_URL = 'https://carrot.megaeth.com/rpc';
  const AMOUNT = 0.005;

  try {
    const web3 = new Web3(RPC_URL);
    const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
    web3.eth.accounts.wallet.add(account);

    const amountWei = web3.utils.toWei(AMOUNT.toString(), 'ether');
    const gasPrice = await web3.eth.getGasPrice();

    const tx = {
      from: FAUCET_ADDRESS,
      to: toAddress,
      value: amountWei,
      gas: 21000,
      gasPrice
    };

    const signedTx = await web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    res.status(200).json({ success: true, txHash: receipt.transactionHash, amount: AMOUNT });
  } catch (err) {
    console.error('Send token error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
