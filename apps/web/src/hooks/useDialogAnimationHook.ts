import * as React from 'react';
import { AnimationPhase } from '../components/molecules/Dialog/DialogBaseTypes';

/**
 * Hook for animation state management
 */
export const useDialogAnimationHook = (initialPhase: AnimationPhase = 'exited') => {
  const [animationPhase, setAnimationPhase] = React.useState<AnimationPhase>(initialPhase);
  const [isAnimating, setIsAnimating] = React.useState(false);

  const startAnimation = React.useCallback((phase: AnimationPhase) => {
    setAnimationPhase(phase);
    setIsAnimating(true);
  }, []);

  const endAnimation = React.useCallback((phase: AnimationPhase) => {
    setAnimationPhase(phase);
    setIsAnimating(false);
  }, []);

  const isEntering = React.useMemo(
    () => animationPhase === 'enter' || animationPhase === 'enter-active',
    [animationPhase]
  );

  const isExiting = React.useMemo(
    () => animationPhase === 'exit' || animationPhase === 'exit-active',
    [animationPhase]
  );

  const transitionClasses = React.useMemo(() => {
    const classes: string[] = ['transition-all', 'duration-200', 'ease-in-out'];

    if (isEntering) {
      classes.push('opacity-0', 'scale-95');
    } else if (isExiting) {
      classes.push('opacity-0', 'scale-95');
    } else {
      classes.push('opacity-100', 'scale-100');
    }

    return classes.join(' ');
  }, [isEntering, isExiting]);

  return {
    animationPhase,
    isAnimating,
    startAnimation,
    endAnimation,
    isEntering,
    isExiting,
    transitionClasses,
  };
};