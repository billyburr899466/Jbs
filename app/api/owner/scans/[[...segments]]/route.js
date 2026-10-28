import { scansResponse } from '../../../../../lib/xray-scans.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
async function handle(request, context) {
  const { segments = [] } = await context.params;
  return scansResponse(request, segments);
}
export { handle as GET, handle as POST, handle as DELETE };
