import {vec3, quat} from 'gl-matrix';
import {Component, Emitter, Object3D, PhysXComponent} from '@wonderlandengine/api';
import {property} from '@wonderlandengine/api/decorators.js';

import {Interactor} from './interactor.js';
import {Interactable} from './interactable.js';
import {HistoryTracker} from '../history-tracker.js';
import {quatDelta} from '../utils/math.js';

/** Temporary info about grabbed target. */
interface GrabData {
    interactor: Interactor;
    offsetTrans: vec3;
    offsetRot: quat;
}

/** Temporaries. */
const _pointA = vec3.create();
const _pointB = vec3.create();
const _vectorA = vec3.create();
const _quatA = quat.create();
const _quatB = quat.create();

/**
 * Grabbable object.
 */
export class Grabbable extends Component {
    /** @override */
    static TypeName = 'grabbable';

    /** Properties. */

    /**
     * Main handle.
     *
     * This is an Object3D containing an {@link Interactable} component.
     */
    @property.object()
    public handle: Object3D = null!;

    /**
     * Secondary handle.
     *
     * This handle is optional.
     *
     * This is an Object3D containing an {@link Interactable} component.
     */
    @property.object()
    public handleSecondary: Object3D = null!;

    /**
     * Whether the object can be thrown with physics or not.
     *
     * When the interactor releases this grabbable, it will be thrown based on
     * the velocity the interactor had.
     */
    @property.bool(true)
    public canThrow = true;

    /**
     * Linear multiplier for the throwing speed.
     *
     * By default, throws at the controller speed.
     */
    @property.float(1.0)
    public throwLinearIntensity = 1.0;

    /**
     * Linear multiplier for the throwing angular  speed.
     *
     * By default, throws at the controller speed.
     */
    @property.float(1.0)
    public throwAngularIntensity = 1.0;

    /**
     * If `true`, the grabbable will be updated based on the controller
     * velocity data, if available.
     *
     * When `false`, the linear and angular velocities will be emulated based on
     * the grabbable previous orientation and position.
     *
     * For more information, please have a look at:
     * - [linearVelocity](https://developer.mozilla.org/en-US/docs/Web/API/XRPose/linearVelocity)
     * - [angularVelocity](https://developer.mozilla.org/en-US/docs/Web/API/XRPose/angularVelocity)
     */
    @property.bool(true)
    public useControllerVelocityData = true;

    @property.object()
    public distanceMarker: Object3D | null = null;

    /**
     * The index of the handle to use when distance-grabbed.
     *
     * Use `0` for {@link handle} and `1` for {@link handleSecondary}.
     */
    @property.int(0)
    public distanceHandle = 0;

    /** Private Attributes. */

    /** Cached interactables. @hidden */
    private _interactable: Interactable[] = new Array<Interactable>(2);
    /** Cached currently grabbed data. @hidden */
    private _grabData: (GrabData | null)[] = new Array<GrabData>(2);
    /** Squared distance between both handle cached when starting a double grab. */
    private _maxSqDistance: number | null = null;

    /** @hidden */
    private _history: HistoryTracker = new HistoryTracker();

    /** @hidden */
    private _physx: PhysXComponent | null = null;

    /** @hidden */
    private _enablePhysx = false;

    /** Notified when an interactable is grabbed. @hidden */
    private readonly _onGrabStart: Emitter<[Interactor, Interactable, this]> =
        new Emitter();
    /** Notified when an interactable is released. @hidden */
    private readonly _onGrabEnd: Emitter<[Interactor, Interactable, this]> = new Emitter();

    /** @hidden */
    start(): void {
        if (!this.handle) {
            throw new Error('Grabbable.start(): `handle` property must be set.');
        }

        this._interactable[0] = this.handle.getComponent(Interactable)!;
        if (!this._interactable[0]) {
            throw new Error(
                `Grabbable.start(): 'handle' must have an Interactable component.`
            );
        }

        /* The second handle is optional. */
        if (this.handleSecondary) {
            this._interactable[1] = this.handleSecondary.getComponent(Interactable)!;
            if (!this._interactable[1]) {
                throw new Error(
                    `Grabbable.start(): 'handleSecondary' must have an Interactable component.`
                );
            }
        }
        this._physx = this.object.getComponent('physx');
    }

    /** @overload */
    onActivate(): void {
        for (let i = 0; i < 2; ++i) {
            const interactable = this._interactable[i];
            if (!interactable) {
                continue;
            }
            interactable.onSelectStart.add(this.grab);
            interactable.onSelectEnd.add(this.release);
        }
        this._enablePhysx = this._physx?.active ?? false;
    }

