// === 1. Firebase Configuration ===
const firebaseConfig = {
  apiKey: "AIzaSyAUsdSGmT8BqlT8ZsV-o7PIJcTwPyplbf4",
  authDomain: "closes-project.firebaseapp.com",
  projectId: "closes-project",
  storageBucket: "closes-project.firebasestorage.app",
  messagingSenderId: "646932990250",
  appId: "1:646932990250:web:d8428d9f27288b2168b653",
  measurementId: "G-8TS484M7EX"
};

// Global Variables (ประกาศไว้บนสุดเพื่อให้ทุกฟังก์ชันเข้าถึงได้)
let db = null;
let auth = null;
const defaultConfig = { building_name: 'SMART BUILDING', electricity_rate: '4.50' };

let appState = {
  usingSolar: true, 
  currentFloor: 1, 
  rooms: {},
  automationSettings: { motion: true, schedule: true, solar: true, alert: true },
  historyData: [],
  todayStats: { solarKwh: 28.5, gridKwh: 12.3, totalCost: 55.35, solarSavings: 128.25 }
};

// === 2. ฟังก์ชันพื้นฐาน (Switch Tab, Toggle Room) - ต้องโหลดก่อนเสมอ ===
function switchTab(tabName) {
  const contents = document.querySelectorAll('.tab-content');
  const buttons = document.querySelectorAll('.tab-btn');
  
  contents.forEach(el => el.classList.add('hidden'));
  buttons.forEach(el => {
    el.classList.remove('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/50');
    el.classList.add('bg-slate-800/50', 'text-slate-400', 'border-slate-700');
  });

  const targetContent = document.getElementById(`content-${tabName}`);
  const targetButton = document.getElementById(`tab-${tabName}`);
  
  if(targetContent) targetContent.classList.remove('hidden');
  if(targetButton) targetButton.classList.add('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/50');
}

function toggleEnergySource() {
  appState.usingSolar = !appState.usingSolar;
  const toggle = document.getElementById('energy-toggle');
  const knob = document.getElementById('toggle-knob');
  const sourceLabel = document.getElementById('source-label');
  
  if (appState.usingSolar) {
    toggle.classList.replace('bg-blue-500', 'bg-yellow-500');
    knob.style.left = '4px'; knob.innerHTML = '☀️';
    sourceLabel.textContent = 'กำลังใช้: โซลาร์เซลล์';
  } else {
    toggle.classList.replace('bg-yellow-500', 'bg-blue-500');
    knob.style.left = 'calc(100% - 44px)'; knob.innerHTML = '🏭';
    sourceLabel.textContent = 'กำลังใช้: ไฟฟ้าจากรัฐ';
  }
}

function selectFloor(floor) {
  appState.currentFloor = floor;
  const buttons = document.querySelectorAll('.floor-btn');
  buttons.forEach((btn, idx) => {
    if (idx + 1 === floor) {
      btn.className = "floor-btn px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/50";
    } else {
      btn.className = "floor-btn px-4 py-2 rounded-lg bg-slate-800 text-slate-400 border border-slate-700";
    }
  });
  renderBlueprint();
}

function initRooms() {
  const types = [{name:'ล็อบบี้', p:200}, {name:'ออฟฟิศ A', p:150}, {name:'ห้องประชุม', p:180}, {name:'ทางเดิน', p:80}];
  for (let f = 1; f <= 5; f++) {
    appState.rooms[f] = types.map((r, i) => ({ id: `f${f}r${i}`, name: r.name, power: r.p, isOn: Math.random() > 0.5 }));
  }
}

function renderBlueprint() {
  const grid = document.getElementById('blueprint-grid');
  if(!grid) return;
  const rooms = appState.rooms[appState.currentFloor] || [];
  grid.innerHTML = rooms.map(room => `
    <div class="room p-4 rounded-xl border-2 ${room.isOn ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-slate-700 bg-slate-800/50'} cursor-pointer" onclick="toggleRoom('${room.id}')">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-medium ${room.isOn ? 'text-yellow-400' : 'text-slate-400'}">${room.name}</span>
        <div class="w-4 h-4 rounded-full ${room.isOn ? 'light-on' : 'light-off'}"></div>
      </div>
      <span class="text-xs text-slate-500">${room.power}W</span>
    </div>
  `).join('');
}

