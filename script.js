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

let db = null;

// เชื่อมต่อ Firebase แบบปลอดภัย
try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  console.log("🔥 Firebase Connected!");
} catch (error) {
  console.error("❌ Firebase Error:", error);
}

// === 2. ตั้งค่าเบื้องต้นของแอป ===
const defaultConfig = { building_name: 'SMART BUILDING', electricity_rate: '4.50' };
let appState = {
  usingSolar: true,
  currentFloor: 1,
  rooms: {},
  historyData: [],
  todayStats: { solarKwh: 28.5, gridKwh: 12.3, totalCost: 55.35, solarSavings: 128.25 }
};

// === 3. ฟังก์ชันระบบควบคุมไฟ ===
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
      isOn: Math.random() > 0.5
    }));
  }
}

function renderBlueprint() {
  const grid = document.getElementById('blueprint-grid');
  const rooms = appState.rooms[appState.currentFloor] || [];
  grid.innerHTML = rooms.map(room => `
    <div class="room p-4 rounded-xl border-2 ${room.isOn ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-slate-700 bg-slate-800/50'} cursor-pointer" onclick="toggleRoom('${room.id}')">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-medium ${room.isOn ? 'text-yellow-400' : 'text-slate-400'}">${room.name}</span>
        <div class="w-3 h-3 rounded-full ${room.isOn ? 'light-on' : 'light-off'}"></div>
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
    const detailText = `${room.isOn ? 'เปิด' : 'ปิด'}ไฟ ${room.name} ชั้น ${floor}`;
    saveLightLog(room.isOn ? 'TURN_ON' : 'TURN_OFF', detailText);
    showToast(room.isOn ? '💡' : '🌙', detailText);
  }
}

function turnAllLightsOn() {
  appState.rooms[appState.currentFloor].forEach(r => r.isOn = true);
  renderBlueprint();
  saveLightLog('ALL_ON', `เปิดไฟทั้งหมดชั้น ${appState.currentFloor}`);
  showToast('💡', 'เปิดไฟทั้งหมดแล้ว');
}

function turnAllLightsOff() {
  appState.rooms[appState.currentFloor].forEach(r => r.isOn = false);
  renderBlueprint();
  saveLightLog('ALL_OFF', `ปิดไฟทั้งหมดชั้น ${appState.currentFloor}`);
  showToast('🌙', 'ปิดไฟทั้งหมดแล้ว');
}

// === 4. ฟังก์ชันจัดการข้อมูล (Firebase) ===
async function saveLightLog(action, detail) {
  if (db) {
    try {
      await db.collection("light_logs").add({ action, detail, timestamp: new Date().toISOString() });
    } catch (e) { console.error(e); }
  }
}

async function saveCurrentRecord() {
  if (!db) return showToast('❌', 'ฐานข้อมูลไม่พร้อม');
  const btn = document.getElementById('save-btn');
  btn.disabled = true; btn.textContent = '⏳ กำลังบันทึก...';
  
  const record = {
    date: new Date().toISOString(),
    solar_kwh: appState.todayStats.solarKwh,
    total_cost: appState.todayStats.totalCost
  };

  try {
    await db.collection("history").add(record);
    showToast('✅', 'บันทึกข้อมูลสำเร็จ!');
  } catch (e) {
    showToast('❌', 'เกิดข้อผิดพลาด');
  } finally {
    btn.disabled = false; btn.textContent = '💾 บันทึกข้อมูลวันนี้';
  }
}

// === 5. ฟังก์ชันระบบและ UI อื่นๆ ===
function initApp() {
  initRooms();
  updateClock();
  setInterval(updateClock, 1000);
  renderBlueprint();
  updateDashboardStats();
  setInterval(simulateRealTimeUpdates, 5000);

  if (db) {
    db.collection("history").orderBy("date", "desc").onSnapshot(snap => {
      appState.historyData = snap.docs.map(doc => doc.data());
      renderHistory();
    });
  }
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(el => {
    el.classList.remove('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/50');
    el.classList.add('bg-slate-800/50', 'text-slate-400', 'border-slate-700');
  });
  document.getElementById(`content-${tabName}`).classList.remove('hidden');
  document.getElementById(`tab-${tabName}`).classList.add('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/50');
}

function selectFloor(f) {
  appState.currentFloor = f;
  document.querySelectorAll('.floor-btn').forEach((btn, idx) => {
    btn.className = (idx+1 === f) ? "floor-btn px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/50" : "floor-btn px-4 py-2 rounded-lg bg-slate-800 text-slate-400 border border-slate-700";
  });
  renderBlueprint();
}

function updateClock() { document.getElementById('current-time').textContent = new Date().toLocaleTimeString('th-TH'); }

function showToast(icon, msg) {
  const t = document.getElementById('toast');
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-message').textContent = msg;
  t.classList.remove('translate-y-20', 'opacity-0');
  setTimeout(() => t.classList.add('translate-y-20', 'opacity-0'), 3000);
}

function updateDashboardStats() {
  document.getElementById('solar-today').textContent = appState.todayStats.solarKwh.toFixed(2);
  document.getElementById('usage-today').textContent = (appState.todayStats.solarKwh + 12.3).toFixed(2);
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

function simulateRealTimeUpdates() {
  appState.todayStats.solarKwh += 0.01;
  updateDashboardStats();
}

initApp();
