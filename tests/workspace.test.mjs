import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceGroups, documentUrl } from '../public/workspace-model.js';

test('workspace search combines title, location and type while respecting project status', () => {
  const records = [
    {id:1,title:'Deck repair',location:'Mishawaka',status:'Work In Progress'},
    {id:2,title:'Deck finish',status:'Completed'},
    {id:3,record_type:'quote',title:'Painting',location:'Mishawaka'},
  ];
  const matching=workspaceGroups(records, [{title:'Mishawaka porch'}], [], 'mishawaka', 'active');
  assert.deepEqual(matching.projects.map(r=>r.id),[1]);
  assert.deepEqual(matching.quotes.map(r=>r.id),[3]);
  assert.equal(matching.plans.length,1);
  assert.deepEqual(workspaceGroups(records,[],[],'deck','completed').projects.map(r=>r.id),[2]);
  assert.equal(workspaceGroups(records,[],[],'missing').projects.length,0);
});

test('document links permit existing PDFs and web files while rejecting executable schemes', () => {
  assert.equal(documentUrl('https://example.com/quote.pdf'),'https://example.com/quote.pdf');
  assert.equal(documentUrl('data:application/pdf;base64,JVBERg=='),'data:application/pdf;base64,JVBERg==');
  for(const value of ['javascript:alert(1)','data:text/html;base64,PHNjcmlwdD4=','//other-site.example/file','/\\evil.example',' JAVASCRIPT:alert(1)']) assert.equal(documentUrl(value),'');
});
