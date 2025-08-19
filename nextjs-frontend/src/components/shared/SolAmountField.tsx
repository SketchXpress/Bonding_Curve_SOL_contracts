import React from 'react';
import { TextField } from '@mui/material';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

interface SolAmountFieldProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
}

export const SolAmountField: React.FC<SolAmountFieldProps> = ({
  value,
  onChange,
  label = 'Amount (SOL)',
  placeholder = '0.0',
  disabled = false,
  min,
  max,
}) => {
  const [error, setError] = React.useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    
    if (isNaN(newValue)) {
      setError('Please enter a valid number');
      return;
    }

    if (min !== undefined && newValue < min) {
      setError(`Minimum amount is ${min} SOL`);
      return;
    }

    if (max !== undefined && newValue > max) {
      setError(`Maximum amount is ${max} SOL`);
      return;
    }

    setError(null);
    onChange(newValue * LAMPORTS_PER_SOL);
  };

  return (
    <TextField
      label={label}
      placeholder={placeholder}
      value={value / LAMPORTS_PER_SOL}
      onChange={handleChange}
      type="number"
      disabled={disabled}
      error={!!error}
      helperText={error}
      fullWidth
      InputProps={{
        endAdornment: 'SOL',
      }}
    />
  );
};
