export function shortenAddress(address) {
    return address.slice(0, 6) + '...' + address.slice(-4);
  }
  