const express = require('express');
const router = express.Router();
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { authMiddleware } = require('./authRoutes');

// Deposit funds (updated with null check)
router.post('/deposit', authMiddleware, async (req, res) => {
  const session = await Wallet.startSession();
  session.startTransaction();
  
  try {
    const { amount, currency } = req.body;
    const wallet = await Wallet.findOne({ user: req.user }).session(session);

    // Null check added
    if (!wallet) {
      throw new Error('Wallet not found for user');
    }

    wallet.updateBalance(currency, amount);
    await wallet.save();

    await Transaction.create([{
      user: req.user,
      type: 'deposit',
      amount,
      currency
    }], { session });

    await session.commitTransaction();
    res.json(wallet);
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ error: err.message });
  } finally {
    session.endSession();
  }
});

// Withdraw funds (updated with null check)
router.post('/withdraw', authMiddleware, async (req, res) => {
  const session = await Wallet.startSession();
  session.startTransaction();

  try {
    const { amount, currency } = req.body;
    const wallet = await Wallet.findOne({ user: req.user }).session(session);

    // Null check added
    if (!wallet) {
      throw new Error('Wallet not found for user');
    }

    const currencyBalance = wallet.currencies.find(c => c.type === currency);
    if (!currencyBalance || currencyBalance.balance < amount) {
      throw new Error('Insufficient funds');
    }

    wallet.updateBalance(currency, -amount);
    await wallet.save();

    await Transaction.create([{
      user: req.user,
      type: 'withdraw',
      amount,
      currency
    }], { session });

    await session.commitTransaction();
    res.json(wallet);
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ error: err.message });
  } finally {
    session.endSession();
  }
});

// Transfer funds (updated with null checks)
router.post('/transfer', authMiddleware, async (req, res) => {
  const session = await Wallet.startSession();
  session.startTransaction();

  try {
    const { toUserId, amount, currency } = req.body;
    
    // Sender's wallet (null check added)
    const fromWallet = await Wallet.findOne({ user: req.user }).session(session);
    if (!fromWallet) {
      throw new Error('Sender wallet not found');
    }

    // Receiver's wallet (null check added)
    const toWallet = await Wallet.findOne({ user: toUserId }).session(session);
    if (!toWallet) {
      throw new Error('Recipient wallet not found');
    }

    const fromCurrency = fromWallet.currencies.find(c => c.type === currency);
    if (!fromCurrency || fromCurrency.balance < amount) {
      throw new Error('Insufficient funds');
    }

    // Update balances
    fromWallet.updateBalance(currency, -amount);
    toWallet.updateBalance(currency, amount);
    
    await fromWallet.save();
    await toWallet.save();

    // Create transactions
    await Transaction.create([
  {
    user: req.user,
    type: 'transfer',
    amount: amount,
    currency,
    toUser: toUserId
  },
  {
    user: toUserId,
    type: 'transfer',
    amount,
    currency,
    toUser: req.user
  }
], { session, ordered: true });


    await session.commitTransaction();
    res.json({ message: 'Transfer successful' });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ error: err.message });
  } finally {
    session.endSession();
  }
});

// Transaction history for the logged-in user
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user })
      .sort({ createdAt: -1 }) // Most recent first
      .populate('toUser', 'username email') // Optional: shows receiver info for transfers
      .exec();
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch transactions' });
  }
});

module.exports = router;
