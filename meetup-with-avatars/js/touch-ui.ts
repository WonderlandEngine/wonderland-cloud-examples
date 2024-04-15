import {Component} from "@wonderlandengine/api";
import {property} from "@wonderlandengine/api/decorators.js";

/**
 * Simple touch UI for mobile devices.
 */
export class TouchUI extends Component {
	static TypeName = "touch-ui";

	@property.bool(false)
	isTranslationEnabled = false;
	@property.bool(false)
	isRotationEnabled = false;

	private joystick1!: JoystickController;
	private joystick2!: JoystickController;

	public get joystick1Value() {
		return {
			x: this.joystick1.x,
			y: this.joystick1.y,
			isTouching: this.joystick1.active,
		};
	}

	public get joystick2Value() {
		return {
			x: this.joystick2.x,
			y: this.joystick2.y,
			isTouching: this.joystick2.active,
		};
	}

	start() {
		this.createDynamicHtml();
		this.createJoystick();
	}

	createJoystick() {
		this.joystick1 = new JoystickController("stick1", 64, 8);
		this.joystick2 = new JoystickController("stick2", 64, 8);
	}

	onActivate(): void {
		if (this.isTranslationEnabled) {
			this.joystick1.activate();
			document.getElementById("joystickTranslation")!.style.display =
				"block";
		}
		if (this.isRotationEnabled) {
			this.joystick2.activate();
			document.getElementById("joystickRotation")!.style.display =
				"block";
		}
	}

	onDeactivate(): void {
		if (this.isTranslationEnabled) {
			this.joystick1.deactivate();
			document.getElementById("joystickTranslation")!.style.display =
				"none";
		}
		if (this.isRotationEnabled) {
			this.joystick2.deactivate();
			document.getElementById("joystickRotation")!.style.display = "none";
		}
	}

	createDynamicHtml() {
		//image asset source assignment (change this source to have custom icons )
		const iconJoystickBodySrc = "images/joystick-body.png";
		const iconJoystickBaseSrc = "images/joystick-base.png";
		const iconJoystickBaseHorizontalSrc = "images/joystick-base.png";

		const joystickTranslation = document.createElement("div");
		joystickTranslation.id = "joystickTranslation";
		joystickTranslation.setAttribute(
			"style",
			" width: 128px; position: absolute; left:10%; bottom:5%",
		);
		document.body.appendChild(joystickTranslation);

		const joystickBase = document.createElement("img");
		joystickBase.src = iconJoystickBaseSrc;
		joystickBase.draggable = false;
		joystickBase.setAttribute("style", "opacity:0.7;");
		joystickBase.setAttribute("data-loaded", "false");
		document
			.getElementById("joystickTranslation")
			?.appendChild(joystickBase);

		const stick1 = document.createElement("div");
		stick1.id = "stick1";
		stick1.setAttribute(
			"style",
			"position: absolute; left:32px; top:32px;",
		);
		document.getElementById("joystickTranslation")?.appendChild(stick1);

		const joystickBody1 = document.createElement("img");
		joystickBody1.src = iconJoystickBodySrc;
		joystickBody1.draggable = false;
		joystickBody1.setAttribute("style", "opacity: 0.7;");
		joystickBody1.setAttribute("data-loaded", "false");
		document.getElementById("stick1")?.appendChild(joystickBody1);

		const joystickRotation = document.createElement("div");
		joystickRotation.id = "joystickRotation";
		joystickRotation.setAttribute(
			"style",
			" width: 128px; position: absolute; right:10%; bottom:5%",
		);
		document.body.appendChild(joystickRotation);

		const joystickBaseHorizontal = document.createElement("img");
		joystickBaseHorizontal.src = iconJoystickBaseHorizontalSrc;
		joystickBaseHorizontal.draggable = false;
		joystickBaseHorizontal.setAttribute("style", "opacity:0.7;");
		joystickBaseHorizontal.setAttribute("data-loaded", "false");
		document
			.getElementById("joystickRotation")
			?.appendChild(joystickBaseHorizontal);

		const stick2 = document.createElement("div");
		stick2.id = "stick2";
		stick2.setAttribute(
			"style",
			"position: absolute; right :32px; top:32px;",
		);
		document.getElementById("joystickRotation")?.appendChild(stick2);

		const joystickBody2 = document.createElement("img");
		joystickBody2.src = iconJoystickBodySrc;
		joystickBody2.draggable = false;
		joystickBody2.setAttribute("style", "opacity: 0.7;");
		joystickBody2.setAttribute("data-loaded", "false");
		document.getElementById("stick2")?.appendChild(joystickBody2);
	}
}

class JoystickController {
	x = 0;
	y = 0;
	id: string;

