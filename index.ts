// FA2 Smart Function for Jstz
// Implements Fungible Asset 2 (FA2) token standard functionality

type Address = string;
type TokenId = number;

// FA2 Transfer entrypoint types
type Transfer = {
    from_: Address;
    txs: Array<{
        to_: Address;
        token_id: TokenId;
        amount: number;
    }>;
};

// FA2 Balance query types
type BalanceRequest = {
    owner: Address;
    token_id: TokenId;
};

// FA2 Operator types
type OperatorParam = {
    owner: Address;
    operator: Address;
    token_id: TokenId | null; // null means all tokens
};

// Token metadata
type TokenMetadata = {
    token_id: TokenId;
    symbol: string;
    name: string;
    decimals: number;
    extras?: Record<string, string>;
};

// Storage keys
const BALANCES_KEY = "fa2_balances";
const OPERATORS_KEY = "fa2_operators";
const TOKEN_METADATA_KEY = "fa2_token_metadata";
const TOTAL_SUPPLY_KEY = "fa2_total_supply";
const MINTER_KEY = "fa2_minter";

// Helper functions for storage
function getBalances(): Map<string, Map<TokenId, number>> {
    const stored = Kv.get(BALANCES_KEY) as string | null;
    if (!stored) return new Map();

    const data = JSON.parse(stored);
    const balances = new Map<string, Map<TokenId, number>>();

    for (const [owner, tokenMap] of Object.entries(data)) {
        const tokenBalances = new Map<TokenId, number>();
        for (const [tokenId, amount] of Object.entries(tokenMap as Record<string, number>)) {
            tokenBalances.set(Number(tokenId), amount);
        }
        balances.set(owner, tokenBalances);
    }

    return balances;
}

function saveBalances(balances: Map<string, Map<TokenId, number>>) {
    const data: Record<string, Record<string, number>> = {};

    for (const [owner, tokenMap] of balances.entries()) {
        data[owner] = {};
        for (const [tokenId, amount] of tokenMap.entries()) {
            data[owner][tokenId.toString()] = amount;
        }
    }

    Kv.set(BALANCES_KEY, JSON.stringify(data));
}

function getOperators(): Set<string> {
    const stored = Kv.get(OPERATORS_KEY) as string | null;
    if (!stored) return new Set();

    const data = JSON.parse(stored) as string[];
    return new Set(data);
}

function saveOperators(operators: Set<string>) {
    const operatorsArray = Array.from(operators);
    Kv.set(OPERATORS_KEY, JSON.stringify(operatorsArray));
}

function getTokenMetadata(): Map<TokenId, TokenMetadata> {
    const stored = Kv.get(TOKEN_METADATA_KEY) as string | null;
    if (!stored) return new Map();

    const data = JSON.parse(stored) as Record<string, TokenMetadata>;
    const metadata = new Map<TokenId, TokenMetadata>();

    for (const [tokenId, meta] of Object.entries(data)) {
        metadata.set(Number(tokenId), meta);
    }

    return metadata;
}

function saveTokenMetadata(metadata: Map<TokenId, TokenMetadata>) {
    const data: Record<string, TokenMetadata> = {};

    for (const [tokenId, meta] of metadata.entries()) {
        data[tokenId.toString()] = meta;
    }

    Kv.set(TOKEN_METADATA_KEY, JSON.stringify(data));
}

function getTotalSupply(): Map<TokenId, number> {
    const stored = Kv.get(TOTAL_SUPPLY_KEY) as string | null;
    if (!stored) return new Map();

    const data = JSON.parse(stored) as Record<string, number>;
    const supply = new Map<TokenId, number>();

    for (const [tokenId, amount] of Object.entries(data)) {
        supply.set(Number(tokenId), amount);
    }

    return supply;
}

function saveTotalSupply(supply: Map<TokenId, number>) {
    const data: Record<string, number> = {};

    for (const [tokenId, amount] of supply.entries()) {
        data[tokenId.toString()] = amount;
    }

    Kv.set(TOTAL_SUPPLY_KEY, JSON.stringify(data));
}

// Get balance for a specific owner and token
function getBalance(owner: Address, tokenId: TokenId): number {
    const balances = getBalances();
    const ownerBalances = balances.get(owner);
    if (!ownerBalances) return 0;
    return ownerBalances.get(tokenId) || 0;
}

