// Virtual joystick / buttons write here; the player reads it alongside the keyboard.
export const touch = {
  move: { x: 0, y: 0 }, // x: right +, y: back + (same convention as keys)
  sprint: false,
  jump: false,
  look: { dx: 0, dy: 0 }, // accumulated camera drag, consumed by the camera rig
};
