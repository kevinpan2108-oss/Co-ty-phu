// Rotation needed to bring each numbered cube face toward the camera.
export const CUBE_ROT = Object.freeze({
  1: Object.freeze([0, 0]),
  2: Object.freeze([0, -90]),
  3: Object.freeze([-90, 0]),
  4: Object.freeze([90, 0]),
  5: Object.freeze([0, 90]),
  6: Object.freeze([0, 180])
});

export function cubeTransform(value, spin = [0, 0]) {
  const number = Number(value);
  const face = Number.isInteger(number) && number >= 1 && number <= 6 ? number : 1;
  const [faceX, faceY] = CUBE_ROT[face];
  const spinX = Number(spin?.[0]);
  const spinY = Number(spin?.[1]);
  const safeSpinX = Number.isFinite(spinX) ? spinX : 0;
  const safeSpinY = Number.isFinite(spinY) ? spinY : 0;
  return `rotateX(${safeSpinX}deg) rotateY(${safeSpinY}deg) rotateX(${faceX}deg) rotateY(${faceY}deg)`;
}
