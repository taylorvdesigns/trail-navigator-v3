import React from 'react';

interface MiddleCardProps {
  children: React.ReactNode;
}

export const MiddleCard: React.FC<MiddleCardProps> = ({ children }) => {
  return (
    <div className="middle-card">
      {children}
    </div>
  );
};
