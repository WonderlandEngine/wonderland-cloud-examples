import {Component, PhysXComponent} from '@wonderlandengine/api';
import {typename} from '../../constants.js';
import {vec3} from 'gl-matrix';
import {ActiveCamera} from '../helpers/active-camera.js';
import {LocomotionSelector} from './locomotion-selector.js';

const tempCameraVec = vec3.create();
const tempPlayerVec = vec3.create();

/**
 * This component is attached to the player object and is responsible for
 * controlling the player's movement.
 *
 * It needs to have a physx component attached to it. And be on the root of the
 * player hierarchy.
 *
 * The player-controller is the main component for controlling the player's movement and
 * uses other components to implement the various things.
 *
 *
 * @see {@link InputBridge} for handling input from various input providers
 * @see {@link LocomotionSelector} for selecting the type of locomotion to use
 * @see {@link TeleportLocomotion} for teleport locomotion
 * @see {@link SmoothLocomotion} for smooth locomotion
 * @see {@link PlayerRotate} for rotating the player
 * @see {@link HeadCollissionMove} for pushing the player backwards when their head collides with a wall / object
 * @see {@link HeadCollissionFade} for fading to black when the player's head collides with a wall / object
 */
export class PlayerController extends Component {
    static TypeName = typename('player-controller');

    private physxComponent!: PhysXComponent;
    private headForward: vec3 = [0, 0, 0];
    private activeCamera!: ActiveCamera;
    private isRotating = false;
    private locomotionSelector!: LocomotionSelector;

    start() {
        const tempPhysx = this.object.getComponent(PhysXComponent);
        if (!tempPhysx) {
            throw new Error(
                `player-controller(${this.object.name}): object does not have a Physx`
            );
        }
        this.physxComponent = tempPhysx;

        const tempActiveCamera = this.object.getComponent(ActiveCamera);
        if (!tempActiveCamera) {
            throw new Error(
                `player-controller(${this.object.name}): object does not have a ActiveCamera`
            );
        }
        this.activeCamera = tempActiveCamera;

        const tempLocomotionSelector = this.object.getComponent(LocomotionSelector);
        if (!tempLocomotionSelector) {
            throw new Error(
                `player-controller(${this.object.name}): object does not have a LocomotionSelector`
            );
        }
        this.locomotionSelector = tempLocomotionSelector;

        this.physxComponent.kinematic = this.locomotionSelector.isKinematic;
    }

    /**
     * Queues a function to be executed on the next update.
     * This way we can can set kinematic mode and disable it the next frame.
     */
    private queue = new Array<() => void>();

    update(): void {
        const exec = this.queue.shift(); // get the first item from the queue
        if (exec) {
            exec();
            return;
        }
    }

    /**
     * Moves the player in the given direction.
     * @param movement The direction to move in.
     */
    move(movement: vec3) {
        if (this.isRotating || this.physxComponent.kinematic) {
            // for now, don't move while rotating or when kinematic is on.
            // Because we use physics to move, we need to switch to kinematic mode
            // during rotation.
            return;
        }

        // Move according to headObject Forward Direction
        const currentCamera = this.activeCamera.current;
        currentCamera.getForwardWorld(this.headForward);

        // Combine direction with headObject
        vec3.transformQuat(movement, movement, currentCamera.getTransformWorld());

        // Do not move on Y axis
        movement[1] = 0;

        // Add force to Physx Component to move the player
        this.physxComponent.addForce(movement);
    }

    /**
     * Rotates the player on the Y axis for the given amount of degrees.
     * Can be called every frame.
     */
    rotate(angle: number) {
        if (this.physxComponent.kinematic) {
            this.object.rotateAxisAngleDegObject([0, 1, 0], -angle);
        } else {
            this.queue.push(() => {
                this.isRotating = true;
                this.physxComponent.kinematic = true;
                this.object.rotateAxisAngleDegObject([0, 1, 0], -angle);
            });
            this.queue.push(() => {
                this.isRotating = false;
                this.physxComponent.kinematic = this.locomotionSelector.isKinematic;
            });
        }
    }

    /**
     * Sets the player's position and rotation.
     * @param location the location to move to
     * @param rotation the rotation to rotate to in radians
     */
    setPositionRotation(location: vec3, rotation: number) {
        this.object.resetRotation();
        this.object.rotateAxisAngleRadObject([0, 1, 0], rotation);

        // Correct for room scale
        this.activeCamera.getPositionWorld(tempCameraVec);
        this.object.getPositionWorld(tempPlayerVec);

        vec3.sub(tempPlayerVec, tempCameraVec, tempPlayerVec);
        tempPlayerVec[0] += location[0];
        tempPlayerVec[1] = location[1];
        tempPlayerVec[2] += location[2];

        this.object.setPositionWorld(location);
    }
}
