import {Component} from '@wonderlandengine/api';
import {vec3} from 'gl-matrix';
import {typename} from '../../constants.js';

/**
 * Direction type for Keyboard Inputs.
 */
type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * KeyMap for Keyboard Inputs.
 * If keys need to change or be added in the future, change here.
 *
 * @remarks
 * Because KeyboardEvent.code is used there is no need to worry about keyboard layout.
 * For example: KeyW is always Up, no matter if the keyboard is QWERTY or AZERTY.
 */
/* eslint-disable */ // Disable ESLint because of KeyboardEvent.code starts with Capital Letter
const keyMap: {[key: string]: Direction} = {
    ArrowUp: 'up',
    KeyW: 'up',
    ArrowRight: 'right',
    KeyD: 'right',
    ArrowDown: 'down',
    KeyS: 'down',
    ArrowLeft: 'left',
    KeyA: 'left',
};
/* eslint-enable */

/**
 * FPS type movement with WASD keys based on Physx.
 *
 * @remarks
 * The component is dependent on an {@link PhysXComponent} component on the same object.
 *
 * Physx Component Settings:
 * - Shape: Sphere
 * - linearDamping: 5
 * - angularDamping: 5
 * - lock all angularAxis except for Y (For rotation torque ability)(Can be disabled if you don't want Rotation)
 */
export class ControlsKeyboard extends Component {
    static TypeName = typename('controls-keyboard');

    private up = false;
    private right = false;
    private down = false;
    private left = false;
    private direction: vec3 = [0, 0, 0];
    private wasMoving = false;

    init() {
        this.up = false;
        this.right = false;
        this.down = false;
        this.left = false;
    }

    getAxis(): vec3 {
        return this.direction;
    }

    onActivate(): void {
        // Set Keyboard Inputs Listeners
        window.addEventListener('keydown', this.pressKeyboard);
        window.addEventListener('keyup', this.releaseKeyboard);
    }

    onDeactivate(): void {
        // Remove Keyboard Inputs Listeners
        window.removeEventListener('keydown', this.pressKeyboard);
        window.removeEventListener('keyup', this.releaseKeyboard);
    }

    update() {
        // do not move if no input
        if (!this.up && !this.down && !this.left && !this.right) {
            if (this.wasMoving) {
                this.direction = [0, 0, 0];
                this.wasMoving = false;
            }
            return;
        }
        this.wasMoving = true;

        this.direction = [0, 0, 0];

        if (this.up) {
            this.direction[2] = -1.0;
        }
        if (this.down) {
            this.direction[2] = 1.0;
        }
        if (this.left) {
            this.direction[0] = -1.0;
        }
        if (this.right) {
            this.direction[0] = 1.0;
        }
    }

    private pressKeyboard = (input: KeyboardEvent) => {
        const direction = keyMap[input.code];

        if (direction) {
            this[direction] = true;
        }
    };

    private releaseKeyboard = (input: KeyboardEvent) => {
        const direction = keyMap[input.code];

        if (direction) {
            this[direction] = false;
        }
    };
}
