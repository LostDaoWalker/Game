#!/bin/bash
set -e

# Check prerequisites
if [ ! -f .env ]; then
  echo "No .env found. Creating from .env.example..."
  cp .env.example .env
  echo "Fill in your DISCORD_TOKEN and CLIENT_ID in .env, then re-run."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Deploying /halcyon command..."
npm run deploy-commands

echo "Starting bot..."
npm start
