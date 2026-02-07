#!/bin/bash
# Migration script to update tenant type imports

echo "Updating tenant type imports to use centralized tenant.types..."

# Create backup of modified files
BACKUP_DIR="./backup-tenant-imports-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Files that need updating (based on common patterns)
FILES_TO_UPDATE=$(find apps/api/src -name "*.ts" -type f -exec grep -l "from.*tenant.*interface" {} \; 2>/dev/null | grep -v node_modules)

for file in $FILES_TO_UPDATE; do
    echo "Updating: $file"
    
    # Create backup
    cp "$file" "$BACKUP_DIR/$(basename "$file").bak"
    
    # Update imports
    sed -i.bak \
        -e "s/from '\.\.\/tenant\/context\/tenant-context\.interface'/from '\.\.\/tenant\.types'/g" \
        -e "s/from '\.\/context\/tenant-context\.interface'/from '\.\.\/tenant\.types'/g" \
        -e "s/from '\.\.\/tenant\/context\/tenant-types\.interface'/from '\.\.\/tenant\.types'/g" \
        -e "s/from '\.\/context\/tenant-types\.interface'/from '\.\.\/tenant\.types'/g" \
        -e "s/import.*tenant-context\.interface.*/import { TenantContext, TenantContextOptions, ITenantContextService } from '..\/tenant.types';/g" \
        "$file"
    
    # Remove backup files created by sed
    rm -f "$file.bak"
done

echo ""
echo "Migration complete!"
echo "Backups saved to: $BACKUP_DIR"
echo ""
echo "Files updated:"
echo "$FILES_TO_UPDATE" | while read -r file; do
    echo "  - $file"
done