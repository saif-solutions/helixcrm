#!/bin/bash

echo "í»‘ Stopping test containers..."
docker-compose -f docker-compose.test.yml down

echo "âœ… Test containers stopped"
