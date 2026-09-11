import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDeckBuilder } from '../public/customer-core.js';
import { renderDeck, deckOutline } from '../public/deck-visual.js';
function polygonArea(p){return Math.abs(p.reduce((a,v,i)=>{const n=p[(i+1)%p.length];return a+v[0]*n[1]-v[1]*n[0];},0)/2);}
test('L-shaped area matches its drawn footprint and configured cutout',()=>{const r=calculateDeckBuilder({shape:'l_shape',length:20,depth:14,notchLength:8,notchDepth:5});assert.equal(r.area,240);assert.equal(polygonArea(deckOutline(r.input)),240);assert.equal(r.perimeter,68);});
test('railing quantities omit the stair opening',()=>{const a=calculateDeckBuilder({length:16,depth:12,railing:'open_sides',stairWidth:4,stairLocation:'front'});const b=calculateDeckBuilder({...a.input,stairLocation:'none'});assert.equal(b.railingLinearFeet-a.railingLinearFeet,4);});
test('all supported layouts render without invalid coordinates',()=>{for(const shape of ['rectangle','l_shape'])for(const stairLocation of ['front','left','right','none'])for(const length of [4,16,60]){const r=calculateDeckBuilder({shape,stairLocation,length,depth:40,height:12});for(const view of [{},{top:true},{yaw:130,framing:true}]){const svg=renderDeck(r,view);assert.doesNotMatch(svg,/NaN|Infinity|undefined/);assert.match(svg,/<svg/);assert.equal(polygonArea(deckOutline(r.input)),r.area);}}});
