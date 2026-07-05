#!/bin/bash
# TH Garments - Auto Startup Script

# ============ SETTINGS ============
APP_DIR="/home/thgarments-server/th-garment"
LOG_FILE="/tmp/cloudflared_th.log"
export NODE_ENV=production
# ==================================

# Wait for network
sleep 8

# Kill any existing processes on port 5000
echo "Cleaning up old processes..."
pkill -f "node server.js" 2>/dev/null || true
sleep 2

# Clear old cloudflared log
> "$LOG_FILE"

# Start Node server
echo "Starting TH Garments server..."
cd "$APP_DIR/server"
node server.js >> /tmp/th-garments-node.log 2>&1 &
SERVER_PID=$!
echo "Server started with PID: $SERVER_PID"

# Wait for server to be ready
sleep 5

# Permanent URL
TUNNEL_URL="https://thgarments.in"
echo "Using Permanent Domain: $TUNNEL_URL"
echo "Setup complete! URL: $TUNNEL_URL"

# Keep script running
wait $SERVER_PID

# Keep script running
wait $SERVER_PID
