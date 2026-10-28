import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {normalizeDimensions, modelDimensions, parseBackup, readProjects, saveProject, PROJECT_KEY} from '../private/xray/project.js';
const project=(id='one')=>({version:1,id,name:'Kitchen',dimensions:{length:40,depth:30,height:9,pitch:6},notes:'Visible wall measured',photos:[{side:'Front',url:'data:image/jpeg;base64,/9j/2Q=='}]});
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}};
test('every public JavaScript file parses, including the customer entry module',()=>{
 for(const name of readdirSync(new URL('../public/',import.meta.url)).filter(n=>n.endsWith('.js')))execFileSync(process.execPath,['--check',new URL('../public/'+name,import.meta.url).pathname]);
});
test('measurements preserve unknown and flat roofs and reject bad ranges',()=>{
 assert.deepEqual(normalizeDimensions({pitch:0}),{pitch:0});assert.deepEqual(normalizeDimensions({}),{});
 for(const d of [{length:0},{depth:201},{height:31},{height:5},{pitch:19},{pitch:-1},{depth:'30'},{height:NaN},null,[]])assert.throws(()=>normalizeDimensions(d));
});
test('roof rise follows pitch and depth with partial measurements',()=>{
 assert.equal(modelDimensions({depth:30,pitch:6}).rise,7.5);assert.equal(modelDimensions({pitch:0}).rise,0);assert.equal(modelDimensions({pitch:12}).rise,13.5);assert.equal(modelDimensions({depth:30,height:9,pitch:6}).height,9);
});
test('backup roundtrip keeps photos and measurements and removes extra properties',()=>{
 const p=project();p.dimensions.attacker=100;p.photos[0].side='<script>alert(1)</script>';
 const restored=parseBackup(JSON.stringify({format:'jbs-xray-project',project:p}));
 assert.equal(restored.name,p.name);assert.equal(restored.photos[0].url,p.photos[0].url);assert.equal(restored.photos[0].side,'Other');assert.equal(restored.dimensions.attacker,undefined);
});
test('malformed backups fail without silently dropping photos',()=>{
 for(const p of [null,{}, {...project(),version:2}, {...project(),photos:[null]}, {...project(),photos:[{url:'https://example.com/private.jpg'}]}, {...project(),dimensions:{height:100}}, {...project(),photos:Array(13).fill(project().photos[0])}])assert.throws(()=>parseBackup(JSON.stringify({format:'jbs-xray-project',project:p})));
 assert.throws(()=>parseBackup('not json'));assert.throws(()=>parseBackup(JSON.stringify({format:'wrong',project:project()})));
});
test('saving updates preserves other projects and the thirty-first cannot evict saved work',()=>{
 const s=storage();for(let i=0;i<30;i++)saveProject(s,project('p'+i));
 const before=s.getItem(PROJECT_KEY);assert.throws(()=>saveProject(s,project('extra')),/30 projects/);assert.equal(s.getItem(PROJECT_KEY),before);
 saveProject(s,{...project('p3'),name:'Updated'});assert.equal(readProjects(s).length,30);assert.equal(readProjects(s).find(p=>p.id==='p3').name,'Updated');
});
test('corrupt storage and quota failures cannot overwrite saved projects',()=>{
 const s=storage();s.setItem(PROJECT_KEY,'broken');assert.throws(()=>saveProject(s,project()));assert.equal(s.getItem(PROJECT_KEY),'broken');
 const full={getItem:()=>JSON.stringify([project()]),setItem:()=>{throw new DOMException('Full','QuotaExceededError')}};
 assert.throws(()=>saveProject(full,project('two')),e=>e.name==='QuotaExceededError');assert.equal(readProjects(full).length,1);
});
test('owner workflow retains accuracy labels and return navigation',()=>{
 const html=readFileSync(new URL('../private/xray/workspace.html',import.meta.url),'utf8'),app=readFileSync(new URL('../public/customer-upgrade.js',import.meta.url),'utf8');
 assert.match(html,/Hidden assemblies are always illustrative/);assert.match(html,/Photos are visual references/);assert.match(html,/capture="environment"/);assert.match(html,/href="\/portal"/);assert.match(html,/https:\/\/jbsuniversalrenos.com/);assert.match(app,/data-owner-action="open-xray"/);assert.doesNotMatch(app,/data-action="open-xray"|no sign-in needed/);
});
