# Evolving NFT Smart Function for Jstz

This is a Jstz smart function that implements an evolving NFT - a dynamic NFT that grows and evolves with each purchase, recording each buyer in its history and unlocking milestones.

## Features

- ✅ Dynamic NFT metadata that changes with each purchase
- ✅ Growth levels that increase with each purchase
- ✅ Milestone system (unlocks at levels 1, 5, 10, 20)
- ✅ Ownership history tracking
- ✅ Visual evolution (variant changes: Common → Rare → Epic → Legendary)

## Prerequisites

- Node.js 22+
- pnpm v10+ (or npm)
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

**Note:** If you see an error that the sandbox is already running, see the [Troubleshooting](#troubleshooting) section below.

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

After deployment, you'll receive a `tz1` address for your smart function.

## API Endpoints

### Get NFT Metadata
```bash
jstz run "jstz://<ADDRESS>/metadata/0" -n dev
```

Returns the current NFT metadata including:
- Growth level
- Variant (Common/Rare/Epic/Legendary)
- Color
- Attributes
- Ownership history
- Unlocked milestones

### Purchase & Evolve NFT
```bash
jstz run jstz://<ADDRESS>/purchase -n dev -d '{
  "buyer": "tz1...",
  "tokenId": 0
}'
```

Increases the growth level, adds the buyer to ownership history, and unlocks milestones if thresholds are reached.

## Frontend

The project includes a React frontend for interacting with the evolving NFT.

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser** to `http://localhost:3000`

5. **Enter your deployed smart function address** and start interacting with the NFT!

## Troubleshooting

### Sandbox "Already Running" Error

If you encounter the error `ERROR The sandbox is already running!` when trying to start the sandbox, but no sandbox is actually running, follow these steps:

1. **Remove stale sandbox state from config:**
   ```bash
   # Backup the config first (optional)
   cp ~/.jstz/config.json ~/.jstz/config.json.backup
   
   # Edit ~/.jstz/config.json and remove the "sandbox" section
   # Or use this command to remove it automatically:
   # (Note: This requires jq - install with: brew install jq)
   jq 'del(.sandbox)' ~/.jstz/config.json > ~/.jstz/config.json.tmp && mv ~/.jstz/config.json.tmp ~/.jstz/config.json
   ```

2. **Clean up Docker containers (if any):**
   ```bash
   docker ps -a | grep jstz
   docker rm -f <container_id>  # Remove any stale containers
   ```

3. **Check for processes using port 8933:**
   ```bash
   lsof -i :8933
   # Kill any processes if found
   ```

4. **Try starting the sandbox again:**
   ```bash
   jstz sandbox start
   ```

The issue occurs when the sandbox process crashes or is killed, but the config file still contains a reference to it with a stale PID. Removing the `sandbox` section from `~/.jstz/config.json` clears this stale state.

### Port 8933 Not Accessible on macOS

On macOS, Docker's host networking mode doesn't properly expose ports to the host machine. If you can't connect to `http://127.0.0.1:8933` even though the sandbox is running, try one of these solutions:

**Option 1: Use Docker port mapping (Recommended)**
```bash
# Stop any existing sandbox
docker ps -a | grep jstz | awk '{print $1}' | xargs docker rm -f

# Start sandbox with explicit port mapping
docker run -d --name jstz-sandbox \
  -p 8933:8933 -p 8932:8932 -p 18731:18731 \
  -v ~/.jstz:/root/.jstz \
  ghcr.io/trilitech/jstz-cli:20240320 sandbox start
```

**Note:** This may still not work because the Jstz service binds to `127.0.0.1` inside the container. If this doesn't work, try Option 2.

**Option 2: Use socat port forwarding**
```bash
# Install socat if needed
brew install socat

# Find the container ID
CONTAINER=$(docker ps --filter "ancestor=ghcr.io/trilitech/jstz-cli:20240320" --format "{{.ID}}" | head -1)

# Forward port 8933 (run this in a separate terminal and keep it running)
docker exec -it $CONTAINER sh -c "apk add socat && socat TCP-LISTEN:8933,fork,reuseaddr,bind=0.0.0.0 TCP:127.0.0.1:8933"
```

**Option 3: Access via Docker exec (for testing)**
You can test the API directly inside the container:
```bash
CONTAINER=$(docker ps --filter "ancestor=ghcr.io/trilitech/jstz-cli:20240320" --format "{{.ID}}" | head -1)
docker exec $CONTAINER sh -c "wget -qO- http://127.0.0.1:8933/health"
```

**Option 4: Modify Vite proxy to use container IP**
If you can get the container's IP address, you can update the Vite proxy config to use it instead of localhost.

## License

MIT
