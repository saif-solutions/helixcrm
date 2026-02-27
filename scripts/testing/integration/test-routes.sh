#!/bin/bash
echo "=== Testing Frontend Routes ==="

echo "1. Checking if all page files exist..."
if [ -f "apps/web/src/pages/DashboardPage.tsx" ]; then
  echo "✅ DashboardPage.tsx exists"
else
  echo "❌ DashboardPage.tsx missing"
fi

if [ -f "apps/web/src/pages/LeadsPage.tsx" ]; then
  echo "✅ LeadsPage.tsx exists"
else
  echo "❌ LeadsPage.tsx missing"
fi

if [ -f "apps/web/src/pages/ContactsPage.tsx" ]; then
  echo "✅ ContactsPage.tsx exists"
else
  echo "❌ ContactsPage.tsx missing"
fi

if [ -f "apps/web/src/pages/DealsPage.tsx" ]; then
  echo "✅ DealsPage.tsx exists"
else
  echo "❌ DealsPage.tsx missing"
fi

if [ -f "apps/web/src/pages/leads/NewLeadPage.tsx" ]; then
  echo "✅ NewLeadPage.tsx exists"
else
  echo "❌ NewLeadPage.tsx missing"
fi

if [ -f "apps/web/src/pages/leads/EditLeadPage.tsx" ]; then
  echo "✅ EditLeadPage.tsx exists"
else
  echo "❌ EditLeadPage.tsx missing"
fi

echo ""
echo "2. Checking App.tsx routes..."
if grep -q "path=\"deals\"" apps/web/src/App.tsx; then
  echo "✅ /deals route exists in App.tsx"
else
  echo "❌ /deals route missing in App.tsx"
fi

if grep -q "path=\"leads/new\"" apps/web/src/App.tsx; then
  echo "✅ /leads/new route exists in App.tsx"
else
  echo "❌ /leads/new route missing in App.tsx"
fi

if grep -q "path=\"leads/:id/edit\"" apps/web/src/App.tsx; then
  echo "✅ /leads/:id/edit route exists in App.tsx"
else
  echo "❌ /leads/:id/edit route missing in App.tsx"
fi

echo ""
echo "3. Checking sidebar navigation..."
if grep -q "to=\"/deals\"" apps/web/src/components/layout/Sidebar.tsx; then
  echo "✅ Deals link exists in Sidebar"
else
  echo "❌ Deals link missing in Sidebar"
fi

echo ""
echo "=== Test Complete ==="
