/**
 * VOLTPY CASINO - NİHAİ GÜNCELLEME
 * Özellikler: Günlük Zam Sıfırlama, X3 FREE Modu, Saniyelik Geri Sayım
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const tg = window.Telegram?.WebApp || {};
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('uid'); 
const backupName = urlParams.get('name') || "Oyuncu";

// --- DEĞİŞKENLER ---
let balance = 0;
let currentEnergy = 0;
let lastFreeSpin = 0; 
let spinCount = 0;      // Günlük zam hesabı için veritabanından gelecek
let freeRoundsLeft = 0; // X3 FREE bonusu
let isSpinning = false;
let currentRotation = 0;
let firstLoad = false;

const rewards = [
    { text: "BOŞ", val: 0, weight: 150 },
    { text: "10 💰", val: 10, weight: 200 },
    { text: "50 💰", val: 50, weight: 180 },
    { text: "X3 FREE", val: 3, type: "frenzy", weight: 40 }, 
    { text: "100 💰", val: 100, weight: 150 },
    { text: "250 💰", val: 250, weight: 40 },
    { text: "5000 💰", val: 5000, weight: 2 }, 
    { text: "⚡ FULL", val: 500, type: "energy", weight: 30 }
];

// 📡 CANLI VERİ SENKRONİZASYONU
if (userId) {
    onValue(ref(db, 'users/' + userId), (snapshot) => {
        const data = snapshot.val();
        if (data && !isSpinning) {
            balance = data.balance || 0;
            currentEnergy = data.energy || 0;
            lastFreeSpin = data.lastFreeSpin || 0;
            spinCount = data.spinCount || 0; // Zam miktarını hatırla
            
            updateUI();
            if (!firstLoad) {
                document.getElementById('loading-overlay').style.display = 'none';
                firstLoad = true;
            }
        }
    });
}

// ⏱️ SAYAÇLAR VE DİNAMİK MALİYET
function updateGameStatus() {
    const now = Date.now();
    const freeWait = 24 * 60 * 60 * 1000;
    const diff = freeWait - (now - lastFreeSpin);
    
    const timerVal = document.getElementById('timer-val');
    const spinBtn = document.getElementById('spin-button');

    // Maliyet hesabı: 100'den başlar, her spin +50, max 500.
    let currentCost = Math.min(500, 100 + (spinCount * 50));

    if (freeRoundsLeft > 0) {
        spinBtn.textContent = `BONUS (${freeRoundsLeft})`;
        spinBtn.style.background = "linear-gradient(45deg, #f59e0b, #ef4444)";
        timerVal.textContent = "🔥 ÜCRETSİZ MOD! 🔥";
    } else if (diff <= 0) {
        spinBtn.textContent = "ÜCRETSİZ ÇEVİR";
        spinBtn.style.background = "linear-gradient(45deg, #00ff88, #00d4ff)";
        timerVal.textContent = "GÜNLÜK HAK HAZIR!";
    } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        timerVal.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        spinBtn.textContent = `ÇEVİR (${currentCost} 💰)`;
        spinBtn.style.background = ""; 
    }
}
setInterval(updateGameStatus, 1000);

// 🎡 ÇARK DÖNDÜRME MANTIĞI
document.getElementById('spin-button').onclick = () => {
    if (isSpinning) return;

    const now = Date.now();
    const isDailyFree = (now - lastFreeSpin >= 24 * 60 * 60 * 1000);
    const cost = Math.min(500, 100 + (spinCount * 50));

    // Maliyet ve Hak Kontrolü
    if (freeRoundsLeft > 0) {
        freeRoundsLeft--; 
    } else if (isDailyFree) {
        lastFreeSpin = now; 
        spinCount = 0; // ÜCRETSİZ HAK KULLANILDIĞINDA ZAMMI SIFIRLA!
    } else {
        if (balance < cost) return alert("Bakiye Yetersiz!");
        balance -= cost;
        spinCount++; // Bir sonraki çevirmeyi pahalılaştır
    }

    isSpinning = true;
    document.getElementById('reward-text').style.display = 'none';
    updateUI();
    bulutaYaz();

    // Ödül Seçimi
    let totalW = rewards.reduce((s, r) => s + r.weight, 0);
    let rand = Math.random() * totalW;
    let pIdx = 0;
    for (let i = 0; i < rewards.length; i++) {
        if (rand < rewards[i].weight) { pIdx = i; break; }
        rand -= rewards[i].weight;
    }

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
            freeRoundsLeft += 3; 
            triggerFrenzyEffect();
        } else if (prize.type === "energy") {
            currentEnergy = 500;
        } else {
            balance += prize.val;
        }

        updateUI();
        bulutaYaz();
        
        const rt = document.getElementById('reward-text');
        rt.textContent = prize.type === "frenzy" ? "🔥 X3 BONUS TUR! 🔥" : `KAZANÇ: ${prize.text}`;
        rt.style.display = 'block';
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    }, 5000);
};

function triggerFrenzyEffect() {
    document.body.style.boxShadow = "inset 0 0 100px #ff4444";
    setTimeout(() => document.body.style.boxShadow = "none", 1000);
}

// ✍️ KAYIT VE ARAYÜZ
function bulutaYaz() {
    if (!userId) return;
    set(ref(db, 'users/' + userId), {
        balance: balance, 
        energy: currentEnergy, 
        lastFreeSpin: lastFreeSpin, 
        spinCount: spinCount, // Çevirme sayısını buluta gönder
        lastUpdate: Date.now()
    });
}

function updateUI() {
    document.getElementById('balance').textContent = balance;
    document.getElementById('energy-text').textContent = `${currentEnergy} / 500`;
    document.getElementById('energy-bar').style.width = `${(currentEnergy / 500) * 100}%`;
}

function drawWheel() {
    const canvas = document.getElementById('wheel-canvas');
    const ctx = canvas.getContext('2d');
    const radius = canvas.width / 2;
    const arc = (2 * Math.PI) / rewards.length;
    for (let i = 0; i < rewards.length; i++) {
        const angle = i * arc - (Math.PI / 2);
        ctx.beginPath(); ctx.moveTo(radius, radius);
        ctx.arc(radius, radius, radius, angle, angle + arc);
        ctx.fillStyle = i % 2 === 0 ? '#00ff88' : '#1e293b';
        ctx.fill();
        ctx.save(); ctx.translate(radius, radius); ctx.rotate(angle + arc / 2);
        ctx.textAlign = "right"; ctx.fillStyle = i % 2 === 0 ? '#000' : '#fff';
        ctx.font = "bold 14px Arial"; ctx.fillText(rewards[i].text, radius - 15, 5);
        ctx.restore();
    }
}

// TAPPER
document.getElementById('tap-button').addEventListener('pointerdown', (e) => {
    if (currentEnergy > 0) {
        balance++; currentEnergy--;
        updateUI(); bulutaYaz();
        const p = document.createElement('div');
        p.innerText = '+1'; p.className = 'plus-one';
        p.style.left = e.clientX + 'px'; p.style.top = e.clientY + 'px';
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 800);
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    }
});

// Menü Navigasyonu
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
        const target = btn.getAttribute('data-target');
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(target).classList.add('active');
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if(target === "earn") drawWheel();
    };
});

drawWheel();
updateUI();
