# Evolving NFT Smart Function Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Frontend (React + Vite)                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  App.tsx                                                         │  │
│  │  - NFT Display Component                                          │  │
│  │  - Purchase Form                                                 │  │
│  │  - Metadata Viewer                                               │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬────────────────────────────────────────┘
                                │
                                │ HTTP Requests
                                │ /api/jstz/run/{address}/metadata/0
                                │ /api/jstz/run/{address}/purchase
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Vite Dev Server (Port 3000)                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Proxy Configuration                                              │  │
│  │  /api/jstz/* → http://127.0.0.1:8934                             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬────────────────────────────────────────┘
                                │
                                │ Proxied Requests
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Proxy Server (Port 8934) - macOS Workaround               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  proxy-server.js                                                 │  │
│  │  - Finds Jstz Docker container                                   │  │
│  │  - Forwards requests via docker exec                             │  │
│  │  - Handles CORS and networking issues                             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬────────────────────────────────────────┘
                                │
                                │ Docker Exec
                                │ curl http://127.0.0.1:8933/...
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Jstz Sandbox (Docker Container)                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Jstz API Server (Port 8933)                                      │  │
│  │  - Receives HTTP requests                                         │  │
│  │  - Routes to smart function by address                           │  │
│  │  - Executes smart function handler                               │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬────────────────────────────────────────┘
                                │
                                │ Smart Function Invocation
                                │ GET /metadata/{tokenId}
                                │ POST /purchase
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Smart Function (index.ts)                             │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Handler Function                                                 │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │
│  │  │  Route: GET /metadata/{tokenId}                            │  │
│  │  │  - Load state from KV store                                │  │
│  │  │  - Build metadata with current level                       │  │
│  │  │  - Return JSON response                                    │  │
│  │  └────────────────────────────────────────────────────────────┘  │
│  │  ┌────────────────────────────────────────────────────────────┐  │
│  │  │  Route: POST /purchase                                      │  │
│  │  │  - Load state from KV store                                │  │
│  │  │  - Increment totalPurchases                                │  │
│  │  │  - Add buyer to owners list                                │  │
│  │  │  - Compute unlocked milestones                             │  │
│  │  │  - Save updated state to KV store                         │  │
│  │  │  - Return updated metadata                                 │  │
│  │  └────────────────────────────────────────────────────────────┘  │
│  └──────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬────────────────────────────────────────┘
                                │
                                │ Read/Write Operations
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Jstz Key-Value Store (Persistent Storage)            │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Key: "s" (state)                                                │  │
│  │  Value: {                                                         │  │
│  │    t: number,        // totalPurchases                          │  │
│  │    o: string[],      // owners array                            │  │
│  │    m: string[]       // milestones unlocked                      │  │
│  │  }                                                                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Load NFT Metadata Flow
```
Frontend → Vite Proxy → Proxy Server → Docker Exec → Jstz API → Smart Function
                                                                      │
                                                                      ▼
                                                              KV Store (read)
                                                                      │
                                                                      ▼
Smart Function ← Jstz API ← Docker Exec ← Proxy Server ← Vite Proxy ← Frontend
```

### 2. Purchase & Evolve Flow
```
Frontend → Vite Proxy → Proxy Server → Docker Exec → Jstz API → Smart Function
                                                                      │
                                                                      ▼
                                                              KV Store (read)
                                                                      │
                                                                      ▼
                                                              Update State
                                                                      │
                                                                      ▼
                                                              KV Store (write)
                                                                      │
                                                                      ▼
Smart Function ← Jstz API ← Docker Exec ← Proxy Server ← Vite Proxy ← Frontend
```

## Component Details

### Smart Function State Structure
```typescript
{
  totalPurchases: number,    // Current growth level
  owners: string[],          // List of unique buyer addresses
  milestonesUnlocked: string[] // ["LVL_1", "LVL_5", "LVL_10", "LVL_20"]
}
```

### Milestone Thresholds
- **LVL_1**: 1 purchase
- **LVL_5**: 5 purchases
- **LVL_10**: 10 purchases
- **LVL_20**: 20 purchases

### Variant Progression
- **Common**: 0-4 purchases
- **Rare**: 5-9 purchases (LVL_5 milestone)
- **Epic**: 10-19 purchases (LVL_10 milestone)
- **Legendary**: 20+ purchases (LVL_20 milestone)

## Storage Schema

### Key-Value Store
- **Key**: `"s"` (state)
- **Value**: JSON stringified state object
- **Persistence**: Stored in Jstz's persistent KV store
- **Scope**: Global to the smart function instance

## API Endpoints

### GET /metadata/{tokenId}
- **Purpose**: Retrieve current NFT metadata
- **Response**: Complete metadata including level, variant, milestones, history
- **Read-only**: No state changes

### POST /purchase
- **Purpose**: Purchase and evolve the NFT
- **Body**: `{ buyer: string, tokenId: number }`
- **Effect**: 
  - Increments `totalPurchases`
  - Adds buyer to `owners` (if new)
  - Recomputes `milestonesUnlocked`
  - Saves updated state
- **Response**: Updated state and metadata

## Network Layers

1. **Frontend Layer**: React application running in browser
2. **Proxy Layer**: Vite dev server with proxy configuration
3. **Bridge Layer**: Node.js proxy server (macOS workaround)
4. **Container Layer**: Docker container running Jstz sandbox
5. **API Layer**: Jstz HTTP API server
6. **Smart Function Layer**: JavaScript handler function
7. **Storage Layer**: Jstz persistent key-value store

## Deployment Flow

```
TypeScript Source (index.ts)
         │
         ▼
    TypeScript Compiler
         │
         ▼
   JavaScript (dist/index.js)
         │
         ▼
   jstz deploy dist/index.js
         │
         ▼
   Deployed Smart Function
   (tz1... address)
```

## Key Features

- **Stateless Handler**: Smart function is stateless; all state in KV store
- **Atomic Operations**: Each purchase is atomic (read → update → write)
- **Persistent History**: All owners and purchases are permanently recorded
- **Dynamic Metadata**: Metadata computed on-demand from current state
- **Milestone System**: Automatic milestone unlocking based on thresholds

---

# Learning & Challenges

## What We Learned

### 1. Jstz Smart Functions Architecture
- **Serverless-like Execution**: Jstz smart functions behave like serverless functions, executing on-demand when called
- **Key-Value Store**: Understanding how Jstz's persistent KV store works - it's the only way to maintain state between invocations
- **Request/Response Model**: Smart functions receive standard HTTP Request objects and return Response objects, making them feel like web APIs
- **Size Constraints**: Smart functions have a strict 3915-byte limit, requiring aggressive code optimization

### 2. TypeScript to JavaScript Compilation
- **Direct JavaScript Output**: Unlike traditional smart contracts, Jstz smart functions are plain JavaScript files
- **No Runtime Dependencies**: The compiled code must be self-contained - no external libraries
- **Global Runtime APIs**: Jstz provides global APIs like `Kv` that need proper TypeScript declarations

### 3. Development Workflow
- **Local Sandbox**: The Jstz sandbox runs in Docker, providing a complete local development environment
- **Deployment Process**: Simple deployment via `jstz deploy` command, receiving a Tezos address
- **Testing**: Testing involves making HTTP requests to the deployed smart function address

### 4. Frontend Integration Challenges
- **CORS Issues**: Direct browser requests to Jstz API face CORS restrictions
- **Proxy Solutions**: Implementing proxy layers (Vite proxy + custom proxy server) to handle networking
- **macOS Docker Limitations**: Docker's host networking mode doesn't work the same on macOS as Linux

## Major Challenges & Solutions

### Challenge 1: Smart Function Size Limit (3915 bytes)

**Problem**: The initial implementation exceeded the 3915-byte limit after compilation.

**Solution**:
- Aggressive code minification and optimization
- Shortened all variable names (e.g., `Address` → `A`, `TokenId` → `T`)
- Removed less critical features (burn, token metadata endpoints, total supply)
- Consolidated logic and removed redundant checks
- Removed all `console.log` statements
- Final optimized version: 2686 bytes (well under limit)

**Key Takeaway**: Every byte counts in smart function development. Plan for optimization from the start.

### Challenge 2: Authorization Bugs in FA2 Implementation

**Problem**: Found three critical security vulnerabilities:
1. Batch transfer authorization checked only one token but executed all transfers
2. Mint endpoint had no authorization check
3. Operator precedence bug in info endpoint path matching

**Solution**:
- Fixed batch transfers to check authorization per individual transfer
- Added minter authorization check to mint endpoint
- Fixed logical operator precedence with proper parentheses

**Key Takeaway**: Security audits are crucial, even in early development. Authorization logic must be carefully tested.

### Challenge 3: macOS Docker Networking

**Problem**: Jstz sandbox runs in Docker with host networking, but on macOS this doesn't properly expose ports to the host machine. Port 8933 was inaccessible from the Mac.

**Solution**:
- Created a Node.js proxy server that uses `docker exec` to forward requests
- Proxy server runs on port 8934 and forwards to the container's internal port 8933
- Vite dev server configured to proxy `/api/jstz/*` requests through the proxy server

**Key Takeaway**: Platform-specific networking differences require creative workarounds. Always test on the target deployment platform.

### Challenge 4: Path Matching in Smart Function

**Problem**: The smart function received requests with different path formats:
- `/metadata/0`
- `/run/{address}/metadata/0`
- Path normalization was inconsistent

**Solution**:
- Implemented flexible path parsing that handles multiple formats
- Checks both normalized path and full pathname
- Extracts tokenId from anywhere in the path string
- Added better error messages with path debugging info

**Key Takeaway**: Be defensive in path parsing - real-world requests may vary from expected formats.

### Challenge 5: Stale Sandbox State

**Problem**: Jstz CLI reported "sandbox is already running" even when no sandbox was active, due to stale state in `~/.jstz/config.json`.

**Solution**:
- Created automated cleanup script to remove stale sandbox section from config
- Documented manual cleanup steps in README
- Added troubleshooting section for common sandbox issues

**Key Takeaway**: State management in development tools can cause issues. Always provide clear recovery steps.

### Challenge 6: ES Module vs CommonJS

**Problem**: Proxy server initially used CommonJS `require()`, but project uses ES modules (`"type": "module"` in package.json).

**Solution**:
- Converted proxy server to use ES module syntax (`import` instead of `require`)
- Used `promisify` from `util` to convert callback-based `exec` to async/await
- Updated all function signatures to use async/await pattern

**Key Takeaway**: Consistency in module systems is important. Check project configuration before writing new files.

## Technical Insights

### State Management
- **No Global Variables**: Smart functions can't use module-level variables for state - everything must go through KV store
- **JSON Serialization**: All data must be JSON-serializable for KV store
- **Atomic Operations**: Each handler invocation is atomic - no partial state updates

### Error Handling
- **Try-Catch Everywhere**: All async operations need proper error handling
- **Meaningful Error Messages**: Error responses should include context for debugging
- **Status Codes**: Proper HTTP status codes help with debugging and API integration

### Performance Considerations
- **Minimize KV Reads/Writes**: Each KV operation has overhead
- **Compute on Demand**: Metadata is computed from state rather than stored
- **Efficient Data Structures**: Arrays for owners list, simple objects for state

## Best Practices Discovered

1. **Start with Full Features, Optimize Later**: Build with all features first, then optimize for size
2. **Test Authorization Early**: Don't wait until the end to test security
3. **Platform-Specific Testing**: Test on the actual deployment platform early
4. **Defensive Programming**: Handle edge cases and unexpected input formats
5. **Clear Error Messages**: Helpful error messages save debugging time
6. **Documentation as You Go**: Document challenges and solutions immediately

## Future Improvements

1. **Better Error Handling**: More granular error types and messages
2. **Input Validation**: Stronger validation of request bodies
3. **Rate Limiting**: Prevent abuse of purchase endpoint
4. **Event Logging**: Better tracking of state changes
5. **Multi-Token Support**: Currently only supports tokenId 0
6. **Image Generation**: Dynamic image generation based on level/variant
7. **Testing Framework**: Automated tests for smart function logic

## Resources & Documentation

- **Jstz Documentation**: https://jstz.tezos.com/quick_start/
- **Tezos FA2 Standard**: Understanding token standards helped with initial design
- **Docker Networking**: Understanding Docker networking modes for macOS workaround
- **TypeScript ES Modules**: Modern JavaScript module system

## Conclusion

Building this evolving NFT smart function was a great learning experience in:
- Understanding a new blockchain platform (Jstz/Tezos)
- Working within strict size constraints
- Handling platform-specific networking challenges
- Building a complete full-stack application
- Security considerations in smart contract development

The challenges encountered and solved provide valuable lessons for future smart function development on Jstz and similar platforms.