// Set balance for a specific owner and token
function setBalance(owner: Address, tokenId: TokenId, amount: number) {
    const balances = getBalances();

    if (!balances.has(owner)) {
        balances.set(owner, new Map());
    }

    const ownerBalances = balances.get(owner)!;
    ownerBalances.set(tokenId, amount);

    saveBalances(balances);
}

// Transfer tokens
function transfer(from: Address, to: Address, tokenId: TokenId, amount: number) {
    if (amount <= 0) {
        throw new Error("Transfer amount must be positive");
    }

    const fromBalance = getBalance(from, tokenId);
    if (fromBalance < amount) {
        throw new Error("Insufficient balance");
    }

    const toBalance = getBalance(to, tokenId);

    setBalance(from, tokenId, fromBalance - amount);
    setBalance(to, tokenId, toBalance + amount);
}

// Check if operator is authorized
function isOperator(owner: Address, operator: Address, tokenId: TokenId | null): boolean {
    const operators = getOperators();
    const key = tokenId === null
        ? `${owner}:${operator}:*`
        : `${owner}:${operator}:${tokenId}`;
    return operators.has(key);
}

// Add operator
function addOperator(owner: Address, operator: Address, tokenId: TokenId | null) {
    const operators = getOperators();
    const key = tokenId === null
        ? `${owner}:${operator}:*`
        : `${owner}:${operator}:${tokenId}`;
    operators.add(key);
    saveOperators(operators);
}

// Remove operator
function removeOperator(owner: Address, operator: Address, tokenId: TokenId | null) {
    const operators = getOperators();
    const key = tokenId === null
        ? `${owner}:${operator}:*`
        : `${owner}:${operator}:${tokenId}`;
    operators.delete(key);
    saveOperators(operators);
}

// Mint new tokens
function mint(to: Address, tokenId: TokenId, amount: number) {
    if (amount <= 0) {
        throw new Error("Mint amount must be positive");
    }

    const balance = getBalance(to, tokenId);
    setBalance(to, tokenId, balance + amount);

    const totalSupply = getTotalSupply();
    const currentSupply = totalSupply.get(tokenId) || 0;
    totalSupply.set(tokenId, currentSupply + amount);
    saveTotalSupply(totalSupply);
}

// Burn tokens
function burn(from: Address, tokenId: TokenId, amount: number) {
    if (amount <= 0) {
        throw new Error("Burn amount must be positive");
    }

    const balance = getBalance(from, tokenId);
    if (balance < amount) {
        throw new Error("Insufficient balance to burn");
    }

    setBalance(from, tokenId, balance - amount);

    const totalSupply = getTotalSupply();
    const currentSupply = totalSupply.get(tokenId) || 0;
    totalSupply.set(tokenId, Math.max(0, currentSupply - amount));
    saveTotalSupply(totalSupply);
}

// Get the authorized minter address
function getMinter(): Address | null {
    const stored = Kv.get(MINTER_KEY) as string | null;
    return stored;
}

// Set the authorized minter address
function setMinter(address: Address) {
    Kv.set(MINTER_KEY, address);
}

// Check if an address is authorized to mint
function isAuthorizedMinter(address: Address): boolean {
    const minter = getMinter();
    // If no minter is set, the first caller becomes the minter (initialization)
    if (!minter) {
        setMinter(address);
        return true;
    }
    return minter === address;
}

