import {Component, InputComponent, Object3D} from '@wonderlandengine/api';
import {typename} from '../../constants.js';
import {property} from '@wonderlandengine/api/decorators.js';
import {mat4, vec3} from 'gl-matrix';
import {Handedness} from '../interactor.js';

const tempVectorAxisLeft = vec3.create();
const tempVectorAxisRight = vec3.create();

/**
 * Movement with VR controllers.
 *
 * Todo:
 * - Add button presses
 * - Add selection for the type of movements, like:
 *   - walk and rotate with both controller
 *   - walk and strafe with left, rotate with right
 */
export class ControlsVR extends Component {
    static TypeName = typename('controls-vr');

    @property.object({required: true})
    leftControlObject!: Object3D;

    @property.object({required: true})
    rightControlObject!: Object3D;

    @property.float(0.1)
    deadzoneThreshold = 0.1;

    private inputLeft!: InputComponent;
    private inputRight!: InputComponent;
    private axisLeft = vec3.create();
    private axisRight = vec3.create();
    private wasMoving = false;

    getAxisMove(): vec3 {
        return this.axisLeft;
    }

    getAxisRotation(): vec3 {
        return this.axisRight;
    }

    getObject(handedness: Handedness) {
        if (handedness === Handedness.Left) {
            return this.leftControlObject;
        } else {
            return this.rightControlObject;
        }
    }

    start() {
        const tempLeftInputComponent = this.leftControlObject.getComponent(InputComponent);
        if (!tempLeftInputComponent) {
            throw new Error(
                `controls-vr(${this.object.name}): leftControlObject does not have a InputComponent`
            );
        }
        this.inputLeft = tempLeftInputComponent;

        const tempRightInputComponent =
            this.rightControlObject.getComponent(InputComponent);
        if (!tempRightInputComponent) {
            throw new Error(
                `controls-vr(${this.object.name}): leftControlObject does not have a InputComponent`
            );
        }
        this.inputRight = tempRightInputComponent;
    }

    update() {
        // check if the controllers are connected
        if (
            !this.inputLeft.xrInputSource?.gamepad?.axes?.length ||
            !this.inputRight.xrInputSource?.gamepad?.axes?.length
        ) {
            if (this.wasMoving) {
                vec3.zero(this.axisLeft);
                vec3.zero(this.axisRight);
            }
            return;
        }

        // get the axes of the controllers
        tempVectorAxisLeft[0] = this.inputLeft.xrInputSource.gamepad.axes[2];
        tempVectorAxisLeft[2] = this.inputLeft.xrInputSource.gamepad.axes[3];
        if (
            Math.abs(tempVectorAxisLeft[0]) > this.deadzoneThreshold ||
            Math.abs(tempVectorAxisLeft[2]) > this.deadzoneThreshold
        ) {
            vec3.copy(this.axisLeft, tempVectorAxisLeft);
        } else {
            vec3.zero(this.axisLeft);
        }

        tempVectorAxisRight[0] = this.inputRight.xrInputSource.gamepad.axes[2];
        tempVectorAxisRight[2] = this.inputRight.xrInputSource.gamepad.axes[3];
        if (
            Math.abs(tempVectorAxisRight[0]) > this.deadzoneThreshold ||
            Math.abs(tempVectorAxisRight[2]) > this.deadzoneThreshold
        ) {
            vec3.copy(this.axisRight, tempVectorAxisRight);
        } else {
            vec3.zero(this.axisRight);
        }
    }
}
