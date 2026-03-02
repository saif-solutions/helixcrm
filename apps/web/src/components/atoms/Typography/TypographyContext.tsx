/* eslint-disable react-refresh/only-export-components */
import * as React from 'react';
import { TypographyVariant, TypographyColor, TypographyWeight } from './Typography.types';

/**
 * Typography component context for theming
 */
export interface TypographyContextValue {
  defaultVariant?: TypographyVariant;
  defaultColor?: TypographyColor;
  defaultWeight?: TypographyWeight;
}

export const TypographyContext = React.createContext<TypographyContextValue>({});

/**
 * TypographyProvider for setting defaults
 */
export const TypographyProvider: React.FC<{
  children: React.ReactNode;
  defaultVariant?: TypographyVariant;
  defaultColor?: TypographyColor;
  defaultWeight?: TypographyWeight;
}> = ({ children, defaultVariant, defaultColor, defaultWeight }) => {
  return (
    <TypographyContext.Provider value={{ defaultVariant, defaultColor, defaultWeight }}>
      {children}
    </TypographyContext.Provider>
  );
};

TypographyProvider.displayName = 'TypographyProvider';

/**
 * Hook to use typography context
 */
export const useTypographyContext = () => {
  return React.useContext(TypographyContext);
};