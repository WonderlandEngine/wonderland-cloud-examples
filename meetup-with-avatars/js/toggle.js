import {Component, MeshComponent, Property} from '@wonderlandengine/api';
import {
    CursorTarget,
    MouseLookComponent,
    WasdControlsComponent,
} from '@wonderlandengine/components';

/**
 * toggle
 */
export class Toggle extends Component {
    static TypeName = 'toggle';
    /* Properties that are configurable in the editor */
    static Properties = {
        toggleMaterial: Property.material(),
        defaultMaterial: Property.material(),
        nonVrCamera: Property.object(),
        player: Property.object(),
    };

    start() {
        this.isToggled = true;
        this.mouseLookComp = this.nonVrCamera.getComponent(MouseLookComponent);
        this.wasdComp = this.player.getComponent(WasdControlsComponent);
        this.mesh = this.object.getComponent(MeshComponent);
        this.target =
            this.object.getComponent(CursorTarget) ||
            this.object.addComponent(CursorTarget);
        this.target.onDown.add(this.onDown);
    }

    /* Called by 'cursor-target' */
    onDown = (_) => {
        this.mouseLookComp.active = !this.mouseLookComp.active;
        this.wasdComp.active = !this.wasdComp.active;
        this.mesh.material = this.toggle();
    };

    toggle() {
        this.isToggled = !this.isToggled;
        return this.isToggled ? this.defaultMaterial : this.toggleMaterial;
    }
}
