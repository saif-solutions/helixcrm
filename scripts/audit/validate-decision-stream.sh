#!/bin/bash
# Validate that only ONE decision stream exists

echo "í´ Validating decision stream singularity..."
echo "========================================="

# Check root directory for multiple decision files
DECISION_FILES=$(find . -maxdepth 1 -name "DECISIONS*.md" | grep -v "DECISIONS.md" | wc -l)

if [ $DECISION_FILES -gt 0 ]; then
  echo "âŒ ERROR: Multiple decision stream files detected in root:"
  find . -maxdepth 1 -name "DECISIONS*.md" | grep -v "DECISIONS.md"
  echo ""
  echo "Only DECISIONS.md is allowed as the single decision stream."
  exit 1
fi

# Check for decision files in docs (outside archive)
OTHER_DECISIONS=$(find docs -maxdepth 2 -name "DECISIONS*.md" -not -path "docs/_archive/*" 2>/dev/null | wc -l)

if [ $OTHER_DECISIONS -gt 0 ]; then
  echo "âš ï¸  WARNING: Decision files found in docs (not in archive):"
  find docs -maxdepth 2 -name "DECISIONS*.md" -not -path "docs/_archive/*" 2>/dev/null
  echo ""
  echo "These should be moved to docs/_archive/history/YYYY/MM/decisions/"
  exit 1
fi

# Verify DECISIONS.md exists and has content
if [ ! -f "DECISIONS.md" ]; then
  echo "âŒ ERROR: DECISIONS.md not found in root"
  exit 1
fi

# Check for any archived decision files (should exist)
ARCHIVED_DECISIONS=$(find docs/_archive -name "DECISIONS*.md" 2>/dev/null | wc -l)
echo "í³‹ Found $ARCHIVED_DECISIONS archived decision files (expected)"

echo "âœ… Decision stream validation passed - single canonical DECISIONS.md"
exit 0
