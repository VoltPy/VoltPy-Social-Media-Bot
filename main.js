/**
 * VOLTPY TAPPER & CASINO - V14 (ENERGY WARNING SYSTEM)
 * Geliştirici: Berke (VoltPy)
 * Optimizasyon: Enerji takip, Shake Efekti, Sıfır Gecikme.
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

// 2. TELEGRAM SDK VE PARAMETRELER
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

// 5. ⏳ SAYAÇLAR
function tick() {
    const now = Date.now();
    const diff = (24 * 60 * 60 * 1000) - (now - lastFreeSpin);
    const spinBtn = document.getElementById('spin-button');
    const cost = Math.min(500, 100 + (spinCount * 50));

    if (spinBtn) {
        if (freeRoundsLeft > 0) spinBtn.textContent = `BONUS (${freeRoundsLeft})`;
        else if (diff <= 0) spinBtn.textContent = "ÜCRETSİZ ÇEVİR";
        else spinBtn.textContent = `ÇEVİR (${cost} 💰)`;
    }
    
    // Enerji Dolumu (1⚡ / 60sn)
    if (currentEnergy < 500 && now - lastUpdate >= 60000) { 
        currentEnergy++; 
        lastUpdate = now; 
        updateUI(); 
        bulutaYaz(); 
    }
}
setInterval(tick, 1000);

// 6. 🎯 TAPPER MANTIĞI VE ENERJİ KONTROLÜ
const tapBtn = document.getElementById('tap-button');
const energySection = document.querySelector('.energy-section');
const energyWarning = document.getElementById('energy-warning');

const handleTap = (e) => {
    if (isAutoClicking) return;
    if (e.cancelable) e.preventDefault();

    if (currentEnergy <= 0) {
        // ENERJİ BİTTİĞİNDE ÇALIŞACAK BLOK
        tapBtn.classList.add('shake');
        setTimeout(() => tapBtn.classList.remove('shake'), 200);
        updateUI(); // Uyarı yazısını tetikle
        return;
    }

    // Enerji varken normal tıklama
    tapBtn.classList.add('active-tap');
    setTimeout(() => tapBtn.classList.remove('active-tap'), 50);

    const touches = e.changedTouches ? e.changedTouches : [e];
    for (let i = 0; i < touches.length; i++) {
        if (currentEnergy > 0) {
            balance++;
            currentEnergy--;
            createPlusOne(touches[i].clientX, touches[i].clientY);
        }
    }
    updateUI();
    if (balance % 30 === 0) bulutaYaz();
};

function createPlusOne(x, y) {
    const p = document.createElement('div');
    p.innerText = '+1';
    p.className = 'plus-one';
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 600);
}

if (tapBtn) {
    tapBtn.addEventListener('touchstart', handleTap, { passive: false });
    tapBtn.addEventListener('mousedown', (e) => { if (!('ontouchstart' in window)) handleTap(e); });
}

// 7. ✍️ FIREBASE VE UI GÜNCELLEME
function bulutaYaz() {
    if (userId) set(ref(db, 'users/' + userId), { balance, energy: currentEnergy, lastFreeSpin, spinCount, adCount, lastAdHour: new Date().getHours(), username: backupName, lastUpdate: Date.now() });
}

function updateUI() {
    document.getElementById('balance').textContent = balance;
    document.getElementById('energy-text').textContent = `${currentEnergy} / 500`;
    document.getElementById('energy-bar').style.width = `${(currentEnergy / 500) * 100}%`;
    document.getElementById('ad-count').textContent = adCount;

    // ENERJİ DURUM KONTROLLERİ
    if (currentEnergy <= 0) {
        energySection.classList.add('energy-empty');
        if (energyWarning) energyWarning.style.display = 'block';
    } else {
        energySection.classList.remove('energy-empty');
        if (energyWarning) energyWarning.style.display = 'none';
    }
}

// 8. 🎰 ÇARK VE 🚀 TURBO (Önceki sürümlerle aynı akış)
window.watchAdForEnergy = () => { if (confirm("+250 Enerji?")) { currentEnergy = Math.min(500, currentEnergy + 250); updateUI(); bulutaYaz(); }};

window.startTurboMode = () => {
    if (isAutoClicking || adCount >= 20 || currentEnergy < 100) return alert("Limit dolu veya enerji yetersiz!");
    adCount++; isAutoClicking = true;
    document.body.classList.add('turbo-active');
    autoClickInterval = setInterval(() => {
        if (currentEnergy > 0) {
            balance++; currentEnergy--; updateUI();
            createPlusOne(window.innerWidth/2, window.innerHeight/2);
        } else { clearInterval(autoClickInterval); isAutoClicking = false; document.body.classList.remove('turbo-active'); updateUI(); bulutaYaz(); }
    }, 85);
};

// NAVİGASYON
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
        if (isAutoClicking) return;
        document.querySelectorAll('.screen, .nav-btn').forEach(el => el.classList.remove('active'));
        document.getElementById(btn.dataset.target).classList.add('active');
        btn.classList.add('active');
        if (btn.dataset.target === "earn") drawWheel();
    };
});

function drawWheel() {
    const canvas = document.getElementById('wheel-canvas'); if (!canvas) return;
    const ctx = canvas.getContext('2d');
    for (let i = 0; i < 8; i++) {
        const angle = i * (Math.PI / 4) - (Math.PI / 2);
        ctx.beginPath(); ctx.moveTo(137.5, 137.5); ctx.arc(137.5, 137.5, 137.5, angle, angle + (Math.PI / 4));
        ctx.fillStyle = i % 2 === 0 ? '#00ff88' : '#1e293b'; ctx.fill();
        ctx.save(); ctx.translate(137.5, 137.5); ctx.rotate(angle + (Math.PI / 8));
        ctx.textAlign = "right"; ctx.fillStyle = i % 2 === 0 ? '#000' : '#fff';
        ctx.font = "bold 12px Arial"; ctx.fillText(rewards[i].text, 120, 5); ctx.restore();
    }
}

drawWheel();
updateUI();
