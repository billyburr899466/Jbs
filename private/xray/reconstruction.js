// Photo reconstruction is deliberately separate from the illustrative construction model.
(() => {
  const $ = id => document.getElementById(id);
  const base = '/api/owner/scans';
  let configured = false, selected = [], manifests = [], jobs = [], active = null, busy = false, pollTimer, viewer, modelBlob, modelName, modelUrl;
  let previewUrls = [], pollFailures = 0, requestGeneration = 0, pauseRequested = false, setupAvailable = false, connectionLoaded = false;
  const session = () => JSON.parse(localStorage.getItem('sb-bjmdtxxlzzhxskxkllvt-auth-token') || 'null');
  const ownerKey = () => session()?.user?.id || 'owner';
  function notice(text, bad = false) { $('scanNotice').textContent = text; $('scanNotice').classList.toggle('scan-error', bad); }
  function report(error) { notice(error.message || 'The scan could not be opened. Try again.', true); }
  async function api(path = '', method = 'GET', body) {
    const token = session()?.access_token;
    if (!token) throw Error('Open the owner app and sign in again.');
    const result = await fetch(base + path, { method, cache: 'no-store', headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(70000) });
    const data = await result.json();
    if (!result.ok) { if (data.scan) renderJob(data.scan); throw Error(data.error || data.scan?.error || 'The scan request failed. Try again.'); }
    return data;
  }
  function setBusy(value) {
    busy = value;
    $('scanBuild').disabled = value || !configured || selected.length < 12;
    for (const id of ['scanFiles','scanClear','scanName','scanExisting','scanRefresh','scanResume','scanRetry','scanCancel','scanDelete','scanOpen','scanImport','scanReopen']) $(id).disabled = value;
    $('scanBuild').textContent = value ? 'Working…' : 'Build 3D scan';
    $('scanPause').hidden = !value || !active || !['uploading','sending'].includes(active.status);
    $('scanToken').disabled = $('scanConnect').disabled = value || !setupAvailable;
    $('scanCheck').disabled = value || !configured;
  }
  function renderJob(job) {
    active = job;
    $('scanJob').hidden = !job;
    if (!job) return;
    const labels = { uploading: 'Uploading originals', sending: 'Sending photos to processor', queued: 'Queued for reconstruction', running: 'Reconstructing visible surfaces', completed: '3D model ready', failed: 'Reconstruction needs attention', canceled: 'Scan canceled' };
    $('scanJobTitle').textContent = job.name;
    $('scanJobState').textContent = labels[job.status] || job.status;
    $('scanJobDetail').textContent = job.error || (job.status === 'sending' ? `${job.forwarded} of ${job.photos.length} photos sent` : ['queued','running'].includes(job.status) ? 'Processing continues after you leave. Return here to check the result.' : job.status === 'completed' ? 'The scan includes surfaces the photos captured. Scale and completeness are not verified.' : 'Original photos are stored privately for this scan.');
    $('scanProgress').value = job.status === 'sending' ? job.forwarded / job.photos.length * 100 : job.progress || 0;
    $('scanProgress').hidden = !['sending','queued','running','completed'].includes(job.status);
    $('scanResume').hidden = !['uploading','sending'].includes(job.status);
    $('scanRetry').hidden = !['failed','canceled'].includes(job.status);
    $('scanCancel').hidden = !['uploading','sending','queued','running'].includes(job.status);
    $('scanOpen').hidden = job.status !== 'completed';
    $('scanPause').hidden = !busy || !['uploading','sending'].includes(job.status);
    jobs = [job, ...jobs.filter(j => j.id !== job.id)]; renderList();
  }
  function renderList() {
    $('scanExisting').replaceChildren(new Option('Open a saved scan…', ''));
    for (const job of jobs) $('scanExisting').add(new Option(`${job.name} · ${job.status}`, job.id));
    $('scanExisting').value = active?.id || '';
  }
  async function refresh() {
    const data = await api(); configured = data.configured; jobs = data.scans; renderList();
    $('scanConnection').textContent = configured ? 'Processor configured · Ready to check and start' : 'Setup needed · Processing server is not connected yet';
    $('scanConnection').classList.toggle('scan-pending', !configured);
    $('scanConnectionHelp').hidden = configured;
    const connection = await api('/processor');
    setupAvailable = connection.setupAvailable;
    if (connection.savedConnection && configured) $('scanConnection').textContent = 'WebODM account connected · Ready to check and start';
    if (!connectionLoaded) { $('scanConnectionSetup').open = !configured; connectionLoaded = true; }
    if (!setupAvailable && !configured) $('scanConnectNotice').textContent = 'Secure connection setup is temporarily unavailable. Refresh to try again.';
    setBusy(busy);
  }
  function connectionNotice(text, bad = false) { $('scanConnectNotice').textContent = text; $('scanConnectNotice').classList.toggle('scan-error', bad); }
  $('scanConnectForm').onsubmit = async event => {
    event.preventDefault(); if (busy || !setupAvailable) return;
    let token = $('scanToken').value.trim(); $('scanToken').value = ''; setBusy(true);
    connectionNotice('Verifying the WebODM token and 3D output support…');
    try {
      await api('/processor', 'POST', { token }); token = '';
      await refresh();
      connectionNotice('Connected to WebODM Lightning. You can now choose photos and build a 3D scan. Processing uses your WebODM credits.');
    } catch (error) { connectionNotice(error.message, true); }
    finally { token = ''; $('scanToken').value = ''; setBusy(false); }
  };
  $('scanCheck').onclick = async () => {
    if (busy) return; setBusy(true); connectionNotice('Checking the processing server…');
    try { await api('/connection'); connectionNotice('Connection verified. The server accepts your account token and supports 3D models.'); }
    catch (error) { connectionNotice(error.message, true); }
    finally { setBusy(false); }
  };
  function schedulePoll() {
    clearTimeout(pollTimer);
    if (active && ['queued','running'].includes(active.status)) pollTimer = setTimeout(poll, document.hidden ? 30000 : 8000);
  }
  async function poll() {
    if (busy || !active) { schedulePoll(); return; }
    const id = active.id, generation = requestGeneration;
    try {
      const data = await api('/' + id);
      if (generation !== requestGeneration || active?.id !== id) return;
      renderJob(data.scan); pollFailures = 0;
    } catch (error) {
      pollFailures++; report(error);
      if (pollFailures >= 3) { notice('Status checks paused after connection errors. Tap Refresh to reconnect.', true); return; }
    }
    schedulePoll();
  }
  function clearPhotos() {
    selected = []; manifests = []; $('scanFiles').value = '';
    previewUrls.forEach(URL.revokeObjectURL); previewUrls = []; $('scanPhotos').replaceChildren();
    $('scanPhotoSummary').textContent = 'No scan photos selected.'; setBusy(false);
  }
  async function choosePhotos(files) {
    if (!files.length) return; setBusy(true);
    try {
      if (files.length > 240) throw Error('Choose at most 240 photos per scan.');
      const next = [], total = files.reduce((sum, file) => sum + file.size, 0);
      if (total > 2 * 1024 ** 3) throw Error('Keep each scan under 2 GB.');
      const seen = new Set();
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!['image/jpeg','image/png'].includes(file.type) || file.size < 100 || file.size > 25 * 1024 * 1024) throw Error('Use original JPG or PNG photos, up to 25 MB each.');
        notice(`Checking photo ${i + 1} of ${files.length}…`);
        const bytes = await file.arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        const sha256 = [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
        if (seen.has(sha256)) throw Error('The selection includes duplicate photos. Choose different overlapping views.');
        seen.add(sha256);
        const image = await createImageBitmap(file).catch(() => null);
        if (!image) throw Error(`${file.name} could not be read as a photograph.`);
        const usable = Math.min(image.width, image.height) >= 640; image.close();
        if (!usable) throw Error('Use full-size photos at least 640 pixels on the shorter side.');
        next.push({ name: file.name, type: file.type, size: file.size, sha256 });
      }
      clearPhotos(); selected = files; manifests = next;
      for (const file of selected.slice(0, 12)) {
        const img = document.createElement('img'); const url = URL.createObjectURL(file); previewUrls.push(url);
        img.src = url; img.alt = file.name; img.loading = 'lazy'; $('scanPhotos').append(img);
      }
      $('scanPhotoSummary').textContent = `${files.length} original photos · ${(total / 1024 / 1024).toFixed(1)} MB${files.length > 12 ? ' · First 12 shown' : ''}`;
      notice(files.length < 12 ? 'Select at least 12 overlapping photos. A full house usually needs many more.' : 'Photos checked. Choose a scan name, then start when the processor is connected.');
    } finally { setBusy(false); }
  }
  async function uploadOriginals(job) {
    const data = await api('/' + job.id);
    const uploaded = new Set(data.uploaded || []);
    if (uploaded.size < job.photos.length && (JSON.stringify(manifests) !== JSON.stringify(job.photos))) throw Error('Reselect the same original photo set to resume this upload.');
    for (let i = 0; i < job.photos.length; i++) {
      if (pauseRequested) throw Error('Upload paused. Tap Resume to continue with the same original photos.');
      if (uploaded.has(i)) continue;
      notice(`Uploading original ${i + 1} of ${job.photos.length}. Keep this page open until uploads finish.`);
      const { url } = await api(`/${job.id}/upload`, 'POST', { index: i });
      const result = await fetch(url, { method: 'PUT', headers: { 'content-type': selected[i].type }, body: selected[i], signal: AbortSignal.timeout(120000) });
      if (!result.ok) throw Error('Photo upload interrupted. Tap Resume after checking your connection.');
    }
  }
  async function sendAndStart(job) {
    if (job.status !== 'sending') job = (await api(`/${job.id}/start`, 'POST', {})).scan;
    renderJob(job);
    while (job.status === 'sending' && job.forwarded < job.photos.length) {
      if (pauseRequested) throw Error('Photo transfer paused. Tap Resume to continue.');
      notice(`Preparing photo ${job.forwarded + 1} of ${job.photos.length} for reconstruction…`);
      job = (await api(`/${job.id}/forward`, 'POST', {})).scan; renderJob(job);
    }
    if (pauseRequested) throw Error('Photo transfer paused. Tap Resume to start reconstruction.');
    if (job.status === 'sending') job = (await api(`/${job.id}/commit`, 'POST', {})).scan;
    renderJob(job); notice('Your scan is processing. You can leave and return to check it.'); schedulePoll();
  }
  async function build() {
    if (busy) return; pauseRequested = false; setBusy(true);
    try {
      if (!configured) throw Error('A processing server must be connected before photos can be reconstructed.');
      const name = $('scanName').value.trim(); if (!name) throw Error('Give this scan a name.');
      const data = await api('', 'POST', { id: crypto.randomUUID(), name, photos: manifests });
      renderJob(data.scan); await uploadOriginals(data.scan); await sendAndStart(data.scan);
    } finally { setBusy(false); }
  }
  async function resume() {
    if (!active || busy) return; pauseRequested = false; setBusy(true);
    try { const job = (await api('/' + active.id)).scan; renderJob(job); if (job.status === 'uploading') await uploadOriginals(job); await sendAndStart(job); }
    finally { setBusy(false); }
  }
  function localModels(mode, value) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('jbs-owner-scan-models', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('models');
      request.onerror = () => reject(Error('Local model storage is unavailable. Download the GLB to keep a copy.'));
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction('models', mode === 'get' ? 'readonly' : 'readwrite');
        const store = tx.objectStore('models'), operation = mode === 'get' ? store.get(ownerKey()) : store.put(value, ownerKey());
        let result; operation.onsuccess = () => { result = operation.result; };
        tx.oncomplete = () => { db.close(); resolve(result); }; tx.onerror = () => { db.close(); reject(Error('Local model storage is full. Download the GLB to keep a copy.')); };
      };
    });
  }
  async function openModel(blob, name, provenance, persist = false) {
    if (blob.size > 48 * 1024 * 1024) throw Error('Use a GLB model under 48 MB.');
    const bytes = await blob.arrayBuffer();
    const { mountScanViewer, inspectGlb } = await import('/xray-viewer.js?v=2.5.1');
    inspectGlb(bytes);
    if (viewer) { viewer.dispose(); viewer = null; }
    $('scanModel').hidden = false; $('scanCanvas').replaceChildren();
    $('scanModelTitle').textContent = name;
    $('scanModelType').textContent = `${provenance} · Scale and completeness not verified`;
    $('scanViewerError').hidden = true;
    if (modelUrl) URL.revokeObjectURL(modelUrl);
    modelBlob = blob; modelName = name; modelUrl = URL.createObjectURL(blob);
    $('scanDownload').href = modelUrl; $('scanDownload').download = name.replace(/[^a-z0-9-]/gi, '-').slice(0, 70) + '.glb';
    // Devices without WebGL can still keep and download the validated original model.
    try { viewer = await mountScanViewer($('scanCanvas'), bytes); }
    catch (error) { $('scanViewerError').textContent = `Could not display this model: ${error.message}. You can still download the GLB.`; $('scanViewerError').hidden = false; if (!/webgl|context/i.test(error.message)) throw error; }
    for (const id of ['scanWireframe','scanGrid']) $(id).setAttribute('aria-pressed', 'false');
    if (persist) {
      try { await localModels('put', { blob, name, provenance }); $('scanReopen').hidden = false; }
      catch (error) { report(error); }
    }
    $('scanModel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  async function openResult() {
    if (!active || busy) return; setBusy(true);
    try {
      notice('Preparing the reconstructed model…');
      const data = await api(`/${active.id}/model`, 'POST', {});
      const result = await fetch(data.url, { cache: 'no-store', signal: AbortSignal.timeout(120000) });
      if (!result.ok) throw Error('The model could not be downloaded. Try Open 3D model again.');
      const blob = await result.blob();
      await openModel(blob, active.name, 'Photo-reconstructed surfaces', true); renderJob(data.scan); notice('Your reconstructed surface model is open.');
    } finally { setBusy(false); }
  }
  const run = action => () => Promise.resolve().then(action).catch(report);
  $('scanFiles').onchange = run(() => choosePhotos([...$('scanFiles').files]));
  $('scanClear').onclick = clearPhotos;
  $('scanPause').onclick = () => { pauseRequested = true; notice('Pausing after the current photo finishes…'); };
  $('scanBuild').onclick = run(build); $('scanResume').onclick = run(resume); $('scanRetry').onclick = run(resume);
  $('scanOpen').onclick = run(openResult);
  $('scanRefresh').onclick = run(async () => { pollFailures = 0; await refresh(); if (active) await poll(); });
  $('scanExisting').onchange = run(async () => { requestGeneration++; clearTimeout(pollTimer); const id = $('scanExisting').value; if (!id) { renderJob(null); return; } renderJob((await api('/' + id)).scan); schedulePoll(); });
  $('scanCancel').onclick = run(async () => { if (!active || !confirm('Cancel reconstruction for this scan? Saved original photos will remain.')) return; setBusy(true); try { renderJob((await api(`/${active.id}/cancel`, 'POST', {})).scan); clearTimeout(pollTimer); notice('Reconstruction canceled.'); } finally { setBusy(false); } });
  $('scanDelete').onclick = run(async () => { if (!active || !confirm('Delete this saved scan and its photos from JB’s storage? Download a copy first. Incomplete transfers on the processor follow its retention policy.')) return; setBusy(true); try { await api('/' + active.id, 'DELETE'); clearTimeout(pollTimer); requestGeneration++; active = null; $('scanJob').hidden = true; await refresh(); notice('The cloud scan was deleted. Downloaded copies remain on your device.'); } finally { setBusy(false); } });
  $('scanImport').onchange = run(async () => { const file = $('scanImport').files[0]; if (!file) return; setBusy(true); try { await openModel(file, file.name.replace(/\.glb$/i, ''), 'Imported 3D model', true); notice('Model opened and saved on this device.'); } finally { $('scanImport').value = ''; setBusy(false); } });
  $('scanReopen').onclick = run(async () => { const saved = await localModels('get'); if (!saved) throw Error('No model is saved on this device yet.'); await openModel(saved.blob, saved.name, saved.provenance); });
  $('scanReset').onclick = () => viewer?.reset();
  $('scanZoomIn').onclick = () => viewer?.zoom(.8); $('scanZoomOut').onclick = () => viewer?.zoom(1.25);
  $('scanLeft').onclick = () => viewer?.rotate(-Math.PI / 6); $('scanRight').onclick = () => viewer?.rotate(Math.PI / 6);
  $('scanUpright').onclick = () => viewer?.upright();
  $('scanWireframe').onclick = () => $('scanWireframe').setAttribute('aria-pressed', String(viewer?.wireframe() || false));
  $('scanGrid').onclick = () => $('scanGrid').setAttribute('aria-pressed', String(viewer?.grid() || false));
  window.addEventListener('beforeunload', event => { if (busy) { event.preventDefault(); event.returnValue = ''; } });
  window.addEventListener('pagehide', () => { clearTimeout(pollTimer); viewer?.dispose(); previewUrls.forEach(URL.revokeObjectURL); if (modelUrl) URL.revokeObjectURL(modelUrl); });
  localModels('get').then(saved => { $('scanReopen').hidden = !saved; }).catch(() => {});
  refresh().catch(report);
})();
