#!/bin/bash
set -e
if [ ! -f .env ]; then cp .env.example .env; echo "Created .env — fill in your token, then re-run."; exit 1; fi
if [ ! -d node_modules ]; then echo "Installing..."; npm install; fi
npm run deploy && npm start
