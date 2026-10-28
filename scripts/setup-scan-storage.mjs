import { createClient } from '@supabase/supabase-js';
import { SCAN_BUCKET } from '../lib/xray-services.js';
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!process.env.SUPABASE_URL || !key) throw Error('Configure server-only Supabase credentials before setting up scan storage.');
const client = createClient(process.env.SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
const existing = await client.storage.getBucket(SCAN_BUCKET);
if (existing.data) {
  if (existing.data.public) throw Error('The scan bucket must be private. Stop and correct its access before using it.');
  console.log('Private scan bucket already exists.');
} else {
  const result = await client.storage.createBucket(SCAN_BUCKET, { public: false, fileSizeLimit: 48 * 1024 * 1024, allowedMimeTypes: ['image/jpeg','image/png','model/gltf-binary'] });
  if (result.error) throw Error('The scan bucket could not be created: ' + result.error.message);
  console.log('Private scan bucket created.');
}
process.exit(0);
