import {Component, Object3D} from '@wonderlandengine/api';
import {property} from '@wonderlandengine/api/decorators.js';
import {typename} from '../../constants.js';
import {ControlsKeyboard} from './controls-keyboard.js';
import {vec3} from 'gl-matrix';
import {ControlsVR} from './controls-vr.js';
import {Handedness} from '../interactor.js';

/**
 * A proxy for handling input from various input providers, such as keyboard, mouse, touch,
 * VR controllers or game controllers.
 */
export class InputBridge extends Component {
    static TypeName = typename('input-bridge');

    private static movementAxis = vec3.create();
    private static rotationAxis = vec3.create();

    @property.object({required: true})
    inputs!: Object3D;

    private keyboardController?: ControlsKeyboard | null;
    private vrController?: ControlsVR | null;

    start(): void {
        this.keyboardController = this.inputs.getComponent(ControlsKeyboard);
        this.vrController = this.inputs.getComponent(ControlsVR);
    }

    getRotationAxis(): vec3 {
        vec3.zero(InputBridge.rotationAxis);

        if (this.vrController && this.vrController.active) {
            this.maxAbs(
                InputBridge.rotationAxis,
                InputBridge.rotationAxis,
                this.vrController.getAxisRotation()
            );
        }

        return InputBridge.rotationAxis;
    }

    getMovementAxis(): vec3 {
        vec3.zero(InputBridge.movementAxis);

        // determine the movement axis with the highest values
        if (this.keyboardController && this.keyboardController.active) {
            this.maxAbs(
                InputBridge.movementAxis,
                InputBridge.movementAxis,
                this.keyboardController.getAxis()
            );
        }

        if (this.vrController && this.vrController.active) {
            this.maxAbs(
                InputBridge.movementAxis,
                InputBridge.movementAxis,
                this.vrController.getAxisMove()
            );
        }

        return InputBridge.movementAxis;
    }

    /**
     * get the position of the VR controller
     * @param position the position to write to
     * @param handedness the handedness of the controller
     * @returns true if the controller is active, false otherwise
     */
    getControllerPosition(position: vec3, handedness: Handedness | null = null): boolean {
        if (this.vrController && this.vrController.active) {
            this.vrController
                .getObject(handedness ?? Handedness.Left)
                .getPositionWorld(position);
            return true;
        }
        return false;
    }

    getControllerForward(forward: vec3, handedness: Handedness | null = null): boolean {
        if (this.vrController && this.vrController.active) {
            this.vrController
                .getObject(handedness ?? Handedness.Left)
                .getForwardWorld(forward);
            return true;
        }
        return false;
    }

    private maxAbs(out: vec3, a: vec3, b: vec3) {
        const v1 = Math.abs(a[0]) + Math.abs(a[1]) + Math.abs(a[2]);
        const v2 = Math.abs(b[0]) + Math.abs(b[1]) + Math.abs(b[2]);

        if (v1 > v2) {
            return vec3.copy(out, a);
        }
        return vec3.copy(out, b);
    }
}
