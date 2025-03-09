#!/bin/bash

echo "Starting sanitization test server..."

# Change to the directory containing the templates
cd $(dirname "$0")/transcendence/pongSPA

# Check if Python version
if command -v python3 &>/dev/null; then
    echo "Using Python 3 HTTP server"
    python3 -m http.server 8000
elif command -v python &>/dev/null; then
    echo "Using Python 2 HTTP server"
    python -m SimpleHTTPServer 8000
else
    echo "Error: Python not found. Please install Python to run the test server."
    exit 1
fi
