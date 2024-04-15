import {
  Component,
  Material,
  MeshComponent,
  Object3D,
} from "@wonderlandengine/api";
import { property } from "@wonderlandengine/api/decorators.js";

export enum SpeakerState {
  NotSpeaking,
  Speaking,
  Muted,
}

export class SpeakerIndicator extends Component {
  static TypeName = "speaker-indicator";

  @property.material()
  speaking?: Material;

  @property.material()
  notSpeaking?: Material;

  @property.material()
  muted?: Material;

  private mesh!: MeshComponent;

  start(): void {
    this.mesh = this.object.getComponent(MeshComponent)!;
    this.setState(SpeakerState.NotSpeaking);
  }

  setState(state: SpeakerState) {
    switch (state) {
      case SpeakerState.NotSpeaking:
        this.mesh.material = this.notSpeaking;
        break;
      case SpeakerState.Speaking:
        this.mesh.material = this.speaking;
        break;
      case SpeakerState.Muted:
        this.mesh.material = this.muted;
        break;
    }
  }
}