	private dragStart: {x: number; y: number} | null;
	private touchId: number | null;
	active: boolean;
	private value = {x: 0, y: 0};

	private stick: HTMLElement;
	private maxDistance: number;
	private deadzone: number;

	// stickID: ID of HTML element (representing joystick) that will be dragged
	// maxDistance: maximum amount joystick can move in any direction
	// deadzone: joystick must move at least this amount from origin to register value change
	constructor(stickID: string, maxDistance: number, deadzone: number) {
		this.id = stickID;
		this.stick = document.getElementById(stickID)!;

		// location from which drag begins, used to calculate offsets
		this.dragStart = null;

		// track touch identifier in case multiple joysticks present
		this.touchId = null;

		this.active = false;
		this.value = {x: 0, y: 0};
		this.maxDistance = maxDistance;
		this.deadzone = deadzone;
	}

	activate() {
		this.stick.addEventListener("mousedown", this.handleDown);
		this.stick.addEventListener("touchstart", this.handleDown);
		document.addEventListener("mousemove", this.handleMove, {
			passive: false,
		});
		document.addEventListener("touchmove", this.handleMove, {
			passive: false,
		});
		document.addEventListener("mouseup", this.handleUp);
		document.addEventListener("touchend", this.handleUp);
	}

	deactivate() {
		this.stick.removeEventListener("mousedown", this.handleDown);
		this.stick.removeEventListener("touchstart", this.handleDown);
		document.removeEventListener("mousemove", this.handleMove);
		document.removeEventListener("touchmove", this.handleMove);
		document.removeEventListener("mouseup", this.handleUp);
		document.removeEventListener("touchend", this.handleUp);
	}

	handleDown = (event: MouseEvent | TouchEvent) => {
		this.active = true;

		// all drag movements are instantaneous
		this.stick.style.transition = "0s";

		// touch event fired before mouse event; prevent redundant mouse event from firing
		event.preventDefault();

		if ("changedTouches" in event) {
			this.dragStart = {
				x: event.changedTouches[0].clientX,
				y: event.changedTouches[0].clientY,
			};
		} else {
			this.dragStart = {x: event.clientX, y: event.clientY};
		}

		// if this is a touch event, keep track of which one
		if ("changedTouches" in event) {
			this.touchId = event.changedTouches[0].identifier;
		}
	};

	handleMove = (event: MouseEvent | TouchEvent) => {
		if (!this.active) {
			return;
		}

		// if this is a touch event, make sure it is the right one
		// also handle multiple simultaneous touchmove events
		let touchmoveId = null;
		let clientX = 0;
		let clientY = 0;
		if ("changedTouches" in event) {
			for (let i = 0; i < event.changedTouches.length; i++) {
				if (this.touchId == event.changedTouches[i].identifier) {
					touchmoveId = i;
					clientX = event.changedTouches[i].clientX;
					clientY = event.changedTouches[i].clientY;
				}
			}

			if (touchmoveId == null) {
				return;
			}
		} else {
			clientX = event.clientX;
			clientY = event.clientY;
		}

		const xDiff = clientX - (this.dragStart?.x || 0);
		const yDiff = clientY - (this.dragStart?.y || 0);
		const angle = Math.atan2(yDiff, xDiff);
		const distance = Math.min(this.maxDistance, Math.hypot(xDiff, yDiff));
		const xPosition = distance * Math.cos(angle);
		const yPosition = distance * Math.sin(angle);

		// move stick image to new position
		this.stick.style.transform = `translate3d(${xPosition}px, ${yPosition}px, 0px)`;

		// deadzone adjustment
		const distance2 =
			distance < this.deadzone
				? 0
				: (this.maxDistance / (this.maxDistance - this.deadzone)) *
				  (distance - this.deadzone);
		const xPosition2 = distance2 * Math.cos(angle);
		const yPosition2 = distance2 * Math.sin(angle);
		const xPercent = parseFloat((xPosition2 / this.maxDistance).toFixed(4));
		const yPercent = parseFloat((yPosition2 / this.maxDistance).toFixed(4));

		this.value = {x: xPercent, y: yPercent};
		this.x = xPercent;
		this.y = yPercent;
	};

	handleUp = (event: MouseEvent | TouchEvent) => {
		if (!this.active) {
			return;
		}

		// if this is a touch event, make sure it is the right one
		if (
			"changedTouches" in event &&
			this.touchId != event.changedTouches[0].identifier
		) {
			return;
		}

		// transition the joystick position back to center
		this.stick.style.transition = ".2s";
		this.stick.style.transform = `translate3d(0px, 0px, 0px)`;

		// reset everything
		this.value = {x: 0, y: 0};
		this.x = 0;
		this.y = 0;
		this.touchId = null;
		this.active = false;
	};
}