    /** @overload */
    onDeactivate(): void {
        for (let i = 0; i < 2; ++i) {
            const interactable = this._interactable[i];
            if (!interactable) {
                continue;
            }
            interactable.onSelectStart.remove(this.grab);
            interactable.onSelectEnd.remove(this.release);
        }
    }

    /** @overload */
    update(dt: number): void {
        if (!this.isGrabbed) {
            return;
        }

        let anyGrab: GrabData | null = null;

        if (this.primaryGrab && this.secondaryGrab) {
            anyGrab = this.primaryGrab;
            this._updateTransformDoubleHand();
        } else {
            const index = this.primaryGrab ? 0 : 1;
            anyGrab = this._grabData[index];
            this._updateTransformSingleHand(index);
        }

        const xrPose = anyGrab!.interactor.xrPose;
        if (xrPose && this.useControllerVelocityData) {
            this._history.updateFromPose(xrPose, this.object, dt);
        } else {
            this._history.update(this.object, dt);
        }
    }

    enablePhysx() {
        if (this._physx) {
            this._physx.active = this._enablePhysx;
        }
    }

    disablePhysx() {
        if (this._physx) {
            this._physx.active = false;
        }
    }

    /**
     * Throws the grabbable.
     *
     * @returns
     */
    throw(): void {
        if (!this._physx) {
            return;
        }

        const angular = this._history.angular(vec3.create());
        vec3.scale(angular, angular, this.throwAngularIntensity);

        const radius = vec3.create();
        // @todo: How to deal with that for 2 hands?
        vec3.subtract(
            radius,
            this.object.getPositionWorld(),
            this._interactable[0].object.getPositionWorld()
        );

        const velocity = this._history.velocity(vec3.create());
        vec3.add(velocity, velocity, vec3.cross(vec3.create(), angular, radius));
        vec3.scale(velocity, velocity, this.throwLinearIntensity);

        this._physx.active = true;
        this._physx.linearVelocity = velocity;
        this._physx.angularVelocity = angular;
    }

    /**
     * Programmatically grab an interactable.
     *
     * @note The interactable must be one of {@link Grabbable.handle}
     * or {@link Grabbable.handleSecondary}.
     *
     * @note This method is useful for grab emulation for non-VR applications.
     * In general, you will not call this method but rather rely on collision
     * checks between the {@link Interactor} and the {@link Interactable}.
     *
     * @param interactor The interactor issuing the interaction.
     * @param interactable The interactable undergoing the action.
     */
    grab = (interactor: Interactor, interactable: Interactable) => {
        const index = this._interactable.indexOf(interactable);
        if (this._grabData[index]) {
            return;
        }

        const grab: GrabData = {
            interactor,
            offsetTrans: vec3.create(),
            offsetRot: quat.create(),
        };

        /** Compute the offset between the interactable and this grabbable. */
        interactable.object.getPositionLocal(grab.offsetTrans);
        vec3.scale(grab.offsetTrans, grab.offsetTrans, -1);

        if (interactable.shouldSnap) {
            interactable.object.getRotationLocal(grab.offsetRot);
        } else {
            /* Compute the delta rotation between the interactable and the grabbable. */
            quatDelta(
                grab.offsetRot,
                grab.interactor.object.getRotationWorld(_quatA),
                this.object.getRotationWorld(_quatB)
            );
        }

        this._grabData[index] = grab;
        this._history.reset(this.object);
        if (this._physx) {
            this._physx.active = false;
        }

        if (this.primaryGrab && this.secondaryGrab) {
            /* Cache the grabbing distance between both handles. */
            this._maxSqDistance = vec3.squaredDistance(
                this._interactable[0].object.getPositionWorld(_pointA),
                this._interactable[1].object.getPositionWorld(_pointB)
            );
        }

        this._grabbed(interactor, interactable);
    };

