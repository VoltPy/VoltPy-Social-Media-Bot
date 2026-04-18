/**
 * VOLTPY TAPPER & CASINO - V45 (FRONTEND / GITHUB VERSİYONU)
 * Geliştirici: Berke (VoltPy)
 * Açıklama: Firebase tamamen silindi. Bu dosya sadece arayüzü yönetir ve güvenli Python Backend'i ile haberleşir.
 */

// 1. SİSTEM VE SUNUCU AYARLARI
const BACKEND_URL = "https://senin-python-sunucun.com/api"; // BURAYA PYTHON SUNUCU LİNKİMİZ GELECEK

const tg = window.Telegram?.WebApp || {};
if (tg.expand) tg.expand();

// TELEGRAM GÜVENLİK ANAHTARI (Backend bu şifreyle adamın kim olduğunu kesin olarak anlayacak)
const initData = tg.initData || ""; 
const fallbackUserId = new URLSearchParams(window.location.search).get('uid');

let balance = 0, currentEnergy = 0, lastFreeSpin = 0, spinCount = 0;
let turboAdCount = 0, energyAdCount = 0, lastTurboAdTime = 0, lastEnergyAdTime = 0;
let isSpinning = false, isAutoClicking = false, autoClickInterval = null;
let currentRotation = 0;

// 🔥 YENİ SİSTEM: HAVUZ (QUEUE) MANTIĞI 🔥
// Adamın tıklamalarını direkt hesaba yazmıyoruz, burada biriktirip sunucuya paket halinde yolluyoruz.
let pendingTaps = 0; 
let inactivityTimer = null;

const rewards = [
    { text: "BOŞ", val: 0, type: "none" },
    { text: "10 💰", val: 10, type: "coin" },
    { text: "50 💰", val: 50, type: "coin" },
    { text: "X3 FREE", val: 3, type: "frenzy" }, 
    { text: "100 💰", val: 100, type: "coin" },
    { text: "250 💰", val: 250, type: "coin" },
    { text: "5000 💰", val: 5000, type: "coin" }, 
    { text: "⚡ FULL", val: 500, type: "energy" }
];

function removeLoadingScreen() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
}
setTimeout(removeLoadingScreen, 4000); // Failsafe

