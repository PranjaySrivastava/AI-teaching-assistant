#!/usr/bin/env bash
set -e

echo "=========================================="
echo " Running All Unit & Integration Tests"
echo "=========================================="

echo "1. Testing Frontend..."
cd frontend && npm test && cd ..

echo "2. Testing Node Backend..."
cd backend/node-service && npm test && cd ../..

echo "3. Testing Python Backend..."
if [ -d ".venv" ]; then
    source .venv/bin/activate 2>/dev/null || source .venv/Scripts/activate 2>/dev/null || true
fi
pytest backend/python-service/tests

echo "=========================================="
echo " All tests passed successfully!"
echo "=========================================="
