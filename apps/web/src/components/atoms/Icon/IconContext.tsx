import * as React from 'react';
import { IconProps } from './Icon.types';

export interface IconContextValue {
  defaultSize?: IconProps['size'];
  defaultColor?: IconProps['color'];
  defaultLibrary?: IconProps['library'];
  defaultVariant?: IconProps['variant'];
  iconPackUrl?: string;
}

export const IconContext = React.createContext<IconContextValue>({});

export const IconProvider: React.FC<{
  children: React.ReactNode;
  config?: IconContextValue;
}> = ({ children, config = {} }) => {
  return <IconContext.Provider value={config}>{children}</IconContext.Provider>;
};

export const useIconConfig = () => {
  return React.useContext(IconContext);
};