// Main handler
const handler = async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const path = url.pathname.toLowerCase();
    const method = request.method;

    // Get the requester's address from Referer header
    const requester = request.headers.get("Referer") as Address || "unknown";

    console.log(`${requester} calls ${method} ${path}`);

    try {
        // Transfer entrypoint
        if (method === "POST" && path === "/transfer") {
            const body = await request.json() as { transfers: Transfer[] };

            if (!body.transfers || !Array.isArray(body.transfers)) {
                return Response.json({ error: "Invalid transfer format" }, { status: 400 });
            }

            for (const transferReq of body.transfers) {
                const from = transferReq.from_;

                // Check authorization for each transfer individually
                // Execute transfers only after verifying authorization for each one
                for (const tx of transferReq.txs) {
                    // Check if requester is the owner
                    if (from === requester) {
                        // Owner can always transfer their own tokens
                        transfer(from, tx.to_, tx.token_id, tx.amount);
                    } else if (isOperator(from, requester, null)) {
                        // Operator with permission for all tokens can transfer
                        transfer(from, tx.to_, tx.token_id, tx.amount);
                    } else if (isOperator(from, requester, tx.token_id)) {
                        // Operator with permission for this specific token can transfer
                        transfer(from, tx.to_, tx.token_id, tx.amount);
                    } else {
                        // No authorization for this transfer
                        return Response.json({
                            error: `Unauthorized transfer: requester ${requester} is not authorized to transfer token_id ${tx.token_id} from ${from}`
                        }, { status: 403 });
                    }
                }
            }

            return Response.json({ success: true, message: "Transfer completed" });
        }

        // Balance query entrypoint
        if (method === "GET" && path === "/balance") {
            const params = url.searchParams;
            const owner = params.get("owner");
            const tokenIdStr = params.get("token_id");

            if (!owner || !tokenIdStr) {
                return Response.json({ error: "Missing owner or token_id parameter" }, { status: 400 });
            }

            const tokenId = Number(tokenIdStr);
            if (Number.isNaN(tokenId)) {
                return Response.json({ error: "Invalid token_id" }, { status: 400 });
            }

            const balance = getBalance(owner, tokenId);
            return Response.json({ balance, owner, token_id: tokenId });
        }

        // Batch balance query
        if (method === "POST" && path === "/balance_of") {
            const body = await request.json() as { requests: BalanceRequest[] };

            if (!body.requests || !Array.isArray(body.requests)) {
                return Response.json({ error: "Invalid balance request format" }, { status: 400 });
            }

            const balances = body.requests.map(req => ({
                request: req,
                balance: getBalance(req.owner, req.token_id)
            }));

            return Response.json({ balances });
        }

        // Update operators entrypoint
        if (method === "POST" && path === "/update_operators") {
            const body = await request.json() as {
                add_operators?: OperatorParam[];
                remove_operators?: OperatorParam[];
            };

            if (!body.add_operators && !body.remove_operators) {
                return Response.json({ error: "No operators to update" }, { status: 400 });
            }

            // Only owner can update their operators
            if (body.add_operators) {
                for (const op of body.add_operators) {
                    if (op.owner !== requester) {
                        return Response.json({ error: "Unauthorized: can only update your own operators" }, { status: 403 });
                    }
                    addOperator(op.owner, op.operator, op.token_id);
                }
            }

            if (body.remove_operators) {
                for (const op of body.remove_operators) {
                    if (op.owner !== requester) {
                        return Response.json({ error: "Unauthorized: can only update your own operators" }, { status: 403 });
                    }
                    removeOperator(op.owner, op.operator, op.token_id);
                }
            }

            return Response.json({ success: true, message: "Operators updated" });
        }

        // Mint entrypoint (for token creation)
        if (method === "POST" && path === "/mint") {
            const body = await request.json() as {
                to: Address;
                token_id: TokenId;
                amount: number;
            };

            if (!body.to || body.token_id === undefined || !body.amount) {
                return Response.json({ error: "Missing required fields: to, token_id, amount" }, { status: 400 });
            }

            // Only authorized minter can mint tokens
            if (!isAuthorizedMinter(requester)) {
                return Response.json({ error: "Unauthorized: only the minter can mint tokens" }, { status: 403 });
            }

            mint(body.to, body.token_id, body.amount);

            return Response.json({
                success: true,
                message: `Minted ${body.amount} tokens of token_id ${body.token_id} to ${body.to}`
            });
        }

        // Burn entrypoint
        if (method === "POST" && path === "/burn") {
            const body = await request.json() as {
                from: Address;
                token_id: TokenId;
                amount: number;
            };

            if (!body.from || body.token_id === undefined || !body.amount) {
                return Response.json({ error: "Missing required fields: from, token_id, amount" }, { status: 400 });
            }

            // Only owner can burn their tokens
            if (body.from !== requester) {
                return Response.json({ error: "Unauthorized: can only burn your own tokens" }, { status: 403 });
            }

            burn(body.from, body.token_id, body.amount);

            return Response.json({
                success: true,
                message: `Burned ${body.amount} tokens of token_id ${body.token_id} from ${body.from}`
            });
        }

        // Token metadata entrypoint
        if (method === "GET" && path === "/token_metadata") {
            const params = url.searchParams;
            const tokenIdStr = params.get("token_id");

            if (!tokenIdStr) {
                return Response.json({ error: "Missing token_id parameter" }, { status: 400 });
            }

            const tokenId = Number(tokenIdStr);
            if (Number.isNaN(tokenId)) {
                return Response.json({ error: "Invalid token_id" }, { status: 400 });
            }

            const metadata = getTokenMetadata();
            const tokenMeta = metadata.get(tokenId);

            if (!tokenMeta) {
                return Response.json({ error: "Token metadata not found" }, { status: 404 });
            }

            return Response.json({ token_id: tokenId, token_info: tokenMeta });
        }

        // Set token metadata entrypoint
        if (method === "POST" && path === "/set_token_metadata") {
            const body = await request.json() as TokenMetadata;

            if (body.token_id === undefined || !body.symbol || !body.name) {
                return Response.json({ error: "Missing required fields: token_id, symbol, name" }, { status: 400 });
            }

            const metadata = getTokenMetadata();
            metadata.set(body.token_id, body);
            saveTokenMetadata(metadata);

            return Response.json({ success: true, message: "Token metadata updated" });
        }

        // Total supply query
        if (method === "GET" && path === "/total_supply") {
            const params = url.searchParams;
            const tokenIdStr = params.get("token_id");

            if (!tokenIdStr) {
                return Response.json({ error: "Missing token_id parameter" }, { status: 400 });
            }

            const tokenId = Number(tokenIdStr);
            if (Number.isNaN(tokenId)) {
                return Response.json({ error: "Invalid token_id" }, { status: 400 });
            }

            const totalSupply = getTotalSupply();
            const supply = totalSupply.get(tokenId) || 0;

            return Response.json({ token_id: tokenId, total_supply: supply });
        }

        // Set minter entrypoint (only current minter can change)
        if (method === "POST" && path === "/set_minter") {
            const body = await request.json() as {
                new_minter: Address;
            };

            if (!body.new_minter) {
                return Response.json({ error: "Missing required field: new_minter" }, { status: 400 });
            }

            // Only current minter can change the minter address
            const currentMinter = getMinter();
            if (!currentMinter) {
                // If no minter is set, the first caller becomes the minter
                setMinter(requester);
                return Response.json({
                    success: true,
                    message: `Minter initialized to ${requester}`
                });
            }

            if (requester !== currentMinter) {
                return Response.json({ error: "Unauthorized: only the current minter can change the minter address" }, { status: 403 });
            }

            setMinter(body.new_minter);

            return Response.json({
                success: true,
                message: `Minter address changed to ${body.new_minter}`
            });
        }

        // Get minter entrypoint
        if (method === "GET" && path === "/minter") {
            const minter = getMinter();
            return Response.json({ minter: minter || null });
        }

        // Help/Info endpoint
        if (method === "GET" && (path === "/" || path === "/info")) {
            return Response.json({
                name: "FA2 Smart Function",
                description: "Fungible Asset 2 (FA2) token standard implementation for Jstz",
                endpoints: {
                    "POST /transfer": "Transfer tokens (supports batch transfers)",
                    "GET /balance?owner=<address>&token_id=<id>": "Get balance for owner and token",
                    "POST /balance_of": "Batch balance query",
                    "POST /update_operators": "Add or remove operators",
                    "POST /mint": "Mint new tokens (minter only)",
                    "POST /burn": "Burn tokens",
                    "GET /token_metadata?token_id=<id>": "Get token metadata",
                    "POST /set_token_metadata": "Set token metadata",
                    "GET /total_supply?token_id=<id>": "Get total supply for token",
                    "POST /set_minter": "Set/change minter address (current minter only)",
                    "GET /minter": "Get current minter address"
                }
            });
        }

        return Response.json({ error: "Not found" }, { status: 404 });

    } catch (error) {
        console.error("Error processing request:", error);
        return Response.json({
            error: error instanceof Error ? error.message : "Internal server error"
        }, { status: 500 });
    }
};

export default handler;

