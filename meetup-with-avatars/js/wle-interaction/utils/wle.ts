import {vec3, vec4} from 'gl-matrix';
import {MeshComponent, Object3D} from '@wonderlandengine/api';

/* Temporaries */
const _vectorA = vec3.create();
const _boundingSphere = vec4.create();

function joinBoundingSphere(out: vec4, other: vec4): vec4 {
    if (other[3] <= 0.00001) {
        return out;
    }

    if (other[3] <= 0.00001) {
        vec3.copy(out as vec3, other as vec3);
        return out;
    }

    /* Vector from this sphere to the other, used to translate the center. */
    const thisToOther = vec3.subtract(_vectorA, other as vec3, out as vec3);
    const distSq = vec3.dot(thisToOther, thisToOther);

    /* Case 1: Spheres are fully overlapping. */
    const thisRadius = out[3];
    const otherRadius = other[3];
    const radiusDiff = thisRadius - otherRadius;
    if (distSq <= radiusDiff * radiusDiff) {
        if (otherRadius > thisRadius) {
            vec4.copy(out, other);
        }
        return out;
    }
    /* Case 2: Apart or slightly overlapping. */
    const dist = Math.sqrt(distSq);
    const newRadius = (dist + thisRadius + otherRadius) * 0.5;

    vec3.scaleAndAdd(
        out as vec3,
        out as vec3,
        thisToOther,
        (newRadius - thisRadius) / dist
    );
    out[3] = newRadius;
    return out;
}

function radiusHierarchyRec(out: vec4, target: Object3D): vec4 {
    const children = target.children;
    for (const child of children) {
        radiusHierarchyRec(out, child);
    }

    const mesh = target.getComponent(MeshComponent);
    if (!mesh || !mesh.mesh) {
        return out;
    }

    mesh.mesh.getBoundingSphere(_boundingSphere);
    const worldScale = target.getScalingWorld();
    _boundingSphere[3] *= vec3.length(worldScale);
    joinBoundingSphere(out, _boundingSphere);

    return out;
}

/**
 * Compute the World Space radius of an Object3D hierarchy.
 *
 * @param object The root to start computing from.
 * @returns The world radius.
 */
export const radiusHierarchy = (function () {
    const temp = vec4.create();
    return function (object: Object3D): number {
        vec4.zero(temp);
        return radiusHierarchyRec(temp, object)[3];
    };
})();
