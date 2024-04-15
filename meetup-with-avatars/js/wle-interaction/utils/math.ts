import {quat} from 'gl-matrix';

/** Temporaries. */
const _quat = quat.create();

/**
 * Compute the delta between `src` and the `dst` quaternion.
 *
 * @param out The output.
 * @param src The source quaternion.
 * @param dst The destination quaternion.
 *
 * @returns The `out` parameter.
 */
export function quatDelta(out: quat, src: quat, dst: quat): quat {
    // Detla = to * inverse(from).
    quat.multiply(out, quat.invert(_quat, src), dst);
    return quat.normalize(out, out);
}
