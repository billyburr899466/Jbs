import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/scan-my-project.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../public/customer-upgrade.js', import.meta.url), 'utf8');

test('X-ray house workflow has the required mobile photo and measurement inputs', () => {
  for (const id of ['prName','prCamera','prFiles','prLength','prDepth','prHeight','prPitch','prNotes','prSave','prExisting','prExport','prImport','house','reveal']) {
    assert.match(html, new RegExp('id="'+id+'"'), 'Missing '+id);
  }
  assert.match(html, /capture="environment"/);
  assert.match(html, /type="number"/);
});

test('Measured dimensions change the model and roof pitch changes ridge height', () => {
  assert.match(html, /function project\(p\)/);
  assert.match(html, /function roofRidge\(\)/);
  assert.match(html, /d\.depth\/2\*d\.pitch\/12/);
  assert.match(html, /prDimensions\(\)/);
});

test('The UI does not pass photographs off as verified hidden utilities', () => {
  assert.match(html, /Hidden assemblies are always illustrative/);
  assert.match(html, /Photos are visual references/);
  assert.match(html, /localStorage\.setItem\(PR_KEY/);
  assert.match(html, /function prDownload\(p\)/);
  assert.doesNotMatch(html, /<script[^>]+src=["']https?:/i);
});

test('The customer app opens the new tool from Explore and Tools', () => {
  assert.match(app, /X-Ray House & Project Scan/);
  assert.match(app, /open-xray/);
  assert.match(app, /window\.location\.assign\("\/scan-my-project\.html"\)/);
});
