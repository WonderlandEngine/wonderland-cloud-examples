import { Component, LightComponent, Object3D, TextComponent } from "@wonderlandengine/api";
import { property } from "@wonderlandengine/api/decorators.js";

import {
  networkManager,
  NetworkConfigurationComponent,
  WonderlandWebsocketEvent
} from "@wonderlandcloud/client";

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
`;
const HTML = `
        <!-- Modal content -->
        <div class="modal-content">
            <h2>Enter Your Name</h2>
            <input type="text" id="username-input" class="username-input" placeholder="Username" onkeydown="event.stopPropagation()">
            <button id="submit-button" class="submit-button">Play!</button>
        </div>
`;

interface ObjectOrComponentReference {
  [key: string]: {
    component?: Component
    object?: Object3D;
    id?: number;
  };
}

/**
 * custom-event-handler
 */
export class MetaverseExampleClient extends NetworkConfigurationComponent {
  static TypeName = "example-metaverse-client";

  @property.bool()
  skipServerStart = true;
  @property.object()
  playerPrototype!: Object3D;

  @property.object()
  ballObject!: Object3D;

  @property.object()
  notificationsObject!: Object3D;

  @property.float(3.0)
  notifyTime!: number;

  static InheritProperties = true;

  notificationText?: TextComponent | null;
  notificationTimer = 0;

  username: string = "";

  modal: HTMLDivElement | null = null;

  userItemOffset = 0;

  remoteUsersAndComps: Map<string, ObjectOrComponentReference> = new Map<
    string,
    ObjectOrComponentReference
  >();


  init() {
    const style = document.createElement("style");
    style.innerText = CSS;
    document.head.append(style);

    this.modal = document.createElement("div");
    this.modal.classList.add("modal-container");
    this.modal.id = "modal-container";
    this.modal.innerHTML = HTML;
    document.body.appendChild(this.modal);
  }

  override start() {
    // Then connect

    this.notificationText =
      this.notificationsObject.getComponent(TextComponent);

    this.username = "";

    if (this.username === "") {
      this.openUsernameModal();
    } else {
      this.connect();
    }
  }

  openUsernameModal() {
    // @ts-ignore
    this.modal.style = "display: flex";
    const btn = document.getElementById("submit-button");
    const input = document.getElementById("username-input") as HTMLInputElement;
    if (!this.modal || !btn || !input) return;

    btn.addEventListener("click", () => {
      this.username = input.value;
      console.log(this.username);
      if (this.username === "") return;
      // @ts-ignore
      this.modal.style = "display: none";
      this.connect();
    });
  }

  /**
   * Function which triggers a connection initiation by calling the connect
   * function of the networkManager singleton instance.
   */
  connect() {
    const customJoinData = {
      handTracking: false,
      hands: false,
      username: this.username
    };
    if (this.connecting) {
      console.error("cannot connect multiple times!");
      return;
    } else {
      this.connecting = true;
    }
    console.log("super", this);
    console.log("connecting...", {
      host: this.serverHost,
      port: this.serverPort,
      secure: this.secure,
      audio: this.audio,
      audioDeviceId: this.inputDeviceId,
      debug: this.debug,
      path: this.serverPath,
      skipServerStart: this.skipServerStart
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
        skipServerStart: this.skipServerStart
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

    // for testing muting players from javascript console
    // @ts-ignore
    window.setMutePlayer = networkManager.setMutePlayer.bind(networkManager);
  }

  update(dt: number) {
    this.notificationTimer -= dt;
    if (this.notificationTimer < 0 && this.notificationText) {
      this.notificationText.text = "";
    }
  }

  override onSuccessfulConnection(joinEvent: number[]) {
    try {
      /* We are mis-using postRender here to ensure all
       * networked-component updates have been called */
      this.engine.scene.onPostRender.add(
        networkManager.update.bind(networkManager)
      );

      networkManager.onEvent.add(this.onEvent.bind(this));
      this.playerObject &&
      this.playerObject.addComponent("networked", {
        networkId: joinEvent[0],
        mode: "send"
      });

      /* Start updating! */
      this.active = true;
    } catch (e) {
      console.log("Error while trying to join:", e);
    }
  }

  override onEvent(e: WonderlandWebsocketEvent) {
    console.log(e);
    switch (e.type) {
      case "user-joined":
        console.log("prototype rotation", this.playerPrototype.getRotationWorld());
        const userNameObject = this.playerPrototype.findByNameRecursive("Username")[0];
        const userNameRotation = userNameObject.getRotationWorld();
        console.log("prototype username rotation", userNameRotation);
        const root = this.playerPrototype.clone();
        root.addComponent("networked", {
          networkId: e.data.networkIds[0],
          mode: "receive"
        });
        console.log("rotation:", root.getRotationWorld());
        root.setRotationWorld(this.playerPrototype.getRotationWorld());
        console.log("rotation new", root.getRotationWorld());
        const meshComponent = root.getComponent("mesh");
        if (meshComponent) {
          meshComponent.active = true;
        }
        const usernameObject = root.findByNameRecursive("Username");
        if (usernameObject[0]) {
          usernameObject[0].setRotationWorld(userNameRotation);
        }
        const textComponent = usernameObject[0]!.getComponent(TextComponent)!;
        if (textComponent) {
          textComponent.text = e.data.username;
          textComponent.active = true;
        }

        const lightObject = root.findByNameRecursive("SpeakingLight");
        const lightComponent = lightObject[0]!.getComponent(LightComponent);
        if (!lightComponent) {
          throw Error("No light component defined on SpeakingLight Object cannot process adding new user");
        }
        const lightObject2 = root.findByNameRecursive("SpeakingLight2");
        const lightComponent2 = lightObject2[0]!.getComponent(LightComponent);
        if (!lightComponent2) {
          throw Error("No light component defined on SpeakingLight Object cannot process adding new user");
        }
        const userObjects = {
          head: {
            object: root,
            id: e.data.networkIds[0] as number
          },
          speakingLight: {
            component: lightComponent
          },
          speakingLight2: {
            component: lightComponent2
          }
        };

        this.remoteUsersAndComps.set(e.data.id, userObjects);
        this.notify(e.data.username.toString() + " joined the game.");
        break;

      case "user-left":
        const remoteUser = this.remoteUsersAndComps.get(e.data.id);
        if (remoteUser) {
          Object.values(remoteUser).forEach((objOrComp) => {
            if (objOrComp.object && objOrComp.id) {
              networkManager.removeObject(objOrComp.id);
              objOrComp.object.destroy();
            }
          });
        }
        this.notify(e.data.username.toString() + " left the game.");
        break;
      case "set-ball-network-id":
        this.ballObject.active = true;
        console.log(this.ballObject.getTransformWorld());
        this.ballObject.addComponent("networked", {
          networkId: e.data.networkId,
          mode: "receive"
        });
        this.notify("Set ball network id " + e.data.networkId);
        break;
      case "player-speak-change":
        const playerId = e.data.playerId;
        const isSpeaking = e.data.isSpeaking;
        if (playerId !== networkManager.selfPlayerId) {
          // only process events but not for others
          const playerObjects = this.remoteUsersAndComps.get(playerId);
          if (playerObjects) {
            if (playerObjects.speakingLight.component && playerObjects.speakingLight2.component) {
              playerObjects.speakingLight.component.active = isSpeaking;
              playerObjects.speakingLight2.component.active = isSpeaking;
            } else {
              console.error("could not find speaking identifier light");
            }
          }
        }

      default:
        if (this.debug) console.log("Unknown event:", e);
    }
  }

  notify(text: string) {
    if (!this.notificationText) return;
    this.notificationText.text = text;
    this.notificationTimer = this.notifyTime;
  }
}
