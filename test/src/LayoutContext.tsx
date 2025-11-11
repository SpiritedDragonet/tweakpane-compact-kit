import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { LayoutPlan, buildPlan } from './layoutPlan';

interface LayoutContextType {
  layoutPlan: LayoutPlan | null;
  generateLayout: () => void;
  setLayoutPlan: (plan: LayoutPlan) => void;
}

const LayoutContext = createContext<LayoutContextType | null>(null);

export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [layoutPlan, setLayoutPlan] = useState<LayoutPlan | null>(null);

  const generateLayout = useCallback(() => {
    const plan = buildPlan();
    setLayoutPlan(plan);
  }, []);

  // Generate initial layout on mount
  useEffect(() => {
    generateLayout();
  }, [generateLayout]);

  return (
    <LayoutContext.Provider value={{ layoutPlan, generateLayout, setLayoutPlan }}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within LayoutProvider');
  }
  return context;
};