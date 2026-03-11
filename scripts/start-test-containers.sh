#!/bin/bash

echo "Ì∫Ä Starting test containers..."
docker-compose -f docker-compose.test.yml up -d

echo "‚è≥ Waiting for containers to be ready..."
sleep 5

echo "‚úÖ Test containers ready!"
echo "   PostgreSQL: localhost:5432"
echo "   Redis: localhost:6379"
echo "   MailHog: localhost:8025 (UI), localhost:1025 (SMTP)"
