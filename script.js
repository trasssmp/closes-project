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

// เริ่มต้น Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// === 2. Auth & UI State Control ===

// ติดตามสถานะการเข้าสู่ระบบ
auth.onAuthStateChanged(user => {
  const authUI = document.getElementById('auth-container');
  const appUI = document.getElementById('app');

  if (user) {
    // กรณี Login แล้ว
    authUI.classList.add('hidden');
    appUI.classList.remove('hidden');
    document.getElementById('user-display').textContent = `ผู้จัดการ: ${user.email}`;
    initApp(); // รันฟังก์ชันเริ่มต้นของ Dashboard
  } else {
    // กรณี Logout
    authUI.classList.remove('hidden');
    appUI.classList.add('hidden');
  }
  lucide.createIcons(); // อัปเดตไอคอน Lucide
});

// ฟังก์ชันเข้าสู่ระบบ
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const pass = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');

  btn.disabled = true;
  btn.innerHTML = '<div class="loading-spinner"></div> กำลังตรวจสอบ...';

  try {
    await auth.signInWithEmailAndPassword(email, pass);
    showToast('👤', 'เข้าสู่ระบบสำเร็จ');
  } catch (error) {
    alert('เกิดข้อผิดพลาด: ' + error.message);
    btn.disabled = false;
    btn.innerHTML = 'เข้าสู่ระบบ';
  }
});

// ฟังก์ชันสมัครสมาชิก
document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('signup-email').value;
  const pass = document.getElementById('signup-password').value;

  try {
    await auth.createUserWithEmailAndPassword(email, pass);
    alert('สมัครสมาชิกสำเร็จ! ระบบจะเข้าสู่หน้าหลักให้ทันที');
  } catch (error) {
    alert('สมัครสมาชิกไม่สำเร็จ: ' + error.message);
  }
});

function handleLogout() {
  auth.signOut().then(() => {
    location.reload(); // รีโหลดเพื่อเคลียร์ค่า State
  });
}

function showSignupForm() {
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('signup-view').classList.remove('hidden');
  lucide.createIcons();
}

function showLoginForm() {
  document.getElementById('signup-view').classList.add('hidden');
  document.getElementById('login-view').classList.remove('hidden');
  lucide.createIcons();
}

// === 3. Solar Dashboard Logic (โค้ดเดิมของคุณ) ===

// *** จุดสำคัญ: ปรับปรุงให้บันทึก User Email ใน Logs ***
async function saveLightLog(actionType, detailText) {
  if (!db || !auth.currentUser) return;
  const logEntry = {
    type: actionType,
    detail: detailText,
    user: auth.currentUser.email, // บันทึกว่าใครเป็นคนทำรายการ
    timestamp: new Date().toISOString()
  };
  try {
    await db.collection("light_logs").add(logEntry);
  } catch (error) { console.error(error); }
}

// (นำฟังก์ชัน initRooms, initApp, render ต่างๆ มาต่อท้ายตรงนี้ได้เลย)

// === 2. โค้ดการทำงานของเว็บ ===
const defaultConfig = {
  building_name: 'SMART BUILDING',
  electricity_rate: '4.50'
};

