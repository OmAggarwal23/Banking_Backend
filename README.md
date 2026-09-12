# Financial Ledger Backend

A production-ready financial ledger backend that handles user authentication, account management, and secure money transfers using double-entry bookkeeping principles.

## Overview

This service provides a robust foundation for applications that need to move money reliably. It enforces atomic, auditable transactions through MongoDB sessions and immutable ledger entries, so every transfer is traceable and every balance is verifiable — not just stored, but derived from the ledger itself.

## Live Deployment

The API is deployed and live on Render:

**Base URL:** [https://banking-backend-chj2.onrender.com](https://banking-backend-chj2.onrender.com)

> Note: the service is hosted on Render's free tier, so it may spin down after periods of inactivity — the first request after idling can take a few extra seconds to respond while it wakes up.

## Tech Stack

- **Runtime / Framework:** Node.js, Express 5.2
- **Database / ODM:** MongoDB, Mongoose 9.1
- **Authentication:** JWT (JSON Web Tokens)
- **Security:** bcryptjs (password hashing)
- **Email:** Nodemailer (Gmail OAuth2)
- **Data Integrity:** MongoDB multi-document transactions for ACID compliance

## Project Structure

```
├── config/            # Database configuration
├── models/            # Mongoose schemas
│   ├── User.js
│   ├── Account.js
│   ├── Transaction.js
│   ├── Ledger.js
│   └── BlackList.js
├── controllers/        # Business logic
│   ├── auth.controller.js
│   ├── account.controller.js
│   └── transaction.controller.js
├── routes/             # API route definitions
├── middleware/         # JWT validation and request guards
└── services/           # Email and other supporting services
```

## Architecture

**Request flow:**

```
Client → Express Middleware → JWT Authentication → Route Handler → Controller Logic → Response
```

### Transaction Flow

Every money transfer follows a 10-step atomic process using MongoDB sessions to guarantee consistency:

1. Start a MongoDB session and begin a transaction
2. Validate the sender's account and authentication
3. Validate the recipient's account
4. Check sufficient balance via on-demand aggregation
5. Create a debit ledger entry for the sender
6. Create a credit ledger entry for the recipient
7. Apply immutability constraints via pre-save hooks (ledger entries cannot be modified after creation)
8. Record the transaction metadata
9. Commit the transaction
10. Roll back automatically on any failure at any step

**Key design principles:**

- **Immutable ledger entries** — enforced via Mongoose pre-hooks; ledger records can never be altered after creation, only appended to.
- **On-demand balance calculation** — account balances are not stored as a mutable field but computed via aggregation over ledger entries, preventing balance drift or tampering.
- **Atomicity** — all steps in a transfer succeed together or fail together, using MongoDB sessions.

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- MongoDB instance (local or Atlas)
- Gmail account with OAuth2 credentials configured (for email notifications)

### Environment Variables

Create a `.env` file in the project root:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GMAIL_CLIENT_ID=your_gmail_oauth_client_id
GMAIL_CLIENT_SECRET=your_gmail_oauth_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token
GMAIL_USER=your_gmail_address
```

### Installation

```bash
npm install
```

### Running the Server

**Development:**

```bash
npm run dev
```

**Production:**

```bash
npm start
```

## API Endpoints

All endpoints below are relative to the base URL — locally that's `http://localhost:<PORT>`, and live it's `https://banking-backend-chj2.onrender.com`.

### Auth Routes (`/api/auth`)

| Method | Endpoint             | Description                          | Example Payload                                                                    |
| ------ | -------------------- | ------------------------------------ | ---------------------------------------------------------------------------------- |
| POST   | `/api/auth/register` | Register a new user                  | `{ "name": "Jane Doe", "email": "jane@example.com", "password": "SecurePass123" }` |
| POST   | `/api/auth/login`    | Authenticate and receive a JWT       | `{ "email": "jane@example.com", "password": "SecurePass123" }`                     |
| POST   | `/api/auth/logout`   | Invalidate current token (blacklist) | `{ "token": "<jwt_token>" }`                                                       |

### Account Routes (`/api/accounts`)

| Method | Endpoint                   | Description                                     | Example Payload                                   |
| ------ | -------------------------- | ----------------------------------------------- | ------------------------------------------------- |
| POST   | `/api/accounts`            | Create a new account for the authenticated user | `{ "accountType": "savings", "currency": "INR" }` |
| GET    | `/api/accounts/:id`        | Get account details and current balance         | —                                                 |
| GET    | `/api/accounts/:id/ledger` | Get full ledger history for an account          | —                                                 |

### Transaction Routes (`/api/transactions`)

| Method | Endpoint                               | Description                           | Example Payload                                                                                 |
| ------ | -------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| POST   | `/api/transactions/transfer`           | Transfer funds between two accounts   | `{ "fromAccountId": "64f...", "toAccountId": "64a...", "amount": 500, "note": "Rent payment" }` |
| GET    | `/api/transactions/:id`                | Get details of a specific transaction | —                                                                                               |
| GET    | `/api/transactions/account/:accountId` | List all transactions for an account  | —                                                                                               |

> **Note:** All account and transaction routes require a valid JWT in the `Authorization: Bearer <token>` header.

## Security

- Passwords are hashed with bcryptjs before storage.
- JWTs are validated on every protected route via middleware.
- Logged-out tokens are blacklisted to prevent reuse.
- All monetary operations run inside MongoDB transactions to prevent partial writes or race conditions.

## License

This project is available for personal and educational use.
