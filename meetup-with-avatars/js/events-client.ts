import {Object3D, TextComponent, WonderlandEngine} from '@wonderlandengine/api';
import {property} from '@wonderlandengine/api/decorators.js';
import {
    networkManager,
    NetworkConfigurationComponent,
    NetworkedComponent,
    WonderlandWebsocketEvent
} from '@wonderlandcloud/client';
import {CopyRotation, CopyPosition, CopyHeadNod} from './copy-rotation.js';
import {setComponentsActive} from './utils/activate-children.js';
import {vec3} from 'gl-matrix';
import {AudioSource} from '@wonderlandengine/spatial-audio';
import {SpeakerIndicator, SpeakerState} from './speaker-indicator.js';

function setCookie(cname: string, cvalue: string, exdays: number) {
    const d = new Date();
    d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
    let expires = 'expires=' + d.toUTCString();
    document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
}

function getCookie(cname: string) {
    let name = cname + '=';
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return '';
}

const tempVec = vec3.create();

const CSS = `
        /* Style for the modal container */
        .modal-container {
            font-family: sans-serif;
            display: none;
            justify-content: center;
            align-items: center;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 1000;
        }

        /* Style for the modal content */
        .modal-content {
            background-color: #fff;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.5);
            text-align: center;
            margin: 5px;
        }

        /* Style for the input field */
        .username-input {
            border: none;
            border-radius: 25px;
            padding: 10px;
            font-size: 16px;
        }

        /* Style for the submit button */
        .submit-button {
            background-color: #007BFF;
            color: #fff;
            border: none;
            border-radius: 25px;
            margin-top: 10px;
            padding: 10px 20px;
            font-size: 16px;
            cursor: pointer;
        }

        #rpm-modal {
          display: none;
          flex-wrap: wrap;
          flex-direction: column;
          min-width: 90%;
          height: 80%; /* 80% of the viewport height */
          max-height: 80%; /* Limit the max height to 80% of the viewport height */
        }
        #rpm-avatar-frame {
          min-width: fit-content;
          height: 80%;
          min-height: auto;
        }
        @media only screen and (min-width: 640px) {
          #rpm-avatar-frame {
            min-width: 640px;
            min-height: 640px;
          }
        }
`;
const HTML = `
        <!-- Modal content -->
        <div id="username-modal" class="modal-content">
            <h2>Enter Your Name</h2>
            <input type="text" id="username-input" class="username-input" placeholder="Username" onkeydown="event.stopPropagation()">
            <button id="submit-button" class="submit-button">Create Avatar</button>
        </div>
        <div id="rpm-modal" class="modal-content">
            <h2>Create Avatar</h2>
            <iframe id="rpm-avatar-frame" class="frame" allow="camera *; microphone *; clipboard-write" min-width></iframe>
            <a>Finish avatar creation to connect.</a>
        </div>
`;

/**
 * custom-event-handler
 */
export class EventsClient extends NetworkConfigurationComponent {
    static TypeName = 'events-client';

    @property.object()
    vrPlayerObject!: Object3D;

    @property.object()
    vrControllerLeft!: Object3D;

    @property.object()
    vrControllerRight!: Object3D;

    @property.object()
    playerPrototype!: Object3D;

    @property.object()
    notificationsObject!: Object3D;

    @property.object()
    radioObject!: Object3D;

    @property.float(3.0)
    notifyTime!: number;

    static InheritProperties = true;

    notificationText?: TextComponent | null;
    notificationTimer = 0;

    username: string = '';
    avatarUrl: string = '';

    modal!: HTMLDivElement;
    frame!: HTMLIFrameElement;

    playerNetworkId: number = -1;

    static onRegister(engine: WonderlandEngine): void {
        engine.registerComponent(CopyRotation);
        engine.registerComponent(CopyHeadNod);
        engine.registerComponent(CopyPosition);
        engine.registerComponent(NetworkedComponent);
    }

