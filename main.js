/**
 * VOLTPY CASINO & TAPPER - V9
 * Geliştirici: Berke (VoltPy)
 * Düzeltmeler: String parantez hatası, UI senkronu, Gelişmiş Tapper Mantığı
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

// 2. DEĞİŞKENLER VE TELEGRAM SDK
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

// 4. 📡 FIREBASE VERİ SENKRONİZASYONU
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

// 5. ⏳ SAYAÇLAR (Enerji & Free Spin & Bug Düzeltme)
function tick() {
    const now = Date.now();
    const freeWait = 24 * 60 * 60 * 1000;
    const diff = freeWait - (now - lastFreeSpin);
    const timerVal = document.getElementById('timer-val');
    const spinBtn = document.getElementById('spin-button');
    const cost = Math.min(500, 100 + (spinCount * 50));

    if (spinBtn) {
        if (freeRoundsLeft > 0) {
            spinBtn.textContent = `BONUS (${freeRoundsLeft})`;
            spinBtn.style.background = "linear-gradient(45deg, #f59e0b, #ef4444)";
            if (timerVal) timerVal.textContent = "🔥 BONUS TUR 🔥";
        } else if (diff <= 0) {
            spinBtn.textContent = "ÜCRETSİZ ÇEVİR";
            spinBtn.style.background = "linear-gradient(45deg, #00ff88, #00d4ff)";
            if (timerVal) timerVal.textContent = "HAKKIN HAZIR!";
        } else {
            // BUG DÜZELTİLDİ: Parantez kapatıldı
            spinBtn.textContent = `ÇEVİR (${cost} 💰)`; 
            spinBtn.style.background = "";
            if (timerVal) {
                const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
                timerVal.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            }
        }
    }

    const regenText = document.getElementById('energy-regen-timer');
    if (currentEnergy < 500) {
        const nextIn = 60 - Math.floor(((now - lastUpdate) / 1000) % 60);
        if (regenText) regenText.textContent = `+1 ⚡ / ${nextIn}s`;
        if (now - lastUpdate >= 60000) {
            currentEnergy++; lastUpdate = now; updateUI(); bulutaYaz();
        }
    } else if (regenText) { regenText.textContent = "FULL 🔋"; }
}
setInterval(tick, 1000);

// 6. 🎡 ÇARK MANTIĞI
if (document.getElementById('spin-button')) {
    document.getElementById('spin-button').onclick = () => {
        if (isSpinning) return;
        const now = Date.now();
        const isDailyFree = (now - lastFreeSpin >= 24 * 60 * 60 * 1000);
        const cost = Math.min(500, 100 + (spinCount * 50));

        if (freeRoundsLeft > 0) {
            freeRoundsLeft--;
        } else if (isDailyFree) {
            lastFreeSpin = now;
            spinCount = 0;
        } else {
            if (balance < cost) return alert("Bakiye Yetersiz!");
            balance -= cost;
            spinCount++;
        }

        isSpinning = true;
        document.getElementById('reward-text').style.display = 'none';
        updateUI(); bulutaYaz();

        let totalW = rewards.reduce((s, r) => s + r.weight, 0);
        let rand = Math.random() * totalW;
        let pIdx = 0;
        for (let i = 0; i < rewards.length; i++) { if (rand < rewards[i].weight) { pIdx = i; break; } rand -= rewards[i].weight; }

        const prize = rewards[pIdx];
        const seg = 360 / rewards.length;
        const startA = currentRotation % 360;
        const targetA = (360 - (pIdx * seg)) - (seg / 2);
        const totalS = currentRotation + (360 * 6) + ((targetA - startA + 360) % 360);

        currentRotation = totalS;
        const canvas = document.getElementById('wheel-canvas');
        canvas.style.transition = 'transform 5s cubic-bezier(0.15, 0, 0.1, 1)';
        canvas.style.transform = `rotate(${currentRotation}deg)`;

        setTimeout(() => {
            isSpinning = false;
            if (prize.type === "frenzy") { 
                freeRoundsLeft = 3; 
                document.body.style.boxShadow = "inset 0 0 60px #ef4444";
                setTimeout(() => document.body.style.boxShadow = "none", 1200);
            }
            else if (prize.type === "energy") { currentEnergy = 500; }
            else { balance += prize.val; }
            
            updateUI(); bulutaYaz();
            const rt = document.getElementById('reward-text');
            rt.textContent = prize.type === "frenzy" ? "🔥 X3 BONUS KAZANDIN! 🔥" : `KAZANÇ: ${prize.text}`;
            rt.style.display = 'block';
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        }, 5100);
    };
}

// 7. 🚀 REKLAM VE TURBO (SADECE HOME'DA AKTİF)
window.watchAdForEnergy = () => {
    if (isAutoClicking || isSpinning) return;
    if (confirm("+250 Enerji için reklam izlensin mi?")) {
        currentEnergy = Math.min(500, currentEnergy + 250);
        updateUI(); bulutaYaz();
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    }
};

window.startTurboMode = () => {
    if (isAutoClicking || isSpinning) return;
    if (adCount >= 20) return alert("Saatlik limit doldu!");
    if (currentEnergy < 100) return alert("Turbo için en az 100 enerji lazım!");

    if (confirm("Otomasyon başlasın mı?")) {
        adCount++;
        startAutoClicker();
        updateUI(); bulutaYaz();
    }
};

function startAutoClicker() {
    isAutoClicking = true;
    document.body.classList.add('turbo-active');
    document.getElementById('turbo-status').style.display = 'block';
    document.querySelector('.bottom-nav').style.pointerEvents = 'none';

    autoClickInterval = setInterval(() => {
        if (currentEnergy > 0) {
            balance++; currentEnergy--; updateUI();
            const p = document.createElement('div'); p.innerText = '+1'; p.className = 'plus-one';
            p.style.left = (window.innerWidth / 2 + (Math.random()*60-30)) + 'px';
            p.style.top = (window.innerHeight / 2 + (Math.random()*60-30)) + 'px';
            document.body.appendChild(p); setTimeout(() => p.remove(), 500);
            if (currentEnergy % 20 === 0) bulutaYaz();
        } else { stopAutoClicker(); }
    }, 85);
}

function stopAutoClicker() {
    clearInterval(autoClickInterval);
    isAutoClicking = false;
    document.body.classList.remove('turbo-active');
    document.getElementById('turbo-status').style.display = 'none';
    document.querySelector('.bottom-nav').style.pointerEvents = 'auto';
    bulutaYaz();
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
}

// 8. 🎨 ÇARK ÇİZİMİ
function drawWheel() {
    const canvas = document.getElementById('wheel-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const radius = canvas.width / 2, arc = (2 * Math.PI) / rewards.length;
    for (let i = 0; i < rewards.length; i++) {
        const angle = i * arc - (Math.PI / 2);
        ctx.beginPath(); ctx.moveTo(radius, radius); ctx.arc(radius, radius, radius, angle, angle + arc);
        ctx.fillStyle = i % 2 === 0 ? '#00ff88' : '#1e293b'; ctx.fill();
        ctx.save(); ctx.translate(radius, radius); ctx.rotate(angle + arc / 2);
        ctx.textAlign = "right"; ctx.fillStyle = i % 2 === 0 ? '#000' : '#fff';
        ctx.font = "bold 14px Arial"; ctx.fillText(rewards[i].text, radius - 15, 5); ctx.restore();
    }
}

// 9. ✍️ FIREBASE KAYDI
function bulutaYaz() {
    if (!userId) return;
    set(ref(db, 'users/' + userId), {
        balance, energy: currentEnergy, lastFreeSpin, spinCount, adCount, 
        lastAdHour: new Date().getHours(), username: backupName, lastUpdate: Date.now()
    });
}

function updateUI() {
    const b = document.getElementById('balance');
    const et = document.getElementById('energy-text');
    const eb = document.getElementById('energy-bar');
    const ac = document.getElementById('ad-count');
    if (b) b.textContent = balance;
    if (et) et.textContent = `${currentEnergy} / 500`;
    if (eb) eb.style.width = `${(currentEnergy / 500) * 100}%`;
    if (ac) ac.textContent = adCount;
}

// 10. TAPPER VE NAVİGASYON
document.getElementById('tap-button').addEventListener('pointerdown', (e) => {
    if (isAutoClicking) return;
    if (currentEnergy > 0) {
        balance++; currentEnergy--; updateUI(); bulutaYaz();
        const p = document.createElement('div'); p.innerText = '+1'; p.className = 'plus-one';
        p.style.left = e.clientX + 'px'; p.style.top = e.clientY + 'px';
        document.body.appendChild(p); setTimeout(() => p.remove(), 800);
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    }
});

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
        if (isAutoClicking) return;
        const target = btn.getAttribute('data-target');
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(target).classList.add('active');
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (target === "earn") drawWheel();
    };
});

drawWheel(); updateUI();
