import { PerspectiveCamera } from "three";

export const createCamera = (aspect: number) => {
  const camera = new PerspectiveCamera(52, aspect, 0.1, 100);
  camera.position.set(0, 14, 12);
  camera.lookAt(0, 0, 0);
  return camera;
};
