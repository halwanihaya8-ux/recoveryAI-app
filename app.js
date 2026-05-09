'use strict';

/* ══════════════════════════════════════════
   app.js — RecoveryAI Mobile App
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
}

async function handleLogin(e) {
  e.preventDefault();
  hideAlert('login-error');
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
  } finally {
    setLoading('btn-login', false);
  }
}
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
      </div>
    </div>`;
  }).join('');
}

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
}
