import { type Variants } from 'framer-motion';

export const FADE_IN_ANIMATION: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

export const SLIDE_UP_ANIMATION: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export const SLIDE_IN_RIGHT: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
};

export const SCALE_IN_ANIMATION: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
};

export const STAGGERED_ITEM_ANIMATION: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (custom: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: custom * 0.1, duration: 0.5 }
  }),
};

export const CELEBRATION_ANIMATION: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { 
    scale: 1.05, 
    opacity: 1,
    transition: { 
      duration: 0.5,
      type: "spring",
      stiffness: 400,
      damping: 10
    } 
  },
  exit: { 
    scale: 1,
    opacity: 0,
    transition: { duration: 0.2 }
  }
}; 