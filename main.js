/**
 * VOLTPY CASINO - MAIN LOGIC V5
 * Geliştirici: Berke (VoltPy)
 * Özellikler: Progressive Cost, X3 Frenzy Mode, Offline Energy Recovery, 24h Timer
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 1. FIREBASE KONFİGÜRASYONU
const firebaseConfig = {
    apiKey: "AIzaSyCumZ1RBi32yLpwvDFkb1Y7RbUPyZAOwYQ",
    authDomain: "voltpy1.firebaseapp.com",
    databaseURL: "https://voltpy1-default-rtdb.firebaseio.com",
    projectId: "voltpy1",
    storageBucket: "voltpy1.firebasestorage.app",
    messagingSenderId: "1027898071391",
    appId: "1:1027898071391:web:95909c9c9fe3dc54103eea"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 2. GLOBAL DEĞİŞKENLER VE TELEGRAM SDK
const tg = window.Telegram?.WebApp || {};
if (tg.expand) tg.expand();

const userId = new URLSearchParams(window.location.search).get('uid');
const backupName = new URLSearchParams(window.location.search).get('name') || "Oyuncu";

let balance = 0;
let currentEnergy = 0;
let lastFreeSpin = 0;
let spinCount = 0;      // Günlük zam hesabı için
let freeRoundsLeft = 0; // X3 FREE Bonus modu
let isSpinning = false;
let currentRotation = 0;
let firstLoad = false;
let lastUpdate = Date.now();

// 3. 🎰 ÖDÜL TABLOSU (8 DİLİM - GÖRSELLE %100 UYUMLU)
const rewards = [
    { text: "BOŞ", val: 0, weight: 150 },        // Dilim 0
    { text: "10 💰", val: 10, weight: 200 },     // Dilim 1
    { text: "50 💰", val: 50, weight: 180 },     // Dilim 2
    { text: "X3 FREE", val: 3, type: "frenzy", weight: 40 }, // Dilim 3
    { text: "100 💰", val: 100, weight: 150 },   // Dilim 4
    { text: "250 💰", val: 250, weight: 40 },    // Dilim 5
    { text: "5000 💰", val: 5000, weight: 2 },   // Dilim 6
    { text: "⚡ FULL", val: 500, type: "energy", weight: 30 } // Dilim 7
];

// 4. 📡 FIREBASE CANLI VERİ VE ENERJİ KURTARMA
if (userId) {
    onValue(ref(db, 'users/' + userId), (snapshot) => {
        const data = snapshot.val();
        if (data && !isSpinning) {
            balance = data.balance || 0;
            lastFreeSpin = data.lastFreeSpin || 0;
            spinCount = data.spinCount || 0;

            // Çevrimdışı geçen sürede dolan enerjiyi hesapla (+1⚡ / 60s)
            const savedEnergy = data.energy || 0;
            const savedTime = data.lastUpdate || Date.now();
            const elapsedMins = Math.floor((Date.now() - savedTime) / 60000);
            
            currentEnergy = Math.min(500, savedEnergy + elapsedMins);
            lastUpdate = Date.now();

            updateUI();
            if (!firstLoad) {
                document.getElementById('loading-overlay').style.display = 'none';
                firstLoad = true;
            }
        }
    });
}

// 5. ⏳ SAYAÇLAR (GÜNLÜK HAK VE ENERJİ REGEN)
function tick() {
    const now = Date.now();
    
    // Ücretsiz Hak Sayacı (24 Saat)
    const freeWait = 24 * 60 * 60 * 1000;
    const diff = freeWait - (now - lastFreeSpin);
    const timerVal = document.getElementById('timer-val');
    const spinBtn = document.getElementById('spin-button');
    const cost = Math.min(500, 100 + (spinCount * 50));

    if (freeRoundsLeft > 0) {
        spinBtn.textContent = `BONUS (${freeRoundsLeft})`;
        spinBtn.style.background = "linear-gradient(45deg, #f59e0b, #ef4444)";
        timerVal.textContent = "🔥 FRENZY MODU 🔥";
    } else if (diff <= 0) {
        spinBtn.textContent = "ÜCRETSİZ ÇEVİR";
        spinBtn.style.background = "linear-gradient(45deg, #00ff88, #00d4ff)";
        timerVal.textContent = "HAKKIN HAZIR!";
    } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        timerVal.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        spinBtn.textContent = `ÇEVİR (${cost} 💰)`;
        spinBtn.style.background = "";
    }

    // Enerji Regen Sayacı
    const regenText = document.getElementById('energy-regen-timer');
    if (currentEnergy < 500) {
        const nextIn = 60 - Math.floor(((now - lastUpdate) / 1000) % 60);
        if (regenText) regenText.textContent = `+1 ⚡ / ${nextIn}s`;
        
        if (now - lastUpdate >= 60000) {
            currentEnergy++;
            lastUpdate = now;
            updateUI();
            bulutaYaz();
        }
    } else if (regenText) {
        regenText.textContent = "FULL 🔋";
    }
}
setInterval(tick, 1000);

// 6. 🎡 ÇARK DÖNDÜRME (MİLİMETRİK HESAPLAMA)
document.getElementById('spin-button').onclick = () => {
    if (isSpinning) return;

    const now = Date.now();
    const isDailyFree = (now - lastFreeSpin >= 24 * 60 * 60 * 1000);
    const cost = Math.min(500, 100 + (spinCount * 50));

    // Hak ve Maliyet Kontrolü
    if (freeRoundsLeft > 0) {
        freeRoundsLeft--;
    } else if (isDailyFree) {
        lastFreeSpin = now;
        spinCount = 0; // Ücretsiz hak kullanılınca zammı sıfırla!
    } else {
        if (balance < cost) {
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
            return alert("Bakiye Yetersiz!");
        }
        balance -= cost;
        spinCount++; // Her çevirmede zam yap
    }

    isSpinning = true;
    document.getElementById('reward-text').style.display = 'none';
    updateUI();
    bulutaYaz();

    // Ağırlıklı Rastgele Seçim
    let totalW = rewards.reduce((s, r) => s + r.weight, 0);
    let rand = Math.random() * totalW;
    let pIdx = 0;
    for (let i = 0; i < rewards.length; i++) {
        if (rand < rewards[i].weight) { pIdx = i; break; }
        rand -= rewards[i].weight;
    }

    const prize = rewards[pIdx];
    const segAngle = 360 / rewards.length;
    const startAngle = currentRotation % 360;
    // Dilimin tam ortasına gelmesi için - (segAngle / 2)
    const targetAngle = (360 - (pIdx * segAngle)) - (segAngle / 2);
    const totalSpin = currentRotation + (360 * 6) + ((targetAngle - startAngle + 360) % 360);

    currentRotation = totalSpin;
    const canvas = document.getElementById('wheel-canvas');
    canvas.style.transition = 'transform 5s cubic-bezier(0.15, 0, 0.1, 1)';
    canvas.style.transform = `rotate(${currentRotation}deg)`;

    setTimeout(() => {
        isSpinning = false;
        
        // Ödül Sonuçları
        if (prize.type === "frenzy") {
            freeRoundsLeft = 3;
            triggerFrenzyUI();
        } else if (prize.type === "energy") {
            currentEnergy = 500;
        } else {
            balance += prize.val;
        }

        updateUI();
        bulutaYaz();
        
        const rt = document.getElementById('reward-text');
        rt.textContent = prize.type === "frenzy" ? "🔥 X3 BONUS KAZANDIN! 🔥" : `KAZANÇ: ${prize.text}`;
        rt.style.display = 'block';
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    }, 5000);
};

function triggerFrenzyUI() {
    document.body.style.boxShadow = "inset 0 0 80px #ef4444";
    setTimeout(() => document.body.style.boxShadow = "none", 1200);
}

// 7. 📺 REKLAM İZLEME SİSTEMİ
window.reklamIzle = () => {
    if (tg.showScanQrPopup) { // Örnek bir Telegram tetikleyicisi veya AdsGram entegrasyonu
        console.log("Reklam servisi çağrılıyor...");
    }
    // Simülasyon:
    if (confirm("150 Enerji için reklam izlensin mi?")) {
        currentEnergy = Math.min(500, currentEnergy + 150);
        updateUI();
        bulutaYaz();
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    }
};

// 8. 🎨 ÇARK ÇİZİMİ (CANVAS)
function drawWheel() {
    const canvas = document.getElementById('wheel-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const radius = canvas.width / 2;
    const arc = (2 * Math.PI) / rewards.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < rewards.length; i++) {
        const angle = i * arc - (Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(radius, radius);
        ctx.arc(radius, radius, radius, angle, angle + arc);
        ctx.fillStyle = i % 2 === 0 ? '#00ff88' : '#1e293b';
        ctx.fill();
        
        ctx.save();
        ctx.translate(radius, radius);
        ctx.rotate(angle + arc / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = i % 2 === 0 ? '#000' : '#fff';
        ctx.font = "bold 14px Arial";
        ctx.fillText(rewards[i].text, radius - 15, 5);
        ctx.restore();
    }
}

// 9. ✍️ FIREBASE KAYIT VE UI
function bulutaYaz() {
    if (!userId) return;
    set(ref(db, 'users/' + userId), {
        balance,
        energy: currentEnergy,
        lastFreeSpin,
        spinCount,
        username: backupName,
        lastUpdate: Date.now()
    });
}

function updateUI() {
    const b = document.getElementById('balance');
    const et = document.getElementById('energy-text');
    const eb = document.getElementById('energy-bar');
    if (b) b.textContent = balance;
    if (et) et.textContent = `${currentEnergy} / 500`;
    if (eb) eb.style.width = `${(currentEnergy / 500) * 100}%`;
}

// 10. TAPPER VE NAVİGASYON
const tapBtn = document.getElementById('tap-button');
if (tapBtn) {
    tapBtn.addEventListener('pointerdown', (e) => {
        if (currentEnergy > 0) {
            balance++;
            currentEnergy--;
            updateUI();
            bulutaYaz();
            
            // +1 Efekti
            const p = document.createElement('div');
            p.innerText = '+1'; p.className = 'plus-one';
            p.style.left = e.clientX + 'px'; p.style.top = e.clientY + 'px';
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 800);
            
            if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        } else {
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('warning');
            if (confirm("Enerjin bitti! Reklam izleyerek +150 enerji kazanmak ister misin?")) {
                window.reklamIzle();
            }
        }
    });
}

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
        const target = btn.getAttribute('data-target');
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(target).classList.add('active');
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (target === "earn") drawWheel();
    };
});

// BAŞLAT
drawWheel();
updateUI();
