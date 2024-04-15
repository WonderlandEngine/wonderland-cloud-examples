import {Component, Object3D} from '@wonderlandengine/api';
import {property} from '@wonderlandengine/api/decorators.js';
import {vec3, quat} from 'gl-matrix';

const tempVec = vec3.create();
const tempQuat = quat.create();
const GlobalForward = vec3.fromValues(0, 0, 1);

const Axis = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
];

/**
 * copy-rotation
 */
export class CopyRotation extends Component {
    static TypeName = 'copy-rotation';

    /* Properties that are configurable in the editor */

    @property.enum(['x', 'y', 'z'])
    axis!: number;

    @property.object({required: true})
    other!: Object3D;

    update() {
        if (this.axis < 3) {
            this.other.getForwardWorld(tempVec);
            tempVec[this.axis] = 0;
            vec3.normalize(tempVec, tempVec);

            quat.rotationTo(tempQuat, GlobalForward, tempVec);

            this.object.setRotationWorld(tempQuat);
        } else {
            this.other.getRotationWorld(tempQuat);
            this.object.setRotationWorld(tempQuat);
        }
    }
}

export class CopyHeadNod extends Component {
    static TypeName = 'copy-head-nod';

    @property.object({required: true})
    other!: Object3D;

    update() {
        this.other.getRotationWorld(tempQuat);
        this.object.setRotationWorld(tempQuat);
        this.object.rotateAxisAngleDegObject(Axis[1], 180);
    }
}

export class CopyPosition extends Component {
    static TypeName = 'copy-position';

    /* Properties that are configurable in the editor */

    @property.float(0.0)
    offsetY!: number;

    @property.object({required: true})
    other!: Object3D;

    update() {
        this.other.getPositionWorld(tempVec);
        tempVec[1] += this.offsetY;
        this.object.setPositionWorld(tempVec);
    }
}
