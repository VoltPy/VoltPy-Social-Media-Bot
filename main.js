/**
 * VOLTPY TAPPER & CASINO - NİHAİ VERSİYON (V12)
 * Geliştirici: Berke (VoltPy)
 * Optimizasyon: Multi-Touch, Sıfır Gecikme, Mekanik Tepki
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 1. FIREBASE YAPILANDIRMASI
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

// 2. TELEGRAM SDK & PARAMETRELER
const tg = window.Telegram?.WebApp || {};
if (tg.expand) tg.expand();

const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('uid'); 
const backupName = urlParams.get('name') || "Oyuncu";

let balance = 0, currentEnergy = 0, lastFreeSpin = 0, spinCount = 0;
let adCount = 0, lastAdHour = new Date().getHours();
let freeRoundsLeft = 0, isSpinning = false, isAutoClicking = false;
let currentRotation = 0, firstLoad = false, lastUpdate = Date.now();
let autoClickInterval = null;

// 3. 🎰 ÖDÜL TABLOSU
const rewards = [
    { text: "BOŞ", val: 0, weight: 150 },
    { text: "10 💰", val: 10, weight: 200 },
    { text: "50 💰", val: 50, weight: 180 },
    { text: "X3 FREE", val: 3, type: "frenzy", weight: 45 }, 
    { text: "100 💰", val: 100, weight: 150 },
    { text: "250 💰", val: 250, weight: 40 },
    { text: "5000 💰", val: 5000, weight: 3 }, 
    { text: "⚡ FULL", val: 500, type: "energy", weight: 30 }
];

// 4. 📡 VERİ SENKRONİZASYONU
if (userId) {
    onValue(ref(db, 'users/' + userId), (snapshot) => {
        const data = snapshot.val();
        if (data && !isSpinning && !isAutoClicking) {
            balance = data.balance || 0;
            lastFreeSpin = data.lastFreeSpin || 0;
            spinCount = data.spinCount || 0;
            adCount = data.adCount || 0;
            const savedAdHour = data.lastAdHour || new Date().getHours();
            if (new Date().getHours() !== savedAdHour) { adCount = 0; }

            const savedEnergy = data.energy || 0;
            const savedTime = data.lastUpdate || Date.now();
            currentEnergy = Math.min(500, savedEnergy + Math.floor((Date.now() - savedTime) / 60000));
            lastUpdate = Date.now();

            updateUI();
            if (!firstLoad) { document.getElementById('loading-overlay').style.display = 'none'; firstLoad = true; }
        }
    });
}

// 5. ⏳ SAYAÇLAR (Enerji & Spin & Parantez Fix)
function tick() {
    const now = Date.now();
    const diff = (24 * 60 * 60 * 1000) - (now - lastFreeSpin);
    const timerVal = document.getElementById('timer-val');
    const spinBtn = document.getElementById('spin-button');
    const cost = Math.min(500, 100 + (spinCount * 50));

    if (spinBtn) {
        if (freeRoundsLeft > 0) {
            spinBtn.textContent = `BONUS (${freeRoundsLeft})`;
            spinBtn.style.background = "linear-gradient(45deg, #f59e0b, #ef4444)";
        } else if (diff <= 0) {
            spinBtn.textContent = "ÜCRETSİZ ÇEVİR";
            spinBtn.style.background = "linear-gradient(45deg, #00ff88, #00d4ff)";
            if (timerVal) timerVal.textContent = "HAKKIN HAZIR!";
        } else {
            // BUG DÜZELTİLDİ: Parantez kapalı
            spinBtn.textContent = `ÇEVİR (${cost} 💰)`; 
            spinBtn.style.background = "";
            if (timerVal) {
                const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
                timerVal.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            }
        }
    }
    if (currentEnergy < 500 && now - lastUpdate >= 60000) { currentEnergy++; lastUpdate = now; updateUI(); bulutaYaz(); }
}
setInterval(tick, 1000);

// 6. 🎡 ÇARK MANTIĞI
const spinBtnEl = document.getElementById('spin-button');
if (spinBtnEl) {
    spinBtnEl.onclick = () => {
        if (isSpinning) return;
        const now = Date.now();
        const cost = Math.min(500, 100 + (spinCount * 50));
        const isDailyFree = (now - lastFreeSpin >= 86400000);

        if (freeRoundsLeft <= 0 && !isDailyFree && balance < cost) return alert("Bakiye Yetersiz!");

        if (freeRoundsLeft > 0) { freeRoundsLeft--; }
        else if (isDailyFree) { lastFreeSpin = now; spinCount = 0; }
        else { balance -= cost; spinCount++; }

        isSpinning = true;
        document.getElementById('reward-text').style.display = 'none';
        updateUI(); bulutaYaz();

        let totalW = rewards.reduce((s, r) => s + r.weight, 0);
        let rand = Math.random() * totalW;
        let pIdx = 0;
        for (let i = 0; i < rewards.length; i++) { if (rand < rewards[i].weight) { pIdx = i; break; } rand -= rewards[i].weight; }

        const prize = rewards[pIdx];
        const seg = 360 / rewards.length;
        const targetA = (360 - (pIdx * seg)) - (seg / 2);
        currentRotation += (360 * 6) + ((targetA - (currentRotation % 360) + 360) % 360);

        const canvas = document.getElementById('wheel-canvas');
        canvas.style.transition = 'transform 5s cubic-bezier(0.15, 0, 0.1, 1)';
        canvas.style.transform = `rotate(${currentRotation}deg)`;

        setTimeout(() => {
            isSpinning = false;
            if (prize.type === "frenzy") { freeRoundsLeft = 3; }
            else if (prize.type === "energy") { currentEnergy = 500; }
            else { balance += prize.val; }
            updateUI(); bulutaYaz();
            document.getElementById('reward-text').textContent = `KAZANÇ: ${prize.text}`;
            document.getElementById('reward-text').style.display = 'block';
        }, 5100);
    };
}

// 7. 🚀 REKLAM VE TURBO
window.watchAdForEnergy = () => {
    if (isAutoClicking || isSpinning) return;
    if (confirm("+250 Enerji ister misin?")) { currentEnergy = Math.min(500, currentEnergy + 250); updateUI(); bulutaYaz(); }
};

window.startTurboMode = () => {
    if (isAutoClicking || adCount >= 20 || currentEnergy < 100) return alert("Limit veya enerji yetersiz!");
    if (confirm("Turbo başlasın mı?")) {
        adCount++; isAutoClicking = true;
        document.body.classList.add('turbo-active');
        document.getElementById('turbo-status').style.display = 'block';
        autoClickInterval = setInterval(() => {
            if (currentEnergy > 0) {
                balance++; currentEnergy--; updateUI();
                createPlusOne(window.innerWidth / 2, window.innerHeight / 2, true);
                if (currentEnergy % 25 === 0) bulutaYaz();
            } else { stopAutoClicker(); }
        }, 85);
    }
};

function stopAutoClicker() {
    clearInterval(autoClickInterval); isAutoClicking = false;
    document.body.classList.remove('turbo-active');
    document.getElementById('turbo-status').style.display = 'none';
    bulutaYaz();
}

// 8. ✍️ FIREBASE KAYDI
function bulutaYaz() {
    if (userId) set(ref(db, 'users/' + userId), { balance, energy: currentEnergy, lastFreeSpin, spinCount, adCount, lastAdHour: new Date().getHours(), username: backupName, lastUpdate: Date.now() });
}

function updateUI() {
    const ids = { 'balance': balance, 'energy-text': `${currentEnergy} / 500`, 'ad-count': adCount };
    for (const [id, val] of Object.entries(ids)) { const el = document.getElementById(id); if (el) el.textContent = val; }
    const bar = document.getElementById('energy-bar'); if (bar) bar.style.width = `${(currentEnergy / 500) * 100}%`;
}

// 9. 🎯 MEKANİK TAPPER (RAPID-FIRE)
const tapBtn = document.getElementById('tap-button');

function createPlusOne(x, y, isTurbo = false) {
    const p = document.createElement('div');
    p.innerText = '+1';
    p.className = 'plus-one';
    // Turbo modunda hafif rastgelelik, manuelde tam parmak ucu
    const offsetX = isTurbo ? (Math.random() * 60 - 30) : 0;
    const offsetY = isTurbo ? (Math.random() * 60 - 30) : 0;
    p.style.left = `${x + offsetX}px`;
    p.style.top = `${y + offsetY}px`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 700);
}

const handleTap = (e) => {
    if (isAutoClicking || currentEnergy <= 0) return;
    
    // Tarayıcı gecikmelerini ve zoomu engelle
    if (e.cancelable) e.preventDefault();

    // Multi-touch desteği: Her dokunma noktası için işlem yap
    const touches = e.changedTouches ? e.changedTouches : [e];
    
    for (let i = 0; i < touches.length; i++) {
        if (currentEnergy > 0) {
            balance++;
            currentEnergy--;
            createPlusOne(touches[i].clientX, touches[i].clientY);
        }
    }
    updateUI();
    if (balance % 25 === 0) bulutaYaz();
};

if (tapBtn) {
    // Mobil için touchstart (0 gecikme)
    tapBtn.addEventListener('touchstart', handleTap, { passive: false });
    // PC için mousedown
    tapBtn.addEventListener('mousedown', (e) => {
        if (!('ontouchstart' in window)) handleTap(e);
    });
}

// 10. NAVİGASYON VE ÇARK ÇİZİMİ
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
        if (isAutoClicking) return;
        const target = btn.dataset.target;
        document.querySelectorAll('.screen, .nav-btn').forEach(el => el.classList.remove('active'));
        document.getElementById(target).classList.add('active');
        btn.classList.add('active');
        if (target === "earn") drawWheel();
    };
});

function drawWheel() {
    const canvas = document.getElementById('wheel-canvas'); if (!canvas) return;
    const ctx = canvas.getContext('2d'); const radius = 160;
    ctx.clearRect(0,0,320,320);
    for (let i = 0; i < 8; i++) {
        const angle = i * (Math.PI / 4) - (Math.PI / 2);
        ctx.beginPath(); ctx.moveTo(radius, radius); ctx.arc(radius, radius, radius, angle, angle + (Math.PI / 4));
        ctx.fillStyle = i % 2 === 0 ? '#00ff88' : '#1e293b'; ctx.fill();
        ctx.save(); ctx.translate(radius, radius); ctx.rotate(angle + (Math.PI / 8));
        ctx.textAlign = "right"; ctx.fillStyle = i % 2 === 0 ? '#000' : '#fff';
        ctx.font = "bold 14px Arial"; ctx.fillText(rewards[i].text, radius - 15, 5); ctx.restore();
    }
}

drawWheel(); updateUI();
