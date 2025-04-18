// This file re-exports the global anchor object as a module
// Since we're now loading main.js only after libraries are available,
// we can directly export from window.anchor

// Export the anchor object and its properties
export default window.anchor;
export const AnchorProvider = window.anchor.AnchorProvider;
export const Program = window.anchor.Program;
export const setProvider = window.anchor.setProvider;
export const spl = window.anchor.spl;
export const TOKEN_PROGRAM_ID = window.anchor.spl.TOKEN_PROGRAM_ID;
export const BN = window.anchor.BN;
export const web3 = window.anchor.web3;
export const utils = window.anchor.utils;
