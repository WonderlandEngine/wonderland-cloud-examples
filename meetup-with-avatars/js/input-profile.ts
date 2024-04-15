import {Component, Object3D} from "@wonderlandengine/api";
import {HandTracking} from "@wonderlandengine/components";
import {vec3, quat} from "gl-matrix";
import {property} from "@wonderlandengine/api/decorators.js";

const _TempVec = vec3.create();
const _TempQuat = quat.create();
const minTemp = new Float32Array(3);
const maxTemp = new Float32Array(3);
const hands = ["left", "right"];

export class InputProfile extends Component {
	static TypeName = "input-profile";

	private _gamepadObjects: Record<string, any> = {};
	private controllerModel: any;
	private toFilter: Set<string> = new Set(["vr-mode-active-mode-switch"]);
	private defaultControllerComponents?: Component[];
	private handedness!: string;
	private url!: string;
	private ProfileJSON: any;
	private modelLoaded!: boolean;
	private gamepad: any;

	@property.object()
	defaultController!: Object3D;

	@property.enum(hands, 0)
	handednessIndex: number = 0;

	@property.string(
		"https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@latest/dist/profiles/",
	)
	path!: string;

	@property.string()
	customProfileFolder!: string;

	@property.bool(false)
	mapToDefaultController!: boolean;

	@property.object()
	trackedHand!: Object3D;

	init() {
		this._gamepadObjects = {};
	}

	start() {
		this.controllerModel = null;
		this.toFilter = new Set(["vr-mode-active-mode-switch"]);
		this.defaultControllerComponents = this.getComponents(
			this.defaultController,
		);
		this.handedness = hands[this.handednessIndex];

		if (this.engine.xr?.session != null) {
			this.engine.xr?.session.addEventListener(
				"inputsourceschange",
				this.onInputSourcesChange.bind(this),
			);
		} else {
			this.engine.onXRSessionStart.add(() => {
				this.engine.xr?.session.addEventListener(
					"inputsourceschange",
					this.onInputSourcesChange.bind(this),
				);
			});
		}
	}

	addToFilter(element: string) {
		this.toFilter.add(element);
	}

	removeFromFilter(element: string) {
		this.toFilter.delete(element);
	}

	onDeactivate() {
		if (this.engine.xr?.session != null) {
			this.engine.xr.session.removeEventListener(
				"inputsourceschange",
				this.onInputSourcesChange.bind(this),
			);
		} else {
			this.engine.onXRSessionStart.add(() => {
				this.engine.xr?.session.removeEventListener(
					"inputsourceschange",
					this.onInputSourcesChange.bind(this),
				);
			});
		}
	}

	setHandTrackingControllers(controllerObject: any) {
		/**@ts-ignore**/
		this.trackedHand.getComponent(HandTracking).controllerToDeactivate =
			controllerObject;
	}

	getComponents(obj: any) {
		if (obj == null) return;

		const components: Component[] = [];

		const stack = [obj];

		while (stack.length > 0) {
			const currentObj = stack.pop();
			const comps = currentObj
				.getComponents()
				.filter((c: any) => !this.toFilter.has(c.type));
			components.push(...comps);
			const children = currentObj.children || [];
			// Push children onto the stack in reverse order to maintain the correct order
			for (let i = children.length - 1; i >= 0; --i) {
				stack.push(children[i]);
			}
		}

		return components;
	}

	setComponentsActive(active: boolean) {
		const comps = this.defaultControllerComponents;
		if (!comps) return;
		for (let i = 0; i < comps.length; ++i) {
			comps[i].active = active;
		}
	}

	onInputSourcesChange(event: any) {
		if (this.modelLoaded && !this.mapToDefaultController) {
			this.setComponentsActive(false);
		}

		event.added.forEach((xrInputSource: any) => {
			if (xrInputSource.hand != null) return;
			if (this.handedness === xrInputSource.handedness) {
				var profile = this.path + xrInputSource.profiles[0];
				if (this.customProfileFolder !== "") {
					profile = this.customProfileFolder;
				}

				this.url = profile + "/profile.json";
				console.log("url is " + this.url);

				fetch(this.url)
					.then((res) => res.json())
					.then((out) => {
						this.ProfileJSON = out;
						console.log(this.ProfileJSON);
						const consoleText = this.modelLoaded
							? "Profile loaded" + this.url
							: "Reloaded Profile for gamepad mapping ";
						console.log(consoleText);
						this.loadGamepad(profile, xrInputSource);
					})
					.catch((e) => {
						console.error("failed to load profile.json");
						console.error(e);
					});
			}
		});
	}

	isModelLoaded() {
		return this.controllerModel !== null;
	}

