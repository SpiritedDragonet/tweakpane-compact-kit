const POSITION_CLASSES = {
  veryfirst: 'tp-v-vfst',
  first: 'tp-v-fst',
  last: 'tp-v-lst',
  verylast: 'tp-v-vlst',
} as const;

type BladePosition = keyof typeof POSITION_CLASSES;

function updateBladePositionClasses(blade: any, el: HTMLElement) {
  (Object.values(POSITION_CLASSES) as string[]).forEach((className) => {
    el.classList.remove(className);
  });

  const positions = blade?.get?.('positions');
  if (!Array.isArray(positions)) {
    return;
  }

  positions.forEach((position) => {
    const className = POSITION_CLASSES[position as BladePosition];
    if (className) {
      el.classList.add(className);
    }
  });
}

export function bindBladePositionClasses(blade: any, el: HTMLElement): () => void {
  const positionsValue = blade?.value?.('positions');
  const emitter = positionsValue?.emitter;
  const onChange = () => {
    updateBladePositionClasses(blade, el);
  };

  updateBladePositionClasses(blade, el);

  try {
    emitter?.on?.('change', onChange);
  } catch {}

  return () => {
    try {
      emitter?.off?.('change', onChange);
    } catch {}
  };
}
