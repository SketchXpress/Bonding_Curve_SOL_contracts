#!/bin/bash

# Simple fix script to remove auto-generated Next.js comments and ensure 'use client' is first

echo "Fixing Next.js auto-generated comments and 'use client' placement..."

find src/hooks -name "*.ts" -type f | while read file; do
    echo "Processing $file..."
    
    # Create backup
    cp "$file" "$file.bak"
    
    # Step 1: Remove lines that contain the auto-generated comment (they may have imports on the same line)
    sed '/\/\* __next_internal_client_entry_do_not_use__.*\*\//d' "$file.bak" > "$file.temp1"
    
    # Step 2: Remove existing 'use client' directives  
    sed "/^'use client';/d" "$file.temp1" > "$file.temp2"
    
    # Step 3: Add 'use client' at the very top
    echo "'use client';" > "$file"
    echo "" >> "$file"
    cat "$file.temp2" >> "$file"
    
    # Clean up temp files
    rm "$file.temp1" "$file.temp2" "$file.bak"
    
    echo "Fixed $file"
done

echo "All TypeScript hook files have been processed."