	loadGamepad(profile: string, xrInputSource: any) {
		this.gamepad = xrInputSource.gamepad;

		const assetPath = profile + "/" + this.handedness + ".glb";
		if (this.modelLoaded) return;
		console.log("flag value == ");
		console.log(this.mapToDefaultController);

		if (!this.mapToDefaultController) {
			this.engine.scene
				.append(assetPath)
				.then((obj: any) => {
					this.controllerModel = obj;
					this.setComponentsActive(false);
					console.log("setting comp false ");
					this.controllerModel.parent = this.object;
					this.controllerModel.setTranslationLocal([0, 0, 0]);
					this.getGamepadObjectsFromProfile(
						this.ProfileJSON,
						this.controllerModel,
					);
					this.modelLoaded = this.isModelLoaded();
					this.setHandTrackingControllers(this.controllerModel);
					this.update = () => this.mapGamepadInput();
					console.log("model loaded to the scene");
				})
				.catch((e) => {
					console.error("failed to load 3d model");
					console.error(e);
					this.setComponentsActive(true);
					console.log("setting comp true");
				});
		} else {
			this.controllerModel = this.defaultController;
			this.getGamepadObjectsFromProfile(
				this.ProfileJSON,
				this.defaultController,
			);
			this.modelLoaded = this.isModelLoaded();
			this.update = () => this.mapGamepadInput();
			this.setHandTrackingControllers(this.defaultController);
		}
	}

	getGamepadObjectsFromProfile(profile: any, obj: any) {
		const components = profile.layouts[this.handedness].components;
		if (!components) return;

		for (const i in components) {
			if (components.hasOwnProperty(i)) {
				const visualResponses = components[i].visualResponses;

				for (const j in visualResponses) {
					if (visualResponses.hasOwnProperty(j)) {
						const valueNode = visualResponses[j].valueNodeName;
						const minNode = visualResponses[j].minNodeName;
						const maxNode = visualResponses[j].maxNodeName;

						this.getGamepadObjectByName(obj, valueNode);
						this.getGamepadObjectByName(obj, minNode);
						this.getGamepadObjectByName(obj, maxNode);
					}
				}
			}
		}
	}

	getGamepadObjectByName(obj: any, name: string) {
		if (!obj || !name) return;

		if (obj.name === name) this._gamepadObjects[name] = obj;

		const children = obj.children;
		for (let i = 0; i < children.length; ++i)
			this.getGamepadObjectByName(children[i], name);
	}

	assignTransform(target: any, min: any, max: any, value: number) {
		vec3.lerp(
			_TempVec,
			min.getPositionWorld(minTemp),
			max.getPositionWorld(maxTemp),
			value,
		);
		target.setTranslationWorld(_TempVec);

		quat.lerp(_TempQuat, min.rotationWorld, max.rotationWorld, value);
		quat.normalize(_TempQuat, _TempQuat);
		target.rotationWorld = _TempQuat;
	}

	mapGamepadInput() {
		const components = this.ProfileJSON.layouts[this.handedness].components;
		if (!components) return;

		for (const i in components) {
			if (components.hasOwnProperty(i)) {
				const component = components[i];
				const visualResponses = component.visualResponses;

				for (const j in visualResponses) {
					if (visualResponses.hasOwnProperty) {
						const visualResponse = visualResponses[j];
						const target =
							this._gamepadObjects[visualResponse.valueNodeName];
						const min =
							this._gamepadObjects[visualResponse.minNodeName];
						const max =
							this._gamepadObjects[visualResponse.maxNodeName];

						this.assignTransform(
							target,
							min,
							max,
							this.getGamepadValue(component, visualResponse),
						);
					}
				}
			}
		}
	}

	getGamepadValue(component: any, visualResponse: any) {
		if (visualResponse.valueNodeProperty === "transform") {
			switch (component.type) {
				case "button":
					return this.gamepad.buttons[component.gamepadIndices.button]
						.pressed;

				case "thumbstick":
					if (visualResponse.componentProperty === "button") {
						return this.gamepad.buttons[
							component.gamepadIndices.button
						].pressed;
					} else if (visualResponse.componentProperty === "xAxis") {
						return (
							(this.gamepad.axes[component.gamepadIndices.xAxis] +
								1) /
							2
						);
					} else if (visualResponse.componentProperty === "yAxis") {
						return (
							(this.gamepad.axes[component.gamepadIndices.yAxis] +
								1) /
							2
						);
					} else {
						console.log("unidentified componentProperty");
					}
				case "trigger":
					return this.gamepad.buttons[component.gamepadIndices.button]
						.value;

				case "squeeze":
					return this.gamepad.buttons[component.gamepadIndices.button]
						.value;
			}
		}
	}
}
