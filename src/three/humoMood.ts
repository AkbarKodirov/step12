/** Shared "excitement" for the 3D Humo — UI sets the target, the frame loop eases toward it. */
export const humoMood = { target: 0, value: 0 }
export const exciteHumo = (on: boolean) => {
  humoMood.target = on ? 1 : 0
}
