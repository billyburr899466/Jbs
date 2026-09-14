// Shared presentation logic. These helpers never change records or permissions.
export function matchesSearch(item, search = '') {
  const query = String(search).trim().toLocaleLowerCase();
  if (!query) return true;
  return [item.title, item.name, item.project_type, item.location, item.status,
    item.customer_name, item.customer_email, item.message, item.sender_name]
    .filter(Boolean).join(' ').toLocaleLowerCase().includes(query);
}

export function isCompleted(record) {
  return record.current_stage === 'completed' || /^(complete|completed)$/i.test(record.status || '');
}

export function workspaceGroups(records = [], plans = [], requests = [], search = '', status = 'all') {
  const visible = items => items.filter(item => matchesSearch(item, search));
  return {
    projects: visible(records.filter(r => r.record_type !== 'quote' &&
      (status === 'all' || (status === 'completed' ? isCompleted(r) : !isCompleted(r))))),
    quotes: visible(records.filter(r => r.record_type === 'quote')),
    plans: visible(plans),
    requests: visible(requests),
  };
}

export function messageDay(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Messages' : date.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
}

export function documentUrl(value) {
  const source = String(value || '').trim();
  if (/^https?:\/\//i.test(source) || /^\/(?![\/\\])/.test(source) || /^data:application\/pdf;base64,/i.test(source)) return source;
  return '';
}
