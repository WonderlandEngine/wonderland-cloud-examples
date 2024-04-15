import {vec3} from "gl-matrix";
import {Component, Object3D} from "@wonderlandengine/api";
import {property} from "@wonderlandengine/api/decorators.js";
import {TouchUI} from "./touch-ui.js";

/**
 * Basic movement with touch events on the left half of the screen.
 */
export class TouchMove extends Component {
	static TypeName = "touch-move";

	@property.float(0.1)
	speed = 0.1;

	@property.object({required: true})
	nonVRCamera!: Object3D;

	@property.object({required: true})
	touchUIComponent!: Object3D;

	private headForward: vec3 = [0, 0, 0];
	private touchUI!: TouchUI;

	start() {
		const tempTouchUI = this.touchUIComponent.getComponent(TouchUI);
		if (!tempTouchUI) {
			throw new Error(
				`touch-look(${this.object.name}): touchUIComponent does not have a TouchUI`,
			);
		}
		this.touchUI = tempTouchUI;
	}

	update() {
		if (this.touchUI.active && this.touchUI.joystick1Value.isTouching) {
			const sensitivity = 0.1; // Adjust the sensitivity based on your preference
			const movementX =
				this.touchUI.joystick1Value.x * sensitivity * this.speed;
			const movementY =
				this.touchUI.joystick1Value.y * sensitivity * this.speed;

			// Get the forward direction of the headObject
			this.headForward = [0, 0, 0];
			const direction: vec3 = [1, 0, 1];

			// Move according to headObject Forward Direction
			vec3.normalize(direction, direction);
			direction[0] *= movementX;
			direction[2] *= movementY;

			this.nonVRCamera.getForwardWorld(this.headForward);

			// Combine direction with headObject
			vec3.transformQuat(
				direction,
				direction,
				this.nonVRCamera.getTransformWorld(),
			);

			// Do not move on Y axis
			direction[1] = 0;
			// Add force to Physx Component to move the player
			this.object.translateLocal(direction);
		}
	}
}
