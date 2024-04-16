import {Component, Property} from '@wonderlandengine/api';
import {CursorTarget} from '@wonderlandengine/components';
import {networkManager} from '@wonderlandcloud/client';

/**
 * radio-toggle
 */
export class RadioToggle extends Component {
    static TypeName = 'radio-toggle';
    /* Properties that are configurable in the editor */
    static Properties = {
        param: Property.float(1.0)
    };

    start() {
        const target = this.object.getComponent(CursorTarget);
        target.onClick.add(() => {
            console.log("Toggling radio.");
            networkManager.client.sendViaWs({
                type: 'radio-toggle',
                data: {}
            });
        });
    }
}
