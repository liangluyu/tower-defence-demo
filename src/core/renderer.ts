import { SRGBColorSpace, PCFSoftShadowMap, WebGLRenderer } from "three";

export const createRenderer = () => {
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.outputColorSpace = SRGBColorSpace;
  return renderer;
};