let appState = {
  usingSolar: true,
  currentFloor: 1,
  rooms: {},
  automationSettings: { motion: true, schedule: true, solar: true, alert: true },
  motionTimeout: 10,
  scheduleTime: '22:00',
  solarThreshold: 2,
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
  
  // ดึงข้อมูลประวัติจาก Firebase
  db.collection("history").onSnapshot((querySnapshot) => {
    const data = [];
    querySnapshot.forEach((doc) => {
      data.push(doc.data());
    });
    appState.historyData = data;
    renderHistory();
  }, (error) => {
    console.error("Firebase Snapshot Error:", error);
  });

  updateClock();
  setInterval(updateClock, 1000);
  renderBlueprint();
  renderSolarPanels();
  renderAutomationLogs();
  updateDashboardStats();
  setInterval(simulateRealTimeUpdates, 5000);
}

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
  
  // สร้างข้อความสำหรับบันทึก Log
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

  // --- แสดงผลบนหน้าจอและส่งไป Firebase ---
  showToast(appState.usingSolar ? '☀️' : '🏭', logMessage);
  
  // เรียกใช้ฟังก์ชันบันทึก Log (ที่รวมการส่งไป Firebase ไว้ข้างในแล้ว)
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
    
    // ข้อความประวัติ
    const detailText = `${room.isOn ? 'เปิด' : 'ปิด'}ไฟ ${room.name} ชั้น ${floor}`;
    
    showToast(room.isOn ? '💡' : '🌙', detailText + 'แล้ว');
    addAutomationLog(detailText);
    
    // ---> สั่งส่งข้อมูลเข้า Firebase ตรงนี้ <---
    saveLightLog(room.isOn ? 'TURN_ON' : 'TURN_OFF', detailText);
  }
}

function turnAllLightsOn() {
  appState.rooms[appState.currentFloor].forEach(room => { room.isOn = true; room.isForgotten = false; });
  renderBlueprint(); 
  
  const detailText = `เปิดไฟทั้งหมดชั้น ${appState.currentFloor}`;
  showToast('💡', detailText + ` แล้ว`);
  addAutomationLog(detailText);

  // ---> สั่งส่งข้อมูลเข้า Firebase ตรงนี้ <---
  saveLightLog('ALL_ON', detailText);
}

function turnAllLightsOff() {
  appState.rooms[appState.currentFloor].forEach(room => { room.isOn = false; room.isForgotten = false; });
  renderBlueprint(); 
  
  const detailText = `ปิดไฟทั้งหมดชั้น ${appState.currentFloor}`;
  showToast('🌙', detailText + ` แล้ว`);
  addAutomationLog(detailText);

  // ---> สั่งส่งข้อมูลเข้า Firebase ตรงนี้ <---
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
    panels.push(`
      <div class="p-3 rounded-lg ${efficiency > 90 ? 'bg-emerald-500/20 border border-emerald-500/50' : 'bg-yellow-500/10 border border-yellow-500/30'} text-center">
        <div class="text-2xl mb-1">☀️</div>
        <div class="text-xs text-slate-400">แผง ${i}</div>
        <div class="text-sm font-medium ${efficiency > 90 ? 'text-emerald-400' : 'text-yellow-400'}">${efficiency}%</div>
      </div>
    `);
  }
  container.innerHTML = panels.join('');
}

function toggleAutomation(type) {
  appState.automationSettings[type] = !appState.automationSettings[type];
  const btn = document.getElementById(`auto-${type}`);
  const knob = btn.querySelector('div');
  if (appState.automationSettings[type]) {
    btn.classList.remove('bg-slate-600'); btn.classList.add('bg-emerald-500');
    knob.style.right = '4px'; knob.style.left = 'auto';
  } else {
    btn.classList.remove('bg-emerald-500'); btn.classList.add('bg-slate-600');
    knob.style.left = '4px'; knob.style.right = 'auto';
  }
}

function updateMotionTimeout() { appState.motionTimeout = parseInt(document.getElementById('motion-timeout').value); showToast('⏱️', `ตั้งเวลาเป็น ${appState.motionTimeout} นาที`); }
function updateScheduleTime() { appState.scheduleTime = document.getElementById('schedule-time').value; showToast('🕐', `ตั้งเวลาเป็น ${appState.scheduleTime} น.`); }
function updateSolarThreshold() { appState.solarThreshold = parseInt(document.getElementById('solar-threshold').value); showToast('☀️', `ตั้งค่าสลับโซลาร์เป็น ${appState.solarThreshold} kW`); }

