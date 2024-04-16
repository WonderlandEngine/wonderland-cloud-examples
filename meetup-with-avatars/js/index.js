/**
 * /!\ This file is auto-generated.
 *
 * This is the entry point of your standalone application.
 *
 * There are multiple tags used by the editor to inject code automatically:
 *     - `wle:auto-imports:start` and `wle:auto-imports:end`: The list of import statements
 *     - `wle:auto-register:start` and `wle:auto-register:end`: The list of component to register
 *     - `wle:auto-constants:start` and `wle:auto-constants:end`: The project's constants,
 *        such as the project's name, whether it should use the physx runtime, etc...
 *     - `wle:auto-benchmark:start` and `wle:auto-benchmark:end`: Append the benchmarking code
 */

/* wle:auto-imports:start */
import {Cursor} from '@wonderlandengine/components';
import {CursorTarget} from '@wonderlandengine/components';
import {FingerCursor} from '@wonderlandengine/components';
import {HandTracking} from '@wonderlandengine/components';
import {HowlerAudioListener} from '@wonderlandengine/components';
import {MouseLookComponent} from '@wonderlandengine/components';
import {PlayerHeight} from '@wonderlandengine/components';
import {TeleportComponent} from '@wonderlandengine/components';
import {VrModeActiveSwitch} from '@wonderlandengine/components';
import {WasdControlsComponent} from '@wonderlandengine/components';
import {AudioListener} from '@wonderlandengine/spatial-audio';
import {AudioSource} from '@wonderlandengine/spatial-audio';
import {Animate} from './animate.js';
import {CopyRotation} from './copy-rotation.js';
import {EventsClient} from './events-client.js';
import {Fullscreen} from './fullscreen.js';
import {Hyperbeam} from './hyperbeam.js';
import {InputProfile} from './input-profile.js';
import {LookAtPlayer} from './look-at.js';
import {MobileActiveSwitch} from './mobile-active-switch.js';
import {RadioToggle} from './radio-toggle.js';
import {SnapRotate} from './snap-rotaion.js';
import {SpeakerIndicator} from './speaker-indicator.js';
import {Toggle} from './toggle.js';
import {TouchLook} from './touch-look.js';
import {TouchMove} from './touch-move.js';
import {TouchUI} from './touch-ui.js';
import {Interactor} from './wle-interaction/index.js';
/* wle:auto-imports:end */

import {loadRuntime} from '@wonderlandengine/api';
import * as API from '@wonderlandengine/api'; // Deprecated: Backward compatibility.

/* wle:auto-constants:start */
const RuntimeOptions = {
    physx: false,
    loader: true,
    xrFramebufferScaleFactor: 1,
    canvas: 'canvas',
};
const Constants = {
    ProjectName: 'Events',
    RuntimeBaseName: 'WonderlandRuntime',
    WebXRRequiredFeatures: ['local',],
    WebXROptionalFeatures: ['local','local-floor','hand-tracking','hit-test',],
};
/* wle:auto-constants:end */

const engine = await loadRuntime(Constants.RuntimeBaseName, RuntimeOptions);
Object.assign(engine, API); // Deprecated: Backward compatibility.
window.WL = engine; // Deprecated: Backward compatibility.

engine.onSceneLoaded.once(() => {
    const el = document.getElementById('version');
    if (el) setTimeout(() => el.remove(), 2000);
});

/* WebXR setup. */

function requestSession(mode) {
    engine
        .requestXRSession(mode, Constants.WebXRRequiredFeatures, Constants.WebXROptionalFeatures)
        .catch((e) => console.error(e));
}

function setupButtonsXR() {
    /* Setup AR / VR buttons */
    const arButton = document.getElementById('ar-button');
    if (arButton) {
        arButton.dataset.supported = engine.arSupported;
        arButton.addEventListener('click', () => requestSession('immersive-ar'));
    }
    const vrButton = document.getElementById('vr-button');
    if (vrButton) {
        vrButton.dataset.supported = engine.vrSupported;
        vrButton.addEventListener('click', () => requestSession('immersive-vr'));
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('load', setupButtonsXR);
} else {
    setupButtonsXR();
}

/* wle:auto-register:start */
engine.registerComponent(Cursor);
engine.registerComponent(CursorTarget);
engine.registerComponent(FingerCursor);
engine.registerComponent(HandTracking);
engine.registerComponent(HowlerAudioListener);
engine.registerComponent(MouseLookComponent);
engine.registerComponent(PlayerHeight);
engine.registerComponent(TeleportComponent);
engine.registerComponent(VrModeActiveSwitch);
engine.registerComponent(WasdControlsComponent);
engine.registerComponent(AudioListener);
engine.registerComponent(AudioSource);
engine.registerComponent(Animate);
engine.registerComponent(CopyRotation);
engine.registerComponent(EventsClient);
engine.registerComponent(Fullscreen);
engine.registerComponent(Hyperbeam);
engine.registerComponent(InputProfile);
engine.registerComponent(LookAtPlayer);
engine.registerComponent(MobileActiveSwitch);
engine.registerComponent(RadioToggle);
engine.registerComponent(SnapRotate);
engine.registerComponent(SpeakerIndicator);
engine.registerComponent(Toggle);
engine.registerComponent(TouchLook);
engine.registerComponent(TouchMove);
engine.registerComponent(TouchUI);
engine.registerComponent(Interactor);
/* wle:auto-register:end */

engine.scene.load(`${Constants.ProjectName}.bin`).catch((e) => {
    console.error(e);
    window.alert(`Failed to load ${Constants.ProjectName}.bin:`, e);
});

/* wle:auto-benchmark:start */
/* wle:auto-benchmark:end */
