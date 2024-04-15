import { Component, Object3D } from "@wonderlandengine/api";
import { quat, vec3 } from "gl-matrix";
import { property } from "@wonderlandengine/api/decorators.js";

const tempQuat = quat.create();
const bodyQuaternion = quat.create();
const tempPositionWorldAvatar = vec3.create();
const tempPositionWorldBody = vec3.create();
const headForward = vec3.create();
/**
 * isolate-parent-rotation
 */
export class IsolateParentRotation extends Component {
  static TypeName = "isolate-parent-rotation";

  @property.object({ required: true })
  root!: Object3D;

  @property.float(0.4)
  bodyDistance = 0.4;

  update() {
    this.object.parent!.getRotationWorld(tempQuat);
    this.object.parent!.getPositionWorld(tempPositionWorldAvatar);
    this.object.getPositionWorld(tempPositionWorldBody);

    vec3.set(headForward, 0, 0, -1);
    vec3.transformQuat(headForward, headForward, tempQuat);

    headForward[1] = 0;

    vec3.normalize(headForward, headForward);

    const yaw = Math.atan2(headForward[0], -headForward[2]);

    quat.identity(bodyQuaternion);
    quat.rotateY(bodyQuaternion, quat.create(), -yaw);

    this.object.setRotationWorld(bodyQuaternion);
    this.object.setPositionWorld([
      tempPositionWorldAvatar[0],
      tempPositionWorldAvatar[1] - this.bodyDistance,
      tempPositionWorldAvatar[2],
    ]);
  }
}
