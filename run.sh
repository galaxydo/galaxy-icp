#!/bin/bash

set -e

if ! [ -x "$(command -v node)" ]; then
  echo "Error: Node.js is not installed. Please install Node.js (v18 or later) before running this script."
  exit 1
fi

if ! [ -x "$(command -v deno)" ]; then
  echo "Error: Deno is not installed. Please install Deno (v1.36 or later) before running this script."
  exit 1
fi

if ! [ -x "$(command -v pnpm)" ]; then
  echo "Error: pnpm is not installed. Please install pnpm before running this script."
  exit 1
fi

echo "Setting up frontend..."
pnpm install

echo "Updating submodules..."
pnpm run pull-submodules

echo "Building production frontend assets..."
pnpm run build || {
  echo "Error: Failed to build production frontend assets."
  exit 1
}

echo "Building webui..."
cd desktop/webui && make || {
  echo "Error: Failed to build webui."
  exit 1
}

echo "Setting up desktop development environment..."
pnpm run dev-desktop

echo "Done!"
