'use strict';

/* ══════════════════════════════════════════
   app.js — RecoveryAI Mobile App
<<<<<<< HEAD
   Backend: Flask RecoveryAI API (ngrok or Render)
   Flow: user enters name → uploads wearable CSV/JSON export
         OR manually types values → app sends to /api/predict
         → displays recovery score + biometrics
   No auth required — data stays on device
══════════════════════════════════════════ */

// ── Change this to your ngrok URL when running locally
const BASE = 'https://boggle-molar-consensus.ngrok-free.dev';

const state = {
  bioData:    null,
  prediction: null,
  userName:   localStorage.getItem('rai_name') || '',
  dataSource: localStorage.getItem('rai_source') || '',
};

/* ══════════════════════════════════════════ INIT */
window.addEventListener('DOMContentLoaded', () => {
  setGreeting();
  if (state.userName) goTo('dashboard');
});

/* ══════════════════════════════════════════ UTILS */
const $  = id => document.getElementById(id);
const safe = (id, val) => { const el=$(id); if(el) el.textContent=val; };
const avg  = arr => arr && arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;

function showAlert(id, msg) { const el=$(id); if(!el) return; el.textContent=msg; el.classList.remove('hidden'); }
function hideAlert(id)      { const el=$(id); if(el) el.classList.add('hidden'); }
function shakeInput(id)     { const el=$(id); if(!el) return; el.classList.add('error'); setTimeout(()=>el.classList.remove('error'),400); }
function setLoading(btnId, on) {
  const btn=$(btnId); if(!btn) return;
  btn.disabled=on;
  const l=btn.querySelector('.btn-label'), s=btn.querySelector('.btn-spinner');
  if(l) l.style.display=on?'none':'';
  if(s) s.classList.toggle('hidden',!on);
}
function getInitials(n) { return n?n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2):'?'; }

function setGreeting() {
  const h  = new Date().getHours();
  const gr = h<12?'Good morning':h<17?'Good afternoon':'Good evening';
  const n  = state.userName||'there';
  const av = getInitials(state.userName||'R');
  safe('db-greeting',gr); safe('db-name',n); safe('db-avatar',av);
  safe('act-avatar',av);  safe('prof-avatar',av); safe('prof-name',state.userName||'Not set');
  safe('pinfo-name',state.userName||'Not set'); safe('pinfo-source',state.dataSource||'None');
}

/* ══════════════════════════════════════════ ROUTING */
const SCREENS = ['login','dashboard','activity','profile'];
function goTo(name) {
  SCREENS.forEach(s => {
    const el=$(`screen-${s}`); if(!el) return;
    el.classList.toggle('hidden', s!==name);
    el.classList.toggle('active', s===name);
  });
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', (item.getAttribute('onclick')||'').includes(`'${name}'`));
  });
  if(name==='activity') renderActivity();
  if(name==='profile')  renderProfile();
}

/* ══════════════════════════════════════════ LOGIN — just enter your name */
function switchTab(tab) {
  $('tab-signin').classList.toggle('active',   tab==='signin');
  $('tab-register').classList.toggle('active', tab==='register');
  $('form-signin').classList.toggle('hidden',    tab!=='signin');
  $('form-register').classList.toggle('hidden',  tab!=='register');
  hideAlert('login-error'); hideAlert('login-success');
=======
   Single backend: recoveryai-wearables.onrender.com
   Endpoints used:
     POST /api/v1/auth/login          — developer login (form-urlencoded)
     GET  /api/v1/auth/me             — get current developer
     PATCH /api/v1/auth/me            — update name
     POST /api/v1/auth/change-password
     POST /api/v1/users               — create app user
     GET  /api/v1/users/{id}/connections
     GET  /api/v1/users/{id}/summaries/activity
     GET  /api/v1/users/{id}/summaries/data
     POST /api/v1/oauth/{provider}/authorize
     POST /ai/predict/{user_id}       — RecoveryAI prediction
══════════════════════════════════════════ */

const BASE = 'https://boggle-molar-consensus.ngrok-free.dev';

/* ── State ── */
const state = {
  token:      null,
  developer:  null,   // { id, email, name }
  appUserId:  null,   // linked wearable user UUID
  bioData:    null,   // last fetched biometrics
  prediction: null,   // last prediction result
};

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  const saved = sessionStorage.getItem('rai_token');
  const dev   = sessionStorage.getItem('rai_developer');
  const uid   = sessionStorage.getItem('rai_user_id');
  if (saved && dev) {
    state.token     = saved;
    state.developer = JSON.parse(dev);
    state.appUserId = uid || null;
    setGreeting();
    goTo('dashboard');
    loadDashboard();
  }
});

/* ══════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════ */
function setLoading(btnId, loading) {
  const btn     = document.getElementById(btnId);
  if (!btn) return;
  const label   = btn.querySelector('.btn-label');
  const spinner = btn.querySelector('.btn-spinner');
  btn.disabled  = loading;
  if (label)   label.style.display  = loading ? 'none' : '';
  if (spinner) spinner.classList.toggle('hidden', !loading);
}

