// === 1. ใส่โค้ด Firebase ของคุณตรงนี้ ===
const firebaseConfig = {
  apiKey: "AIzaSyAUsdSGmT8BqlT8ZsV-o7PIJcTwPyplbf4",
  authDomain: "closes-project.firebaseapp.com",
  projectId: "closes-project",
  storageBucket: "closes-project.firebasestorage.app",
  messagingSenderId: "646932990250",
  appId: "1:646932990250:web:d8428d9f27288b2168b653",
  measurementId: "G-8TS484M7EX"
};

// เริ่มต้น Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// === 2. ระบบ Login / Register ด้วยเลขประจำตัว ===
const getFakeEmail = (id) => `${id}@smartbuilding.com`;
const DEFAULT_PW = "sb123456"; 

function toggleAuthMode(isRegister) {
  document.getElementById('auth-title').innerText = isRegister ? 'REGISTER ID' : 'STUDENT LOGIN';
  document.getElementById('login-group').classList.toggle('hidden', isRegister);
  document.getElementById('register-group').classList.toggle('hidden', !isRegister);
}

async function handleRegister() {
  const studentId = document.getElementById('auth-student-id').value.trim();
  if(!studentId) return showToast('⚠️', 'กรุณาระบุเลขประจำตัว');
  const fakeEmail = getFakeEmail(studentId);
  try {
    await auth.createUserWithEmailAndPassword(fakeEmail, DEFAULT_PW);
    showToast('✅', 'ลงทะเบียนสำเร็จ!');
    if(db) await db.collection("users").doc(studentId).set({
        studentId: studentId,
        registeredAt: new Date().toISOString()
    });
  } catch (e) {
    showToast('❌', 'เลขประจำตัวนี้มีในระบบแล้ว หรือเกิดข้อผิดพลาด');
  }
}

async function handleLogin() {
  const studentId = document.getElementById('auth-student-id').value.trim();
  if(!studentId) return showToast('⚠️', 'กรุณากรอกเลขประจำตัว');
  const fakeEmail = getFakeEmail(studentId);
  try {
    await auth.signInWithEmailAndPassword(fakeEmail, DEFAULT_PW);
    showToast('✅', 'ยินดีต้อนรับ รหัส ' + studentId);
  } catch (e) {
    showToast('❌', 'ไม่พบเลขประจำตัวนี้ในระบบ');
  }
}

function handleLogout() {
  if(auth) auth.signOut();
}

// ตัวเฝ้าดูสถานะการ Login (หัวใจสำคัญ)
if (auth) {
  auth.onAuthStateChanged((user) => {
    const authScreen = document.getElementById('auth-screen');
    const app = document.getElementById('app');
    if (user) {
      authScreen.classList.add('opacity-0', 'pointer-events-none');
      app.classList.remove('opacity-0', 'pointer-events-none');
      initApp(); // รันแอปหลักเมื่อ Login ผ่านแล้ว
    } else {
      authScreen.classList.remove('opacity-0', 'pointer-events-none');
      app.classList.add('opacity-0', 'pointer-events-none');
    }
  });
}

// === 3. โค้ดการทำงานของเว็บ (แอปหลัก) ===
const defaultConfig = { building_name: 'SMART BUILDING', electricity_rate: '4.50' };

let appState = {
  usingSolar: true,
  currentFloor: 1,
  rooms: {},
  automationSettings: { motion: true, schedule: true, solar: true, alert: true },
  automationLogs: [],
  historyFilter: 'all',
  historyData: [],
  todayStats: { solarKwh: 28.5, gridKwh: 12.3, totalCost: 55.35, solarSavings: 128.25 }
};

function initRooms() {
  const roomTypes = [
    { name: 'ล็อบบี้', power: 200 }, { name: 'ออฟฟิศ A', power: 150 },
    { name: 'ออฟฟิศ B', power: 150 }, { name: 'ห้องประชุม', power: 180 },
    { name: 'ห้องน้ำ', power: 60 }, { name: 'ห้องครัว', power: 100 },
    { name: 'ห้องเซิร์ฟเวอร์', power: 300 }, { name: 'ทางเดิน', power: 80 }
  ];
  for (let floor = 1; floor <= 5; floor++) {
    appState.rooms[floor] = roomTypes.map((room, index) => ({
      id: `f${floor}r${index}`, name: room.name, power: room.power,
      isOn: Math.random() > 0.5, isForgotten: Math.random() > 0.9
    }));
  }
}

function initApp() {
  initRooms();
  
  // ดึงข้อมูลประวัติค่าไฟ
  db.collection("history").onSnapshot((querySnapshot) => {
    const data = [];
    querySnapshot.forEach((doc) => { data.push(doc.data()); });
    appState.historyData = data;
    renderHistory();
  }, (error) => { console.error("Firebase Snapshot Error:", error); });

  // ดึงข้อมูล Automation Logs จาก Firebase
  if (db) {
    db.collection("automation_logs")
      .orderBy("timestamp", "desc")
      .limit(10)
      .onSnapshot((querySnapshot) => {
        const logs = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const time = new Date(data.timestamp).toLocaleTimeString('th-TH');
          logs.push({ time: time, message: data.message });
        });
        appState.automationLogs = logs;
        renderAutomationLogs();
      });
  }

  updateClock();
  setInterval(updateClock, 1000);
  renderBlueprint();
  renderSolarPanels();
  updateDashboardStats();
  setInterval(simulateRealTimeUpdates, 5000);
}

