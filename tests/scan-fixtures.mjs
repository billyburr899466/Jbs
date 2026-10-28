import { randomUUID } from 'node:crypto';
import { zipSync } from 'fflate';
import { ScanError } from '../lib/xray-services.js';

export const owner = { id: '11111111-1111-4111-8111-111111111111', email: 'billyburr89@gmail.com' };
export const manifest = () => ({ id: randomUUID(), name: 'House test', photos: Array.from({length:12}, (_, i) => ({ name: `photo-${i}.jpg`, type: 'image/jpeg', size: 1000, sha256: i.toString(16).padStart(64, '0') })) });
export function testGlb(change = {}) {
  const positions = new Float32Array([-1,-1,0,1,-1,0,0,1,0, -1,-1,0,0,1,0,0,0,1]);
  const binary = Buffer.from(positions.buffer);
  const doc = { asset: {version:'2.0',generator:'JBs test fixture — not a reconstructed house'}, scene:0, scenes:[{nodes:[0]}], nodes:[{mesh:0}], meshes:[{primitives:[{attributes:{POSITION:0},material:0}]}], materials:[{pbrMetallicRoughness:{baseColorFactor:[.4,.9,.7,1],metallicFactor:0,roughnessFactor:1},doubleSided:true}], accessors:[{bufferView:0,componentType:5126,count:6,type:'VEC3',min:[-1,-1,0],max:[1,1,1]}], bufferViews:[{buffer:0,byteLength:binary.length}], buffers:[{byteLength:binary.length}], ...change };
  const json = Buffer.from(JSON.stringify(doc)); const padded = Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(padded);
  const output=Buffer.alloc(12+8+padded.length+8+binary.length);
  output.writeUInt32LE(0x46546c67,0);output.writeUInt32LE(2,4);output.writeUInt32LE(output.length,8);
  output.writeUInt32LE(padded.length,12);output.writeUInt32LE(0x4e4f534a,16);padded.copy(output,20);
  const offset=20+padded.length;output.writeUInt32LE(binary.length,offset);output.writeUInt32LE(0x004e4942,offset+4);binary.copy(output,offset+8);
  return output;
}
export function fakeScanServices() {
  const rows = new Map(), uploaded = new Map(), calls = [], options = { code:10, progress:0, failUpload:false, lock:false, archive:zipSync({'odm_texturing/test.glb':testGlb()}) };
  const clone = x => structuredClone(x);
  const store = {
    async list(uid) {return [...rows.values()].filter(j=>j.owner_id===uid).map(clone);},
    async get(id,uid) {const j=rows.get(id);return j?.owner_id===uid?clone(j):null;},
    async insert(j) {if([...rows.values()].some(x=>x.owner_id===j.owner_id&&['uploading','sending','queued','running'].includes(x.status)))throw new ScanError('Active scan already exists',409);const row={inflight:null,submitted:false,error:null,created_at:new Date().toISOString(),...clone(j)};rows.set(j.id,row);return clone(row);},
    async patch(j,p) {Object.assign(rows.get(j.id),clone(p));return clone(rows.get(j.id));},
    async lock(j) {if(options.lock)throw new ScanError('Busy',409);return clone(rows.get(j.id));},
    async unlock() {},
    async uploaded(j) {return uploaded.get(j.id)||[];},
    async uploadUrl(j,i) {return `https://storage.test/${j.id}/${i}`;},
    async photo() {return new Blob([Buffer.alloc(1000)]);},
    async saveModel(j,b) {calls.push(['save',b.length]);return `${j.owner_id}/${j.id}/model.glb`;},
    async modelUrl(j) {return 'https://storage.test/'+j.model_path;},
    async delete(j) {rows.delete(j.id);calls.push(['delete',j.id]);},
  };
  const provider = {
    async check(){calls.push(['check']);},async init(){calls.push(['init']);return randomUUID();},
    async upload(j,i){calls.push(['upload',i]);if(options.failUpload)throw Error('token=must-not-leak');},
    async commit(){calls.push(['commit']);},async info(){return {status:{code:options.code},progress:options.progress};},
    async cancel(){calls.push(['cancel']);},async remove(){calls.push(['remove']);},async archive(){calls.push(['archive']);return options.archive;},
  };
  return {configured:true,storageReady:true,fingerprint:'processor-test',store,provider,rows,uploaded,calls,options};
}
