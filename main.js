/**
 * VOLTPY SMM BOT - NİHAİ BAĞIMLILIK DÖNGÜSÜ
 * Özellikler: Hatasız Çark, Pasif Enerji, Reklam Teşviği
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

let balance = 0;
let currentEnergy = 0;
let isSpinning = false;
let currentRotation = 0;
let firstLoad = false;

// 1. 📡 CANLI VERİ VE PASİF ENERJİ HESABI
if (userId) {
    onValue(ref(db, 'users/' + userId), (snapshot) => {
        const data = snapshot.val();
        if (data && !isSpinning) {
            balance = data.balance || 0;
            const savedEnergy = data.energy || 0;
            const savedTime = data.lastUpdate || Date.now();
            
            // Çevrimdışı dolan enerji (60 saniyede +1)
            const now = Date.now();
            const elapsedMins = Math.floor((now - savedTime) / 60000);
            currentEnergy = Math.min(500, savedEnergy + elapsedMins);
            
            updateUI();
            if (!firstLoad) {
                document.getElementById('loading-overlay').style.display = 'none';
                firstLoad = true;
            }
        }
    });
}

// 🔋 Oyun açıkken her 60 saniyede +1 Enerji
setInterval(() => {
    if (currentEnergy < 500 && !isSpinning) {
        currentEnergy++;
        updateUI();
        bulutaYaz();
    }
}, 60000);

// 2. 🎰 ÖDÜL TABLOSU (8 DİLİM)
const rewards = [
    { text: "BOŞ", val: 0, weight: 150 },
    { text: "5 💰", val: 5, weight: 200 },
    { text: "20 💰", val: 20, weight: 180 },
    { text: "125 💰", val: 125, weight: 100 },
    { text: "50 💰", val: 50, weight: 150 },
    { text: "250 💰", val: 250, weight: 40 },
    { text: "5000 💰", val: 5000, weight: 3 }, // Efsanevi Ödül!
    { text: "⚡ FULL", val: 500, weight: 40 }
];

// 3. 🎡 ÇARK DÖNDÜRME (MATEMATİKSEL SABİTLEME)
const spinBtn = document.getElementById('spin-button');
const rewardText = document.getElementById('reward-text');

if (spinBtn) {
    spinBtn.onclick = () => {
        if (isSpinning || balance < 100) return;
        
        balance -= 100;
        isSpinning = true;
        rewardText.style.display = 'none';
        updateUI();
        bulutaYaz();

        // Ağırlıklı seçim
        let totalW = rewards.reduce((s, r) => s + r.weight, 0);
        let rand = Math.random() * totalW;
        let pIdx = 0;
        for (let i = 0; i < rewards.length; i++) {
            if (rand < rewards[i].weight) { pIdx = i; break; }
            rand -= rewards[i].weight;
        }

        const prize = rewards[pIdx];
        const seg = 360 / rewards.length;
        const off = (Math.random() * (seg * 0.6)) + (seg * 0.2); // Rastgele duruş
        
        // Çarkın her seferinde doğru yere gelmesi için modulo hesabı
        const target = (360 - (pIdx * seg)) - off;
        currentRotation += (360 * 5) + (target - (currentRotation % 360) + 360) % 360;

        const canvas = document.getElementById('wheel-canvas');
        canvas.style.transition = 'transform 5s cubic-bezier(0.15, 0, 0.1, 1)';
        canvas.style.transform = `rotate(${currentRotation}deg)`;

        setTimeout(() => {
            isSpinning = false;
            if (prize.text === "⚡ FULL") currentEnergy = 500;
            else balance += prize.val;

            updateUI();
            bulutaYaz();
            
            rewardText.textContent = `KAZANÇ: ${prize.text}`;
            rewardText.style.display = 'block';
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        }, 5000);
    };
}

// 4. 📺 REKLAM İZLEME (TEŞVİK)
window.reklamIzle = () => {
    // Berke, buraya reklam sağlayıcını (AdsGram vb.) bağlayacaksın.
    // Şimdilik simüle ediyoruz:
    if (confirm("Enerji tazelemek için kısa bir video izlemek ister misin?")) {
        // Reklam bitti varsayalım:
        currentEnergy = Math.min(500, currentEnergy + 150); 
        updateUI();
        bulutaYaz();
        alert("⚡ +150 Enerji Hesabına Eklendi!");
    }
};

// 5. ✍️ YARDIMCI FONKSİYONLAR (UI & BULUT)
function bulutaYaz() {
    if (!userId) return;
    set(ref(db, 'users/' + userId), {
        balance: balance, energy: currentEnergy, username: backupName, lastUpdate: Date.now()
    });
}

function updateUI() {
    document.getElementById('balance').textContent = balance;
    document.getElementById('energy-text').textContent = `${currentEnergy} / 500`;
    document.getElementById('energy-bar').style.width = `${(currentEnergy / 500) * 100}%`;
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
    } else {
        // Enerji bittiğinde kullanıcıyı reklam izlemeye yönlendir
        if (confirm("Enerjin bitti! Hemen ⚡ +150 enerji kazanmak için bir reklam izle?")) {
            window.reklamIzle();
        }
    }
});

// ÇARK ÇİZİMİ (8 DİLİM)
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

// MENÜ
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
        const target = btn.getAttribute('data-target');
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(target).classList.add('active');
        if(target === "earn") drawWheel();
    };
});

drawWheel();
updateUI();
