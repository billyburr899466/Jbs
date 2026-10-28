export const SCAN_LIMITS = Object.freeze({ minPhotos: 12, maxPhotos: 240, photoBytes: 25 * 1024 * 1024, totalBytes: 2 * 1024 ** 3, modelBytes: 48 * 1024 * 1024 });

export function validateManifest(input) {
  if (!input || typeof input.name !== 'string' || !input.name.trim() || input.name.length > 100) throw Error('Enter a scan name (up to 100 characters).');
  if (!Array.isArray(input.photos) || input.photos.length < SCAN_LIMITS.minPhotos || input.photos.length > SCAN_LIMITS.maxPhotos) throw Error('Choose 12–240 overlapping photos of one connected area.');
  const seen = new Set(); let total = 0;
  const photos = input.photos.map(photo => {
    if (!photo || typeof photo.name !== 'string' || photo.name.length > 200 || !['image/jpeg', 'image/png'].includes(photo.type)) throw Error('Use original JPG or PNG photos. Export HEIC files as JPG first.');
    if (!Number.isSafeInteger(photo.size) || photo.size < 100 || photo.size > SCAN_LIMITS.photoBytes) throw Error('Each photo must be under 25 MB.');
    if (!/^[a-f0-9]{64}$/.test(photo.sha256 || '') || seen.has(photo.sha256)) throw Error('Remove duplicate photos before starting the scan.');
    seen.add(photo.sha256); total += photo.size;
    return { name: photo.name, type: photo.type, size: photo.size, sha256: photo.sha256 };
  });
  if (total > SCAN_LIMITS.totalBytes) throw Error('Keep a scan under 2 GB. Capture large properties in separate sections.');
  return { name: input.name.trim(), photos };
}

// A self-contained GLB cannot request external URLs while being previewed.
export function inspectGlb(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (data.length < 24 || data.length > SCAN_LIMITS.modelBytes) throw Error('Use a GLB model under 48 MB.');
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== data.length) throw Error('This is not a valid GLB 2.0 model.');
  const length = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4e4f534a || length > 5 * 1024 * 1024 || length + 20 > data.length) throw Error('The model has an invalid scene description.');
  let document;
  try { document = JSON.parse(new TextDecoder().decode(data.subarray(20, 20 + length))); } catch { throw Error('The model has an invalid scene description.'); }
  if (document.asset?.version !== '2.0' || !Array.isArray(document.meshes) || !document.meshes.length) throw Error('The GLB does not contain a surface model.');
  for (const entry of [...(document.buffers || []), ...(document.images || [])]) {
    if (entry.uri) throw Error('Export a self-contained GLB with embedded textures and geometry. External files are not supported.');
  }
  const unsupported = (document.extensionsRequired || []).filter(x => ['KHR_draco_mesh_compression','EXT_meshopt_compression','KHR_texture_basisu'].includes(x));
  if (unsupported.length) throw Error('Export the GLB without Draco, Meshopt, or KTX2 compression.');
  let offset = 20 + length;
  while (offset < data.length) {
    if (offset + 8 > data.length) throw Error('The model is truncated.');
    offset += 8 + view.getUint32(offset, true);
    if (offset > data.length) throw Error('The model is truncated.');
  }
  return document;
}
