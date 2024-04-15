import {Component, Object3D} from '@wonderlandengine/api';
import {property} from '@wonderlandengine/api/decorators.js';
import {vec3} from 'gl-matrix';
import {TouchUI} from './touch-ui.js';

/**
 * Controls the camera through touch movements on mobile devices.
 *
 * Efficiently implemented to affect object orientation only
 * when the touch moves.
 */
export class TouchLook extends Component {
    static TypeName = 'touch-look';

    @property.float(1)
    sensitivity = 1;

    @property.bool(true)
    enabled = true;

    @property.object({required: true})
    touchUIComponent!: Object3D;

    private currentRotationY = 0;
    private currentRotationX = 0;
    private rotationX = 0;
    private rotationY = 0;
    private origin = vec3.create();
    private parentOrigin = vec3.create();
    private touchUI!: TouchUI;

    init() {
        this.currentRotationY = 0;
        this.currentRotationX = 0;
        this.rotationX = 0;
        this.rotationY = 0;
        this.origin = vec3.create();
        this.parentOrigin = vec3.create();
    }

    start(): void {
        const tempTouchUI = this.touchUIComponent.getComponent(TouchUI);
        if (!tempTouchUI) {
            throw new Error(
                `touch-look(${this.object.name}): touchUIComponent does not have a TouchUI`
            );
        }
        this.touchUI = tempTouchUI;
    }

    update(delta: number): void {
        if (this.touchUI.active && this.touchUI.joystick2Value.isTouching) {
            this.rotationY = -this.touchUI.joystick2Value.x * this.sensitivity * delta;
            this.rotationX = -this.touchUI.joystick2Value.y * this.sensitivity * delta;

            this.currentRotationX += this.rotationX;
            this.currentRotationY += this.rotationY;

            /* 1.507 = PI/2 = 90° */
            this.currentRotationX = Math.min(1.507, this.currentRotationX);
            this.currentRotationX = Math.max(-1.507, this.currentRotationX);

            this.object.getPositionWorld(this.origin);

            const parent = this.object.parent;
            if (parent !== null) {
                parent.getPositionWorld(this.parentOrigin);
                vec3.subtract(this.origin, this.origin, this.parentOrigin);
            }

            this.object.resetPositionRotation();
            this.object.rotateAxisAngleRadLocal([1, 0, 0], this.currentRotationX);
            this.object.rotateAxisAngleRadLocal([0, 1, 0], this.currentRotationY);
            this.object.translateLocal(this.origin);
        }
    }
}
