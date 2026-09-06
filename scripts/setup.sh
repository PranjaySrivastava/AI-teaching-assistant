#!/usr/bin/env bash
set -e

echo "=========================================="
echo " Setting up AI Teaching Assistant Monorepo"
echo "=========================================="

echo "1. Installing root dependencies..."
npm install

echo "2. Installing frontend dependencies..."
cd frontend && npm install && cd ..

echo "3. Installing backend node-service dependencies..."
cd backend/node-service && npm install && cd ../..

echo "4. Setting up Python environment..."
if command -v python3 &>/dev/null; then
    python3 -m venv .venv
    source .venv/bin/activate || source .venv/Scripts/activate || true
    pip install -r backend/python-service/requirements.txt
elif command -v python &>/dev/null; then
    python -m venv .venv
    .venv\Scripts\activate || true
    pip install -r backend/python-service/requirements.txt
fi

echo "=========================================="
echo " Setup complete! Run 'npm run dev' to start."
echo "=========================================="
