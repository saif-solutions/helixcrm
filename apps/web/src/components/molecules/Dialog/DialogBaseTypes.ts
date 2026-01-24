// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\Dialog\DialogBaseTypes.ts
import * as React from 'react';

// Core types that don't depend on other Dialog files
export type DialogEvent = React.MouseEvent | React.KeyboardEvent | MouseEvent | KeyboardEvent;

export type DialogSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';
export type DialogVariant =
  | 'default'
  | 'alert'
  | 'confirm'
  | 'form'
  | 'success'
  | 'error'
  | 'warning';
export type DialogPosition =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';
export type DialogAnimation =
  | 'fade'
  | 'slide'
  | 'scale'
  | 'none'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'shake';
export type AnimationPhase =
  | 'enter'
  | 'enter-active'
  | 'exit'
  | 'exit-active'
  | 'entered'
  | 'exited';

export interface DialogAction {
  id?: string;
  label: string;
  onClick?: (event?: React.MouseEvent) => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'error' | 'success' | 'warning';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  autoFocus?: boolean;
  icon?: React.ReactNode;
  'data-testid'?: string;
  'data-analytics'?: string;
}

export interface DialogRef extends HTMLDivElement {
  focusFirstElement: () => void;
  focusLastElement: () => void;
  announceToScreenReader: (message: string) => void;
  forceClose: () => void;
}
