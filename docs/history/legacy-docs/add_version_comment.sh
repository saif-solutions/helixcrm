#!/bin/bash
echo "í¶• Adding version comment to force cache refresh..."
cp apps/web/src/pages/ContactsPage.tsx apps/web/src/pages/ContactsPage.tsx.versioned

# Add a version comment at the top
sed -i '1s/^/\/\/ VERSION: 1.0.0 - FIXED HOOK ERROR - '$(date +%Y%m%d%H%M%S)'\n/' apps/web/src/pages/ContactsPage.tsx

echo "âœ… Added version: $(head -1 apps/web/src/pages/ContactsPage.tsx)"
