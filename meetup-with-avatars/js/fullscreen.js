import {Component, Property} from "@wonderlandengine/api";

export class Fullscreen extends Component {
	static TypeName = "fullscreen";
	static Properties = {
		fullScreenIconUrl: Property.string(),
	};

	start() {
		this.createDynamicHtml();
		this.vrButton = document.getElementById("vr-button");
		console.log(window.EMBED_URL);
		this.vrButton.style.display = "none";
		this.UpdateXrIconVisibility();
	}

	createDynamicHtml() {
		const iconFullscreenSrc =
			this.fullScreenIconUrl ||
			"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='110'%3E%3Crect width='300' height='100' style='fill:transparent;stroke-width:4;stroke:black' /%3E%3C/svg%3E";
		const iconFullscreen = document.createElement("img");
		iconFullscreen.src = iconFullscreenSrc;
		iconFullscreen.draggable = "false";
		iconFullscreen.type = "button";
		iconFullscreen.id = "fullscreen";
		iconFullscreen.setAttribute(
			"onclick",
			"if(document.fullscreenElement) {document.exitFullscreen().then(() => {}).catch((err) => console.error(err))} else {document.documentElement.requestFullscreen();}",
		);
		iconFullscreen.setAttribute("data-loaded", "false");
		iconFullscreen.setAttribute(
			"style",
			"border:10px; bottom:10px; height:50px;width:50px;right:5px; position:absolute;",
		);
		document.body.appendChild(iconFullscreen);
	}

	UpdateXrIconVisibility() {
		const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
		const isVRHeadset = /(?:Oculus|Valve|Pico)/i.test(navigator.userAgent);

		if (isVRHeadset) {
			this.vrButton.style.display = "block";
			console.log("VR Headset");
		} else if (isMobile) {
			console.log("Mobile");
		} else {
			console.log("PC");
		}
	}
}
