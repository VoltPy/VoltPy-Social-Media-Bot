/**
 * VOLTPY TAPPER & CASINO - V47 (ZIRHLI FRONTEND)
 * Geliştirici: Berke (VoltPy)
 * Özellik: Backend bağımlı kilit sistemi. Backend yoksa oyun yok.
 */

// 1. BACKEND KONFIGURASYONU (PythonAnywhere linkini alınca buraya yazacağız)
const BACKEND_URL = "https://voltpy.pythonanywhere.com/api"; 

const tg = window.Telegram?.WebApp || {};
if (tg.expand) tg.expand();

// Telegram Verileri
const userId = tg.initDataUnsafe?.user?.id || "web_test";
const firstName = tg.initDataUnsafe?.user?.first_name || "Oyuncu";

let balance = 0, currentEnergy = 0, spinCount = 0;
let isSpinning = false, isAutoClicking = false;
let currentRotation = 0, pendingTaps = 0, inactivityTimer = null;

const rewards = [
    { text: "BOŞ" }, { text: "10 💰" }, { text: "50 💰" }, { text: "X3 FREE" },
    { text: "100 💰" }, { text: "250 💰" }, { text: "5000 💰" }, { text: "⚡ FULL" }
];

// 2. 🛡️ GÜVENLİK VE İLETİŞİM MOTORU
async function apiCall(endpoint, payload = {}) {
    try {
        const response = await fetch(`${BACKEND_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Fallback-UID': userId.toString()
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error("Sunucu Kapalı");
        const res = await response.json();
        return res;
    } catch (e) {
        console.error("Kritik Bağlantı Hatası:", e);
        showStatus("SUNUCU BAĞLANTISI YOK!");
        return { success: false };
    }
}

function showStatus(msg) {
    const loadingText = document.querySelector('#loading-overlay p');
    if (loadingText) loadingText.textContent = msg;
}

// 3. 🚀 SİSTEMİ BAŞLAT (BACKEND KONTROLÜ)
async function startApp() {
    showStatus("Sunucuya bağlanılıyor...");
    
    // Backend'den kullanıcı verilerini çekmeyi dene
    const res = await apiCall('/get_user');
    
    if (res.success) {
        balance = res.data.balance;
        currentEnergy = res.data.energy;
        spinCount = res.data.spinCount;
        
        updateUI();
        drawWheel();
        // Sadece veri geldiyse yükleme ekranını kaldır!
        document.getElementById('loading-overlay').style.display = 'none';
        console.log("✅ Sistem Aktif: " + firstName);
    } else {
        showStatus("BAĞLANTI HATASI: Sunucu çevrimdışı veya IP adresi yanlış.");
    }
}

// 4. 🎯 TAPPER (TAMAMEN BACKEND KONTROLLÜ)
const tapBtn = document.getElementById('tap-button');

const handleTap = (e) => {
    if (isAutoClicking || currentEnergy <= 0) return;
    if (e.cancelable) e.preventDefault();

    const touches = e.changedTouches ? e.changedTouches : [e];
    for (let i = 0; i < touches.length; i++) {
        if (currentEnergy > 0) {
            // Görsel olarak artır (Hissiyat için)
            balance++; currentEnergy--; pendingTaps++;
            createPlusOne(touches[i].clientX, touches[i].clientY);
        }
    }
    updateUI();
    
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(syncTaps, 800);
};

async function syncTaps() {
    if (pendingTaps <= 0) return;
    const count = pendingTaps;
    pendingTaps = 0;
    
    const res = await apiCall('/tap', { count: count });
    if (res.success) {
        balance = res.data.balance;
        currentEnergy = res.data.energy;
        updateUI();
    }
}

// 5. 🎡 ÇARK VE REKLAMLAR
window.spinWheel = async () => {
    if (isSpinning) return;
    const res = await apiCall('/spin');
    if (!res.success) return alert(res.message);

    isSpinning = true;
    const pIdx = res.prizeIndex;
    const targetA = (360 - (pIdx * 45)) - 22.5;
    currentRotation += (360 * 5) + ((targetA - (currentRotation % 360) + 360) % 360);

    const canvas = document.getElementById('wheel-canvas');
    canvas.style.transition = 'transform 5s cubic-bezier(0.15, 0, 0.1, 1)';
    canvas.style.transform = `rotate(${currentRotation}deg)`;

    setTimeout(() => {
        isSpinning = false;
        balance = res.newBalance;
        currentEnergy = res.newEnergy;
        updateUI();
        alert("Kazancınız: " + rewards[pIdx].text);
    }, 5100);
};

// 6. ARAYÜZ VE DİĞERLERİ
function updateUI() {
    const balEl = document.getElementById('balance');
    const enText = document.getElementById('energy-text');
    const enBar = document.getElementById('energy-bar');
    
    if (balEl) balEl.textContent = balance;
    if (enText) enText.textContent = `${currentEnergy} / 500`;
    if (enBar) enBar.style.width = `${(currentEnergy / 500) * 100}%`;
}

function createPlusOne(x, y) {
    const p = document.createElement('div');
    p.innerText = '+1'; p.className = 'plus-one';
    p.style.left = `${x}px`; p.style.top = `${y}px`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 600);
}

function drawWheel() {
    const canvas = document.getElementById('wheel-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const radius = 140;
    ctx.clearRect(0, 0, 320, 320);
    ctx.translate(160, 160);
    for (let i = 0; i < 8; i++) {
        const angle = i * (Math.PI / 4) - (Math.PI / 2);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, radius, angle, angle + (Math.PI / 4));
        ctx.fillStyle = i % 2 === 0 ? '#00ff88' : '#1e293b'; ctx.fill();
        ctx.save(); ctx.rotate(angle + (Math.PI / 8));
        ctx.textAlign = "right"; ctx.fillStyle = i % 2 === 0 ? '#000' : '#fff';
        ctx.font = "bold 13px Arial"; ctx.fillText(rewards[i].text, radius - 15, 5); ctx.restore();
    }
}

// Navigasyon
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
        const target = btn.dataset.target;
        document.querySelectorAll('.screen, .nav-btn').forEach(el => el.classList.remove('active'));
        document.getElementById(target).classList.add('active');
        btn.classList.add('active');
    };
});

// Event Listeners
if (tapBtn) {
    tapBtn.addEventListener('touchstart', handleTap, { passive: false });
    tapBtn.addEventListener('mousedown', (e) => { if (!('ontouchstart' in window)) handleTap(e); });
}

// Başlat
startApp();
