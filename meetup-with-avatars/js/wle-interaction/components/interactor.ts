import {CollisionComponent, Component, Emitter, Scene} from '@wonderlandengine/api';
import {property} from '@wonderlandengine/api/decorators.js';

import {Interactable} from './interactable.js';

/** Handedness for left / right hands. */
export enum Handedness {
    Right = 'right',
    Left = 'left',
}
export const HandednessValues = Object.values(Handedness);

/**
 * An interactor represents a controller that can:
 *     - Grip {@link Interactable}
 *     - Trigger
 *
 * The interactor is most likely attached to the object onto which the
 * mesh controller is, but this is not mandatory.
 */
export class Interactor extends Component {
    /** @overload */
    static TypeName = 'interactor';

    /** Properties. */

    /**
     * If `true`, automatically setup events from gamepad.
     * Set this to `false` to use your own input mappings or
     * gamepad library.
     */
    @property.bool(true)
    public useDefaultInputs = true;

    /** Handedness value. Compare against {@link Handedness}. */
    @property.enum(HandednessValues, Handedness.Right)
    public handedness!: number;

    /** Private Attributes. */

    /** Collision component of this object. @hidden */
    private _collision: CollisionComponent = null!;
    /** Cached interactable after it's gripped. @hidden */
    private _interactable: Interactable | null = null;

    /** Previous loaded scene. @hidden */
    private _previousScene: Scene | null = null;

    /** Grip start emitter. @hidden */
    private readonly _onGripStart: Emitter<[Interactable]> = new Emitter();
    /** Grip end emitter. @hidden */
    private readonly _onGripEnd: Emitter<[Interactable]> = new Emitter();

    /** @hidden */
    private readonly _onPreRender = () => {
        if (
            this.engine.xr &&
            this.#xrInputSource &&
            this.#xrInputSource.gripSpace &&
            this.#referenceSpace
        ) {
            const pose = this.engine.xr.frame.getPose(
                this.#xrInputSource.gripSpace,
                this.#referenceSpace
            );
            this.#xrPose = pose ?? null;
        }
    };
    /** @hidden */
    private readonly _onSceneLoaded = () => {
        const scene = this.engine.scene;
        if (this._previousScene) {
            scene.onPreRender.remove(this._onPreRender);
            this.engine.onSceneLoaded.remove(this._onSceneLoaded);
        }
        this.engine.onSceneLoaded.add(this._onSceneLoaded);
        scene.onPreRender.add(this._onPreRender);
        this._previousScene = this.engine.scene;
    };

    /** @hidden */
    #xrInputSource: XRInputSource | null = null;
    /** @hidden */
    #referenceSpace: XRReferenceSpace | XRBoundedReferenceSpace | null = null;
    /** @hidden */
    #xrPose: XRPose | null = null;
    /** @hidden */
    #onSessionStart = this._startSession.bind(this);
    /** @hidden */
    #onSessionEnd = this._endSession.bind(this);

    /**
     * Set the collision component needed to perform
     * grab interaction
     *
     * @param collision The collision component
     *
     * @returns This instance, for chaining
     */
    start() {
        this._collision = this.object.getComponent('collision', 0)!;
        if (!this._collision) {
            throw new Error('grabber.start(): No collision component found');
        }

        this._onSceneLoaded();
    }

    /** @overload */
    onActivate(): void {
        this.engine.onXRSessionStart.add(this.#onSessionStart);
        this.engine.onXRSessionEnd.add(this.#onSessionEnd);
    }

    /** @overload */
    onDeactivate(): void {
        this.engine.onXRSessionStart.add(this.#onSessionStart);
        this.engine.onXRSessionEnd.add(this.#onSessionEnd);
    }

    /**
     * Force this interactor to start interacting with the given interactable.
     *
     * @param interactable - The interactable to process.
     */
    public startInteraction(interactable: Interactable) {
        this._interactable = interactable;
        interactable.onSelectStart.notify(this, interactable);
        this._onGripStart.notify(interactable);
    }

    /**
     * Check for nearby interactable, and notifies one if this interactor
     * interacts with it.
     */
    public checkForNearbyInteractables() {
        const overlaps = this._collision.queryOverlaps();
        for (const overlap of overlaps) {
            const interactable = overlap.object.getComponent(Interactable);
            if (interactable) {
                this.startInteraction(interactable);
                return;
            }
        }
    }

    /**
     * Force this interactor to stop interacting with the
     * currently bound interactable.
     */
    public stopInteraction() {
        if (this._interactable) {
            this._interactable.onSelectEnd.notify(this, this._interactable);
            this._onGripEnd.notify(this._interactable);
        }
        this._interactable = null;
    }

    /** Notified on a grip start. */
    get onGripStart(): Emitter<[Interactable]> {
        return this._onGripStart;
    }

    /** Notified on a grip end. */
    get onGripEnd(): Emitter<[Interactable]> {
        return this._onGripEnd;
    }

    /**
     * Current [XR pose](https://developer.mozilla.org/en-US/docs/Web/API/XRPose).
     *
     * @note This is only available when a session is started **and** during a frame, i.e.,
     * during the update phase.
     */
    get xrPose(): XRPose | null {
        return this.#xrPose;
    }

    /**
     * Current interactable handled by this interactor. If no interaction is ongoing,
     * this getter returns `null`.
     */
    get interactable(): Interactable | null {
        return this._interactable;
    }

    /** @hidden */
    private _startSession(session: XRSession) {
        this.#referenceSpace = this.engine.xr!.referenceSpaceForType('local');

        session.addEventListener('inputsourceschange', (event) => {
            for (const item of event.removed) {
                if (item === this.#xrInputSource) {
                    this.#xrInputSource = null;
                    break;
                }
            }
            const handedness = HandednessValues[this.handedness];
            for (const item of event.added) {
                if (item.handedness === handedness) {
                    this.#xrInputSource = item;
                    break;
                }
            }
        });

        if (!this.useDefaultInputs) {
            return;
        }

        session.addEventListener('selectstart', (event) => {
            if (this.#xrInputSource === event.inputSource) {
                this.checkForNearbyInteractables();
            }
        });
        session.addEventListener('selectend', (event) => {
            if (this.#xrInputSource === event.inputSource) {
                this.stopInteraction();
            }
        });
    }

    /** @hidden */
    private _endSession() {
        this.#referenceSpace = null;
        this.#xrInputSource = null;
        this.stopInteraction();
    }
}
