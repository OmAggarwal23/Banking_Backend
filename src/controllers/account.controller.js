const accountModel = require("../models/accounts.model");

async function createAccountController(req, res) {
  const user = req.user;
  const account = await accountModel.create({
    user: user._id,
  });

  return res.status(201).json({
    account,
  });
}
async function getUserAccountsController(req, res) {
  const accounts = await accountModel.find({ user: req.user._id });

  return res.status(200).json({
    accounts,
  });
}

async function getAccountBalanceController(req, res) {
  const { accountId } = req.params;
  const account = await accountModel.findOne({
    _id: accountId,
    user: req.user._id,
  });

  if (!account) {
    return res.status(401).json({
      message: "Account not found",
    });
  }

  const balance = await account.getBalance();
  return res.status(200).json({
    message: "Account balance fetched",
    balance: balance,
  });
}

module.exports = {
  createAccountController,
  getUserAccountsController,
  getAccountBalanceController,
};
