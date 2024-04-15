import {Component} from '@wonderlandengine/api';
import {property} from '@wonderlandengine/api/decorators.js';
import {typename} from '../../constants.js';
import {SmoothLocomotion} from './smooth-locomotion.js';
import {TeleportLocomotion} from './teleport-locomotion.js';
import {LocomotionType} from './enums/LocomotionType.js';

/**
 * A component that allows easy selecting the type of locomotion to use.
 */

export class LocomotionSelector extends Component {
    static TypeName = typename('locomotion-selector');

    private static locomotionTypeMapping = ['Teleport', 'SmoothLocomotion', 'None'];

    @property.enum(
        LocomotionSelector.locomotionTypeMapping,
        LocomotionSelector.locomotionTypeMapping[LocomotionType.Teleport]
    )
    locomotionType = LocomotionType.Teleport;
    // get locomotionType(): LocomotionType {
    //     return this._locomotionType;
    // }
    // set locomotionType(value: LocomotionType) {
    //     if (this._locomotionType === value) {
    //         return;
    //     }
    //     this._locomotionType = value;
    //     this.setLocomotion();
    // }

    // /** @hidden */
    // private _locomotionType = LocomotionType.Teleport;

    private smoothLocomotion?: SmoothLocomotion | null;
    private teleportLocomotion?: TeleportLocomotion | null;

    public get isKinematic(): boolean {
        return this.locomotionType === LocomotionType.Teleport;
    }

    start(): void {
        const tempSmoothLocomotion = this.object.getComponent(SmoothLocomotion);
        if (!tempSmoothLocomotion) {
            console.warn(
                `player-controller(${this.object.name}): object does not have a SmoothLocomotion. To use smooth locomotion, make sure the component is on the ${this.object.name} object.`
            );
        }
        this.smoothLocomotion = tempSmoothLocomotion;

        const tempTeleportLocomotion = this.object.getComponent(TeleportLocomotion);
        if (!tempTeleportLocomotion) {
            console.warn(
                `player-controller(${this.object.name}): object does not have a TeleportLocomotion. To use teleport locomotion, make sure the component is on the ${this.object.name} object.`
            );
        }
        this.teleportLocomotion = tempTeleportLocomotion;

        this.setLocomotion();
    }

    private setLocomotion() {
        this.toggleTeleport(this.locomotionType === LocomotionType.Teleport);
        this.toggleSmoothLocomotion(this.locomotionType === LocomotionType.Smooth);
    }

    toggleSmoothLocomotion(enabled: boolean) {
        if (this.smoothLocomotion) {
            this.smoothLocomotion.active = enabled;
        } else {
            console.warn(
                `locomotion-selector(${this.object.name}) doesn't smoothLocomotion set.`
            );
        }
    }

    toggleTeleport(enabled: boolean) {
        if (this.teleportLocomotion) {
            this.teleportLocomotion.active = enabled;
        } else {
            console.warn(
                `locomotion-selector(${this.object.name}) doesn't teleportLocomotion set.`
            );
        }
    }
}
