import sys
from base64 import b64encode
import hashlib
import struct

def find_program_address(seeds, program_id):
    """Find a valid program address for the given seeds and program ID."""
    max_nonce = 255
    for nonce in range(max_nonce):
        seed_bytes = b''.join(seeds)
        if nonce != 0:
            seed_bytes += bytes([nonce])
        h = hashlib.sha256(seed_bytes + bytes.fromhex(program_id)).digest()
        if h[31] == 0:  # Check if the last byte is 0
            return h[:32].hex(), nonce
    raise ValueError("Unable to find a valid program address")

def main():
    if len(sys.argv) < 4:
        print("Usage: python derive_pda.py <seed_prefix> <pubkey> <program_id>")
        return
    
    seed_prefix = sys.argv[1]
    pubkey = sys.argv[2]
    program_id = sys.argv[3]
    
    seeds = [seed_prefix.encode(), bytes.fromhex(pubkey)]
    try:
        address, nonce = find_program_address(seeds, program_id)
        print(address)
    except ValueError as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
