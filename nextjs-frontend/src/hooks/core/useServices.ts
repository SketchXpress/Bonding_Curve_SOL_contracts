import { useEffect, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Program } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import { useAnchorProvider } from './useAnchorProvider';
import { Services } from '@/types/services';
import { BondingCurveSystemProgram } from '@/types/anchor';
import { initializeServices } from '@/services';
import { PROGRAM_ID } from '@/config/constants';

// Import your IDL
import IDL from '@/idl/bonding_curve_system.json';

export function useServices(): Services | null {
  const { connection } = useConnection();
  const provider = useAnchorProvider();
  const [services, setServices] = useState<Services | null>(null);

  useEffect(() => {
    if (provider && connection) {
      const program = new Program(
        IDL,
        new PublicKey(PROGRAM_ID),
        provider
      ) as BondingCurveSystemProgram;
      
      setServices(initializeServices(program, connection));
    }
  }, [provider, connection]);

  return services;
}
