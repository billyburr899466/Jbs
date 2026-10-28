import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { inspectGlb } from '../lib/xray-formats.js';
export { inspectGlb };

export async function mountScanViewer(container, bytes) {
  inspectGlb(bytes);
  const manager = new THREE.LoadingManager();
  manager.setURLModifier(url => { if (!url.startsWith('blob:')) throw Error('External model resources are blocked.'); return url; });
  const loaded = await new GLTFLoader(manager).parseAsync(bytes, '');
  const model = loaded.scene;
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  if (bounds.isEmpty() || ![size.x,size.y,size.z,center.x,center.y,center.z].every(Number.isFinite) || size.length() <= 0) throw Error('The model does not have usable surface geometry.');
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#091d27');
  model.position.sub(center); scene.add(model);
  const radius = Math.max(size.x, size.y, size.z);
  const camera = new THREE.PerspectiveCamera(45, 1, radius / 10000, radius * 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', '3D scan. Drag to rotate, pinch or scroll to zoom, two-finger drag to pan.');
  renderer.domElement.setAttribute('role', 'img');
  container.replaceChildren(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = radius * .02; controls.maxDistance = radius * 15;
  const hemi = new THREE.HemisphereLight(0xffffff, 0x658497, 2.5); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2); sun.position.set(radius, radius * 2, radius); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xd7ebff, 1); fill.position.set(-radius, radius, -radius); scene.add(fill);
  const grid = new THREE.GridHelper(radius * 1.6, 16, 0x44766d, 0x213e49); grid.position.y = -size.y / 2; grid.visible = false; scene.add(grid);
  const render = () => renderer.render(scene, camera);
  function reset() { controls.target.set(0, 0, 0); camera.position.set(radius * 1.2, radius * .75, radius * 1.5); controls.update(); render(); }
  const resize = () => { const width = container.clientWidth, height = container.clientHeight; if (!width || !height) return; renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); render(); };
  const observer = new ResizeObserver(resize); observer.observe(container);
  controls.addEventListener('change', render); reset(); resize();
  container.dataset.loaded = 'true';
  let wire = false;
  return {
    reset,
    zoom(factor) { camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target); controls.update(); render(); },
    rotate(angle) { camera.position.sub(controls.target).applyAxisAngle(new THREE.Vector3(0,1,0), angle).add(controls.target); controls.update(); render(); },
    upright() { model.rotateX(Math.PI / 2); render(); },
    wireframe() { wire = !wire; model.traverse(node => { for (const material of [].concat(node.material || [])) material.wireframe = wire; }); render(); return wire; },
    grid() { grid.visible = !grid.visible; render(); return grid.visible; },
    dispose() {
      observer.disconnect(); controls.dispose();
      const textures = new Set();
      scene.traverse(node => {
        node.geometry?.dispose();
        for (const material of [].concat(node.material || [])) {
          for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
          material.dispose();
        }
      });
      for (const texture of textures) { texture.source?.data?.close?.(); texture.dispose(); }
      renderer.dispose(); renderer.forceContextLoss(); container.replaceChildren(); delete container.dataset.loaded;
    },
  };
}
