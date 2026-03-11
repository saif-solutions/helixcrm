# Cleanup Inventory

## Manual Review Needed (Immediate Actions):

- [ ] Duplicate decorators: `shared/decorators/require-permission.decorator.ts` vs `shared/permissions/decorators/require-permission.decorator.ts`
- [ ] .old files: Find and remove `*.old.*` files
- [ ] Archive folders: `apps/web/archive` and `apps/web/src/pages/archive`
- [ ] Debug scripts: `apps/api/scripts/dev/*` and `apps/api/test-*.ts`

## Scan Results:

$(cat reports/knip-report.txt | grep -A 20 "Unused files" || echo "No unused files found")
$(cat reports/depcheck-report.txt | grep -A 10 "Unused" || echo "No unused deps found")
$(cat reports/circular-deps.txt || echo "No circular deps found")
