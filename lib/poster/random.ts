// Deterministic pseudo-random numbers. The same seed string always produces
// the same sequence, so a cocktail's poster never changes between renders.

export type Random = {
  /** A float in [0, 1). */
  next(): number;
  /** A float in [min, max). */
  range(min: number, max: number): number;
  /** An integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  /** True with probability p. */
  chance(p: number): boolean;
  /** -1 or 1. */
  sign(): -1 | 1;
};

/** FNV-1a 32-bit hash. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32: small, fast and well distributed enough for generative art. */
export function createRandom(seed: string): Random {
  let state = hashString(seed);

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    chance: (p) => next() < p,
    sign: () => (next() < 0.5 ? -1 : 1),
  };
}
