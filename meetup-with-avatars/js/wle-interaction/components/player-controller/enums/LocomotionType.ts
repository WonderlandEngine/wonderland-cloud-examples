/**
 * The type of locomotion to use for the player
 */

export enum LocomotionType {
    /**
     * Teleportation locomotion is the most comfortable for most people.
     */
    Teleport,
    /**
     * Smooth locomotion is the most immersive, but can cause motion sickness.
     */
    Smooth,
    /**
     * None means that the player cannot move using the controllers. This is useful for
     * experiences that use room-scale VR.
     */
    None,
}