    init() {
        const style = document.createElement('style');
        style.innerText = CSS;
        document.head.append(style);

        this.modal = document.createElement('div');
        this.modal.classList.add('modal-container');
        this.modal.id = 'modal-container';
        this.modal.innerHTML = HTML;
        document.body.appendChild(this.modal);
    }

    override start() {
        // Then connect
        this.notificationText = this.notificationsObject.getComponent(TextComponent);

        this.username = getCookie('events-username');
        this.avatarUrl = getCookie('events-avatar');

        if (this.username === '' || this.avatarUrl === '') {
            this.openUsernameModal();
        } else {
            this.connect();
        }
    }

    openUsernameModal() {
        this.modal.style.display = 'flex';
        const btn = document.getElementById('submit-button');
        const input = document.getElementById('username-input') as HTMLInputElement;
        input.value = this.username;
        if (!this.modal || !btn || !input) return;

        const subdomain = 'wonderland';
        this.frame = document.getElementById('rpm-avatar-frame') as HTMLIFrameElement;
        this.frame!.src = `https://${subdomain}.readyplayer.me/avatar?frameApi&bodyType=halfbody`;

        window.addEventListener('message', this.rpmSubscribe.bind(this));
        document.addEventListener('message', this.rpmSubscribe.bind(this));

        btn.addEventListener('click', () => {
            this.username = input.value;
            //console.log(this.username);
            if (this.username === '') return;
            setCookie('events-username', this.username, 365);

            this.frame!.hidden = false;
            document.getElementById('username-modal').style.display = 'none';
            document.getElementById('rpm-modal').style.display = 'flex';
        });
    }

    rpmSubscribe(event: CustomEvent) {
        const json = this.parse(event);

        if (json?.source !== 'readyplayerme') {
            return;
        }

        // Susbribe to all events sent from Ready Player Me once frame is ready
        if (json.eventName === 'v1.frame.ready') {
            this.frame!.contentWindow.postMessage(
                JSON.stringify({
                    target: 'readyplayerme',
                    type: 'subscribe',
                    eventName: 'v1.**',
                }),
                '*'
            );
        }

        // Get avatar GLB URL
        if (json.eventName === 'v1.avatar.exported') {
            //console.log(`Avatar URL: ${json.data.url}`);
            //document.getElementById('avatarUrl').innerHTML = `Avatar URL: ${json.data.url}`;
            this.frame!.hidden = true;
            this.modal!.style.display = 'none';

            this.avatarUrl = json.data.url;
            setCookie('events-avatar', this.avatarUrl, 365);

            this.connect();
        }

        // Get user id
        if (json.eventName === 'v1.user.set') {
            console.log(`User with id ${json.data.id} set: ${JSON.stringify(json)}`);
        }
    }

    parse(event: CustomEvent) {
        try {
            return JSON.parse(event.data);
        } catch (error) {
            return null;
        }
    }

    /**
     * Function which triggers a connection initiation by calling the connect
     * function of the networkManager singleton instance.
     */
    connect() {
        const customJoinData = {
            handTracking: false,
            hands: true,
            username: this.username,
            avatarUrl: this.avatarUrl,
        };
        if (this.connecting) {
            console.error('cannot connect multiple times!');
            return;
        } else {
            this.connecting = true;
        }
        console.log('connecting...', {
            host: this.serverHost,
            port: this.serverPort,
            secure: this.secure,
            audio: this.audio,
            audioDeviceId: this.inputDeviceId,
            debug: this.debug,
            path: this.serverPath,
        });

        networkManager
            .connect(customJoinData, {
                host: this.serverHost,
                port: this.serverPort,
                secure: this.secure,
                audio: this.audio,
                audioDeviceId: this.inputDeviceId,
                debug: this.debug,
                path: this.serverPath,
            })
            .then(this.onSuccessfulConnection.bind(this))
            .catch((e) => {
                console.error(e);
                /* No more updates for now. */
                this.active = false;
                this.connecting = false;
                /* Automatically reconnect -- for debugging the server */
                setTimeout(this.connect.bind(this), 1000);
            });
    }

    update(dt: number) {
        this.notificationTimer -= dt;
        if (this.notificationTimer < 0 && this.notificationText) {
            this.notificationText.text = '';
        }
    }

