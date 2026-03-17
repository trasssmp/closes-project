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

// Global Variables
let db = null;
let auth = null;

// === 2. Auth Functions (ต้องอยู่บนสุดเพื่อความไว) ===
function toggleAuthMode(isRegister) {
  document.getElementById('auth-title').innerText = isRegister ? 'REGISTER' : 'ADMIN LOGIN';
  document.getElementById('login-group').classList.toggle('hidden', isRegister);
  document.getElementById('register-group').classList.toggle('hidden', !isRegister);
}

async function handleRegister() {
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  if(password.length < 6) return showToast('⚠️', 'รหัสผ่านต้อง 6 ตัวขึ้นไป');

  try {
    await auth.createUserWithEmailAndPassword(email, password);
    showToast('✅', 'สมัครสมาชิกสำเร็จ!');
  } catch (error) {
    showToast('❌', 'ผิดพลาด: ' + error.message);
  }
}

async function handleLogin() {
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  if(!email || !password) return showToast('⚠️', 'กรุณากรอกข้อมูลให้ครบ');

  try {
    await auth.signInWithEmailAndPassword(email, password);
    showToast('✅', 'เข้าสู่ระบบสำเร็จ!');
  } catch (error) {
    showToast('❌', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  }
}

function handleLogout() {
  if(auth) auth.signOut().then(() => showToast('👋', 'ออกจากระบบแล้ว'));
}

// === 3. Application State & UI Logic ===
const defaultConfig = { building_name: 'SMART BUILDING', electricity_rate: '4.50' };
let appState = {
  usingSolar: true, currentFloor: 1, rooms: {},
  automationSettings: { motion: true, schedule: true, solar: true, alert: true },
  automationLogs: [], historyData: [],
  todayStats: { solarKwh: 28.5, gridKwh: 12.3, totalCost: 55.35, solarSavings: 128.25 }
};

// Initialize Firebase & App
try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  auth = firebase.auth();

  auth.onAuthStateChanged((user) => {
    const screen = document.getElementById('login-screen');
    if (user) {
      screen.classList.add('opacity-0', 'pointer-events-none');
      initApp(); // เริ่มโหลดข้อมูลเมื่อ Login แล้ว
    } else {
      screen.classList.remove('opacity-0', 'pointer-events-none');
    }
  });
} catch (e) { console.error("Firebase Error", e); }

function initApp() {
  initRooms();
  updateClock();
  setInterval(updateClock, 1000);
  renderBlueprint();
  renderSolarPanels();
  updateDashboardStats();
  setInterval(simulateRealTimeUpdates, 5000);

  // Load Data from Firebase
  if(db) {
    db.collection("history").orderBy("date", "desc").onSnapshot(snap => {
      appState.historyData = snap.docs.map(doc => doc.data());
      renderHistory();
    });
  }
}

// UI Functions (Switch Tab, Toggle Room, etc.)
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(el => {
    el.classList.remove('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/50');
    el.classList.add('bg-slate-800/50', 'text-slate-400', 'border-slate-700');
  });
  document.getElementById(`content-${tabName}`).classList.remove('hidden');
  document.getElementById(`tab-${tabName}`).classList.add('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/50');
}

function initRooms() {
  const types = [{name:'ล็อบบี้', p:200}, {name:'ออฟฟิศ A', p:150}, {name:'ห้องประชุม', p:180}, {name:'ทางเดิน', p:80}];
  for (let f = 1; f <= 5; f++) {
    appState.rooms[f] = types.map((r, i) => ({ id: `f${f}r${i}`, name: r.name, power: r.p, isOn: Math.random() > 0.5 }));
  }
}

function renderBlueprint() {
  const grid = document.getElementById('blueprint-grid');
  const rooms = appState.rooms[appState.currentFloor];
  grid.innerHTML = rooms.map(room => `
    <div class="room p-4 rounded-xl border-2 ${room.isOn ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-slate-700 bg-slate-800/50'} cursor-pointer" onclick="toggleRoom('${room.id}')">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-medium ${room.isOn ? 'text-yellow-400' : 'text-slate-400'}">${room.name}</span>
        <div class="w-4 h-4 rounded-full ${room.isOn ? 'light-on' : 'light-off'}"></div>
      </div>
      <span class="text-xs text-slate-500">${room.power}W</span>
    </div>
  `).join('');
  updateRoomStats();
}

function toggleRoom(roomId) {
  const floor = appState.currentFloor;
  const room = appState.rooms[floor].find(r => r.id === roomId);
  if (room) {
    room.isOn = !room.isOn;
    renderBlueprint();
    saveLightLog(room.isOn ? 'ON' : 'OFF', `${room.isOn ? 'เปิด' : 'ปิด'}ไฟ ${room.name} ชั้น ${floor}`);
  }
}

async function saveLightLog(type, detail) {
  if(db) await db.collection("light_logs").add({ type, detail, timestamp: new Date().toISOString() });
}

async function saveCurrentRecord() {
  if(!db) return;
  const record = { date: new Date().toISOString(), solar_kwh: appState.todayStats.solarKwh, total_cost: appState.todayStats.totalCost };
  await db.collection("history").add(record);
  showToast('✅', 'บันทึกสำเร็จ');
}

// Utility Functions
function updateClock() { document.getElementById('current-time').textContent = new Date().toLocaleTimeString('th-TH'); }
function showToast(icon, msg) {
  const t = document.getElementById('toast');
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-message').textContent = msg;
  t.classList.remove('translate-y-20', 'opacity-0');
  setTimeout(() => t.classList.add('translate-y-20', 'opacity-0'), 3000);
}

// ส่วนอื่นๆ ที่เหลือ (Stats, Automation Logs, History Render) สามารถใส่ต่อท้ายได้ปกติครับ
function updateDashboardStats() {
  document.getElementById('solar-today').textContent = appState.todayStats.solarKwh.toFixed(2);
  document.getElementById('usage-today').textContent = (appState.todayStats.solarKwh + appState.todayStats.gridKwh).toFixed(2);
  document.getElementById('cost-today').textContent = appState.todayStats.totalCost.toFixed(2);
  document.getElementById('savings-today').textContent = appState.todayStats.solarSavings.toFixed(2);
}

function renderHistory() {
  const table = document.getElementById('history-table');
  table.innerHTML = appState.historyData.map(r => `
    <tr class="border-b border-slate-800">
      <td class="py-3 px-4">${new Date(r.date).toLocaleDateString('th-TH')}</td>
      <td class="py-3 px-4 text-right text-yellow-400">${r.solar_kwh.toFixed(2)}</td>
      <td class="py-3 px-4 text-right text-red-400">${r.total_cost.toFixed(2)} ฿</td>
    </tr>
  `).join('');
}

function updateRoomStats() {
  let on = 0, p = 0;
  Object.values(appState.rooms).forEach(f => f.forEach(r => { if(r.isOn) { on++; p += r.power; } }));
  document.getElementById('lights-on-count').textContent = on;
  document.getElementById('current-power').textContent = p + ' W';
}

function renderSolarPanels() {
  const container = document.getElementById('solar-panels');
  let html = '';
  for (let i = 1; i <= 9; i++) {
    html += `<div class="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center"><div class="text-2xl">☀️</div><div class="text-xs">แผง ${i}</div></div>`;
  }
  container.innerHTML = html;
}

function simulateRealTimeUpdates() {
  appState.todayStats.solarKwh += 0.01;
  updateDashboardStats();
}
