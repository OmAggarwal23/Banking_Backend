const { Router } = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const transactionController = require("../controllers/transaction.controller");

const transactionRoutes = Router();

/**
 * POST - api/transactions/
 * Create a new Transaction
 */

transactionRoutes.post(
  "/",
  authMiddleware.authMiddleware,
  transactionController.createTransaction,
);
/**
 * - POST api/transactions/system/initial-funds
 * - Create initial funds transactions from system user
 */
transactionRoutes.post(
  "/system/initial-funds",
  authMiddleware.authSystemUserMiddleware,
  transactionController.createInitialFundsController,
);

/**
 * - GET api/accounts/
 * - Protected route
 */

module.exports = transactionRoutes;
