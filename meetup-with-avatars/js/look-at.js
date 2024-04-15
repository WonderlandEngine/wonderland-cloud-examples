import {Component} from "@wonderlandengine/api";
const tempVec = new Float32Array(3);
export class LookAtPlayer extends Component {
	static TypeName = "look-at-player";
	static Properties = {};
	update() {
		this.object.lookAt(
			this.engine.scene.activeViews[0].object.getPositionWorld(tempVec),
			[0, 1, 0],
		);
	}
}
