# FA2 Token Minting Frontend

A simple React frontend for minting FA2 tokens on Jstz.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The app will open at `http://localhost:3000`

## Usage

1. **Deploy your FA2 smart function** and copy the KT1 address
2. **Install the Jstz dev wallet** extension in Chrome (if you want to use wallet integration)
3. **Enter the contract address** in the form (format: `KT1...` or `jstz://KT1...`)
4. **Fill in the minting details:**
   - Recipient address (or click "Use My Address" if wallet is connected)
   - Token ID (default: 0)
   - Amount to mint
5. **Click "Mint Tokens"**

## Features

- ✅ Mint tokens to any address
- ✅ Check token balances
- ✅ View current minter address
- ✅ Connect with Jstz dev wallet
- ✅ Responsive design

## Note

This frontend currently uses direct API calls to the Jstz node. For production use, you should integrate with the Jstz dev wallet extension to properly sign transactions.

## Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```