// 2. 📡 BACKEND İLE İLETİŞİM MOTORU
async function apiCall(endpoint, payload = {}) {
    try {
        const response = await fetch(`${BACKEND_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': initData, // Adamın F12'den taklit edemeyeceği Telegram imzası
                'Fallback-UID': fallbackUserId 
            },
            body: JSON.stringify(payload)
        });
        return await response.json();
    } catch (error) {
        console.error("Sunucu bağlantı hatası:", error);
        return { success: false, error: "Sunucuya ulaşılamıyor" };
    }
}

// 3. OYUNU BAŞLATMA VE VERİ ÇEKME
async function loadUserData() {
    // Firebase yerine kendi sunucumuzdan veriyi istiyoruz
    const res = await apiCall('/get_user');
    
    if (res.success) {
        const data = res.data;
        balance = data.balance;
        currentEnergy = data.energy;
        spinCount = data.spinCount;
        lastFreeSpin = data.lastFreeSpin;
        turboAdCount = data.turboAdCount;
        energyAdCount = data.energyAdCount;
        lastTurboAdTime = data.lastTurboAdTime;
        lastEnergyAdTime = data.lastEnergyAdTime;
    } else {
        // Sunucu yoksa arayüz çökmeyip varsayılanları göstersin diye
        balance = 0; currentEnergy = 500;
    }
    updateUI();
    removeLoadingScreen();
}
loadUserData();

// 4. 🎯 TAPPER (TIKLAMA) SİSTEMİ
const tapBtn = document.getElementById('tap-button');

const handleTap = (e) => {
    if (isAutoClicking) return;
    if (e.cancelable) e.preventDefault();

    if (currentEnergy <= 0) {
        const modal = document.getElementById('energy-modal');
        if(modal) modal.style.display = 'flex';
        tapBtn?.classList.add('shake');
        setTimeout(() => tapBtn?.classList.remove('shake'), 200);
        return;
    }

    tapBtn?.classList.add('active-tap');
    setTimeout(() => tapBtn?.classList.remove('active-tap'), 50);

    const touches = e.changedTouches ? e.changedTouches : [e];
    for (let i = 0; i < touches.length; i++) {
        if (currentEnergy > 0) {
            // Sadece ekranda (UI) anlık gösteriyoruz, gerçek para sunucuda artacak
            balance++; currentEnergy--; pendingTaps++;
            createPlusOne(touches[i].clientX, touches[i].clientY);
        }
    }
    updateUI();

    // Adam tıklamayı bırakınca sunucuya gönder
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        sendTapsToBackend();
    }, 1000); 
};

// Bekleyen tıklamaları sunucuya ileten fonksiyon
async function sendTapsToBackend() {
    if (pendingTaps === 0) return;
    
    const tapsToSend = pendingTaps;
    pendingTaps = 0; // Havuzu sıfırla

    // Sunucuya "Bu adam şu kadar tıkladı" diyoruz. Sunucu hile var mı diye kendi bakacak.
    const res = await apiCall('/tap', { count: tapsToSend });
    
    // Sunucu hile tespit edip reddederse, ekranı sunucudaki gerçek parayla güncelliyoruz
    if (res.success) {
        balance = res.data.balance;
        currentEnergy = res.data.energy;
        updateUI();
    }
}

function createPlusOne(x, y) {
    const p = document.createElement('div');
    p.innerText = '+1'; p.className = 'plus-one';
    p.style.left = `${x}px`; p.style.top = `${y}px`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 600);
}

if (tapBtn) {
    tapBtn.addEventListener('touchstart', handleTap, { passive: false });
    tapBtn.addEventListener('mousedown', (e) => { if (!('ontouchstart' in window)) handleTap(e); });
}

// 5. 🎡 CASINO ÇARK MANTIĞI (RNG SUNUCUYA TAŞINDI)
const spinBtnEl = document.getElementById('spin-button');
if (spinBtnEl) {
    spinBtnEl.onclick = async () => {
        if (isSpinning) return;
        
        isSpinning = true;
        const rewardEl = document.getElementById('reward-text');
        if(rewardEl) rewardEl.style.display = 'none';

        // Çarkı çevirmeden önce sunucuya soruyoruz: "Param yetiyor mu? Hangi ödül geldi?"
        const res = await apiCall('/spin');

        if (!res.success) {
            isSpinning = false;
            return alert(res.message || "Bakiye yetersiz veya hata oluştu!");
        }

        // Sunucunun belirlediği ödül indeksini alıyoruz (Hile yapılması imkansız!)
        const pIdx = res.prizeIndex; 
        const prize = rewards[pIdx];

        // Anlık bakiyeyi düşürüyoruz (Görsel olarak)
        balance = res.currentBalance;
        updateUI();

        // Çarkı, sunucunun söylediği ödüle döndürüyoruz
        const targetA = (360 - (pIdx * 45)) - 22.5;
        currentRotation += (360 * 6) + ((targetA - (currentRotation % 360) + 360) % 360);

        const canvas = document.getElementById('wheel-canvas');
        if(canvas) {
            canvas.style.transition = 'transform 5s cubic-bezier(0.15, 0, 0.1, 1)';
            canvas.style.transform = `rotate(${currentRotation}deg)`;
        }

        setTimeout(() => {
            isSpinning = false;
            
            // Animasyon bitince sunucunun gönderdiği yeni verileri ekrana yansıt
            balance = res.newBalance;
            currentEnergy = res.newEnergy;
            updateUI();
            
            if(rewardEl) {
                rewardEl.textContent = `KAZANÇ: ${prize.text}`;
                rewardEl.style.display = 'inline-block';
            }
        }, 5100);
    };
}

// 6. 🚀 REKLAM VE TURBO SİSTEMİ (Onaylar Sunucudan)
window.watchAdForEnergy = async () => {
    if (isAutoClicking || isSpinning) return;

    if (confirm("+250 Enerji ister misin? (Buraya reklam gelecek)")) {
        const res = await apiCall('/watch_energy_ad');
        if (res.success) {
            currentEnergy = res.data.energy;
            energyAdCount = res.data.energyAdCount;
            lastEnergyAdTime = res.data.lastEnergyAdTime;
            updateUI();
            updateCooldowns();
        } else {
            alert(res.message);
        }
    }
};

window.startTurboMode = async () => {
    if (isAutoClicking) return;
    if (currentEnergy < 100) return alert("Turbo için en az 100 enerji gerekli.");

    if (confirm("Otomasyon başlasın mı?")) {
        // Sunucudan turbo onayı alıyoruz
        const res = await apiCall('/start_turbo');
        if (!res.success) return alert(res.message);

        turboAdCount = res.data.turboAdCount;
        lastTurboAdTime = res.data.lastTurboAdTime;
        isAutoClicking = true;
        document.body.classList.add('turbo-active');
        const statusText = document.getElementById('turbo-status');
        if (statusText) statusText.style.display = 'block';

        autoClickInterval = setInterval(() => {
            if (currentEnergy > 0) {
                balance++; currentEnergy--; pendingTaps++;
                updateUI();
                createPlusOne(window.innerWidth / 2, window.innerHeight / 2);
                
                if (pendingTaps % 15 === 0) sendTapsToBackend();
            } else { 
                stopAutoClicker(); 
            }
        }, 85);
        updateCooldowns(); 
    }
};

function stopAutoClicker() {
    if (autoClickInterval) {
        clearInterval(autoClickInterval);
        autoClickInterval = null;
    }
    isAutoClicking = false;
    document.body.classList.remove('turbo-active');
    const statusText = document.getElementById('turbo-status');
    if (statusText) statusText.style.display = 'none';
    sendTapsToBackend(); // Kalanları yolla
    updateUI(); 
}

// 7. ARAYÜZ VE SAYAÇ GÜNCELLEMELERİ
function updateUI() {
    try {
        const balEl = document.getElementById('balance');
        if(balEl) balEl.textContent = balance;
        
        const eText = document.getElementById('energy-text');
        if(eText) eText.textContent = `${currentEnergy} / 500`;
        
        const eBar = document.getElementById('energy-bar');
        if(eBar) eBar.style.width = `${(currentEnergy / 500) * 100}%`;
        
        const turboAdEl = document.getElementById('turbo-ad-text');
        if(turboAdEl) turboAdEl.textContent = `${turboAdCount}/5`;

        const energyAdEl = document.getElementById('energy-ad-text');
        if(energyAdEl) energyAdEl.textContent = `${energyAdCount}/5`;

        const energySection = document.querySelector('.energy-section');
        const energyWarning = document.getElementById('energy-warning');

        if (currentEnergy <= 0) {
            if (energySection) energySection.classList.add('energy-empty');
            if (energyWarning) energyWarning.style.display = 'block';
            if (isAutoClicking) stopAutoClicker();
        } else {
            if (energySection) energySection.classList.remove('energy-empty');
            if (energyWarning) energyWarning.style.display = 'none';
        }
    } catch(e) {}
}

function updateCooldowns() {
    // (Aynı UI güncellemeleri, bu kodlar sadece görünüm olduğu için burada kalıyor)
    const now = Date.now();
    function formatTime(ms) {
        if (ms < 0) return "00:00";
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    const AD_COOLDOWN_MS = 5 * 60 * 1000;
    const currentHour = new Date(now).getHours();

    // ⚡ ENERJİ BUTONU PERDESİ
    const energyOverlay = document.getElementById('energy-cooldown-overlay');
    const energyTimerText = document.getElementById('energy-cooldown-timer');
    if (energyOverlay && energyTimerText) {
        if (energyAdCount >= 5) {
            const nextHour = new Date(now); nextHour.setHours(currentHour + 1, 0, 0, 0); 
            energyOverlay.style.display = 'flex';
            const span = energyOverlay.querySelector('span'); if(span) span.textContent = "LİMİT DOLDU";
            energyTimerText.textContent = formatTime(nextHour.getTime() - now);
        } else if (now - lastEnergyAdTime < AD_COOLDOWN_MS && lastEnergyAdTime !== 0) {
            energyOverlay.style.display = 'flex';
            const span = energyOverlay.querySelector('span'); if(span) span.textContent = "BEKLEME SÜRESİ";
            energyTimerText.textContent = formatTime(AD_COOLDOWN_MS - (now - lastEnergyAdTime));
        } else {
            energyOverlay.style.display = 'none';
        }
    }

    // 🚀 TURBO BUTONU PERDESİ
    const turboOverlay = document.getElementById('turbo-cooldown-overlay');
    const turboTimerText = document.getElementById('turbo-cooldown-timer');
    if (turboOverlay && turboTimerText) {
        if (turboAdCount >= 5) {
            const nextHour = new Date(now); nextHour.setHours(currentHour + 1, 0, 0, 0);
            turboOverlay.style.display = 'flex';
            const span = turboOverlay.querySelector('span'); if(span) span.textContent = "LİMİT DOLDU";
            turboTimerText.textContent = formatTime(nextHour.getTime() - now);
        } else if (now - lastTurboAdTime < AD_COOLDOWN_MS && lastTurboAdTime !== 0) {
            turboOverlay.style.display = 'flex';
            const span = turboOverlay.querySelector('span'); if(span) span.textContent = "BEKLEME SÜRESİ";
            turboTimerText.textContent = formatTime(AD_COOLDOWN_MS - (now - lastTurboAdTime));
        } else {
            turboOverlay.style.display = 'none';
        }
    }
}
setInterval(updateCooldowns, 1000);

// 8. NAVİGASYON
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
        if (isAutoClicking) return;
        const target = btn.dataset.target;
        document.querySelectorAll('.screen, .nav-btn').forEach(el => el.classList.remove('active'));
        const targetEl = document.getElementById(target);
        if(targetEl) targetEl.classList.add('active');
        btn.classList.add('active');
        if (target === "earn") drawWheel(); // drawWheel fonksiyonun HTML'de kalabilir
    };
});

window.closeEnergyModal = () => {
    document.getElementById('energy-modal').style.display = 'none';
};

// SİGORTA: Sayfa kapanırken bekleyen tıklamaları mutlaka gönder
window.addEventListener("beforeunload", () => {
    if (pendingTaps > 0) {
        // navigator.sendBeacon, sayfa kapanırken bile sunucuya istek atmayı sağlayan güvenli bir fonksiyondur
        navigator.sendBeacon(`${BACKEND_URL}/tap`, JSON.stringify({
            count: pendingTaps,
            initData: initData,
            uid: fallbackUserId
        }));
    }
});
