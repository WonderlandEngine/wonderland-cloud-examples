import {Component, CollisionComponent, Emitter} from '@wonderlandengine/api';
import {property} from '@wonderlandengine/api/decorators.js';

import {Interactor} from './interactor.js';

/**
 * Base class for any interactable.
 *
 * Interactables are generic object that can react to interactors. As a developper,
 * you can attach multiple interactable components and listen for incoming events.
 *
 * An interactable isn't mapping one to one to a {@link Grabbable}. Grabbables
 * can point to one or more interactable used as "handles". This allows for
 * instance to double grab an object.
 */
export class Interactable extends Component {
    /** @overload */
    static TypeName = 'interactable';

    /** Properties. */

    /**
     * If `true`, this interactable should be snapped using its transform.
     *
     * As a example, the {@link Grabbable} component will use the transformation
     * of the object containing this interactable as an anchor point / rotation.
     */
    @property.bool(true)
    public shouldSnap = true;

    /** Private Attributes. */

    /** Notified when an interactor selects this interactable. @hidden */
    private readonly _onSelectStart: Emitter<[Interactor, this]> = new Emitter();
    /** Notified when an interactor stops selecting this interactable. @hidden */
    private readonly _onSelectEnd: Emitter<[Interactor, this]> = new Emitter();

    /** @overload */
    public start(): void {
        if (!this.object.getComponent(CollisionComponent)) {
            throw new Error('Interactable.start(): No collision component found.');
        }
    }

    /** Notified on a select start. */
    public get onSelectStart(): Emitter<[Interactor, this]> {
        return this._onSelectStart;
    }

    /** Notified on a select end. */
    public get onSelectEnd(): Emitter<[Interactor, this]> {
        return this._onSelectEnd;
    }
}
