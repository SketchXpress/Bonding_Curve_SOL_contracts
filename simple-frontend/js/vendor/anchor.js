// This file re-exports the global anchor object as a module
// Wait for anchor to be available
function waitForAnchor() {
    return new Promise((resolve) => {
      if (window.anchor) {
        resolve(window.anchor);
      } else {
        // Check every 100ms if anchor is loaded
        const interval = setInterval(() => {
          if (window.anchor) {
            clearInterval(interval);
            resolve(window.anchor);
          }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(interval);
          console.error('Anchor library not loaded after timeout');
          resolve(null);
        }, 5000);
      }
    });
  }
  
  // Initialize exports
  let anchorInstance = null;
  let AnchorProvider = null;
  let Program = null;
  let setProvider = null;
  let spl = null;
  let TOKEN_PROGRAM_ID = null;
  let BN = null;
  let web3 = null;
  let utils = null;
  
  // Initialize the module
  waitForAnchor().then(anchor => {
    if (anchor) {
      anchorInstance = anchor;
      AnchorProvider = anchor.AnchorProvider;
      Program = anchor.Program;
      setProvider = anchor.setProvider;
      spl = anchor.spl;
      TOKEN_PROGRAM_ID = anchor.spl.TOKEN_PROGRAM_ID;
      BN = anchor.BN;
      web3 = anchor.web3;
      utils = anchor.utils;
      console.log('Anchor library loaded successfully');
    }
  });
  
  // Export with getters to ensure they're available when accessed
  export default { 
    get AnchorProvider() { return AnchorProvider; },
    get Program() { return Program; },
    get setProvider() { return setProvider; },
    get spl() { return spl; },
    get TOKEN_PROGRAM_ID() { return TOKEN_PROGRAM_ID; },
    get BN() { return BN; },
    get web3() { return web3; },
    get utils() { return utils; }
  };
  
  export { 
    AnchorProvider, 
    Program, 
    setProvider, 
    spl, 
    TOKEN_PROGRAM_ID, 
    BN, 
    web3, 
    utils 
  };
  