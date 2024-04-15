import {Component, Object3D} from "@wonderlandengine/api";
import {property} from "@wonderlandengine/api/decorators.js";

export class MobileActiveSwitch extends Component {
	static TypeName = "mobile-active-switch";

	@property.bool(true)
	affectChildren = true;

	@property.bool(false)
	disableOnMobile = false;

	private components = new Array<Component>();

	start() {
		this.getComponents(this.object);
		if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
			this.setComponentsActive(!this.disableOnMobile);
		} else {
			this.setComponentsActive(this.disableOnMobile);
		}
	}

	getComponents(obj: Object3D) {
		const comps = obj
			.getComponents()
			.filter((c) => c.type != "mobile-active-switch");
		this.components = this.components.concat(comps);

		if (this.affectChildren) {
			const children = obj.children;
			for (let i = 0; i < children.length; ++i) {
				this.getComponents(children[i]);
			}
		}
	}

	setComponentsActive(active: boolean) {
		const comps = this.components;
		for (let i = 0; i < comps.length; ++i) {
			comps[i].active = active;
		}
	}
}
