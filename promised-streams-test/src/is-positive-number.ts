export const isPositiveNumber = (i?: number): i is number => typeof i === 'number' && isFinite(i) && i >= 0