    onActivate(): void {
        this.engine.onXRSessionStart.add(this.enterVR);
        this.engine.onXRSessionEnd.add(this.exitVR);
    }

    onDeactivate(): void {
        this.engine.onXRSessionStart.remove(this.enterVR);
        this.engine.onXRSessionEnd.remove(this.exitVR);
    }

    enterVR = () => {
        if (networkManager && networkManager.client) {
            networkManager.client.sendViaWs({
                type: 'user-enter-xr',
                data: {},
            });
        }

        this.playerObject!.active = false;
        const networkComponent = this.playerObject!.getComponent(NetworkedComponent);
        if (networkComponent) {
            networkComponent.destroy();
        }

        if (!this.vrPlayerObject.getComponent(NetworkedComponent)) {
            this.vrPlayerObject!.addComponent(NetworkedComponent, {
                networkId: this.playerNetworkId,
                mode: 'send',
            });
        }
        this.vrPlayerObject!.active = true;
    };

    exitVR = () => {
        if (networkManager && networkManager.client) {
            networkManager.client.sendViaWs({
                type: 'user-exit-xr',
                data: {},
            });
        }
        this.vrPlayerObject!.active = false;
        const networkComponent = this.vrPlayerObject!.getComponent(NetworkedComponent);
        if (networkComponent) {
            networkComponent.destroy();
        }
        if (!this.playerObject!.getComponent(NetworkedComponent)) {
            this.playerObject!.addComponent(NetworkedComponent, {
                networkId: this.playerNetworkId,
                mode: 'send',
            });
        }
        this.playerObject!.active = true;
    };

    override onSuccessfulConnection(joinEvent: number[]) {
        try {
            /* We are mis-using postRender here to ensure all
             * networked-component updates have been called */
            this.engine.scene.onPostRender.add(networkManager.update.bind(networkManager));

            networkManager.onEvent.add(this.onEvent.bind(this));
            this.playerNetworkId = joinEvent[0];

            if (this.engine.xr && this.engine.xr.session) {
                this.vrPlayerObject &&
                    this.vrPlayerObject.addComponent(NetworkedComponent, {
                        networkId: this.playerNetworkId,
                        mode: 'send',
                    });
                networkManager.client!.sendViaWs({
                    type: 'user-enter-xr',
                    data: {},
                });
            } else {
                this.playerObject &&
                    this.playerObject.addComponent(NetworkedComponent, {
                        networkId: this.playerNetworkId,
                        mode: 'send',
                    });
            }

            this.vrControllerLeft.addComponent(NetworkedComponent, {
                networkId: joinEvent[1],
                mode: 'send',
            });
            this.vrControllerRight.addComponent(NetworkedComponent, {
                networkId: joinEvent[2],
                mode: 'send',
            });

            /* Start updating! */
            this.active = true;
        } catch (e) {
            console.log('Error while trying to join:', e);
        }
    }

