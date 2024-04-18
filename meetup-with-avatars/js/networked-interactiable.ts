import { Component, Object3D, PhysXComponent } from "@wonderlandengine/api";
import { property } from "@wonderlandengine/api/decorators.js";
import {
  WonderlandWebsocketEvent,
  networkManager,
} from "@wonderlandcloud/client";
import { Grabbable } from "./wle-interaction/index.js";

export class NetworkedInteractiable extends Component {
  static TypeName = "networked-interactiable";

  private _grabbable!: Grabbable;
  private _objectNetworkId = 25;
  private _physx!: PhysXComponent;

  start(): void {
    this._grabbable = this.object.getComponent(Grabbable)!;
    this._grabbable.onGrabStart.add(this.onGrabStart);
    this._grabbable.onGrabEnd.add(this.onGrabEnd);

    this._physx = this.object.getComponent(PhysXComponent)!;
  }
  onActivate(): void {
    networkManager.onEvent.add(this.onEvent);
  }
  onDectivate(): void {
    networkManager.onEvent.remove(this.onEvent);
  }

  onEvent = (e: WonderlandWebsocketEvent) => {
    switch (e.type) {
      case "object-grab":
        /*
            TODO put the ball into read only state locally because someone else grabbed it!
            Maybe we can only send the ball grab event to the player having the ball previously as
            the other players should technically not care
             */
        if (networkManager.writeComponents.has(this._objectNetworkId)) {
          networkManager.readComponents.set(
            this._objectNetworkId,
            networkManager.writeComponents.get(this._objectNetworkId)
          );
          networkManager.writeComponents.delete(this._objectNetworkId);
        }
        this._physx.kinematic = true;

        //  console.log('implement me');
        break;
    }
  };
  onGrabStart = () => {
    this.grabObject();
  };

  onGrabEnd = () => {
    if (networkManager.writeComponents.has(this._objectNetworkId)) {
      networkManager.readComponents.set(
        this._objectNetworkId,
        networkManager.writeComponents.get(this._objectNetworkId)
      );
      networkManager.writeComponents.delete(this._objectNetworkId);
    }
  };

  grabObject() {
    if (!networkManager.client) {
      return;
    }

    // send an initial broadcast message to every connected client
    networkManager.client.sendViaWs({
      type: "object-grab",
      data: {},
    });

    if (networkManager.readComponents.has(this._objectNetworkId)) {
      networkManager.writeComponents.set(
        this._objectNetworkId,
        networkManager.readComponents.get(this._objectNetworkId)
      );
      networkManager.readComponents.delete(this._objectNetworkId);
    }
  }
}
