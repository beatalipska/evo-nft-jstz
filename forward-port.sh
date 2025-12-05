#!/bin/bash
# Port forwarding workaround for macOS Docker host networking issue
# This script forwards port 8933 from the Jstz container to localhost

CONTAINER=$(docker ps --filter "ancestor=ghcr.io/trilitech/jstz-cli:20240320" --format "{{.ID}}" | head -1)

if [ -z "$CONTAINER" ]; then
    echo "No Jstz sandbox container found. Please start it first with: jstz sandbox start"
    exit 1
fi

echo "Forwarding port 8933 from container $CONTAINER to localhost:8933"
echo "Press Ctrl+C to stop forwarding"
echo ""

# Use socat if available, otherwise use nc
if command -v socat &> /dev/null; then
    docker exec -i $CONTAINER sh -c "socat TCP-LISTEN:8933,fork,reuseaddr TCP:127.0.0.1:8933" &
    FORWARD_PID=$!
    trap "kill $FORWARD_PID 2>/dev/null" EXIT
    wait $FORWARD_PID
else
    echo "socat not found. Installing socat or using alternative method..."
    echo "You can install socat with: brew install socat"
    echo ""
    echo "Alternative: Use Docker port mapping by running the sandbox with:"
    echo "docker run -d --name jstz-sandbox -p 8933:8933 --network bridge ghcr.io/trilitech/jstz-cli:20240320 sandbox start"
fi

