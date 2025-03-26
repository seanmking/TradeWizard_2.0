#!/bin/bash

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Create initial migration
npx prisma migrate dev --name init

echo "Setup complete! The Prisma client has been generated." 