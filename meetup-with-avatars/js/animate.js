import {Component} from "@wonderlandengine/api";

/**
 * animate
 */
export class Animate extends Component {
	static TypeName = "animate";
	/* Properties that are configurable in the editor */
	static Properties = {};
	update(dt) {
		/* Called every frame. */
		this.object.rotateAxisAngleDegObject([0, 0, 1], dt * 10);
	}
}
