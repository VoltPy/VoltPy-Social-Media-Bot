/**
 * VOLTPY SMM BOT - MAIN.JS (GÜNCELLENMİŞ & VERİTABANI BAĞLANTILI)
 * Geliştirici: Berke (VoltPy)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 1. FIREBASE YAPILANDIRMASI (databaseURL Eklendi!)
const firebaseConfig = {
  apiKey: "AIzaSyCumZ1RBi32yLpwvDFkb1Y7RbUPyZAOwYQ",
  authDomain: "voltpy1.firebaseapp.com",
  databaseURL: "https://voltpy1-default-rtdb.firebaseio.com", 
  projectId: "voltpy1",
  storageBucket: "voltpy1.firebasestorage.app",
  messagingSenderId: "1027898071391",
  appId: "1:1027898071391:web:95909c9c9fe3dc54103eea",
  measurementId: "G-X6250NC6PW"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 2. TELEGRAM BİLGİLERİ & GÜVENLİK DUVARI
const tg = window.Telegram?.WebApp || {};
if (tg.expand) tg.expand();

const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('uid'); 
const backupName = urlParams.get('name') || "Oyuncu";

// 🛑 GÜVENLİK DUVARI: Telegram dışı girişleri engeller
if (!userId || tg.platform === "unknown" || tg.platform === undefined) {
    document.body.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #0f172a; color: white; font-family: sans-serif; text-align: center; padding: 20px;">
            <div style="font-size: 60px; margin-bottom: 15px;">🛑</div>
            <h2 style="color: #ff4444; margin-bottom: 10px;">Erişim Engellendi</h2>
            <p style="color: #94a3b8; font-size: 16px; line-height: 1.5;">Bu oyun sadece Telegram üzerinden oynanabilir.</p>
            <a href="https://t.me/VoltPySmmBot" style="margin-top: 25px; padding: 12px 25px; background: #00ff88; color: #0f172a; text-decoration: none; border-radius: 25px; font-weight: 800;">🤖 Bota Git</a>
        </div>
    `;
    throw new Error("Güvenlik: İzinsiz giriş durduruldu.");
}

// 3. OYUN DEĞİŞKENLERİ
let balance = parseInt(urlParams.get('bal')) || 0;
let currentEnergy = parseInt(urlParams.get('en')) || 500;
const maxEnergy = 500;
let isSpinning = false;
let sonKaydedilenBakiye = balance; 

// 4. BULUTA VERİ KAYDETME FONKSİYONU
function bulutaYaz() {
    if (!userId) return; 
    
    set(ref(db, 'users/' + userId), {
        balance: balance,
        energy: currentEnergy,
        username: backupName,
        lastUpdate: Date.now()
    }).then(() => {
        sonKaydedilenBakiye = balance;
        console.log("✅ Firebase Güncellendi: " + balance);
    }).catch(err => {
        console.error("❌ Firebase Yazma Hatası:", err);
    });
}

// ⏱️ Otomatik Senkronizasyon (3 saniyede bir)
setInterval(() => {
    if (balance !== sonKaydedilenBakiye) {
        bulutaYaz();
    }
}, 3000);

// 🔒 Tarayıcı Kapanırken Son Kayıt
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === 'hidden' && balance !== sonKaydedilenBakiye) {
        bulutaYaz();
    }
});

// 5. ARAYÜZ GÜNCELLEME
function updateUI() {
    const balEl = document.getElementById('balance');
    const enText = document.getElementById('energy-text');
    const enBar = document.getElementById('energy-bar');
    
    if (balEl) balEl.textContent = balance;
    if (enText) enText.textContent = `${currentEnergy} / ${maxEnergy}`;
    if (enBar) enBar.style.width = `${(currentEnergy / maxEnergy) * 100}%`;
}

// 6. TIKLAMA (TAPPER) SİSTEMİ
const tapButton = document.getElementById('tap-button');
if (tapButton) {
    tapButton.addEventListener('pointerdown', (e) => {
        if (currentEnergy > 0) {
            balance++;
            currentEnergy--;
            updateUI();

            // +1 Animasyonu
            const plusOne = document.createElement('div');
            plusOne.innerText = '+1';
            plusOne.className = 'plus-one';
            const x = e.clientX || (e.touches && e.touches[0].clientX) || window.innerWidth / 2;
            const y = e.clientY || (e.touches && e.touches[0].clientY) || window.innerHeight / 2;
            plusOne.style.left = `${x}px`;
            plusOne.style.top = `${y}px`;
            document.body.appendChild(plusOne);
            setTimeout(() => plusOne.remove(), 800);

            if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        }
    });
}

// 7. ÇARK SİSTEMİ (CANVAS)
const rewards = [
    { text: "BOŞ", type: "lose", val: 0 },
    { text: "20 💰", type: "coin", val: 20 },
    { text: "50 💰", type: "coin", val: 50 },
    { text: "100 💰", type: "coin", val: 100 },
    { text: "250 💰", type: "coin", val: 250 },
    { text: "500 💰", type: "coin", val: 500 },
    { text: "1000 💰", type: "coin", val: 1000 },
    { text: "FULL EN", type: "energy", val: 500 },
    { text: "5 💰", type: "coin", val: 5 },
    { text: "TEKRAR", type: "free", val: 100 }
];

let currentRotation = 0;

function drawWheel() {
    const canvas = document.getElementById('wheel-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const radius = canvas.width / 2;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const arc = (2 * Math.PI) / rewards.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < rewards.length; i++) {
        const angle = i * arc - (Math.PI / 2) - (arc / 2); 
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, angle, angle + arc);
        ctx.fillStyle = i % 2 === 0 ? '#00ff88' : '#1e293b'; 
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.1)";
        ctx.stroke();

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle + arc / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = i % 2 === 0 ? '#000000' : '#ffffff'; 
        ctx.font = "bold 14px Arial";
        ctx.fillText(rewards[i].text, radius - 15, 5);
        ctx.restore();
    }
}

const spinBtn = document.getElementById('spin-button');
if (spinBtn) {
    spinBtn.onclick = () => {
        if (isSpinning || balance < 100) return;
        
        balance -= 100; 
        isSpinning = true;
        updateUI();
        bulutaYaz(); // Harcamayı hemen kaydet

        const prizeIdx = Math.floor(Math.random() * rewards.length);
        const prize = rewards[prizeIdx];
        const segmentAngle = 360 / rewards.length;
        const targetRotation = currentRotation + 1440 + (360 - (prizeIdx * segmentAngle));
        currentRotation = targetRotation;

        const canvas = document.getElementById('wheel-canvas');
        canvas.style.transition = 'transform 4s cubic-bezier(0.1, 0, 0.1, 1)';
        canvas.style.transform = `rotate(${currentRotation}deg)`;

        setTimeout(() => {
            isSpinning = false;
            if (prize.type === "coin") balance += prize.val;
            if (prize.type === "energy") currentEnergy = maxEnergy; 
            if (prize.type === "free") balance += 100; 
            updateUI();
            alert(`🎁 Kazancın: ${prize.text}`);
            bulutaYaz(); // Ödülü hemen kaydet
        }, 4000);
    };
}

// 8. MARKET & NAVİGASYON
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
        const target = btn.getAttribute('data-target');
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(target).classList.add('active');
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    };
});

// 9. BAŞLAT
function init() {
    const nameEl = document.getElementById('username');
    if (nameEl) nameEl.textContent = tg.initDataUnsafe?.user?.first_name || backupName;
    updateUI();
    drawWheel();
}

init();
