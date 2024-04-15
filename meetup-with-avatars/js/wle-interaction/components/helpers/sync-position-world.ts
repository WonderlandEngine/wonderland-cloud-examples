import {Component, Object3D} from '@wonderlandengine/api';
import {property} from '@wonderlandengine/api/decorators.js';
import {vec3} from 'gl-matrix';

/**
 * Synchronise the world position of two Object3D instances,
 * making them stick together.
 */
export class SyncPositionWorld extends Component {
    static TypeName = 'sync-position-world';

    @property.object({required: true})
    target!: Object3D;

    #position = vec3.create();

    update() {
        this.target.getPositionWorld(this.#position);
        this.object.setPositionWorld(this.#position);
    }
}
