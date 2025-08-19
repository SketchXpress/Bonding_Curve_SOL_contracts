import React from 'react';
import { Card, CardContent, CardHeader } from '@mui/material';

interface BaseCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const BaseCard: React.FC<BaseCardProps> = ({ title, children, className }) => {
  return (
    <Card className={className}>
      <CardHeader title={title} />
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
};
