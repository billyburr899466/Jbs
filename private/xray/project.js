export const PROJECT_KEY = 'jbs-xray-projects-v1';
export const MAX_PROJECTS = 30;
export const MAX_PHOTOS = 12;
export const MAX_BACKUP_BYTES = 25_000_000;
export const DIMENSIONS = {
  length: [5, 200, 'Length', 'feet'],
  depth: [5, 200, 'Depth', 'feet'],
  height: [6, 30, 'Wall height', 'feet'],
  pitch: [0, 18, 'Roof pitch', 'inches per 12 inches'],
};
const sides = ['Front', 'Back', 'Left', 'Right', 'Interior', 'Floor plan', 'Other'];

export function normalizeDimensions(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Invalid project measurements.');
  const result = {};
  for (const [key, [min, max, label, unit]] of Object.entries(DIMENSIONS)) {
    if (input[key] === undefined) continue;
    const value = input[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
      throw Error(`${label} must be between ${min} and ${max} ${unit}.`);
    }
    result[key] = value;
  }
  return result;
}

export function normalizeProject(input) {
  if (!input || input.version !== 1 || typeof input.name !== 'string' || !input.name.trim() || !Array.isArray(input.photos)) {
    throw Error('Not a valid JB’s X-ray project.');
  }
  if (input.photos.length > MAX_PHOTOS) throw Error('Maximum 12 photos per project.');
  const photos = input.photos.map(photo => {
    if (!photo || typeof photo.url !== 'string' || photo.url.length > 2_000_000 || !/^data:image\/jpeg;base64,[a-z0-9+/]+={0,2}$/i.test(photo.url)) {
      throw Error('The project contains an invalid photo. No saved data was changed.');
    }
    return {url: photo.url, side: sides.includes(photo.side) ? photo.side : 'Other'};
  });
  return {
    version: 1,
    id: typeof input.id === 'string' ? input.id.slice(0, 120) : '',
    name: input.name.trim().slice(0, 100),
    dimensions: normalizeDimensions(input.dimensions),
    notes: typeof input.notes === 'string' ? input.notes.slice(0, 2000) : '',
    photos,
    updated: typeof input.updated === 'string' ? input.updated.slice(0, 40) : '',
  };
}

export function parseBackup(text) {
  if (new Blob([text]).size > MAX_BACKUP_BYTES) throw Error('Backup file is too large.');
  let data;
  try { data = JSON.parse(text); } catch { throw Error('This backup is not valid JSON.'); }
  if (data?.format !== 'jbs-xray-project') throw Error('Not a JB’s X-ray project backup.');
  return normalizeProject(data.project);
}

export function readProjects(storage) {
  const raw = storage.getItem(PROJECT_KEY);
  if (raw === null) return [];
  let records;
  try { records = JSON.parse(raw); } catch { throw Error('Saved project data could not be read. It has been kept unchanged.'); }
  if (!Array.isArray(records) || records.length > MAX_PROJECTS) throw Error('Saved project list is invalid. It has been kept unchanged.');
  const ids = new Set();
  return records.map(record => {
    const p = normalizeProject(record);
    if (!p.id || ids.has(p.id)) throw Error('Saved project IDs are invalid. Data has been kept unchanged.');
    ids.add(p.id);
    return p;
  });
}

export function saveProject(storage, project) {
  const p = normalizeProject(project);
  if (!p.id) throw Error('Project ID is missing.');
  const records = readProjects(storage);
  const existing = records.findIndex(item => item.id === p.id);
  if (existing >= 0) records[existing] = p;
  else {
    if (records.length >= MAX_PROJECTS) throw Error('30 projects saved. Back up and delete an old project first.');
    records.unshift(p);
  }
  storage.setItem(PROJECT_KEY, JSON.stringify(records));
  return p;
}

export function modelDimensions(input = {}) {
  const d = normalizeDimensions(input);
  const length = d.length ?? 36, depth = d.depth ?? 27, height = d.height ?? 14.55, pitch = d.pitch ?? 6;
  return {length, depth, height, pitch, rise: depth / 2 * pitch / 12};
}
