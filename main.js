/**
 * VOLTPY SMM BOT - MAIN.JS (NİHAİ REVİZE)
 * Özellikler: Günlük Ücretsiz Hak, Milimetrik Çark Hassasiyeti, Bulut Senkronizasyon
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
let isSpinning = false;
let firstDataLoaded = false;
let currentRotation = 0;

// 3. 🎰 ÖDÜL TABLOSU (Fotoğraftaki 8 Dilim Yapısı & Yeni Oranlar)
const rewards = [
    { text: "BOŞ", val: 0, weight: 150 },        // Dilim 0
    { text: "5 💰", val: 5, weight: 200 },       // Dilim 1
    { text: "20 💰", val: 20, weight: 180 },     // Dilim 2
    { text: "125 💰", val: 125, weight: 100 },   // Dilim 3 (Eski TEKRAR yerine kâr)
    { text: "50 💰", val: 50, weight: 150 },      // Dilim 4
    { text: "250 💰", val: 250, weight: 40 },     // Dilim 5
    { text: "5000 💰", val: 5000, weight: 3 },    // Dilim 6 (%0.3 Şans)
    { text: "⚡ FULL", val: 500, weight: 40 }     // Dilim 7
];

// 4. 📡 CANLI VERİ VE GÜNLÜK HAK KONTROLÜ
if (userId) {
    onValue(ref(db, 'users/' + userId), (snapshot) => {
        const data = snapshot.val();
        if (data && !isSpinning) {
            balance = data.balance || 0;
            currentEnergy = data.energy || 0;
            lastFreeSpin = data.lastFreeSpin || 0;
            updateUI();
            checkFreeSpinTimer();
            if (!firstDataLoaded) {
                document.getElementById('loading-overlay').style.display = 'none';
                firstDataLoaded = true;
            }
        }
    });
}

function checkFreeSpinTimer() {
    const now = Date.now();
    const waitTime = 24 * 60 * 60 * 1000;
    const diff = waitTime - (now - lastFreeSpin);
    const spinBtn = document.getElementById('spin-button');
    const timerVal = document.getElementById('timer-val');

    if (diff <= 0) {
        timerVal.textContent = "HAZIR!";
        spinBtn.textContent = "ÜCRETSİZ ÇEVİR!";
        spinBtn.style.background = "linear-gradient(45deg, #00ff88, #00d4ff)";
    } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        timerVal.textContent = `${h}s ${m}dk`;
        spinBtn.textContent = "ÇEVİR (100 💰)";
        spinBtn.style.background = "";
    }
}
setInterval(checkFreeSpinTimer, 30000);

// 5. 🎡 ÇARK DÖNDÜRME (MİLİMETRİK HASSASİYET)
document.getElementById('spin-button').onclick = () => {
    if (isSpinning) return;

    const now = Date.now();
    const isFree = (now - lastFreeSpin >= 24 * 60 * 60 * 1000);

    if (!isFree && balance < 100) {
        alert("Bakiye yetersiz! Tıklayarak kazanabilirsin.");
        return;
    }

    // Ödeme Al
    if (isFree) lastFreeSpin = now; 
    else balance -= 100;

    isSpinning = true;
    document.getElementById('reward-text').style.display = 'none';
    updateUI();
    bulutaYaz();

    // Ağırlıklı Rastgele Seçim
    let totalWeight = rewards.reduce((s, r) => s + r.weight, 0);
    let random = Math.random() * totalWeight;
    let prizeIdx = 0;
    for (let i = 0; i < rewards.length; i++) {
        if (random < rewards[i].weight) { prizeIdx = i; break; }
        random -= rewards[i].weight;
    }

    const prize = rewards[prizeIdx];
    const segmentAngle = 360 / rewards.length;
    
    // --- HATA ÇÖZÜMÜ: RANDOM OFFSET ---
    // Dilimin %20'si ile %80'i arasına düşürerek çizgide durmayı engelleriz
    const randomOffset = (Math.random() * (segmentAngle * 0.6)) + (segmentAngle * 0.2);
    
    // prizeIdx ödülünü tam ibreye getirecek açı hesabı
    const targetAngle = (360 - (prizeIdx * segmentAngle)) - randomOffset;
    const totalSpin = currentRotation + 2160 + targetAngle; // 6 tam tur + hedef

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
        checkFreeSpinTimer();

        const rt = document.getElementById('reward-text');
        rt.textContent = `KAZANÇ: ${prize.text}`;
        rt.style.display = 'block';
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    }, 5000);
};

// 6. 🎨 ÇARK ÇİZİMİ (8 DİLİM)
function drawWheel() {
    const canvas = document.getElementById('wheel-canvas');
    const ctx = canvas.getContext('2d');
    const radius = canvas.width / 2;
    const arc = (2 * Math.PI) / rewards.length;

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

// 7. ✍️ BULUT KAYDI VE UI
function bulutaYaz() {
    if (!userId) return;
    set(ref(db, 'users/' + userId), {
        balance: balance,
        energy: currentEnergy,
        lastFreeSpin: lastFreeSpin,
        username: backupName,
        lastUpdate: Date.now()
    });
}

function updateUI() {
    document.getElementById('balance').textContent = balance;
    document.getElementById('energy-text').textContent = `${currentEnergy} / 500`;
    document.getElementById('energy-bar').style.width = `${(currentEnergy / 500) * 100}%`;
}

// 8. TAPPER VE NAVİGASYON
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
