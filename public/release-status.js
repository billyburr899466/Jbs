import { APP_VERSION } from './customer-core.js';

let latest = '';
let dismissed = '';
function showStatus() {
  document.querySelector('#jbs-release-banner')?.remove();
  const offline = !navigator.onLine;
  if (!offline && (!latest || latest === APP_VERSION || dismissed === latest)) return;
  const banner = document.createElement('aside');
  banner.id = 'jbs-release-banner';
  banner.className = 'jbs-release-banner';
  banner.setAttribute('role', 'status');
  const title = document.createElement('strong');
  title.textContent = offline ? 'You’re offline' : `Version ${latest} is ready`;
  const message = document.createElement('p');
  message.textContent = offline ? 'Reconnect before sending messages or saving changes. Keep this page open to keep your draft.' : 'Save your work, then reload to get the update.';
  banner.append(title, message);
  if (!offline) {
    const reload = document.createElement('button');
    reload.textContent = 'Reload app';
    reload.onclick = () => location.reload();
    const later = document.createElement('button');
    later.textContent = 'Later';
    later.onclick = () => { dismissed = latest; banner.remove(); };
    banner.append(reload, later);
  }
  document.body.append(banner);
}
async function checkVersion(button) {
  if(button) {button.disabled=true;button.textContent='Checking…';}
  try {
    const response=await fetch('/version.json',{cache:'no-store'});
    if(!response.ok)throw new Error('Update check unavailable');
    const data=await response.json();
    if(/^\d+\.\d+\.\d+$/.test(data.version))latest=data.version;
    dismissed='';
    navigator.serviceWorker?.getRegistration().then(registration=>registration?.update()).catch(()=>{});
    if(button)button.textContent=latest===APP_VERSION?`You’re up to date · ${APP_VERSION}`:'Update ready';
  } catch {if(button)button.textContent='Could not check. Try again.';}
  finally {if(button)button.disabled=false;showStatus();}
}
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-release-check]');
  if(button)checkVersion(button);
});
window.addEventListener('online',()=>checkVersion());
window.addEventListener('offline',showStatus);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkVersion();});
checkVersion();
