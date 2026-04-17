/**
 * VOLTPY SMM BOT - MAIN.JS (NİHAİ PROFESYONEL SÜRÜM)
 * Geliştirici: Berke (VoltPy)
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

// 2. TELEGRAM VE DEĞİŞKENLER
const tg = window.Telegram?.WebApp || {};
if (tg.expand) tg.expand();

const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('uid'); 
const backupName = urlParams.get('name') || "Oyuncu";

let balance = 0;
let currentEnergy = 0;
let lastFreeSpin = 0; 
let lastUpdate = Date.now();
let isSpinning = false;
let firstDataLoaded = false;
let currentRotation = 0;

// 3. 🎰 ÖDÜL TABLOSU (8 DİLİM - FOTOĞRAFA TAM UYUMLU)
const rewards = [
    { text: "BOŞ", val: 0, weight: 150 },        // Dilim 0
    { text: "5 💰", val: 5, weight: 200 },       // Dilim 1
    { text: "20 💰", val: 20, weight: 180 },     // Dilim 2
    { text: "125 💰", val: 125, weight: 100 },   // Dilim 3
    { text: "50 💰", val: 50, weight: 150 },      // Dilim 4
    { text: "250 💰", val: 250, weight: 40 },     // Dilim 5
    { text: "5000 💰", val: 5000, weight: 3 },    // Dilim 6 (%0.3 Şans)
    { text: "⚡ FULL", val: 500, weight: 40 }     // Dilim 7
];

// 4. 📡 CANLI VERİ VE PASİF ENERJİ SENKRONİZASYONU
if (userId) {
    onValue(ref(db, 'users/' + userId), (snapshot) => {
        const data = snapshot.val();
        if (data && !isSpinning) {
            balance = data.balance || 0;
            lastFreeSpin = data.lastFreeSpin || 0;
            
            // Çevrimdışı dolan enerji hesabı (60 saniyede +1)
            const savedEnergy = data.energy || 0;
            const savedTime = data.lastUpdate || Date.now();
            const elapsedMins = Math.floor((Date.now() - savedTime) / 60000);
            
            currentEnergy = Math.min(500, savedEnergy + elapsedMins);
            lastUpdate = Date.now(); // Senkronize et

            updateUI();
            if (!firstDataLoaded) {
                document.getElementById('loading-overlay').style.opacity = '0';
                setTimeout(() => document.getElementById('loading-overlay').style.display = 'none', 500);
                firstDataLoaded = true;
            }
        }
    });
}

// ⏳ SANİYELİK SAYAÇLAR (Enerji ve Ücretsiz Hak)
function checkTimers() {
    const now = Date.now();
    
    // Ücretsiz Hak Sayacı
    const waitTime = 24 * 60 * 60 * 1000;
    const diff = waitTime - (now - lastFreeSpin);
    const timerVal = document.getElementById('timer-val');
    const spinBtn = document.getElementById('spin-button');

    if (diff <= 0) {
        timerVal.textContent = "HAZIR!";
        timerVal.style.color = "#00ff88";
        if (!isSpinning) spinBtn.textContent = "ÜCRETSİZ ÇEVİR!";
    } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        timerVal.textContent = `${h}s ${m}d ${s}sn`;
        timerVal.style.color = "#94a3b8";
        if (!isSpinning) spinBtn.textContent = "ÇEVİR (100 💰)";
    }

    // Enerji Dolum Sayacı (+1 ⚡ / XX sn)
    const energyRegenTimer = document.getElementById('energy-regen-timer');
    if (currentEnergy < 500) {
        const nextEnergyIn = 60 - (Math.floor((now - lastUpdate) / 1000) % 60);
        energyRegenTimer.textContent = `+1 ⚡ / ${nextEnergyIn}sn`;
    } else {
        energyRegenTimer.textContent = "FULL 🔋";
    }

    // Uygulama açıkken her 60 saniyede enerjiyi 1 artır
    if (now - lastUpdate >= 60000 && currentEnergy < 500) {
        currentEnergy++;
        lastUpdate = now;
        updateUI();
        bulutaYaz();
    }
}
setInterval(checkTimers, 1000);

// 5. 🎡 HATASIZ ÇARK DÖNDÜRME SİSTEMİ
document.getElementById('spin-button').onclick = () => {
    if (isSpinning) return;

    const now = Date.now();
    const isFree = (now - lastFreeSpin >= 24 * 60 * 60 * 1000);

    if (!isFree && balance < 100) {
        alert("Bakiye yetersiz!");
        return;
    }

    // Ödeme İşlemi
    if (isFree) lastFreeSpin = now;
    else balance -= 100;

    isSpinning = true;
    document.getElementById('reward-text').style.display = 'none';
    updateUI();
    bulutaYaz();

    // Ağırlıklı Seçim
    let totalW = rewards.reduce((s, r) => s + r.weight, 0);
    let rand = Math.random() * totalW;
    let prizeIdx = 0;
    for (let i = 0; i < rewards.length; i++) {
        if (rand < rewards[i].weight) { prizeIdx = i; break; }
        rand -= rewards[i].weight;
    }

    const prize = rewards[prizeIdx];
    const segmentAngle = 360 / rewards.length;
    
    // --- MATEMATİKSEL SAPMA DÜZELTME ---
    const startAngle = currentRotation % 360;
    // Dilimin tam ortasına (segmentAngle/2) denk getiriyoruz
    const targetAngle = (360 - (prizeIdx * segmentAngle)) - (segmentAngle / 2);
    // En az 5 tam tur + hedefe olan fark
    const totalSpin = currentRotation + (360 * 5) + ((targetAngle - startAngle + 360) % 360);

    currentRotation = totalSpin;
    const canvas = document.getElementById('wheel-canvas');
    canvas.style.transition = 'transform 5s cubic-bezier(0.15, 0, 0.1, 1)';
    canvas.style.transform = `rotate(${currentRotation}deg)`;

    setTimeout(() => {
        isSpinning = false;
        if (prize.text === "⚡ FULL") currentEnergy = 500;
        else balance += prize.val;

        updateUI();
        bulutaYaz();
        
        const rt = document.getElementById('reward-text');
        rt.textContent = `KAZANÇ: ${prize.text}`;
        rt.style.display = 'block';
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    }, 5000);
};

// 6. 🎨 ÇARK ÇİZİMİ (CANVAS)
function drawWheel() {
    const canvas = document.getElementById('wheel-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const radius = canvas.width / 2;
    const arc = (2 * Math.PI) / rewards.length;

    ctx.clearRect(0,0, canvas.width, canvas.height);

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

// 7. 📺 REKLAM İZLEME SİMÜLASYONU
window.reklamIzle = () => {
    if (confirm("150 Enerji için reklam izlemek ister misin?")) {
        // AdsGram vb. entegrasyonu buraya gelecek
        currentEnergy = Math.min(500, currentEnergy + 150);
        updateUI();
        bulutaYaz();
        alert("⚡ +150 Enerji Eklendi!");
    }
};

// 8. ✍️ BULUT KAYDI VE UI GÜNCELLEME
function bulutaYaz() {
    if (!userId) return;
    set(ref(db, 'users/' + userId), {
        balance: balance,
        energy: currentEnergy,
        lastFreeSpin: lastFreeSpin,
        lastUpdate: Date.now(),
        username: backupName
    });
}

function updateUI() {
    document.getElementById('balance').textContent = balance;
    document.getElementById('energy-text').textContent = `${currentEnergy} / 500`;
    document.getElementById('energy-bar').style.width = `${(currentEnergy / 500) * 100}%`;
}

// 9. TAPPER VE NAVİGASYON
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

// Başlat
document.getElementById('username').textContent = tg.initDataUnsafe?.user?.first_name || backupName;
drawWheel();
updateUI();
