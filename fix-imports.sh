#!/bin/bash

echo "Fixing duplicate imports and 'use client' issues..."

# Fix the specific files mentioned in the error
files=(
    "src/hooks/useBuyNft.ts"
    "src/hooks/useCreateCollectionNft.ts" 
    "src/hooks/useNftTransactions.ts"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "Processing $file..."
        
        # Create backup
        cp "$file" "$file.bak"
        
        # Remove any auto-generated Next.js comments that might contain imports
        sed 's/\/\* __next_internal_client_entry_do_not_use__.*\*\/ *//g' "$file.bak" > "$file.temp1"
        
        # Remove duplicate 'use client' directives
        awk '!seen[$0]++ || $0 !~ /^'"'"'use client'"'"';/' "$file.temp1" > "$file.temp2"
        
        # Ensure 'use client' is at the top if it's not already
        if ! head -1 "$file.temp2" | grep -q "'use client'"; then
            echo "'use client';" > "$file"
            echo "" >> "$file"
            cat "$file.temp2" >> "$file"
        else
            cp "$file.temp2" "$file"
        fi
        
        # Clean up temp files
        rm "$file.temp1" "$file.temp2" "$file.bak"
        
        echo "Fixed $file"
    else
        echo "File $file not found"
    fi
done

echo "Import fixing complete."
