// Store the original console.warn
const originalWarn = console.warn;

// Replace with filtered version
console.warn = function() {
  // Convert arguments to string for checking
  const warningText = Array.from(arguments).join(' ');
  
  // Skip bigint binding warnings
  if (warningText.includes('bigint: Failed to load bindings')) {
    return;
  }
  
  // Pass through all other warnings
  return originalWarn.apply(console, arguments);
};

// Load the actual server
require('./server.js');