function toggleRoom(roomId) {
  const floor = appState.currentFloor;
  const room = appState.rooms[floor].find(r => r.id === roomId);
  if (room) {
    room.isOn = !room.isOn;
    renderBlueprint();
    if(db) db.collection("light_logs").add({ type: room.isOn?'ON':'OFF', detail: `เปลี่ยนสถานะ ${room.name} ชั้น ${floor}`, timestamp: new Date().toISOString() });
  }
}

// === 3. Auth & Login Logic ===
function toggleAuthMode(isRegister) {
  document.getElementById('auth-title').innerText = isRegister ? 'REGISTER' : 'ADMIN LOGIN';
  document.getElementById('login-group').classList.toggle('hidden', isRegister);
  document.getElementById('register-group').classList.toggle('hidden', !isRegister);
}

async function handleRegister() {
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  try {
    await auth.createUserWithEmailAndPassword(email, password);
    showToast('✅', 'สมัครสมาชิกสำเร็จ!');
  } catch (e) { showToast('❌', e.message); }
}

async function handleLogin() {
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  try {
    await auth.signInWithEmailAndPassword(email, password);
    showToast('✅', 'เข้าสู่ระบบสำเร็จ!');
  } catch (e) { showToast('❌', 'อีเมลหรือรหัสผ่านผิด'); }
}

function handleLogout() { if(auth) auth.signOut(); }

// === 4. Initialization (หัวใจหลักของระบบ) ===
try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  auth = firebase.auth();

  // เช็คสถานะ Login
  auth.onAuthStateChanged((user) => {
    const screen = document.getElementById('login-screen');
    if (user) {
      screen.classList.add('opacity-0', 'pointer-events-none');
      startSystem(); // เริ่มระบบแสดงผลเมื่อล็อคอินแล้ว
    } else {
      screen.classList.remove('opacity-0', 'pointer-events-none');
    }
  });
} catch (e) { console.error(e); }

function startSystem() {
  initRooms();
  renderBlueprint();
  renderSolarPanels();
  updateDashboardStats();
  
  // โหลดประวัติจาก Firebase
  db.collection("history").orderBy("date", "desc").limit(10).onSnapshot(snap => {
    appState.historyData = snap.docs.map(doc => doc.data());
    renderHistory();
  });

  // นาฬิกาและจำลอง Real-time
  setInterval(() => {
    document.getElementById('current-time').textContent = new Date().toLocaleTimeString('th-TH');
  }, 1000);
  
  setInterval(() => {
    appState.todayStats.solarKwh += 0.001;
    updateDashboardStats();
  }, 5000);
}

// Utility
function showToast(icon, msg) {
  const t = document.getElementById('toast');
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-message').textContent = msg;
  t.classList.replace('translate-y-20', 'translate-y-0');
  t.classList.replace('opacity-0', 'opacity-100');
  setTimeout(() => {
    t.classList.replace('translate-y-0', 'translate-y-20');
    t.classList.replace('opacity-100', 'opacity-0');
  }, 3000);
}

function updateDashboardStats() {
  document.getElementById('solar-today').textContent = appState.todayStats.solarKwh.toFixed(2);
  document.getElementById('usage-today').textContent = (appState.todayStats.solarKwh + 12.3).toFixed(2);
}

function renderHistory() {
  const table = document.getElementById('history-table');
  if(!table) return;
  table.innerHTML = appState.historyData.map(r => `
    <tr class="border-b border-slate-800">
      <td class="py-3 px-4">${new Date(r.date).toLocaleDateString('th-TH')}</td>
      <td class="py-3 px-4 text-right text-yellow-400">${r.solar_kwh.toFixed(2)}</td>
      <td class="py-3 px-4 text-right text-red-400">${r.total_cost.toFixed(2)} ฿</td>
    </tr>
  `).join('');
}

function renderSolarPanels() {
  const container = document.getElementById('solar-panels');
  if(!container) return;
  let html = '';
  for (let i = 1; i <= 9; i++) {
    html += `<div class="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center"><div class="text-2xl">☀️</div><div class="text-xs">แผง ${i}</div></div>`;
  }
  container.innerHTML = html;
}
