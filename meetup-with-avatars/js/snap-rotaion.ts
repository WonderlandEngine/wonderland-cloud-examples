import {Component, InputComponent, Object3D} from "@wonderlandengine/api";
import {property} from "@wonderlandengine/api/decorators.js";

/**
 * This component snaps the player to a fixed rotation when the trigger is
 * moved left or right.
 *
 * @remarks
 * The component is dependent on an {@link InputComponent} component on the same object.
 */
export class SnapRotate extends Component {
	static TypeName = "snap-rotate";

	@property.object({required: true})
	private controller?: Object3D;

	private input?: InputComponent;
	private snapped = false;
	private lowThreshold = 0.2;
	private highThreshold = 0.5;

	start() {
		const tempInput = this.controller?.getComponent(InputComponent);
		if (!tempInput) {
			throw new Error(
				"The snap-rotate component requires an input component on controller object",
			);
		}
		this.input = tempInput;
		this.snapped = false;
	}

	queue = new Array<() => void>();

	update() {
		if (!this.input?.xrInputSource?.gamepad?.axes?.length) {
			return;
		}
		const exec = this.queue.pop();
		if (exec) {
			exec();
			return;
		}
		const currentAxis = this.input.xrInputSource.gamepad.axes[2];
		if (Math.abs(currentAxis) < this.lowThreshold) {
			this.snapped = false;
			return;
		}
		// need to release trigger before snapping again
		if (this.snapped || Math.abs(currentAxis) < this.highThreshold) {
			return;
		}
		const angle = 45;
		if (currentAxis < -this.highThreshold && !this.snapped) {
			this.object.rotateAxisAngleDegObject([0, 1, 0], angle);
			this.snapped = true;
		}

		if (currentAxis > this.highThreshold && !this.snapped) {
			this.object.rotateAxisAngleDegObject([0, 1, 0], -angle);
			this.snapped = true;
		}
	}
}
