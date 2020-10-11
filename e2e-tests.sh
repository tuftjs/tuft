#!/bin/sh

set -e

# Start the server.
npm run start:test &

# Execute e2e tests once the server is running.
wait-on http-get://localhost:3000/ && newman run ./postman_collection.json
