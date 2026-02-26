#!/bin/bash
# CI check for archive immutability

echo "Ì¥ç CI Archive Immutability Check"
echo "================================="

# Check if any archived files were modified in this PR
if [ -n "$GITHUB_BASE_REF" ]; then
  # We're in a GitHub PR
  git fetch origin $GITHUB_BASE_REF
  MODIFIED_ARCHIVE=$(git diff --name-only origin/$GITHUB_BASE_REF..HEAD | grep "^docs/_archive/" | grep -v "\.meta\.json$" || true)
else
  # Local check - compare with main
  MODIFIED_ARCHIVE=$(git diff --name-only main..HEAD | grep "^docs/_archive/" | grep -v "\.meta\.json$" || true)
fi

if [ ! -z "$MODIFIED_ARCHIVE" ]; then
  echo "‚ùå ERROR: PR modifies immutable archived files:"
  echo "$MODIFIED_ARCHIVE"
  echo ""
  echo "Archived files are immutable by governance invariant G-02."
  echo "If you need to add historical content, create a NEW file with current timestamp."
  exit 1
fi

# Check for metadata consistency
echo "‚úÖ Archive immutability check passed"
exit 0
