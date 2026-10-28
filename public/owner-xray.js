const status = document.getElementById('owner-status');
try {
  const session = JSON.parse(localStorage.getItem('sb-bjmdtxxlzzhxskxkllvt-auth-token') || 'null');
  if (!session?.access_token) {
    status.textContent = 'Sign in to your JB’s owner account, then open Customer workspace → X-Ray House · In development.';
  } else {
    const response = await fetch('/api/owner/xray', {
      headers: { authorization: `Bearer ${session.access_token}` }, cache: 'no-store',
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      status.textContent = result.error || 'This workspace is available only to JB’s owners. Return to the app to sign in.';
    } else if (response.headers.get('content-type')?.includes('text/html')) {
      const html = await response.text();
      document.open();
      document.write(html);
      document.close();
    } else {
      status.textContent = 'The owner workspace could not be opened. Please return to the app and try again.';
    }
  }
} catch {
  status.textContent = 'The owner workspace could not be opened. Check your connection, then return to the app and try again.';
}
