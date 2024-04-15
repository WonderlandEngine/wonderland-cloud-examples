/** Epsilon floating point value. */
export const EPSILON = 0.000001;

/**
 * Format component typename with the interaction library prefix.
 *
 * @param name The name to format.
 * @returns The formatted name.
 */
export function typename(name: string) {
  return `wlei:${name}`;
}