    override onEvent(e: WonderlandWebsocketEvent) {
        //   console.log(e);
        const remoteUser = this.remoteUsers.get(e.data.id);

        switch (e.type) {
            case 'user-joined':
                this.engine.scene
                    .append(e.data.avatarUrl.toString() + '?textureSizeLimit=512')
                    .then((root) => {
                        const proto = this.playerPrototype.clone();
                        if (!root) {
                            return;
                        }
                        const head = proto.findByNameRecursive('Head')[0]!;
                        head.addComponent(NetworkedComponent, {
                            networkId: e.data.networkIds[0],
                            mode: 'receive',
                        });

                        const leftHand = proto.findByNameRecursive(
                            'LeftHand'
                        )[0]! as Object3D; // Assume the object is there.
                        leftHand.addComponent(NetworkedComponent, {
                            networkId: e.data.networkIds[1],
                            mode: 'receive',
                        });
                        const lhBone = root.findByNameRecursive('LeftHand')[0]!;
                        lhBone.addComponent(CopyRotation, {
                            axis: 3,
                            other: leftHand.children[0],
                        });
                        lhBone.addComponent(CopyPosition, {
                            //     axis: 1,
                            other: leftHand.children[0],
                        });

                        const rightHand = proto.findByNameRecursive('RightHand')[0]!; // Assume the object is there.
                        rightHand.addComponent(NetworkedComponent, {
                            networkId: e.data.networkIds[2],
                            mode: 'receive',
                        });
                        const rhBone = root.findByNameRecursive('RightHand')[0]!;
                        rhBone.addComponent(CopyRotation, {
                            axis: 3,
                            other: rightHand.children[0],
                        });
                        rhBone.addComponent(CopyPosition, {
                            //     axis: 1,
                            other: rightHand.children[0],
                        });

                        if (!e.data.inXR) {
                            setComponentsActive(leftHand, false);
                            setComponentsActive(rightHand, false);
                        }

                        const spineBone = root.findByNameRecursive('Spine')[0]!;
                        spineBone.addComponent(CopyRotation, {
                            axis: 1,
                            other: head,
                        });
                        const headBone = root.findByNameRecursive('Head')[0]!;
                        headBone.addComponent(CopyHeadNod, {
                            axis: 0,
                            other: head,
                        });

                        headBone.getPositionWorld(tempVec);
                        root!.addComponent(CopyPosition, {
                            offsetY: -tempVec[1],
                            other: head,
                        });

                        const usernameObject = proto.findByNameRecursive('Username')[0]!;
                        usernameObject.getComponent(TextComponent)!.text = e.data.name;

                        const userIndicatorObject =
                            proto.findByNameRecursive('Indicator')[0]!;

                        const userObjects = {
                            head: {
                                object: head,
                                id: e.data.networkIds[0],
                            },
                            leftHand: {
                                object: leftHand,
                                id: e.data.networkIds[1],
                            },
                            rightHand: {
                                object: rightHand,
                                id: e.data.networkIds[2],
                            },
                            root: {
                                object: root,
                            },
                            userIndicatorObject: {
                                object: userIndicatorObject,
                            },
                        };

                        this.remoteUsers.set(e.data.id, userObjects);
                    });
                this.notify(e.data.name.toString() + ' joined the game.');

                break;

            case 'user-left':
                if (remoteUser) {
                    Object.values(remoteUser).forEach(({object, id}) => {
                        networkManager.removeObject(id);
                        if (!object.isDestroyed) {
                            object.destroy();
                        }
                    });
                }
                this.notify(e.data.name.toString() + ' left the game.');
                break;
            case 'user-enter-xr':
                // show hands of user.
                if (remoteUser) {
                    setComponentsActive(remoteUser['leftHand'].object, true);
                    setComponentsActive(remoteUser['rightHand'].object, true);
                }
                break;
            case 'user-exit-xr':
                // hide hands of user.
                if (remoteUser) {
                    setComponentsActive(remoteUser['leftHand'].object, false);
                    setComponentsActive(remoteUser['rightHand'].object, false);
                }
                break;
            case 'radio-toggle':
                {
                    if (this.radioObject) {
                        const radio = this.radioObject.getComponent(AudioSource);
                        if (e.data.radioState) {
                            radio.play();
                        } else {
                            radio?.stop();
                        }
                    }
                }
                break;
            case 'player-speak-change':
                const playerId = e.data.playerId;
                const isSpeaking = e.data.isSpeaking;
                if (playerId !== networkManager.selfPlayerId) {
                    //          const playerObjects = this.remoteUsersAndComps.get(playerId);
                    if (remoteUser) {
                        remoteUser.userIndicatorObject.object
                            .getComponent(SpeakerIndicator)!
                            .setState(
                                isSpeaking
                                    ? SpeakerState.Speaking
                                    : SpeakerState.NotSpeaking
                            );
                    }
                }
                break;
            default:
                if (this.debug) {
                    console.log('Unknown event:', e);
                }
        }
    }

    notify(text: string) {
        if (!this.notificationText) return;
        this.notificationText.text = text;
        this.notificationTimer = this.notifyTime;
    }
}