// --- ฟังก์ชันช่วยเหลืออื่นๆ (เหมือนเดิมของคุณทั้งหมด) ---

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(el => {
    el.classList.remove('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/50');
    el.classList.add('bg-slate-800/50', 'text-slate-400', 'border-slate-700');
  });
  document.getElementById(`content-${tabName}`).classList.remove('hidden');
  const activeTab = document.getElementById(`tab-${tabName}`);
  activeTab.classList.remove('bg-slate-800/50', 'text-slate-400', 'border-slate-700');
  activeTab.classList.add('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/50');
}

function toggleEnergySource() {
  appState.usingSolar = !appState.usingSolar;
  const toggle = document.getElementById('energy-toggle');
  const knob = document.getElementById('toggle-knob');
  const solarIndicator = document.getElementById('solar-indicator');
  const gridIndicator = document.getElementById('grid-indicator');
  const sourceLabel = document.getElementById('source-label');
  const logMessage = `สลับแหล่งพลังงานเป็น: ${appState.usingSolar ? 'โซลาร์เซลล์' : 'ไฟฟ้าจากรัฐ'}`;
  
  if (appState.usingSolar) {
    toggle.classList.remove('bg-blue-500'); toggle.classList.add('bg-yellow-500');
    toggle.style.boxShadow = '0 0 20px rgba(234, 179, 8, 0.5)';
    knob.style.left = '4px'; knob.innerHTML = '<span class="text-xl">☀️</span>';
    solarIndicator.classList.remove('opacity-50'); solarIndicator.classList.add('border-yellow-500', 'bg-yellow-500/10');
    gridIndicator.classList.add('opacity-50'); sourceLabel.textContent = 'กำลังใช้: โซลาร์เซลล์';
  } else {
    toggle.classList.remove('bg-yellow-500'); toggle.classList.add('bg-blue-500');
    toggle.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)';
    knob.style.left = 'calc(100% - 44px)'; knob.innerHTML = '<span class="text-xl">🏭</span>';
    solarIndicator.classList.add('opacity-50'); gridIndicator.classList.remove('opacity-50');
    gridIndicator.classList.add('border-blue-500', 'bg-blue-500/10'); sourceLabel.textContent = 'กำลังใช้: ไฟฟ้าจากรัฐ';
  }
  showToast(appState.usingSolar ? '☀️' : '🏭', logMessage);
  addAutomationLog(logMessage);
}

function selectFloor(floor) {
  appState.currentFloor = floor;
  document.querySelectorAll('.floor-btn').forEach((btn, index) => {
    if (index + 1 === floor) {
      btn.classList.remove('bg-slate-800', 'text-slate-400', 'border-slate-700');
      btn.classList.add('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/50');
    } else {
      btn.classList.remove('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/50');
      btn.classList.add('bg-slate-800', 'text-slate-400', 'border-slate-700');
    }
  });
  renderBlueprint();
}

function renderBlueprint() {
  const grid = document.getElementById('blueprint-grid');
  const rooms = appState.rooms[appState.currentFloor];
  grid.innerHTML = rooms.map(room => `
    <div class="room p-4 rounded-xl border-2 ${room.isOn ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-slate-700 bg-slate-800/50'} cursor-pointer transition-all hover:scale-105" onclick="toggleRoom('${room.id}')">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-medium ${room.isOn ? 'text-yellow-400' : 'text-slate-400'}">${room.name}</span>
        <div class="w-4 h-4 rounded-full ${room.isOn ? (room.isForgotten ? 'bg-red-500 blink' : 'light-on') : 'light-off'}"></div>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-xs text-slate-500">${room.power}W</span>
        <span class="text-xs ${room.isOn ? 'text-yellow-400' : 'text-slate-600'}">${room.isOn ? 'เปิด' : 'ปิด'}</span>
      </div>
      ${room.isForgotten && room.isOn ? '<div class="text-xs text-red-400 mt-2">⚠️ ลืมปิดไฟ</div>' : ''}
    </div>
  `).join('');
  updateRoomStats();
}

function toggleRoom(roomId) {
  const floor = appState.currentFloor;
  const room = appState.rooms[floor].find(r => r.id === roomId);
  if (room) {
    room.isOn = !room.isOn; room.isForgotten = false;
    renderBlueprint();
    const detailText = `${room.isOn ? 'เปิด' : 'ปิด'}ไฟ ${room.name} ชั้น ${floor}`;
    showToast(room.isOn ? '💡' : '🌙', detailText + 'แล้ว');
    addAutomationLog(detailText);
    saveLightLog(room.isOn ? 'TURN_ON' : 'TURN_OFF', detailText);
  }
}