function showAlert(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function shakeInput(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('error');
  setTimeout(() => el.classList.remove('error'), 400);
}

function parseError(res, data) {
  if (data?.detail) return typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
  if (data?.message) return data.message;
  if (data?.error)   return data.error;
  return `Server error (${res.status})`;
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function setGreeting() {
  const h  = new Date().getHours();
  const gr = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const n  = state.developer?.name || state.developer?.email?.split('@')[0] || '—';
  const av = getInitials(state.developer?.name || n);

  const safe = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  safe('db-greeting', gr);
  safe('db-name', n);
  safe('db-avatar', av);
  safe('act-avatar', av);
  safe('prof-avatar', av);
  safe('prof-name', n);
  safe('prof-email', state.developer?.email || '—');
  safe('pinfo-name', n);
  safe('pinfo-email', state.developer?.email || '—');
}

async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (state.token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const ct  = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : {};
  if (res.status === 401) {
    // Session expired — kick to login
    handleLogout(true);
    throw new Error('Session expired. Please sign in again.');
  }
  return { res, data };
}

/* ══════════════════════════════════════════
   ROUTING
══════════════════════════════════════════ */
const SCREENS = ['login', 'dashboard', 'activity', 'profile'];

function goTo(name) {
  SCREENS.forEach(s => {
    const el = document.getElementById(`screen-${s}`);
    if (!el) return;
    el.classList.toggle('hidden', s !== name);
    el.classList.toggle('active', s === name);
  });
  // Update nav active states
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  // Activate correct nav item on each nav bar
  document.querySelectorAll('.nav-item').forEach(item => {
    const onclick = item.getAttribute('onclick') || '';
    if (onclick.includes(`'${name}'`)) item.classList.add('active');
  });
  if (name === 'activity') loadActivity();
  if (name === 'profile')  loadProfile();
}

/* ══════════════════════════════════════════
   AUTH — LOGIN
══════════════════════════════════════════ */
function switchTab(tab) {
  document.getElementById('tab-signin').classList.toggle('active',   tab === 'signin');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('form-signin').classList.toggle('hidden',    tab !== 'signin');
  document.getElementById('form-register').classList.toggle('hidden',  tab !== 'register');
  hideAlert('login-error');
  hideAlert('login-success');
>>>>>>> 36745bd8cbb06d63240c8c9fbd9869a7ff8c6f77
}

async function handleLogin(e) {
  e.preventDefault();
  hideAlert('login-error');
<<<<<<< HEAD
  const name = $('login-name')?.value.trim();
  if (!name) { shakeInput('login-name'); showAlert('login-error','Please enter your name to continue.'); return; }
  setLoading('btn-login', true);
  try {
    const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error();
    state.userName = name;
    localStorage.setItem('rai_name', name);
    setGreeting();
    goTo('dashboard');
  } catch {
    showAlert('login-error', 'Cannot reach the RecoveryAI server. Make sure ngrok is running and the BASE URL in app.js is correct.');
=======
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;

  if (!email) { shakeInput('login-email'); showAlert('login-error', 'Email is required.'); return; }
  if (!pass)  { shakeInput('login-password'); showAlert('login-error', 'Password is required.'); return; }

  setLoading('btn-login', true);
  try {
    // Login uses OAuth2 form encoding
    const res  = await fetch(`${BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: email, password: pass }),
    });
    const data = await res.json();

    if (!res.ok) {
      const msg = parseError(res, data);
      shakeInput('login-email');
      shakeInput('login-password');
      showAlert('login-error',
        res.status === 401 ? 'Incorrect email or password. Please try again.' : msg
      );
      return;
    }

    state.token = data.access_token;
    sessionStorage.setItem('rai_token', state.token);

    // Fetch developer profile
    await fetchDeveloperProfile();
    // Try to find or create an app user linked to this developer
    await resolveAppUser();

    setGreeting();
    goTo('dashboard');
    loadDashboard();

  } catch (err) {
    showAlert('login-error', err.message || 'Network error. Check your connection.');
>>>>>>> 36745bd8cbb06d63240c8c9fbd9869a7ff8c6f77
  } finally {
    setLoading('btn-login', false);
  }
}
<<<<<<< HEAD
async function handleRegister(e) { await handleLogin(e); }
function togglePw() {}
function handleLogout() {
  state.userName=''; state.bioData=null; state.prediction=null; state.dataSource='';
  localStorage.clear(); goTo('login');
}

/* ══════════════════════════════════════════ DASHBOARD */
async function loadDashboard() {
  const content=$('db-content'), noDevice=$('db-no-device'), errBanner=$('db-error-banner');
  if(errBanner) errBanner.classList.add('hidden');

  if (!state.bioData) {
    content?.classList.add('hidden');
    noDevice?.classList.remove('hidden');
    return;
  }
  noDevice?.classList.add('hidden');
  if(content) { content.classList.remove('hidden'); content.style.opacity='0.4'; }

  try {
    const result = await callPredict(state.bioData);
    state.prediction = result;
    renderDashboard(result);
  } catch(err) {
    showDashboardError(err.message||'Prediction failed.');
  } finally {
    if(content) content.style.opacity='1';
  }
}

async function callPredict(bio) {
  const res = await fetch(`${BASE}/api/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hrv_rmssd_ms: bio.hrv, avg_hr_day_bpm: bio.hr, sleep_duration_hours: bio.sleep, steps: bio.steps }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
  return data;
}

function showDashboardError(msg) {
  const el=$('db-error-banner'), em=$('db-error-msg');
  if(el) el.classList.remove('hidden');
  if(em) em.textContent=msg;
}
function retryDashboard() { loadDashboard(); }

function renderDashboard(pd) {
  const score=pd.prediction, zone=pd.readiness_zone||'fair', ci=pd.confidence_interval, bio=state.bioData;
  const ring=$('db-ring');
  if(ring) ring.style.strokeDashoffset = 314 - Math.min(100,(score/80)*100)/100*314;

  safe('db-score', score.toFixed(1));
  const badge=$('db-zone-badge');
  if(badge) { badge.textContent=zone.charAt(0).toUpperCase()+zone.slice(1); badge.className=`ring-badge badge-${zone}`; }
  const ciEl=$('db-ci');
  if(ciEl&&ci) ciEl.textContent=`95% CI: ${ci.lower.toFixed(1)} – ${ci.upper.toFixed(1)} ms`;

  const insightMap = {
    excellent:'Your body is fully recovered. Prime day for high-intensity training.',
    good:     'Well recovered. High-intensity training is appropriate today.',
    fair:     'Moderate recovery. Stick to your usual routine and sleep well tonight.',
    poor:     'HRV is below baseline. Prioritise rest and recovery today.',
  };
  const insight = pd.shap_insight && pd.shap_insight!=='Features are within normal ranges'
    ? pd.shap_insight+'. '+insightMap[zone] : insightMap[zone];

  safe('db-insight',   insightMap[zone]);
  safe('db-ins-title', zone==='excellent'||zone==='good'?'Ready to perform':'Recovery advisory');
  safe('db-ins-body',  insight);
  safe('db-days-note', `Based on ${bio.hrv.length} days of wearable data · ${state.dataSource}`);
  safe('db-hrv-avg',   avg(bio.hrv).toFixed(0)+' ms');
  safe('db-sleep-avg', avg(bio.sleep).toFixed(1)+' h');
  safe('db-hr-avg',    avg(bio.hr).toFixed(0)+' bpm');

  const last=bio.hrv.length-1;
  safe('m-hrv',   bio.hrv[last].toFixed(0));
  safe('m-hr',    bio.hr[last].toFixed(0));
  safe('m-sleep', bio.sleep[last].toFixed(1));
  safe('m-steps', (bio.steps[last]/1000).toFixed(1));

  const setBar=(id,pct)=>{ const el=$(id); if(el) el.style.width=Math.min(100,Math.max(2,pct))+'%'; };
  setBar('b-hrv',   bio.hrv[last]/80*100);
  setBar('b-hr',    bio.hr[last]/120*100);
  setBar('b-sleep', bio.sleep[last]/10*100);
  setBar('b-steps', bio.steps[last]/15000*100);

  ['db-device-pill','prof-device-pill'].forEach(id=>{ const el=$(id); if(el) el.classList.add('connected'); });
  ['db-device-label','prof-device-label'].forEach(id=>{ const el=$(id); if(el) el.textContent=state.dataSource||'Uploaded data'; });
}

/* ══════════════════════════════════════════ FILE UPLOAD */
function openUpload()  { $('upload-panel')?.classList.remove('hidden'); $('manual-panel')?.classList.add('hidden'); }
function closeUpload() { $('upload-panel')?.classList.add('hidden'); }

function handleFileUpload(event) {
  const file=event.target.files[0]; if(!file) return;
  hideAlert('upload-error');
  const reader=new FileReader();
  reader.onload=(e)=>{
    try {
      const text=e.target.result;
      let bio = file.name.endsWith('.json') ? parseJSON(text) : file.name.endsWith('.csv') ? parseCSV(text) : null;
      if(!bio) { showAlert('upload-error','Unsupported file type. Use CSV or JSON.'); return; }
      state.bioData=bio; state.dataSource=file.name;
      localStorage.setItem('rai_source',file.name);
      closeUpload();
      $('db-no-device')?.classList.add('hidden');
      loadDashboard();
    } catch(err) { showAlert('upload-error','Could not parse file: '+err.message); }
  };
  reader.readAsText(file);
}

function parseJSON(text) {
  const data=JSON.parse(text);
  let hrv,hr,sleep,steps;
  if(Array.isArray(data)) {
    const sorted=data.sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(-5);
    hrv  =sorted.map(d=>+(d.hrv_rmssd_ms||d.hrv||d.hrv_ms||45));
    hr   =sorted.map(d=>+(d.avg_hr_day_bpm||d.hr||d.heart_rate||70));
    sleep=sorted.map(d=>+(d.sleep_duration_hours||d.sleep||7));
    steps=sorted.map(d=>+(d.steps||d.step_count||8000));
  } else {
    hrv  =(data.hrv_rmssd_ms||data.hrv||[]).map(Number);
    hr   =(data.avg_hr_day_bpm||data.hr||data.heart_rate||[]).map(Number);
    sleep=(data.sleep_duration_hours||data.sleep||[]).map(Number);
    steps=(data.steps||data.step_count||[]).map(Number);
  }
  return validateBio({hrv,hr,sleep,steps});
}

function parseCSV(text) {
  const lines=text.trim().split('\n'); if(lines.length<2) throw new Error('No data rows');
  const headers=lines[0].split(',').map(h=>h.trim().toLowerCase().replace(/[^a-z0-9_]/g,'_'));
  const col=names=>{ for(const n of names){ const i=headers.findIndex(h=>h.includes(n)); if(i!==-1) return i; } return -1; };
  const hrvIdx=col(['hrv_rmssd','hrv','rmssd']), hrIdx=col(['avg_hr','heart_rate','hr_bpm','resting_hr','hr']);
  const sleepIdx=col(['sleep_duration','sleep_hours','sleep']), stepsIdx=col(['steps','step_count','daily_steps']);
  const dateIdx=col(['date','day','timestamp']);
  if(hrvIdx===-1||hrIdx===-1||sleepIdx===-1||stepsIdx===-1) throw new Error(`Missing columns. Found: ${headers.join(', ')}`);
  let rows=lines.slice(1).filter(l=>l.trim()).map(l=>l.split(',').map(v=>v.trim()));
  if(dateIdx!==-1) rows=rows.sort((a,b)=>new Date(a[dateIdx])-new Date(b[dateIdx]));
  const last5=rows.slice(-5);
  return validateBio({
    hrv:  last5.map(r=>parseFloat(r[hrvIdx])||45),
    hr:   last5.map(r=>parseFloat(r[hrIdx])||70),
    sleep:last5.map(r=>parseFloat(r[sleepIdx])||7),
    steps:last5.map(r=>parseFloat(r[stepsIdx])||8000),
  });
}

function validateBio({hrv,hr,sleep,steps}) {
  if(!hrv.length||!hr.length||!sleep.length||!steps.length) throw new Error('Empty data arrays');
  const pad=arr=>{ const m=avg(arr); while(arr.length<5) arr.unshift(m); return arr; };
  return {
    hrv:  hrv.length<5?pad([...hrv]):hrv.slice(-5),
    hr:   hr.length<5?pad([...hr]):hr.slice(-5),
    sleep:sleep.length<5?pad([...sleep]):sleep.slice(-5),
    steps:steps.length<5?pad([...steps]):steps.slice(-5),
  };
}

/* ══════════════════════════════════════════ MANUAL ENTRY */
function openManualEntry()  { $('manual-panel')?.classList.remove('hidden'); $('upload-panel')?.classList.add('hidden'); }
function closeManualEntry() { $('manual-panel')?.classList.add('hidden'); }

function handleManualEntry(e) {
  e.preventDefault(); hideAlert('manual-error');
  const parse5=id=>{ const v=$(id)?.value.trim(); if(!v) return null; const n=v.split(',').map(x=>parseFloat(x.trim())).filter(x=>!isNaN(x)); return n.length?n:null; };
  const hrv=parse5('manual-hrv'),hr=parse5('manual-hr'),sleep=parse5('manual-sleep'),steps=parse5('manual-steps');
  if(!hrv)  { shakeInput('manual-hrv');   showAlert('manual-error','Enter at least 1 HRV value (e.g. 45,48,42,50,47).'); return; }
  if(!hr)   { shakeInput('manual-hr');    showAlert('manual-error','Enter at least 1 heart rate value.'); return; }
  if(!sleep){ shakeInput('manual-sleep'); showAlert('manual-error','Enter at least 1 sleep value.'); return; }
  if(!steps){ shakeInput('manual-steps'); showAlert('manual-error','Enter at least 1 steps value.'); return; }
  try {
    state.bioData=validateBio({hrv,hr,sleep,steps}); state.dataSource='Manual entry';
    localStorage.setItem('rai_source','Manual entry');
    closeManualEntry(); $('db-no-device')?.classList.add('hidden'); loadDashboard();
  } catch(err) { showAlert('manual-error',err.message); }
}

/* ══════════════════════════════════════════ ACTIVITY */
function renderActivity() {
  const bio=state.bioData; if(!bio) return;
  safe('act-hrv-avg',   avg(bio.hrv).toFixed(1));
  safe('act-sleep-avg', avg(bio.sleep).toFixed(1));
  safe('act-hr-avg',    avg(bio.hr).toFixed(0));
  renderBarChart('hrv-bars',   bio.hrv,   80, '#6C63FF');
  renderBarChart('sleep-bars', bio.sleep, 10, '#00D4AA');
  renderDailyLog(bio);
}

function renderBarChart(cid, values, maxVal, color) {
  const el=$(cid); if(!el) return;
  const n=values.length, days=n===5?['Day 1','Day 2','Day 3','Day 4','Today']:values.map((_,i)=>i===n-1?'Today':`Day ${i+1}`);
  const max=Math.max(...values,maxVal*0.3);
  el.innerHTML=values.map((v,i)=>`<div class="bar-col">
    <div class="bar-val">${v.toFixed(v<20?1:0)}</div>
    <div class="bar-fill" style="height:${Math.max(5,(v/max)*100)}%;background:${color};opacity:${(0.4+(i/(n-1))*0.6).toFixed(2)}"></div>
    <div class="bar-label">${days[i]}</div>
  </div>`).join('');
}

function renderDailyLog(bio) {
  const el=$('daily-log'); if(!el) return;
  const n=bio.hrv.length, days=n===5?['5 days ago','4 days ago','3 days ago','Yesterday','Today']:bio.hrv.map((_,i)=>i===n-1?'Today':`${n-1-i} days ago`);
  const zone=h=>h>=55?'excellent':h>=42?'good':h>=35?'fair':'poor';
  el.innerHTML=[...bio.hrv].reverse().map((_,ri)=>{
    const i=n-1-ri, z=zone(bio.hrv[i]);
    return `<div class="log-card">
      <div class="log-header"><div class="log-day">${days[i]}</div><div class="ring-badge badge-${z}" style="font-size:10px;padding:2px 10px">${z.charAt(0).toUpperCase()+z.slice(1)}</div></div>
      <div class="log-chips">
        <div class="log-chip"><div class="log-chip-val" style="color:var(--purple)">${bio.hrv[i].toFixed(0)}<span style="font-size:8px;color:var(--txt2)">ms</span></div><div class="log-chip-lbl">HRV</div></div>
        <div class="log-chip"><div class="log-chip-val" style="color:var(--coral)">${bio.hr[i].toFixed(0)}<span style="font-size:8px;color:var(--txt2)">bpm</span></div><div class="log-chip-lbl">HR</div></div>
        <div class="log-chip"><div class="log-chip-val" style="color:var(--teal)">${bio.sleep[i].toFixed(1)}<span style="font-size:8px;color:var(--txt2)">h</span></div><div class="log-chip-lbl">Sleep</div></div>
        <div class="log-chip"><div class="log-chip-val" style="color:var(--amber)">${(bio.steps[i]/1000).toFixed(1)}<span style="font-size:8px;color:var(--txt2)">k</span></div><div class="log-chip-lbl">Steps</div></div>
=======

/* ══════════════════════════════════════════
   AUTH — REGISTER
══════════════════════════════════════════ */
async function handleRegister(e) {
  e.preventDefault();
  hideAlert('login-error');
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-password').value;

  if (!name)          { shakeInput('reg-name');     showAlert('login-error', 'Full name is required.'); return; }
  if (!email)         { shakeInput('reg-email');    showAlert('login-error', 'Email is required.'); return; }
  if (pass.length < 8){ shakeInput('reg-password'); showAlert('login-error', 'Password must be at least 8 characters.'); return; }

  setLoading('btn-register', true);
  try {
    // Register uses the invitations accept endpoint; if not available, attempt direct user creation
    // Most practical: admin creates accounts. Show helpful message.
    showAlert('login-error',
      'Self-registration is managed by your admin. Contact them for an invitation, or sign in if you already have an account.'
    );
  } catch (err) {
    showAlert('login-error', err.message || 'Registration failed.');
  } finally {
    setLoading('btn-register', false);
  }
}

/* ══════════════════════════════════════════
   DEVELOPER PROFILE
══════════════════════════════════════════ */
async function fetchDeveloperProfile() {
  try {
    const { res, data } = await apiFetch('/api/v1/auth/me');
    if (res.ok) {
      state.developer = { id: data.id, email: data.email, name: data.name || data.email };
      sessionStorage.setItem('rai_developer', JSON.stringify(state.developer));
    }
  } catch (_) {}
}

/* ══════════════════════════════════════════
   RESOLVE APP USER
   The Open Wearables "user" (not developer) is who
   has wearable data. We look for one linked to this
   developer, or create one.
══════════════════════════════════════════ */
async function resolveAppUser() {
  try {
    // List users — find the first one associated with this account
    const { res, data } = await apiFetch('/api/v1/users?limit=1');
    if (res.ok && data.items?.length > 0) {
      state.appUserId = data.items[0].id;
      sessionStorage.setItem('rai_user_id', state.appUserId);
    } else if (res.ok) {
      // No user yet — create one
      const { res: cr, data: cd } = await apiFetch('/api/v1/users', {
        method: 'POST',
        body: JSON.stringify({ email: state.developer.email }),
      });
      if (cr.ok) {
        state.appUserId = cd.id;
        sessionStorage.setItem('rai_user_id', state.appUserId);
      }
    }
  } catch (_) {}
}

/* ══════════════════════════════════════════
   LOGOUT
══════════════════════════════════════════ */
function handleLogout(expired = false) {
  state.token = null;
  state.developer = null;
  state.appUserId = null;
  state.bioData   = null;
  state.prediction = null;
  sessionStorage.clear();
  goTo('login');
  if (expired) showAlert('login-error', 'Your session expired. Please sign in again.');
}

/* ══════════════════════════════════════════
   DASHBOARD — LOAD
══════════════════════════════════════════ */
async function loadDashboard() {
  const content  = document.getElementById('db-content');
  const errBanner = document.getElementById('db-error-banner');
  const noDevice = document.getElementById('db-no-device');

  if (content)   content.style.opacity = '0.4';
  if (errBanner) errBanner.classList.add('hidden');

  try {
    if (!state.appUserId) {
      if (content)  content.classList.add('hidden');
      if (noDevice) noDevice.classList.remove('hidden');
      return;
    }

    // Fetch connections — check if a device is linked
    const { res: cr, data: cd } = await apiFetch(`/api/v1/users/${state.appUserId}/connections`);
    const connections = cr.ok ? cd : [];
    updateDevicePill(connections);

    if (connections.length === 0) {
      if (content)  content.classList.add('hidden');
      if (noDevice) noDevice.classList.remove('hidden');
      return;
    }

    if (noDevice) noDevice.classList.add('hidden');
    if (content)  content.classList.remove('hidden');

    // Fetch prediction (auto-pulls last 5 days from DB)
    const { res: pr, data: pd } = await apiFetch(`/ai/predict/${state.appUserId}`, { method: 'POST' });

    if (!pr.ok) {
      const msg = parseError(pr, pd);
      showDashboardError(msg.includes('No biometric') ? 'No biometric data found yet. Sync your wearable first.' : msg);
      return;
    }

    state.prediction = pd;
    renderDashboard(pd);

  } catch (err) {
    showDashboardError('Unable to reach the server. Check your connection.');
  }
}

function showDashboardError(msg) {
  const el = document.getElementById('db-error-banner');
  const em = document.getElementById('db-error-msg');
  if (el) el.classList.remove('hidden');
  if (em) em.textContent = msg;
  const content = document.getElementById('db-content');
  if (content) content.style.opacity = '1';
}

function retryDashboard() { loadDashboard(); }

function updateDevicePill(connections) {
  const pills = ['db-device-pill', 'prof-device-pill'];
  const labels = ['db-device-label', 'prof-device-label'];

  if (connections.length > 0) {
    const p = connections[0].provider;
    const name = p.charAt(0).toUpperCase() + p.slice(1) + ' connected';
    pills.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('connected');
    });
    labels.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = name;
    });
  }
}

function renderDashboard(pd) {
  const content = document.getElementById('db-content');
  if (content) content.style.opacity = '1';

  const score  = pd.prediction;
  const zone   = pd.readiness_zone || 'fair';
  const ci     = pd.confidence_interval;
  const data   = pd;

  // Ring animation
  const ring = document.getElementById('db-ring');
  if (ring) {
    const pct    = Math.min(100, (score / 80) * 100);
    const circumf = 314;
    const offset  = circumf - (pct / 100) * circumf;
    ring.style.strokeDashoffset = offset;
  }

  // Score
  const scoreEl = document.getElementById('db-score');
  if (scoreEl) scoreEl.textContent = score.toFixed(1);

  // Zone badge
  const badge = document.getElementById('db-zone-badge');
  if (badge) {
    badge.textContent  = zone.charAt(0).toUpperCase() + zone.slice(1);
    badge.className    = `ring-badge badge-${zone}`;
  }

  // CI
  const ciEl = document.getElementById('db-ci');
  if (ciEl && ci) ciEl.textContent = `95% CI: ${ci.lower.toFixed(1)} – ${ci.upper.toFixed(1)} ms`;

  // Insight
  const insightMap = {
    excellent: 'Your body is fully recovered. Prime day for high-intensity training.',
    good:      'Well recovered. High-intensity training is appropriate today.',
    fair:      'Moderate recovery. Stick to your usual routine and sleep well tonight.',
    poor:      'HRV is well below baseline. Prioritise rest and recovery today.',
  };
  const insTitle = document.getElementById('db-ins-title');
  const insBody  = document.getElementById('db-ins-body');
  if (insTitle) insTitle.textContent = zone === 'excellent' || zone === 'good' ? 'Ready to perform' : 'Recovery advisory';
  if (insBody)  insBody.textContent  = (pd.shap_insight && pd.shap_insight !== 'Features are within normal ranges')
    ? pd.shap_insight + '. ' + insightMap[zone]
    : insightMap[zone];

  // Hero insight
  const heroIns = document.getElementById('db-insight');
  if (heroIns) heroIns.textContent = insightMap[zone];

  // Days note
  const daysNote = document.getElementById('db-days-note');
  if (daysNote && pd.days_used !== undefined) {
    daysNote.textContent = `Based on ${pd.days_used}/5 days of real wearable data`;
  }

  // Store bio data for activity screen (use defaults from prediction note)
  state.bioData = {
    hrv:   [45, 48, 42, 50, score],
    hr:    [72, 68, 75, 70, 71],
    sleep: [7.5, 6.8, 8.0, 7.2, 7.9],
    steps: [8200, 9500, 6100, 10200, 7800],
  };

  // Try to get real summaries
  loadRealBioData();
}

async function loadRealBioData() {
  if (!state.appUserId) return;
  try {
    const end   = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const { res, data } = await apiFetch(
      `/api/v1/users/${state.appUserId}/summaries/activity?start_date=${start}&end_date=${end}&limit=7`
    );
    if (!res.ok || !data.items?.length) return;

    const items = data.items.slice(-5);
    const hrv   = items.map(d => d.hrv_rmssd_ms   || 45);
    const hr    = items.map(d => d.avg_hr_day_bpm  || 70);
    const sleep = items.map(d => d.sleep_duration_hours || 7.5);
    const steps = items.map(d => d.steps           || 8000);

    state.bioData = { hrv, hr, sleep, steps };

    const avg = arr => arr.reduce((a,b) => a+b, 0) / arr.length;
    const safe = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    safe('db-hrv-avg',   avg(hrv).toFixed(0) + ' ms');
    safe('db-sleep-avg', avg(sleep).toFixed(1) + ' h');
    safe('db-hr-avg',    avg(hr).toFixed(0) + ' bpm');

    // Update metric cards with latest day
    const last = items[items.length - 1];
    safe('m-hrv',   (last.hrv_rmssd_ms || 47).toFixed(0));
    safe('m-hr',    (last.avg_hr_day_bpm || 71).toFixed(0));
    safe('m-sleep', (last.sleep_duration_hours || 7.9).toFixed(1));
    safe('m-steps', ((last.steps || 8200) / 1000).toFixed(1));

    // Bars
    const setBar = (id, pct) => { const el = document.getElementById(id); if (el) el.style.width = Math.min(100, pct) + '%'; };
    setBar('b-hrv',   (last.hrv_rmssd_ms || 47) / 80  * 100);
    setBar('b-hr',    (last.avg_hr_day_bpm || 71) / 120 * 100);
    setBar('b-sleep', (last.sleep_duration_hours || 7.9) / 10 * 100);
    setBar('b-steps', (last.steps || 8200) / 15000 * 100);

  } catch (_) {
    // Fallback to demo data display
    fallbackBioDisplay();
  }
}

function fallbackBioDisplay() {
  const d = { hrv: 47, hr: 71, sleep: 7.9, steps: 8.2 };
  const safe = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  safe('m-hrv', d.hrv);
  safe('m-hr', d.hr);
  safe('m-sleep', d.sleep);
  safe('m-steps', d.steps);
  safe('db-hrv-avg',   d.hrv + ' ms');
  safe('db-sleep-avg', d.sleep + ' h');
  safe('db-hr-avg',    d.hr + ' bpm');
  const setBar = (id, pct) => { const el = document.getElementById(id); if (el) el.style.width = pct + '%'; };
  setBar('b-hrv',   59);
  setBar('b-hr',    55);
  setBar('b-sleep', 79);
  setBar('b-steps', 68);
}

/* ══════════════════════════════════════════
   ACTIVITY SCREEN
══════════════════════════════════════════ */
function loadActivity() {
  const bio = state.bioData;
  if (!bio) return;

  const avg = arr => (arr.reduce((a, b) => a + b, 0) / arr.length);
  const safe = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  safe('act-hrv-avg',   avg(bio.hrv).toFixed(1));
  safe('act-sleep-avg', avg(bio.sleep).toFixed(1));
  safe('act-hr-avg',    avg(bio.hr).toFixed(0));

  // HRV bars
  renderBarChart('hrv-bars', bio.hrv, 80, '#6C63FF', 50);
  // Sleep bars
  renderBarChart('sleep-bars', bio.sleep, 10, '#00D4AA', null);
  // Daily log
  renderDailyLog(bio);
}

function renderBarChart(containerId, values, maxVal, color, baseline) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Today'];
  const max  = Math.max(...values, maxVal * 0.3);
  el.innerHTML = values.map((v, i) => {
    const pct = Math.max(5, (v / max) * 100);
    return `<div class="bar-col">
      <div class="bar-val">${typeof v === 'number' ? v.toFixed(v < 20 ? 1 : 0) : v}</div>
      <div class="bar-fill" style="height:${pct}%;background:${color};opacity:${0.5 + i * 0.12}"></div>
      ${baseline ? `<div class="bar-fill" style="height:2px;background:#00D4AA;opacity:0.4;position:absolute;bottom:${(baseline/max)*100}%"></div>` : ''}
      <div class="bar-label">${days[i] || `Day ${i+1}`}</div>
    </div>`;
  }).join('');
}

function renderDailyLog(bio) {
  const el = document.getElementById('daily-log');
  if (!el) return;
  const days = ['5 days ago', '4 days ago', '3 days ago', 'Yesterday', 'Today'];
  const zones = bio.hrv.map(h => h >= 55 ? 'excellent' : h >= 42 ? 'good' : h >= 35 ? 'fair' : 'poor');
  const zoneColors = { excellent: 'var(--teal)', good: 'var(--purple)', fair: 'var(--amber)', poor: 'var(--coral)' };

  el.innerHTML = [...bio.hrv].reverse().map((_, ri) => {
    const i = bio.hrv.length - 1 - ri;
    const zone = zones[i];
    return `<div class="log-card">
      <div class="log-header">
        <div class="log-day">${days[i]}</div>
        <div class="ring-badge badge-${zone}" style="font-size:10px;padding:2px 10px">${zone.charAt(0).toUpperCase()+zone.slice(1)}</div>
      </div>
      <div class="log-chips">
        <div class="log-chip">
          <div class="log-chip-val" style="color:var(--purple)">${bio.hrv[i].toFixed(0)}<span style="font-size:9px;color:var(--txt2)">ms</span></div>
          <div class="log-chip-lbl">HRV</div>
        </div>
        <div class="log-chip">
          <div class="log-chip-val" style="color:var(--coral)">${bio.hr[i].toFixed(0)}<span style="font-size:9px;color:var(--txt2)">bpm</span></div>
          <div class="log-chip-lbl">HR</div>
        </div>
        <div class="log-chip">
          <div class="log-chip-val" style="color:var(--teal)">${bio.sleep[i].toFixed(1)}<span style="font-size:9px;color:var(--txt2)">h</span></div>
          <div class="log-chip-lbl">Sleep</div>
        </div>
        <div class="log-chip">
          <div class="log-chip-val" style="color:var(--amber)">${(bio.steps[i]/1000).toFixed(1)}<span style="font-size:9px;color:var(--txt2)">k</span></div>
          <div class="log-chip-lbl">Steps</div>
        </div>
>>>>>>> 36745bd8cbb06d63240c8c9fbd9869a7ff8c6f77
      </div>
    </div>`;
  }).join('');
}

<<<<<<< HEAD
/* ══════════════════════════════════════════ PROFILE */
function renderProfile() {
  const bio=state.bioData;
  if(bio) { safe('prof-hrv',avg(bio.hrv).toFixed(0)+' ms'); safe('prof-sleep',avg(bio.sleep).toFixed(1)+' h'); safe('prof-days',bio.hrv.length); }
}

function toggleEditName() {
  const form=$('edit-name-form'), input=$('edit-name-input'); if(!form) return;
  const hidden=form.classList.contains('hidden'); form.classList.toggle('hidden',!hidden);
  if(hidden&&input) { input.value=state.userName; input.focus(); }
  hideAlert('edit-name-error');
}
function saveProfileName() {
  const name=$('edit-name-input')?.value.trim();
  if(!name) { showAlert('edit-name-error','Name cannot be empty.'); return; }
  state.userName=name; localStorage.setItem('rai_name',name); setGreeting(); toggleEditName();
}

function openChangePassword() { alert('No account system is used — your data stays on your device only.'); }
function closeChangePassword() {} async function submitChangePassword() {}

function openAddDevice()    { openUpload(); }
function closeAddDevice()   { closeUpload(); }
function connectProvider(p) { alert(`Export your data from ${p} as CSV or JSON, then upload it using the upload button.`); }

async function openPrivacy() {
  const panel=$('privacy-panel'), content=$('data-summary-content'); if(!panel) return;
  panel.classList.remove('hidden');
  const bio=state.bioData;
  if(content) content.innerHTML=bio?`
    <strong>Your data summary</strong><br><br>
    Days tracked: <strong>${bio.hrv.length}</strong><br>
    Source: <strong>${state.dataSource||'Not set'}</strong><br>
    Avg HRV: <strong>${avg(bio.hrv).toFixed(1)} ms</strong><br>
    Avg sleep: <strong>${avg(bio.sleep).toFixed(1)} hrs</strong><br>
    Avg HR: <strong>${avg(bio.hr).toFixed(0)} bpm</strong><br>
    Avg steps: <strong>${(avg(bio.steps)/1000).toFixed(1)}k/day</strong><br><br>
    <strong>Privacy:</strong> All data stays on your device. Nothing is stored on any server. Only the 5-day arrays are sent to the model for prediction.
  `:`<strong>No data uploaded yet.</strong><br><br>Your data stays on your device only.`;
}
function closePrivacy() { $('privacy-panel')?.classList.add('hidden'); }

function exportData() {
  const blob=new Blob([JSON.stringify({exported_at:new Date().toISOString(),name:state.userName,source:state.dataSource,biometrics:state.bioData,prediction:state.prediction},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url; a.download=`recoveryai-${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(url);
}

function confirmDeleteAccount() {
  if(confirm('Clear all local data? This removes your name and uploaded data from this device.')) handleLogout();
=======
/* ══════════════════════════════════════════
   PROFILE SCREEN
══════════════════════════════════════════ */
async function loadProfile() {
  // Stats
  const bio = state.bioData;
  const safe = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  if (bio) {
    const avg = arr => arr.reduce((a,b)=>a+b,0)/arr.length;
    safe('prof-hrv',   avg(bio.hrv).toFixed(0) + ' ms');
    safe('prof-sleep', avg(bio.sleep).toFixed(1) + ' h');
  }
  safe('prof-days', '5'); // based on window size

  // Load connections
  await loadConnections();
}

async function loadConnections() {
  const el = document.getElementById('connections-list');
  if (!el || !state.appUserId) return;

  try {
    const { res, data } = await apiFetch(`/api/v1/users/${state.appUserId}/connections`);
    if (!res.ok || !data.length) {
      el.innerHTML = `<div class="settings-item muted"><div class="settings-label" style="color:var(--txt2)">No devices connected yet</div></div>`;
      return;
    }
    el.innerHTML = data.map(c => `
      <div class="settings-item">
        <div class="settings-icon teal-bg">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        </div>
        <div class="settings-label">${c.provider.charAt(0).toUpperCase() + c.provider.slice(1)}</div>
        <div class="ring-badge badge-excellent" style="font-size:9px;padding:2px 8px">Connected</div>
      </div>
    `).join('');
  } catch (_) {
    el.innerHTML = `<div class="settings-item muted"><div class="settings-label" style="color:var(--txt3)">Could not load connections</div></div>`;
  }
}

/* ══════════════════════════════════════════
   PROFILE — EDIT NAME
══════════════════════════════════════════ */
function toggleEditName() {
  const form = document.getElementById('edit-name-form');
  const input = document.getElementById('edit-name-input');
  if (!form) return;
  const isHidden = form.classList.contains('hidden');
  form.classList.toggle('hidden', !isHidden);
  if (isHidden && input) {
    input.value = state.developer?.name || '';
    input.focus();
  }
  hideAlert('edit-name-error');
}

async function saveProfileName() {
  const input = document.getElementById('edit-name-input');
  const name  = input?.value.trim();
  if (!name) { showAlert('edit-name-error', 'Name cannot be empty.'); return; }

  try {
    const { res, data } = await apiFetch('/api/v1/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
    if (!res.ok) { showAlert('edit-name-error', parseError(res, data)); return; }

    state.developer.name = name;
    sessionStorage.setItem('rai_developer', JSON.stringify(state.developer));
    setGreeting();
    toggleEditName();
  } catch (err) {
    showAlert('edit-name-error', 'Failed to save. Check your connection.');
  }
}

/* ══════════════════════════════════════════
   PROFILE — CHANGE PASSWORD
══════════════════════════════════════════ */
function openChangePassword() {
  const el = document.getElementById('change-pw-form');
  if (el) {
    el.classList.remove('hidden');
    document.getElementById('pw-current').value = '';
    document.getElementById('pw-new').value     = '';
    hideAlert('pw-error');
    hideAlert('pw-success');
  }
}

function closeChangePassword() {
  const el = document.getElementById('change-pw-form');
  if (el) el.classList.add('hidden');
}

async function submitChangePassword() {
  const curr = document.getElementById('pw-current')?.value;
  const next  = document.getElementById('pw-new')?.value;
  hideAlert('pw-error');
  hideAlert('pw-success');

  if (!curr) { shakeInput('pw-current'); showAlert('pw-error', 'Enter your current password.'); return; }
  if (!next || next.length < 8) { shakeInput('pw-new'); showAlert('pw-error', 'New password must be at least 8 characters.'); return; }
  if (curr === next) { showAlert('pw-error', 'New password must differ from current password.'); return; }

  try {
    const { res, data } = await apiFetch('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: curr, new_password: next }),
    });
    if (!res.ok) {
      const msg = parseError(res, data);
      showAlert('pw-error', res.status === 400 ? 'Current password is incorrect.' : msg);
      shakeInput('pw-current');
      return;
    }
    showAlert('pw-success', 'Password updated successfully.');
    document.getElementById('pw-current').value = '';
    document.getElementById('pw-new').value     = '';
    setTimeout(closeChangePassword, 2000);
  } catch (err) {
    showAlert('pw-error', 'Failed to update. Check your connection.');
  }
}

/* ══════════════════════════════════════════
   PROFILE — ADD DEVICE / OAUTH
══════════════════════════════════════════ */
function openAddDevice() {
  const el = document.getElementById('add-device-panel');
  if (el) el.classList.remove('hidden');
}

function closeAddDevice() {
  const el = document.getElementById('add-device-panel');
  if (el) el.classList.add('hidden');
}

async function connectProvider(provider) {
  if (!state.appUserId) {
    alert('No user profile found. Please contact your admin.');
    return;
  }
  try {
    const redirect = encodeURIComponent(window.location.href);
    const { res, data } = await apiFetch(
      `/api/v1/oauth/${provider}/authorize?user_id=${state.appUserId}&redirect_uri=${redirect}`
    );
    if (!res.ok) {
      alert(`Could not start ${provider} connection: ${parseError(res, data)}`);
      return;
    }
    // Redirect to OAuth provider
    if (data.authorization_url) {
      window.location.href = data.authorization_url;
    } else {
      alert(`Provider ${provider} returned no authorization URL.`);
    }
  } catch (err) {
    alert(`Failed to connect to ${provider}. Please check your network.`);
  }
}

/* ══════════════════════════════════════════
   PROFILE — PRIVACY & DATA
══════════════════════════════════════════ */
async function openPrivacy() {
  const panel = document.getElementById('privacy-panel');
  const content = document.getElementById('data-summary-content');
  if (!panel) return;
  panel.classList.remove('hidden');

  if (!state.appUserId) {
    if (content) content.textContent = 'No user profile linked yet.';
    return;
  }

  try {
    const { res, data } = await apiFetch(`/api/v1/users/${state.appUserId}/summaries/data`);
    if (!res.ok) throw new Error();
    if (content) content.innerHTML = `
      <strong>Your data summary</strong><br><br>
      Total data points: <strong>${data.total_data_points ?? 'N/A'}</strong><br>
      Providers: <strong>${data.providers?.join(', ') || 'None linked'}</strong><br>
      Series types tracked: <strong>${data.series_type_count ?? 'N/A'}</strong><br>
      Events recorded: <strong>${data.event_count ?? 'N/A'}</strong><br><br>
      Your data is stored securely on Render's infrastructure and is never sold or shared with third parties.
    `;
  } catch (_) {
    if (content) content.innerHTML = `
      <strong>Data policy</strong><br><br>
      Your wearable data is stored securely on Render's infrastructure.<br><br>
      It is used only to power your personal RecoveryAI predictions.<br><br>
      Your data is never sold or shared with third parties.
    `;
  }
}

function closePrivacy() {
  const el = document.getElementById('privacy-panel');
  if (el) el.classList.add('hidden');
}

async function exportData() {
  if (!state.bioData && !state.prediction) {
    alert('No data to export yet. Load your dashboard first.');
    return;
  }
  const payload = {
    exported_at:  new Date().toISOString(),
    developer:    state.developer,
    biometrics:   state.bioData,
    prediction:   state.prediction,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `recoveryai-data-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function confirmDeleteAccount() {
  const confirmed = window.confirm(
    'Are you sure you want to delete your account?\n\nThis will permanently remove all your data and cannot be undone.'
  );
  if (!confirmed) return;

  const confirmed2 = window.confirm('Last chance — permanently delete account and all data?');
  if (!confirmed2) return;

  try {
    if (state.appUserId) {
      await apiFetch(`/api/v1/users/${state.appUserId}`, { method: 'DELETE' });
    }
    alert('Account deleted. You will now be signed out.');
    handleLogout();
  } catch (err) {
    alert('Could not delete account. Please contact your administrator.');
  }
}

/* ══════════════════════════════════════════
   UTILS
══════════════════════════════════════════ */
function togglePw(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const isPass = inp.type === 'password';
  inp.type  = isPass ? 'text' : 'password';
  btn.textContent = isPass ? 'Hide' : 'Show';
>>>>>>> 36745bd8cbb06d63240c8c9fbd9869a7ff8c6f77
}
