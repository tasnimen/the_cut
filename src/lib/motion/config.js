export const motionDuration = Object.freeze({
  fast: 0.16,
  standard: 0.28,
  deliberate: 0.52,
});

export const motionEase = Object.freeze({
  standard: [0.22, 1, 0.36, 1],
  emphasized: [0.16, 1, 0.3, 1],
});

export const motionTransition = Object.freeze({
  duration: motionDuration.deliberate,
  ease: motionEase.standard,
});

export const revealVariants = Object.freeze({
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
});