function addAutomationLog(message) {
  const now = new Date();
  const time = now.toLocaleTimeString('th-TH');
  appState.automationLogs.unshift({ time, message });
  if (appState.automationLogs.length > 20) appState.automationLogs.pop();
  renderAutomationLogs();

  // --- แก้ไขจุดนี้: เรียกใช้ฟังก์ชันบันทึก Firebase ---
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

function filterHistory(filter) {
  appState.historyFilter = filter;
  document.querySelectorAll('#content-history .flex.gap-2 button').forEach(btn => {
    btn.classList.remove('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/50');
    btn.classList.add('bg-slate-800', 'text-slate-400', 'border-slate-700');
  });
  document.getElementById(`filter-${filter}`).classList.remove('bg-slate-800', 'text-slate-400', 'border-slate-700');
  document.getElementById(`filter-${filter}`).classList.add('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/50');
  renderHistory();
}

function renderHistory() {
  const table = document.getElementById('history-table');
  const noHistory = document.getElementById('no-history');
  let data = [...appState.historyData];
  
  if (appState.historyFilter === 'week') {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    data = data.filter(d => new Date(d.date) >= weekAgo);
  } else if (appState.historyFilter === 'month') {
    const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
    data = data.filter(d => new Date(d.date) >= monthAgo);
  }
  
  if (data.length === 0) {
    table.innerHTML = ''; noHistory.classList.remove('hidden');
  } else {
    noHistory.classList.add('hidden');
    table.innerHTML = data.sort((a, b) => new Date(b.date) - new Date(a.date)).map(record => `
      <tr class="border-b border-slate-800 hover:bg-slate-800/30">
        <td class="py-3 px-4 text-white">${new Date(record.date).toLocaleDateString('th-TH')}</td>
        <td class="py-3 px-4 text-right text-yellow-400">${record.solar_kwh.toFixed(2)}</td>
        <td class="py-3 px-4 text-right text-blue-400">${record.grid_kwh.toFixed(2)}</td>
        <td class="py-3 px-4 text-right text-red-400">${record.total_cost.toFixed(2)} ฿</td>
        <td class="py-3 px-4 text-right text-emerald-400">${record.solar_savings.toFixed(2)} ฿</td>
      </tr>
    `).join('');
  }
  
  const totalSolar = data.reduce((sum, d) => sum + d.solar_kwh, 0);
  const totalGrid = data.reduce((sum, d) => sum + d.grid_kwh, 0);
  const totalCost = data.reduce((sum, d) => sum + d.total_cost, 0);
  const totalSavings = data.reduce((sum, d) => sum + d.solar_savings, 0);
  
  document.getElementById('total-solar').textContent = `${totalSolar.toFixed(1)} kWh`;
  document.getElementById('total-grid').textContent = `${totalGrid.toFixed(1)} kWh`;
  document.getElementById('total-cost').textContent = `${totalCost.toFixed(0)} บาท`;
  document.getElementById('total-savings').textContent = `${totalSavings.toFixed(0)} บาท`;
}

async function saveCurrentRecord() {
  const btn = document.getElementById('save-btn');
  btn.disabled = true; btn.textContent = '⏳ กำลังบันทึก...';
  const record = {
    type: 'daily', date: new Date().toISOString(),
    solar_kwh: appState.todayStats.solarKwh, grid_kwh: appState.todayStats.gridKwh,
    total_cost: appState.todayStats.totalCost, solar_savings: appState.todayStats.solarSavings
  };
  try {
    await db.collection("history").add(record);
    showToast('✅', 'บันทึกข้อมูลลง Firebase สำเร็จ!');
    addAutomationLog('บันทึกข้อมูลการใช้ไฟฟ้าลงฐานข้อมูล');
  } catch (error) {
    console.error("Error adding document: ", error);
    showToast('❌', 'เกิดข้อผิดพลาดในการบันทึก');
  } finally {
    btn.disabled = false; btn.textContent = '💾 บันทึกข้อมูล';
  }
}

function updateDashboardStats() {
  document.getElementById('solar-today').textContent = appState.todayStats.solarKwh.toFixed(2);
  document.getElementById('usage-today').textContent = (appState.todayStats.solarKwh + appState.todayStats.gridKwh).toFixed(2);
  document.getElementById('cost-today').textContent = appState.todayStats.totalCost.toFixed(2);
  document.getElementById('savings-today').textContent = appState.todayStats.solarSavings.toFixed(2);
}

function simulateRealTimeUpdates() {
  const solarPower = (3.5 + Math.random() * 1.5).toFixed(1);
  document.getElementById('solar-power').textContent = `${solarPower} kW`;
  document.getElementById('current-generation').textContent = `${solarPower} kW`;
  const buildingUsage = (3.0 + Math.random() * 1.5).toFixed(1);
  document.getElementById('building-usage').textContent = `${buildingUsage} kW`;
  const batteryLevel = 80 + Math.floor(Math.random() * 15);
  document.getElementById('battery-level').textContent = `${batteryLevel}%`;
  document.getElementById('battery-percent').textContent = `${batteryLevel}%`;
  document.getElementById('battery-fill').style.height = `${batteryLevel}%`;
  document.getElementById('battery-remaining').textContent = `${(batteryLevel * 0.5).toFixed(1)} kWh`;
  
  appState.todayStats.solarKwh += parseFloat(solarPower) * (5/3600);
  appState.todayStats.gridKwh += Math.max(0, parseFloat(buildingUsage) - parseFloat(solarPower)) * (5/3600);
  const rate = parseFloat(defaultConfig.electricity_rate);
  appState.todayStats.totalCost = appState.todayStats.gridKwh * rate;
  appState.todayStats.solarSavings = appState.todayStats.solarKwh * rate;
  updateDashboardStats();
}

function updateClock() {
  const now = new Date();
  document.getElementById('current-time').textContent = now.toLocaleTimeString('th-TH');
}

function showToast(icon, message) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-message').textContent = message;
  toast.classList.remove('translate-y-20', 'opacity-0'); toast.classList.add('translate-y-0', 'opacity-100');
  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100'); toast.classList.add('translate-y-20', 'opacity-0');
  }, 3000);
}
// ฟังก์ชันสำหรับส่งประวัติการเปิด-ปิดไฟเข้า Firebase
async function saveLightLog(actionType, detailText) {
  if (!db) return; // ถ้า Database ยังไม่พร้อมให้ข้ามไปก่อน

  const logEntry = {
    type: actionType,       // เช่น 'TURN_ON', 'TURN_OFF', 'ALL_ON'
    detail: detailText,     // เช่น 'เปิดไฟ ออฟฟิศ A ชั้น 1'
    timestamp: new Date().toISOString() // เวลาที่กด (ปี-เดือน-วัน T เวลา)
  };

  try {
    // ส่งไปเก็บใน Collection ใหม่ที่ชื่อว่า "light_logs"
    await db.collection("light_logs").add(logEntry);
    console.log("บันทึกประวัติไฟสำเร็จ:", detailText);
  } catch (error) {
    console.error("บันทึกประวัติไฟล้มเหลว: ", error);
  }
}
// โหลดการทำงานเริ่มต้น

async function saveAutomationLogToFirebase(message) {
  if (!db) return; // ถ้าเชื่อมต่อ Firebase ไม่ติดให้หยุดทำงาน

  const logEntry = {
    message: message,
    timestamp: new Date().toISOString()
  };

  try {
    // คำสั่งนี้จะสร้าง Collection "automation_logs" ให้เองอัตโนมัติเมื่อมีการส่งครั้งแรก
    await db.collection("automation_logs").add(logEntry);
    console.log("บันทึก Automation Log สำเร็จ");
  } catch (error) {
    console.error("บันทึก Automation Log ล้มเหลว:", error);
  }
}
