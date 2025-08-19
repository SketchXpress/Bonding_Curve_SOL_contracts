import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';

interface SolanaAddressFieldProps extends Omit<TextFieldProps, 'error' | 'helperText' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

export const SolanaAddressField: React.FC<SolanaAddressFieldProps> = ({
  value,
  onChange,
  ...props
}) => {
  const [error, setError] = React.useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Basic Solana address validation
    if (newValue && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(newValue)) {
      setError('Invalid Solana address format');
    } else {
      setError(null);
    }
  };

  return (
    <TextField
      {...props}
      value={value}
      onChange={handleChange}
      error={!!error}
      helperText={error}
      fullWidth
    />
  );
};
