import {Component} from '@wonderlandengine/api';
import {NetworkConfigurationComponent} from '@wonderlandcloud/client';

const MediaDevices = [];

/**
 * Show a selection of different audio input
 */
export class MicSelection extends Component {
    static TypeName = 'mic-selection';
    static Properties = {};

    start() {
        navigator.mediaDevices
            .enumerateDevices()
            .then((devices) => {
                devices.forEach((device) => {
                    console.log('Found', device);
                    if (device.kind === 'audioinput')
                        MediaDevices.push({id: device.deviceId, name: device.label});
                });
                this.addSelection();
            })
            .catch((err) => {
                console.error(`${err.name}: ${err.message}`, err);
            });
    }
    addSelection() {
        const HTML = `
            <select name="microphone" id="mic">
                ${MediaDevices.map(
                    (m) => `<option value="${m.id}">${m.name}</option>`
                ).join('\n')}
            </select>`;

        const div = document.createElement('div');
        div.innerHTML = HTML;
        div.style.position = 'absolute';
        div.style.width = '100%';
        div.style.top = 0;
        div.style.bottom = 0;
        div.style.left = 0;
        div.style.right = 0;
        div.style.margin = 'auto';
        div.style.pointerEvents = 'all';

        const button = document.createElement('button');
        button.innerHTML = 'Connect';
        button.onclick = this.onConnectClicked.bind(this);
        div.appendChild(button);

        const container = document.querySelector('.xr-button-container');
        container.appendChild(div);
    }

    onConnectClicked() {
        const e = document.getElementById('mic');
        const deviceId = e.value;

        const network = this.object.getComponent(NetworkConfigurationComponent);
        network.inputDeviceId = deviceId;
        network.connect();
    }
}
