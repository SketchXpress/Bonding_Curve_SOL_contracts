import React from 'react';
import { Button, ButtonProps } from '@mui/material';

interface ActionButtonProps extends ButtonProps {
  loading?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({ 
  loading, 
  children, 
  disabled,
  ...props 
}) => {
  return (
    <Button
      {...props}
      disabled={loading || disabled}
      variant="contained"
    >
      {loading ? 'Processing...' : children}
    </Button>
  );
};
