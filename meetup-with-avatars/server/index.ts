import {
  MultiUserServer,
  JoinEvent,
  LeaveEvent,
  WebSocketEvent,
  PeerBase,
} from "@wonderlandengine/multi-user-server-api";

export default class WonderlandEventsServer extends MultiUserServer {
  ballNetworkId = 0;
  lastUserIdBallGrab = 0;
  usersInXR = new Set<number>();

  radioState = false;

  constructor() {
    super();
    console.log("Initialized Wonderland Events server!");

    setInterval(this.update.bind(this), 20);
  }

  usernames = new Map<number, string>();
  avatarUrls = new Map<number, string>();

  onUserJoin(e: JoinEvent) {
    /*
    We need the logic below to add the user to other users
     */
    const username = e.data.username;
    const avatarUrl = e.data.avatarUrl;
    console.log("Joined:", e.peer.id, username);
    let objectCount = 1; /* Head */
    if (e.data.handTracking) {
      objectCount += 50; /* 25 joints, two hands */
    }
    if (e.data.hands) {
      objectCount += 2; /* two hands */
    }
    if (e.data.body) {
      objectCount += 1;
    }
    e.transforms = new Float32Array(8 * objectCount);
    /* Initialize dual quaternions */
    for (let i = 0; i < objectCount; ++i) {
      e.transforms[i * 8 + 3] = 1;
    }

    const user = super.onUserJoin(e);
    this.usernames.set(user.id, username);
    this.avatarUrls.set(user.id, avatarUrl);

    /* Let all other users know about the new player and his objects */
    const otherUsers = Array.from(this.users.values()).filter(
      (u) => u.id != user.id
    );

    this.sendEvent(
      "user-joined",
      {
        networkIds: user.objects,
        id: user.id,
        name: username,
        avatarUrl: avatarUrl,
      },
      otherUsers
    );
    this.sendEvent("set-id", { id: user.id }, [user]);
    /* Let this user know about the other players and their objects */
    for (const u of this.users.values()) {
      /* Don't send the user to themselves */
      if (u.id == user.id) continue;
      this.sendEvent(
        "user-joined",
        {
          networkIds: u.objects,
          id: u.id,
          name: this.usernames.get(u.id),
          avatarUrl: this.avatarUrls.get(u.id),
          inXR: this.usersInXR.has(u.id),
        },
        [user]
      );
    }

    return user;
  }

  onUserLeave(e: LeaveEvent) {
    const id = e.user.id;
    const networkIds = e.user.objects;
    super.onUserLeave(e);
    /* update all remaining users that the current user has left */
    this.sendEvent(
      "user-left",
      { networkIds, id, name: this.usernames.get(id) },
      Array.from(this.users.values())
    );
  }

  onWsMessageEvent(e: WebSocketEvent, peer: PeerBase) {
    switch (e.type) {
      case "user-enter-xr":
        this.usersInXR.add(peer.user?.id as number);
        this.sendEvent(
          "user-enter-xr",
          { id: peer.user?.id },
          this.getOtherUsers(peer.user?.id as number)
        );
        break;
      case "user-exit-xr":
        this.usersInXR.delete(peer.user?.id as number);
        this.sendEvent(
          "user-exit-xr",
          { id: peer.user?.id },
          this.getOtherUsers(peer.user?.id as number)
        );
        break;
      case "radio-toggle":
        this.radioState = !this.radioState;
        this.sendEvent(
          "radio-toggle",
          { id: peer.user?.id, radioState: this.radioState },
          this.getOtherUsers(peer.user?.id as number)
        );
        break;
      case "object-grab":
        /*     // reset write permissions for last user who grabbed the ball
      if (this.lastUserIdBallGrab) {
        this.writePermissions[this.lastUserIdBallGrab] =
          1 << this.lastUserIdBallGrab;
      }
      this.lastUserIdBallGrab = peer.user?.id as number; */
        // set the current user who grabbed the ball to allow update
        this.writePermissions[25] = 1 << (peer.user?.id as number);
        this.sendEvent(
          "object-grab",
          { userId: peer.user?.id },
          this.getOtherUsers(peer.user?.id as number)
        );
        // TODO on the client side, we will put the ball network object as a received
        break;
    }
  }

  onPlayerSpeakChange(peer: PeerBase, isSpeaking: boolean) {
    super.sendEvent(
      "player-speak-change",
      { playerId: peer.id, id: peer.user?.id, isSpeaking },
      Array.from(this.users.values())
    );
  }

  update() {
    // TODO: need dt from parent
    const dt = 1 / this.updatesPerSecond;

    super.update();
  }
}
