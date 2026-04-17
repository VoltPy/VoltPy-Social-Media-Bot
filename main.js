/**
 * VOLTPY SMM BOT - NİHAİ ANA DOSYA (V4 - PROFESYONEL CASINO SÜRÜMÜ)
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
    appId: "1:1027898071391:web:95909c9c9fe3dc54103eea",
    measurementId: "G-X6250NC6PW"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 2. TELEGRAM VE BAŞLANGIÇ AYARLARI
const tg = window.Telegram?.WebApp || {};
if (tg.expand) tg.expand();

const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('uid'); 
const backupName = urlParams.get('name') || "Oyuncu";

// Global Değişkenler
let balance = 0;
let currentEnergy = 0;
const maxEnergy = 500;
let isSpinning = false;
let firstDataLoaded = false;
let currentRotation = 0;

// 3. 📡 CANLI VERİ DİNLEME VE PERDE KONTROLÜ
if (userId) {
    const userRef = ref(db, 'users/' + userId);

    // Veri gelse de gelmese de 4 saniye sonra perdeyi kaldır (Donma koruması)
    setTimeout(() => {
        if (!firstDataLoaded) {
            removeOverlay();
            firstDataLoaded = true;
        }
    }, 4000);

    onValue(userRef, (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            if (!isSpinning) {
                balance = data.balance || 0;
                currentEnergy = data.energy || 0;
                updateUI();
            }
        } else {
            // YENİ KULLANICI: İlk giriş hediyesi 100 coin
            balance = 100;
            currentEnergy = 500;
            updateUI();
            bulutaYaz();
        }

        if (!firstDataLoaded) {
            removeOverlay();
            firstDataLoaded = true;
        }
    });
}

function removeOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.style.display = 'none', 500);
    }
}

// 4. 🎰 KUMARBAZ ÖDÜL TABLOSU (Berke'nin Özel Oranları)
const rewards = [
    { text: "5000 💰", val: 5000, type: "coin", weight: 1 },   // %0.1
    { text: "1000 💰", val: 1000, type: "coin", weight: 4 },   // %0.4
    { text: "500 💰", val: 500, type: "coin", weight: 15 },    // %1.5
    { text: "250 💰", val: 250, type: "coin", weight: 40 },    // %4
    { text: "110 💰", val: 110, type: "coin", weight: 100 },   // %10
    { text: "100 💰", val: 100, type: "free", weight: 140 },   // %14 (Cashback)
    { text: "75 💰", val: 75, type: "coin", weight: 200 },     // %20
    { text: "50 💰", val: 50, type: "coin", weight: 250 },     // %25
    { text: "10 💰", val: 10, type: "coin", weight: 200 },     // %20
    { text: "⚡ FULL", val: 500, type: "energy", weight: 40 } // %4
];

function getWeightedPrize() {
    let totalWeight = rewards.reduce((sum, r) => sum + r.weight, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < rewards.length; i++) {
        if (random < rewards[i].weight) return i;
        random -= rewards[i].weight;
    }
    return 0;
}

// 5. 🎡 ÇARK DÖNDÜRME (Rastgele Duruşlu)
const spinBtn = document.getElementById('spin-button');
const rewardText = document.getElementById('reward-text');

if (spinBtn) {
    spinBtn.onclick = () => {
        if (isSpinning || balance < 100) return;
        
        balance -= 100;
        isSpinning = true;
        rewardText.style.display = 'none'; // Eski ödülü temizle
        updateUI();
        bulutaYaz();

        const prizeIdx = getWeightedPrize();
        const prize = rewards[prizeIdx];
        
        // --- RANDOM OFFSET (Dilim içi rastgele duruş) ---
        const segmentAngle = 360 / rewards.length;
        const randomInSegment = (Math.random() * (segmentAngle * 0.7)) + (segmentAngle * 0.15);
        
        const targetAngle = (360 - (prizeIdx * segmentAngle)) - randomInSegment; 
        const totalSpin = currentRotation + 2160 + targetAngle; // 6 tam tur
        
        currentRotation = totalSpin;
        const canvas = document.getElementById('wheel-canvas');
        canvas.style.transition = 'transform 5s cubic-bezier(0.15, 0, 0.15, 1)';
        canvas.style.transform = `rotate(${currentRotation}deg)`;

        setTimeout(() => {
            isSpinning = false;
            
            if (prize.type === "energy") {
                currentEnergy = 500;
            } else {
                balance += prize.val;
            }

            updateUI();
            bulutaYaz();
            
            // Ödülü ekrana yaz
            rewardText.textContent = `KAZANÇ: ${prize.text}`;
            rewardText.style.display = 'block';
            
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        }, 5000);
    };
}

// 6. ✍️ BULUT KAYDI VE UI
function bulutaYaz() {
    if (!userId) return;
    set(ref(db, 'users/' + userId), {
        balance: balance, energy: currentEnergy, username: backupName, lastUpdate: Date.now()
    }).catch(err => console.error("Firebase Hatası:", err));
}

function updateUI() {
    const balEl = document.getElementById('balance');
    const enText = document.getElementById('energy-text');
    const enBar = document.getElementById('energy-bar');
    
    if (balEl) balEl.textContent = balance;
    if (enText) enText.textContent = `${currentEnergy} / 500`;
    if (enBar) enBar.style.width = `${(currentEnergy / 500) * 100}%`;
}

// 7. TAPPER (TIKLAMA)
const tapBtn = document.getElementById('tap-button');
if (tapBtn) {
    tapBtn.addEventListener('pointerdown', (e) => {
        if (currentEnergy > 0) {
            balance++;
            currentEnergy--;
            updateUI();
            bulutaYaz();

            const p = document.createElement('div');
            p.innerText = '+1'; p.className = 'plus-one';
            p.style.left = `${e.clientX}px`; p.style.top = `${e.clientY}px`;
            p.style.position = 'fixed'; p.style.color = '#00ff88'; p.style.fontWeight = 'bold';
            p.style.pointerEvents = 'none'; p.style.animation = 'fadeOutUp 0.8s forwards';
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 800);

            if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        }
    });
}

// 8. ÇARK ÇİZİMİ
function drawWheel() {
    const canvas = document.getElementById('wheel-canvas');
    if (!canvas) return;
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
        ctx.font = "bold 12px Arial";
        ctx.fillText(rewards[i].text, radius - 15, 5);
        ctx.restore();
    }
}

// 9. MARKET VE NAVİGASYON
window.buyItem = function(name, price) {
    if (balance >= price) {
        if (confirm(`${name} satın alınsın mı?`)) {
            balance -= price;
            updateUI();
            bulutaYaz();
            alert("✅ Siparişiniz başarıyla oluşturuldu!");
        }
    } else { alert("❌ Bakiye yetersiz!"); }
};

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
function init() {
    const userDisplay = document.getElementById('username');
    if (userDisplay) userDisplay.textContent = tg.initDataUnsafe?.user?.first_name || backupName;

    const mList = document.getElementById('market-list');
    if (mList) {
        const items = [
            { n: "100 Instagram Takipçi", p: 5000 },
            { n: "500 Instagram Beğeni", p: 3000 },
            { n: "100 TikTok Takipçi", p: 2500 }
        ];
        mList.innerHTML = items.map(i => `
            <div class="market-item" style="display:flex; justify-content:space-between; align-items:center; background:#1e293b; padding:15px; margin:10px; border-radius:15px; color:white;">
                <span>${i.n}</span>
                <button class="buy-btn" onclick="buyItem('${i.n}', ${i.p})" style="background:#00ff88; border:none; padding:10px 15px; border-radius:10px; font-weight:bold;">${i.p} 💰</button>
            </div>
        `).join('');
    }

    drawWheel();
    updateUI();
}

init();
