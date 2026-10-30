import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateEstimate} from '../lib/estimate-validation.mjs';
const valid={name:'Taylor Customer',city:'Elkhart',phone:'574-555-0199',email:'',projectType:'Garage or interior renovation',description:'We want to renovate our two-car garage.',contactPreference:'phone',timeframe:'Within 1–3 months',source:'facebook:garage_winter_7day',consent:true};
test('accepts a local estimate with phone contact and server-side normalized data',()=>{
 const r=validateEstimate(valid);assert.equal(r.ok,true);assert.equal(r.data.customer_name,'Taylor Customer');assert.equal(r.data.city,'Elkhart');assert.equal(r.data.customer_email,null);
});
test('requires permission to contact and adequate project description',()=>{
 assert.equal(validateEstimate({...valid,consent:false}).ok,false);
 assert.equal(validateEstimate({...valid,description:'short'}).ok,false);
});
test('requires usable phone or email, validates email',()=>{
 assert.equal(validateEstimate({...valid,phone:'',email:''}).ok,false);
 assert.equal(validateEstimate({...valid,email:'not an address',phone:''}).ok,false);
 assert.equal(validateEstimate({...valid,email:'taylor@example.com',phone:''}).ok,true);
});
test('rejects overly long or malformed fields',()=>{
 assert.equal(validateEstimate({...valid,name:'X'.repeat(125)}).ok,false);
 assert.equal(validateEstimate({...valid,phone:'ABC-INVALID'}).ok,false);
 assert.equal(validateEstimate({...valid,city:''}).ok,false);
});
test('public form and owner inbox have required wiring',()=>{
 const form=readFileSync(new URL('../public/estimate.html',import.meta.url),'utf8');
 const inbox=readFileSync(new URL('../public/owner-estimate-leads.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../public/customer-upgrade.js',import.meta.url),'utf8');
 for(const term of ['name="name"','name="city"','name="projectType"','name="description"','name="consent"',"fetch('/api/estimate'"]){assert.ok(form.includes(term),term)}
 assert.ok(inbox.includes('/api/estimate/leads'));
 assert.ok(app.includes('view-estimate-leads'));
 assert.ok(form.includes("window.fbq('track','Lead')"));
 assert.ok(form.includes("params.get('utm_content')"));
 assert.ok(inbox.includes('Facebook ad quotes'));
 assert.ok(inbox.includes('Garage campaign quotes'));
 assert.ok(inbox.includes('Other form quotes'));
});
