import {
  JoinEvent,
  LeaveEvent,
  MultiUserServer,
  WebSocketEvent,
  PeerBase,
} from "@wonderlandcloud/multi-user-server-api";
import { quat2 } from "gl-matrix";

/* Get number of objects required for given user settings */
function getObjectCount(settings: { handTracking?: boolean; hands?: boolean }) {
  let objectCount = 1; /* Head */
  if (settings.handTracking) {
    objectCount += 50; /* 25 joints, two hands */
  }
  if (settings.hands) {
    objectCount += 2; /* two hands */
  }
  return objectCount;
}

/* Create an array of dual quaternion transforms that are initialized to an identity transform */
function createTransforms(count: number) {
  const transforms = new Float32Array(8 * count);
  for (let i = 0; i < count; ++i) {
    quat2.identity(transforms.subarray(i * 8, i * 8 + 8));
  }
  return transforms;
}

export class SimpleServer extends MultiUserServer {
  usernames = new Map<string, string>();

  /** Called when a user connects */
  onUserJoin(e: JoinEvent) {
    const id = e.peer.id;
    console.log("User joined", id);

    /* Initialize dual quaternion transforms for this user */
    const objectCount = getObjectCount(e.data);
    e.transforms = createTransforms(objectCount);

    /* Save username for this user */
    const user = super.onUserJoin(e);
    const username = e.data.username;
    this.usernames.set(user.peer.id, username);

    /* Let all other users know about the new player and his objects */
    const otherUsers = super.getOtherUsers(user.id);
    const networkIds = user.objects;
    this.sendEvent("user-joined", { networkIds, id, username }, otherUsers);

    /* Let the joined user know about the other players and their objects */
    for (const u of otherUsers) {
      const networkIds = u.objects;
      const id = u.peer.id;
      const username = this.usernames.get(u.peer.id);
      this.sendEvent("user-joined", { networkIds, id, username }, [user]);
    }

    return user;
  }

  /** Called when a user disconnects */
  onUserLeave(e: LeaveEvent) {
    const id = e.user.peer.id;
    const username = this.usernames.get(e.user.peer.id);
    const networkIds = e.user.objects;

    console.log("User left:", id);
    super.onUserLeave(e);

    super.sendEvent(
      "user-left",
      { networkIds, id, username },
      Array.from(this.users.values())
    );
  }

  /* Called when a reliable message is sent via websockets */
  onWsMessageEvent(e: WebSocketEvent, sender: PeerBase) {
    console.log("event", e.type);
    switch (e.type) {
      case "simple":
        break;
    }
  }

  /* Called when a player's audio track changes from silence to audio. */
  onPlayerSpeakChange(peer: PeerBase, isSpeaking: boolean) {
    super.sendEvent(
      "player-speak-change",
      { playerId: peer.id, isSpeaking },
      Array.from(this.users.values())
    );
  }

  /* Called recurringly, not needed for this example */
  update() {
    super.update();
  }
}

export default SimpleServer;
