export * from '../../node_modules/three/build/three.module.js';
export const captured = [];
export class WebGLRenderer { constructor() { this.autoClear = true; } resetState() {} dispose() {}
  render(scene, camera) { captured.push({ scene, proj: Array.from(camera.projectionMatrix.elements) }); } }
