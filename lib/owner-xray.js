import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const OWNER_EMAILS = new Set(['billyburr89@gmail.com', 'jeremiahgrider24@gmail.com']);
const SUPABASE_URL = 'https://bjmdtxxlzzhxskxkllvt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_UlU-Bo7t_Hv9lypvIjm9qQ_HaO65V9a';
export const privateHeaders = { 'cache-control': 'private, no-store, max-age=0', 'vary': 'Authorization', 'x-robots-tag': 'noindex, nofollow', 'x-content-type-options': 'nosniff' };
const errorResponse = (error, status) => Response.json({ error }, { status, headers: privateHeaders });

export async function ownerXrayPage() {
  const directory = join(process.cwd(), 'private', 'xray');
  const [html, project, workspace, reconstruction] = await Promise.all([
    readFile(join(directory, 'workspace.html'), 'utf8'),
    readFile(join(directory, 'project.js'), 'utf8'),
    readFile(join(directory, 'workspace.js'), 'utf8'),
    readFile(join(directory, 'reconstruction.js'), 'utf8'),
  ]);
  const script = project.replace(/^export /gm, '') + '\n' + workspace.replace(/^import [^\n]+\n/, '') + '\n' + reconstruction;
  return html.replace('<script type="module" src="/scan-my-project.js"></script>', () => '<script type="module">' + script.replace(/<\/script/gi, '<\\/script') + '</script>');
}

export async function verifyOwner(request, fetchUser = fetch) {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ') || authorization.length < 8 || authorization.length > 8192) {
    return errorResponse('Sign in with your JB’s owner account to open this development tool.', 401);
  }
  try {
    const verification = await fetchUser(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_KEY, authorization }, cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    if (!verification.ok) return errorResponse('Your sign-in could not be verified. Open the app and sign in again.', verification.status >= 500 ? 503 : 401);
    const user = await verification.json();
    if (!user?.id || !user.email) return errorResponse('Your sign-in could not be verified.', 401);
    if (!OWNER_EMAILS.has(String(user.email).toLowerCase())) return errorResponse('X-Ray House is available only in the JB’s owner workspace.', 403);
    return { user, authorization };
  } catch {
    return errorResponse('The owner workspace could not be opened. Please try again.', 503);
  }
}

export async function ownerXrayResponse(request, fetchUser = fetch) {
  const identity = await verifyOwner(request, fetchUser);
  if (identity instanceof Response) return identity;
  try {
    return new Response(await ownerXrayPage(), { headers: { ...privateHeaders, 'content-type': 'text/html; charset=utf-8' } });
  } catch {
    return errorResponse('The owner workspace could not be opened. Please try again.', 503);
  }
}