    /**
     * Programmatically release an interactable.
     *
     * @note The interactable must be one of {@link Grabbable.handle}
     * or {@link Grabbable.handleSecondary}.
     *
     * @note This method is useful for grab emulation for non-VR applications.
     * In general, you will not call this method but rather rely on collision
     * checks between the {@link Interactor} and the {@link Interactable}.
     *
     * @param interactor The interactor issuing the interaction.
     * @param interactable The interactable undergoing the action.
     */
    release = (interactor: Interactor, interactable: Interactable | number) => {
        const index =
            typeof interactable === 'number'
                ? interactable
                : this._interactable.indexOf(interactable);
        const grab = this._grabData[index];
        if (!grab || interactor !== grab.interactor) {
            return;
        }

        const secondaryGrab = index === 0 ? this._grabData[1] : this._grabData[0];
        if (secondaryGrab) {
            /* Compute the delta rotation between the interactable and the grabbable. */
            quatDelta(
                secondaryGrab.offsetRot,
                secondaryGrab.interactor.object.getRotationWorld(_quatA),
                this.object.getRotationWorld(_quatB)
            );
        }

        this._grabData[index] = null;
        this._maxSqDistance = null;

        if (this.canThrow && !this.isGrabbed) {
            this.throw();
        }

        this._released(interactor, this._interactable[index]);
    };

    /**
     * Get the {@link Interactable} stored at the given index.
     *
     * Use `0` for {@link handle} and `1` for {@link handleSecondary}.
     *
     * @note This method returns `undefined` for anything outside the range [0; 1].
     *
     * @param index The index to retrieve
     * @returns The interactable.
     */
    getInteractable(index: number): Interactable {
        return this._interactable[index];
    }

    /** `true` is any of the two handles is currently grabbed. */
    get isGrabbed(): boolean {
        return !!this.primaryGrab || !!this.secondaryGrab;
    }

    /** `true` if the primary handle is grabbed, the object pointer by {@link handle}. */
    get primaryGrab(): GrabData | null {
        return this._grabData[0];
    }

    /** `true` if the secondary handle is grabbed, the object pointer by {@link handleSecondary}. */
    get secondaryGrab(): GrabData | null {
        return this._grabData[1];
    }

    /** Notified on a select start. */
    get onGrabStart(): Emitter<[Interactor, Interactable, this]> {
        return this._onGrabStart;
    }

    /** Notified on a select end. */
    get onGrabEnd(): Emitter<[Interactor, Interactable, this]> {
        return this._onGrabEnd;
    }

    /**
     * Called just after the interactable is grabbed.
     *
     * @param interactable The grabbed interactable.
     *
     * @hidden
     */
    protected _grabbed(interactor: Interactor, interactable: Interactable) {
        this._onGrabStart.notify(interactor, interactable, this);
    }

    /**
     * Called just after the interactable is released.
     *
     * @param interactable The released interactable.
     *
     * @hidden
     */
    protected _released(interactor: Interactor, interactable: Interactable) {
        this._onGrabEnd.notify(interactor, interactable, this);
    }

    /**
     * Compute the transform of this grabbable based on a single handle.
     *
     * @param index The index of the handle to update the transform from.
     *
     * @hidden
     */
    private _updateTransformSingleHand(index: number) {
        const grab = this._grabData[index]!;
        const interactor = grab.interactor;
        // const interactable = this._interactable[index];

        const rotation = quat.copy(quat.create(), interactor.object.getRotationWorld());
        quat.multiply(rotation, rotation, grab.offsetRot);

        this.object.resetRotation();
        this.object.setRotationWorld(rotation);
        // this.object.rot(grab.offsetRot);

        const world = interactor.object.getPositionWorld(vec3.create());
        this.object.setPositionWorld(world);
        this.object.translateObject(grab.offsetTrans);
    }

    /**
     * Compute the transform of this grabbable based on both handles.
     *
     * @hidden
     */
    private _updateTransformDoubleHand() {
        const primaryGrab = this._grabData[0] as GrabData;
        const primaryInteractor = primaryGrab.interactor;
        const secondaryInteractor = this._grabData[1]!.interactor;

        const primaryWorld = primaryInteractor.object.getPositionWorld(_pointA);
        const secondaryWorld = secondaryInteractor.object.getPositionWorld(_pointB);

        const squaredDistance = vec3.squaredDistance(primaryWorld, secondaryWorld);
        if (squaredDistance > this._maxSqDistance! * 2.0) {
            /* Hands are too far apart, release the second handle. */
            this.release(secondaryInteractor, 1);
            return;
        }

        this.object.setPositionWorld(primaryWorld);
        this.object.translateObject(primaryGrab.offsetTrans);

        /* Rotate the grabbable from first handle to secondary. */
        const dir = vec3.subtract(_vectorA, secondaryWorld, primaryWorld);
        vec3.normalize(dir, dir);
        vec3.scale(dir, dir, 100.0);
        this.object.lookAt(vec3.add(primaryWorld, primaryWorld, dir));
    }
}
