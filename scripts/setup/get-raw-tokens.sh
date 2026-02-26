#!/bin/bash

echo "í´ GETTING RAW TOKENS"
echo "===================="

# 1. Login
echo -e "\n1. Login and save FULL cookie..."
curl -c cookies.txt -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@helixcrm.test","password":"Admin123!"}' \
  -o /dev/null -s

TOKEN1=$(grep refresh_token cookies.txt | awk '{print $NF}')
echo "TOKEN1: $TOKEN1"
echo "Length: ${#TOKEN1}"

# 2. First refresh
echo -e "\n2. First refresh..."
curl -c cookies2.txt -b cookies.txt -X POST http://localhost:3001/api/v1/auth/refresh \
  -o /dev/null -s

TOKEN2=$(grep refresh_token cookies2.txt | tail -1 | awk '{print $NF}')
echo "TOKEN2: $TOKEN2"
echo "Length: ${#TOKEN2}"

# 3. Compare
echo -e "\n3. Byte comparison..."
if [ "$TOKEN1" = "$TOKEN2" ]; then
    echo "   âš ï¸  TOKENS ARE IDENTICAL!"
    echo "   This explains everything - rotation isn't happening!"
else
    echo "   Tokens are different"
    echo "   First 50 chars same? ${TOKEN1:0:50} vs ${TOKEN2:0:50}"
fi

# 4. Save to files for manual inspection
echo "$TOKEN1" > token1.txt
echo "$TOKEN2" > token2.txt
echo -e "\nTokens saved to token1.txt and token2.txt"
