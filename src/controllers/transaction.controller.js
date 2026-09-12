const transactionModel = require("../models/transactions.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/accounts.model");
const emailService = require("../services/email.service");
const mongoose = require("mongoose");
const userModel = require("../models/user.model");
const { json } = require("express");

/**
 * - Create a valid Transaction
 * THE 10 - STEP TRANSFER FLOW:
 * 1. Validate request
 * 2. Validate idempotency Key
 * 3. Check account status
 * 4. Derive sender balance from ledger
 * 5. Create a transaction (PENDING)
 * 6. Create a DEBIT ledger entry
 * 7. Create a CREDIT ledger entry
 * 8. Mark Transaction completed
 * 9. Commit MongoDB session
 * 10. Send email notification
 */

async function createTransaction(req, res) {
  /**
   * 1. Validate request
   */
  const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

  if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({
      message: "fromAccount, toAccount, amount and idempotencyKey are required",
    });
  }

  const fromUserAccount = await accountModel.findOne({
    _id: fromAccount,
  });

  const toUserAccount = await accountModel.findOne({
    _id: toAccount,
  });

  if (!fromAccount || !toAccount) {
    return (
      res.status(400),
      json({
        message: "Invalid fromAccount or toAccount",
      })
    );
  }

  /**
   * 2. Validate Idempotency Key
   */
  const isTransactionAlreadyExists = await transactionModel.findOne({
    idempotencyKey: idempotencyKey,
  });

  if (isTransactionAlreadyExists) {
    if (isTransactionAlreadyExists.status === "COMPLETED") {
      return res.status(200).json({
        message: "Transaction already processed",
        transaction: isTransactionAlreadyExists,
      });
    }

    if (isTransactionAlreadyExists.status === "PENDING") {
      return res.status(200).json({
        message: "Transaction is still processing",
      });
    }

    if (isTransactionAlreadyExists.status === "FAILED") {
      return res.status(500).json({
        message: "Transaction processing failed, please retry",
      });
    }

    if (isTransactionAlreadyExists.status === "REVERSED") {
      return res.status(500).json({
        message: "Transaction was reversed, please try",
      });
    }
  }

  /**
   * 3. Check account status
   */
  if (
    fromUserAccount.status !== "ACTIVE" ||
    toUserAccount.status !== "ACTIVE"
  ) {
    return res.status(400).json({
      message:
        "Both fromAccount and toAccount status should be ACTIVE to process the transaction",
    });
  }

  /**
   * 4.Derive sender balance from ledger
   */
  const balance = await fromUserAccount.getBalance();

  if (balance < amount) {
    return res.status(400).json({
      message: `Insufficient balance. Current Account Balance is ${balance}. Requested amount is ${amount}`,
    });
  }

  /**
   * 5. Create Transaction (PENDING)
   */
  let transaction;
  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    transaction = (
      await transactionModel.create(
        [
          {
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING",
          },
        ],
        { session },
      )
    )[0];

    const debitLedgerEntry = await ledgerModel.create(
      [
        {
          account: fromAccount,
          amount: amount,
          transaction: transaction._id,
          type: "DEBIT",
        },
      ],
      { session },
    );

    await (() => {
      return new Promise((resolve) => setTimeout(resolve, 20 * 1000));
    })();

    const creditLedgerEntry = await ledgerModel.create(
      [
        {
          account: toAccount,
          amount: amount,
          transaction: transaction._id,
          type: "CREDIT",
        },
      ],
      {
        session,
      },
    );

    await transactionModel.findOneAndUpdate(
      {
        _id: transaction._id,
      },
      {
        status: "COMPLETED",
      },
      {
        session,
      },
    );

    // transaction.status = "COMPLETED";
    // await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    return res.status(400).json({
      message:
        "Transaction is pending due to some issue, please retry again after sometime",
      error: error.message,
    });
  }

  /**
   * 10.Email service notification
   */
  await emailService.sendTransactionEmail(
    req.user.email,
    req.user.username,
    amount,
    toAccount,
  );

  return res.status(200).json({
    message: "Transaction created successfully",
    transaction: transaction,
  });
}

async function createInitialFundsController(req, res) {
  const { toAccount, amount, idempotencyKey } = req.body;

  if (!toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({
      message: "toAccount, amount and idempotencyKey are required",
    });
  }

  const toUserAccount = await accountModel.findOne({
    _id: toAccount,
  });

  if (!toUserAccount) {
    return res.status(400).json({
      message: "Invalid Account",
    });
  }

  console.log("REQ.USER:", req.user);
  console.log("REQ.USER._ID:", req.user?._id);

  const fromUserAccount = await accountModel.findOne({
    user: req.user._id,
  });

  console.log("FROM USER ACCOUNT:", fromUserAccount);

  if (!fromUserAccount) {
    return res.status(400).json({
      message: "System user account not found",
    });
  }
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const transaction = new transactionModel({
      fromAccount: fromUserAccount._id,
      toAccount,
      amount,
      idempotencyKey,
      status: "PENDING",
    });

    const debitLedgerEntry = await ledgerModel.create(
      [
        {
          account: fromUserAccount._id,
          amount: amount,
          transaction: transaction._id,
          type: "DEBIT",
        },
      ],
      { session },
    );
    const creditLedgerEntry = await ledgerModel.create(
      [
        {
          account: toAccount,
          amount: amount,
          transaction: transaction._id,
          type: "CREDIT",
        },
      ],
      { session },
    );

    transaction.status = "COMPLETED";
    await transaction.save({ session });
    await session.commitTransaction();

    return res.status(201).json({
      message: "Initial funds transcation completed sucessfully",
      transaction: transaction,
    });
  } catch (err) {
    await session.abortTransaction();

    return res.status(500).json({
      message: err.message,
    });
  } finally {
    await session.endSession();
  }
}

module.exports = { createTransaction, createInitialFundsController };
