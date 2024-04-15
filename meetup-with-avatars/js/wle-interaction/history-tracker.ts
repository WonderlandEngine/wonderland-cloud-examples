import {Object3D} from '@wonderlandengine/api';
import {quat, vec3} from 'gl-matrix';

/** Constants. */
const StackSize = 4;

/** Temporaries. */
const _vectorA = vec3.create();

/**
 * Angular and linear velocities history tracker.
 *
 * This helper allows to accumulate and smooth the velocities
 * over multiple frames.
 */
export class HistoryTracker {
    /* Private Attributes. */

    /** List of linear velocities. @hidden */
    private readonly _linear: vec3[] = new Array<vec3>(StackSize);
    /** List of angular velocities. @hidden */
    private readonly _angular: vec3[] = new Array<vec3>(StackSize);

    /** Current position in the ring buffer. @hidden */
    private _curr = -1;
    /** previous world space position of the object. @hidden */
    private _previousPosition: vec3 = vec3.create();
    /** previous world space rotation of the object. @hidden */
    private _previousRotation: quat = quat.create();

    constructor() {
        for (let i = 0; i < StackSize; ++i) {
            this._linear[i] = vec3.create();
            this._angular[i] = vec3.create();
        }
    }

    /**
     * Update the history with the given object.
     *
     * @param target The target object to update from.
     * @param delta The delta time.
     */
    update(target: Object3D, delta: number) {
        this._curr = (this._curr + 1) % StackSize;

        const linearOutput = this._linear[this._curr];
        const angularOutput = this._angular[this._curr];
        this._updateLinear(linearOutput, target, delta);
        this._updateAngular(angularOutput, target, delta);
    }

    /**
     * Update the history with the given [XR pose](https://developer.mozilla.org/en-US/docs/Web/API/XRPose).
     *
     * @note Please use this when available, as the velocities from the pose might be more accurate.
     *
     * @param xrPose The XR pose.
     * @param target The object to get the velocity from, in case the XR pose doesn't expose any.
     * @param delta The delta time.
     */
    updateFromPose(xrPose: XRPose, target: Object3D, delta: number) {
        /* eslint-disable */
        // @ts-ignore Unfortunately, typings are outdated.
        const velocity: DOMPointReadOnly | null = xrPose.linearVelocity;
        // @ts-ignore Unfortunately, typings are outdated.
        const angular: DOMPointReadOnly | null = xrPose.angularVelocity;
        /* eslint-enable */
        this._curr = (this._curr + 1) % StackSize;
        const linearOutput = this._linear[this._curr];
        if (velocity) {
            linearOutput[0] = velocity.x;
            linearOutput[1] = velocity.y;
            linearOutput[2] = velocity.z;
        } else {
            this._updateLinear(linearOutput, target, delta);
        }

        const angularOutput = this._angular[this._curr];
        if (angular) {
            angularOutput[0] = angular.x;
            angularOutput[1] = angular.y;
            angularOutput[2] = angular.z;
        } else {
            this._updateAngular(angularOutput, target, delta);
        }
    }

    /**
     * Resets the history tracker.
     *
     * @note This method needs a target because it resets the history based on
     * the position of the target.
     *
     * @param target The object that was tracked.
     */
    reset(target: Object3D) {
        for (const v of this._linear) {
            vec3.zero(v);
        }
        for (const v of this._angular) {
            vec3.zero(v);
        }
        this._curr = -1;
        const position = target.getPositionWorld(_vectorA);
        vec3.copy(this._previousPosition, position);
    }

    /**
     * Computes the linear velocity based on the current history.
     *
     * @note This method isn't a simple getter and will perform computations,
     * please use only once per frame or after the object is moved.
     *
     * @param out The output velocity.
     * @returns The `out` parameter.
     */
    velocity(out: vec3 = vec3.create()): vec3 {
        vec3.zero(out);
        const count = this._linear.length;
        for (let i = 0; i < count; ++i) {
            vec3.add(out, out, this._linear[i]);
        }
        vec3.scale(out, out, 1.0 / count);
        return out;
    }

    /**
     * Computes the angular velocity based on the current history.
     *
     * @note This method isn't a simple getter and will perform computations,
     * please use only once per frame or after the object is rotated.
     *
     * @param out The output angular velocity.
     * @returns The `out` parameter.
     */
    angular(out: vec3): vec3 {
        vec3.zero(out);
        const count = this._angular.length;
        for (let i = 0; i < count; ++i) {
            vec3.add(out, out, this._angular[i]);
        }
        vec3.scale(out, out, 1.0 / count);
        return out;
    }

    /** @hidden */
    private _updateLinear(out: vec3, target: Object3D, delta: number): void {
        const position = target.getPositionWorld(_vectorA);
        vec3.subtract(out, position, this._previousPosition);
        vec3.scale(out, out, 1.0 / delta);
        vec3.copy(this._previousPosition, position);
    }

    /** @hidden */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private _updateAngular(out: vec3, target: Object3D, delta: number): void {
        /* @todo: Handle angular velocity. */
        // const worldRot = target.getRotationWorld(quat.create());
        // const deltaRot = quatDelta(quat.create(), this._previousRotation, worldRot);
    }
}
