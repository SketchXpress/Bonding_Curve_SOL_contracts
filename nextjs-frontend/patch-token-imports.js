#!/usr/bin/env node

/**
 * Token Import Patch Script
 *
 * This script replaces @solana/spl-token imports with our centralized constants
 * to fix bundling issues that cause incorrect program IDs to be passed.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Patching token imports...');

// Recursively find all files
function findFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  let results = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && item !== 'node_modules' && item !== '.next') {
      results = results.concat(findFiles(fullPath, extensions));
    } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
      results.push(fullPath);
    }
  }

  return results;
}

const srcDir = path.join(__dirname, 'src');
const files = findFiles(srcDir);

let patchedFiles = 0;
let totalReplacements = 0;

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let modified = false;

  // Calculate relative path to solana-constants
  const relativePath = path.relative(path.dirname(filePath), path.join(srcDir, 'utils', 'solana-constants'))
    .replace(/\\/g, '/'); // Convert Windows paths to Unix style

  // Check if file contains problematic imports
  const hasProgramIdImports = content.includes('TOKEN_PROGRAM_ID') || content.includes('ASSOCIATED_TOKEN_PROGRAM_ID');
  const hasSpltokenImport = content.includes("from '@solana/spl-token'");

  // Skip the solana-constants file itself to avoid circular imports
  const isConstantsFile = filePath.includes('solana-constants');

  if (hasProgramIdImports && hasSpltokenImport && !isConstantsFile) {
    console.log(`Processing ${path.relative(__dirname, filePath)}...`);

    // Remove existing program ID imports from @solana/spl-token
    content = content.replace(
      /import\s*{\s*([^}]*)\s*}\s*from\s*['"]@solana\/spl-token['"];?\s*\n?/g,
      (match, imports) => {
        const importList = imports.split(',').map(imp => imp.trim()).filter(imp => imp);
        const nonProgramIds = importList.filter(imp =>
          !imp.includes('TOKEN_PROGRAM_ID') &&
          !imp.includes('ASSOCIATED_TOKEN_PROGRAM_ID')
        );

        if (nonProgramIds.length > 0) {
          return `import { ${nonProgramIds.join(', ')} } from '@solana/spl-token';\n`;
        }
        return '';
      }
    );

    // Add our centralized import at the top (after other imports)
    const importRegex = /^((?:import\s+.*?;\s*\n)*)/m;
    const match = content.match(importRegex);

    if (match) {
      const existingImports = match[1];
      const hasOurImport = existingImports.includes('solana-constants');

      if (!hasOurImport) {
        const newImports = existingImports + `import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '${relativePath}';\n`;
        content = content.replace(importRegex, newImports);
        modified = true;
        totalReplacements++;
      }
    }
  }

  // Write back if modified
  if (modified && content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    patchedFiles++;
    console.log(`✓ Patched ${path.relative(__dirname, filePath)}`);
  }
});

console.log(`\n🎉 Patch complete!`);
console.log(`📊 Files processed: ${files.length}`);
console.log(`📊 Files patched: ${patchedFiles}`);
console.log(`📊 Total replacements: ${totalReplacements}`);

if (patchedFiles > 0) {
  console.log('\n✅ Token import patching completed successfully!');
  console.log('The application should now use centralized program IDs consistently.');
} else {
  console.log('\n✨ No files needed patching - imports already clean!');
}
