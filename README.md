# FA2 Smart Function for Jstz

This is a Jstz smart function that implements the FA2 (Fungible Asset 2) token standard, adapted for the Jstz platform.

## Features

- ✅ Token transfers (single and batch)
- ✅ Balance queries
- ✅ Operator management (delegate transfer permissions)
- ✅ Token minting
- ✅ Token burning
- ✅ Token metadata management
- ✅ Total supply tracking

## Prerequisites

- Node.js 22+
- pnpm v10+
- Jstz CLI installed
- Docker (for local sandbox)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the Jstz sandbox:
```bash
jstz sandbox start
```

Note: If you see an error about the configuration file, delete the `~/.config/jstz/` folder and try again.

## Building and Deploying

1. Build the smart function:
```bash
npm run build
```

2. Deploy to the sandbox:
```bash
jstz deploy dist/index.js -n dev
```

Or use the combined command:
```bash
npm run deploy
```

After deployment, you'll receive a `KT1` address for your smart function.

## API Endpoints

### Transfer Tokens
```bash
# Single transfer
jstz run jstz://<ADDRESS>/transfer -n dev -d '{
  "transfers": [{
    "from_": "tz1...",
    "txs": [{
      "to_": "tz1...",
      "token_id": 0,
      "amount": 100
    }]
  }]
}'
```

### Get Balance
```bash
jstz run "jstz://<ADDRESS>/balance?owner=tz1...&token_id=0" -n dev
```

### Batch Balance Query
```bash
jstz run jstz://<ADDRESS>/balance_of -n dev -d '{
  "requests": [
    {"owner": "tz1...", "token_id": 0},
    {"owner": "tz1...", "token_id": 1}
  ]
}'
```

### Mint Tokens
```bash
jstz run jstz://<ADDRESS>/mint -n dev -d '{
  "to": "tz1...",
  "token_id": 0,
  "amount": 1000
}'
```

### Burn Tokens
```bash
jstz run jstz://<ADDRESS>/burn -n dev -d '{
  "from": "tz1...",
  "token_id": 0,
  "amount": 100
}'
```

### Update Operators
```bash
jstz run jstz://<ADDRESS>/update_operators -n dev -d '{
  "add_operators": [{
    "owner": "tz1...",
    "operator": "tz1...",
    "token_id": null
  }]
}'
```

### Set Token Metadata
```bash
jstz run jstz://<ADDRESS>/set_token_metadata -n dev -d '{
  "token_id": 0,
  "symbol": "TKN",
  "name": "My Token",
  "decimals": 6
}'
```

### Get Token Metadata
```bash
jstz run "jstz://<ADDRESS>/token_metadata?token_id=0" -n dev
```

### Get Total Supply
```bash
jstz run "jstz://<ADDRESS>/total_supply?token_id=0" -n dev
```

## Usage Example

1. Deploy the smart function
2. Set token metadata:
```bash
jstz run jstz://<ADDRESS>/set_token_metadata -n dev -d '{
  "token_id": 0,
  "symbol": "FA2",
  "name": "FA2 Token",
  "decimals": 6
}'
```

3. Mint tokens to an address:
```bash
jstz run jstz://<ADDRESS>/mint -n dev -d '{
  "to": "tz1YourAddress...",
  "token_id": 0,
  "amount": 1000000
}'
```

4. Check balance:
```bash
jstz run "jstz://<ADDRESS>/balance?owner=tz1YourAddress...&token_id=0" -n dev
```

5. Transfer tokens:
```bash
jstz run jstz://<ADDRESS>/transfer -n dev -d '{
  "transfers": [{
    "from_": "tz1YourAddress...",
    "txs": [{
      "to_": "tz1RecipientAddress...",
      "token_id": 0,
      "amount": 100
    }]
  }]
}'
```

## Storage

The smart function uses Jstz's key-value store to persist:
- Token balances (per owner, per token)
- Operator permissions
- Token metadata
- Total supply per token

## License

MIT

