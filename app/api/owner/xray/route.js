import { ownerXrayResponse } from '../../../../lib/owner-xray.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  return ownerXrayResponse(request);
}