function turnAllLightsOn() {
  appState.rooms[appState.currentFloor].forEach(room => { room.isOn = true; room.isForgotten = false; });
  renderBlueprint(); 
  const detailText = `เปิดไฟทั้งหมดชั้น ${appState.currentFloor}`;
  showToast('💡', detailText + ` แล้ว`);
  addAutomationLog(detailText);
  saveLightLog('ALL_ON', detailText);
}

function turnAllLightsOff() {
  appState.rooms[appState.currentFloor].forEach(room => { room.isOn = false; room.isForgotten = false; });
  renderBlueprint(); 
  const detailText = `ปิดไฟทั้งหมดชั้น ${appState.currentFloor}`;
  showToast('🌙', detailText + ` แล้ว`);
  addAutomationLog(detailText);
  saveLightLog('ALL_OFF', detailText);
}

function updateRoomStats() {
  let lightsOn = 0, totalPower = 0, forgotten = 0;
  Object.values(appState.rooms).forEach(floorRooms => {
    floorRooms.forEach(room => {
      if (room.isOn) { lightsOn++; totalPower += room.power; if (room.isForgotten) forgotten++; }
    });
  });
  document.getElementById('lights-on-count').textContent = lightsOn;
  document.getElementById('current-power').textContent = `${totalPower} W`;
  document.getElementById('forgotten-lights').textContent = forgotten;
}

function renderSolarPanels() {
  const container = document.getElementById('solar-panels');
  const panels = [];
  for (let i = 1; i <= 12; i++) {
    const efficiency = 85 + Math.floor(Math.random() * 15);
    panels.push(`<div class="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center"><div class="text-2xl mb-1">☀️</div><div class="text-xs text-slate-400">แผง ${i}</div></div>`);
  }
  container.innerHTML = panels.join('');
}

function addAutomationLog(message) {
  saveAutomationLogToFirebase(message); 
}

function renderAutomationLogs() {
  const container = document.getElementById('automation-log');
  if (appState.automationLogs.length === 0) {
    container.innerHTML = '<div class="text-center py-4 text-slate-500">ยังไม่มีประวัติ</div>'; return;
  }
  container.innerHTML = appState.automationLogs.map(log => `
    <div class="flex items-center gap-3 p-2 rounded-lg bg-slate-800/30">
      <span class="text-xs text-slate-500 w-20">${log.time}</span>
      <span class="text-sm text-slate-300">${log.message}</span>
    </div>
  `).join('');
}

function renderHistory() {
  const table = document.getElementById('history-table');
  table.innerHTML = appState.historyData.sort((a, b) => new Date(b.date) - new Date(a.date)).map(record => `
    <tr class="border-b border-slate-800">
      <td class="py-3 px-4 text-white">${new Date(record.date).toLocaleDateString('th-TH')}</td>
      <td class="py-3 px-4 text-right text-yellow-400">${record.solar_kwh.toFixed(2)}</td>
      <td class="py-3 px-4 text-right text-blue-400">${record.grid_kwh.toFixed(2)}</td>
      <td class="py-3 px-4 text-right text-red-400">${record.total_cost.toFixed(2)} ฿</td>
      <td class="py-3 px-4 text-right text-emerald-400">${record.solar_savings.toFixed(2)} ฿</td>
    </tr>
  `).join('');
}

async function saveCurrentRecord() {
  const record = { type: 'daily', date: new Date().toISOString(), solar_kwh: appState.todayStats.solarKwh, grid_kwh: appState.todayStats.gridKwh, total_cost: appState.todayStats.totalCost, solar_savings: appState.todayStats.solarSavings };
  try { await db.collection("history").add(record); showToast('✅', 'บันทึกสำเร็จ!'); } catch (e) { showToast('❌', 'ผิดพลาด'); }
}

function updateDashboardStats() {
  document.getElementById('solar-today').textContent = appState.todayStats.solarKwh.toFixed(2);
  document.getElementById('usage-today').textContent = (appState.todayStats.solarKwh + appState.todayStats.gridKwh).toFixed(2);
  document.getElementById('cost-today').textContent = appState.todayStats.totalCost.toFixed(2);
  document.getElementById('savings-today').textContent = appState.todayStats.solarSavings.toFixed(2);
}

function simulateRealTimeUpdates() {
  appState.todayStats.solarKwh += 0.001;
  updateDashboardStats();
}

function updateClock() {
  document.getElementById('current-time').textContent = new Date().toLocaleTimeString('th-TH');
}

function showToast(icon, message) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-message').textContent = message;
  toast.classList.remove('translate-y-20', 'opacity-0'); toast.classList.add('translate-y-0', 'opacity-100');
  setTimeout(() => { toast.classList.remove('translate-y-0', 'opacity-100'); toast.classList.add('translate-y-20', 'opacity-0'); }, 3000);
}

async function saveLightLog(type, detail) {
  if (db) await db.collection("light_logs").add({ type, detail, timestamp: new Date().toISOString() });
}

async function saveAutomationLogToFirebase(message) {
  if (db) await db.collection("automation_logs").add({ message, timestamp: new Date().toISOString() });
}
