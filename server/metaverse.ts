import {
  JoinEvent,
  LeaveEvent,
  MultiUserServer,
  WebSocketEvent,
  PeerBase
} from "@wonderlandengine/multi-user-server-api";

export class MetaverseServer extends MultiUserServer {
  connectedUsers = new Map<string, string>();
  ballObjectId?: number;
  ballIsInFront = false;
  movingInterval?: NodeJS.Timer;
  raiseAmount = 0;

  constructor() {
    super();
    console.log("Changed message again hello there");
  }

  onUserJoin(e: JoinEvent) {
    console.log("User joined", e.peer.id);

    let objectCount = 1; /* Head */
    if (e.data.handTracking) {
      objectCount += 50; /* 25 joints, two hands */
    }
    if (e.data.hands) {
      objectCount += 2; /* two hands */
    }
    e.transforms = new Float32Array(8 * objectCount);
    /* Initialize dual quaternions */
    for (let i = 0; i < objectCount; ++i) {
      e.transforms[i * 8 + 3] = 1;
    }

    const user = super.onUserJoin(e);

    /* Let all other users know about the new player and his objects */
    this.sendEvent(
      "user-joined",
      {
        networkIds: user.objects,
        id: user.peer.id,
        username: e.data.username
      },
      super.getOtherUsers(user.id)
    );
    if (this.ballObjectId) {
      super.sendEvent(
        "set-ball-network-id",
        { networkId: this.ballObjectId },
        [user]
      );
    }
    /* Let this user know about the other players and their objects */
    for (const u of this.users.values()) {
      /* Don't send the user to themselves */
      if (u.id === user.id) continue;
      const username = this.connectedUsers.get(u.peer.id);
      this.sendEvent(
        "user-joined",
        { networkIds: u.objects, id: u.peer.id, username },
        [user]
      );
    }
    this.connectedUsers.set(user.peer.id, e.data.username);
    return user;
  }

  onUserLeave(e: LeaveEvent) {
    console.log("Left:", e);
    const id = e.user.peer.id;
    const networkIds = e.user.objects;
    super.onUserLeave(e);
    const username = this.connectedUsers.get(e.user.peer.id);
    super.sendEvent(
      "user-left",
      { networkIds, id, username },
      Array.from(this.users.values())
    );
  }

  onWsMessageEvent(e: WebSocketEvent, peer: PeerBase) {
    console.log("event", e.type);
    switch (e.type) {
      case "move-ball":
        break;
      case "create-ball":
        if (!this.ballObjectId) {
          // create a new ball with initial transforms and
          // server write permissions
          const [ballObjectId] = super.addObjects(
            new Float32Array([0, 0, 0, 1, 0, 0, 0, -1]),
            0xffffffff
          );
          this.ballObjectId = ballObjectId;
          this.ballIsInFront = false;
          // create a new ball with initial transforms and
          // server write permissions
          super.sendEvent(
            "set-ball-network-id",
            { networkId: ballObjectId },
            Array.from(this.users.values())
          );
        }

        break;
    }
  }

  onPlayerSpeakChange(peer: PeerBase, isSpeaking: boolean) {
    super.sendEvent(
      "player-speak-change",
      { playerId: peer.id, isSpeaking },
      Array.from(this.users.values())
    );
  }

  update() {
    super.update();

    /*
     Move the ball up and down every 5 seconds
    */

    if (this.ballIsInFront) {
      this.raiseAmount -= 0.01;
      super.setTransforms(
        0xffffffff,
        [this.ballObjectId as number],
        new Float32Array([0, 0, 0, 1, 0, this.raiseAmount, 0, -0])
      );
      if (this.raiseAmount <= 0) {
        this.ballIsInFront = false;
      }
    } else {
      this.raiseAmount += 0.01;
      super.setTransforms(
        0xffffffff,
        [this.ballObjectId as number],
        new Float32Array([0, 0, 0, 1, 0, this.raiseAmount, 0, -0])
      );

      if (this.raiseAmount >= 0.5) {
        this.ballIsInFront = true;
      }
    }
    /* Nothing to do yet */
  }
}

export default MetaverseServer;
