/**
 * VOLTPY SMM BOT - MAIN.JS (NİHAİ REVİZE)
 * Geliştirici: Berke (VoltPy)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// 2. GLOBAL DEĞİŞKENLER VE TELEGRAM GÜVENLİĞİ
const tg = window.Telegram?.WebApp || {};
if (tg.expand) tg.expand();

const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('uid'); 
const backupName = urlParams.get('name') || "Oyuncu";

// Erişim Engeli (Telegram dışı girişler için)
if (!userId || tg.platform === "unknown" || tg.platform === undefined) {
    document.body.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #0f172a; color: white; text-align: center; font-family: sans-serif;">
            <h1 style="color: #ff4444;">🛑 ERİŞİM REDDEDİLDİ</h1>
            <p>Lütfen Telegram botu üzerinden giriş yapın.</p>
        </div>
    `;
    throw new Error("Sadece Telegram girişi.");
}

// Oyun Değerleri
let balance = parseInt(urlParams.get('bal')) || 0;
let currentEnergy = parseInt(urlParams.get('en')) || 500;
const maxEnergy = 500;
let isSpinning = false;

// 3. ANLIK BULUT KAYIT FONKSİYONU
function bulutaYaz() {
    if (!userId) return;
    set(ref(db, 'users/' + userId), {
        balance: balance,
        energy: currentEnergy,
        username: backupName,
        lastUpdate: Date.now()
    }).then(() => {
        console.log("📡 Firebase: Veri başarıyla işlendi.");
    }).catch(err => console.error("❌ Firebase Hatası:", err));
}

// 4. ARAYÜZ GÜNCELLEME
function updateUI() {
    document.getElementById('balance').textContent = balance;
    document.getElementById('energy-text').textContent = `${currentEnergy} / ${maxEnergy}`;
    document.getElementById('energy-bar').style.width = `${(currentEnergy / maxEnergy) * 100}%`;
}

// 5. TAPPER (TIKLAMA) MANTIĞI
const tapBtn = document.getElementById('tap-button');
if (tapBtn) {
    tapBtn.addEventListener('pointerdown', (e) => {
        if (currentEnergy > 0) {
            balance++;
            currentEnergy--;
            updateUI();
            
            // HER TIKTA ANINDA KAYIT
            bulutaYaz();

            // Efekt (+1)
            const p = document.createElement('div');
            p.innerText = '+1'; p.className = 'plus-one';
            p.style.left = `${e.clientX}px`; p.style.top = `${e.clientY}px`;
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 800);

            if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        }
    });
}

// 6. ŞANS ÇARKI (CANVAS)
const rewards = [
    { text: "BOŞ", type: "lose", val: 0 }, { text: "20 💰", type: "coin", val: 20 },
    { text: "50 💰", type: "coin", val: 50 }, { text: "100 💰", type: "coin", val: 100 },
    { text: "250 💰", type: "coin", val: 250 }, { text: "500 💰", type: "coin", val: 500 },
    { text: "1000 💰", type: "coin", val: 1000 }, { text: "FULL EN", type: "energy", val: 500 },
    { text: "5 💰", type: "coin", val: 5 }, { text: "TEKRAR", type: "free", val: 100 }
];

let currentRotation = 0;

function drawWheel() {
    const canvas = document.getElementById('wheel-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const radius = canvas.width / 2;
    const arc = (2 * Math.PI) / rewards.length;

    for (let i = 0; i < rewards.length; i++) {
        const angle = i * arc - (Math.PI / 2) - (arc / 2);
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

const spinBtn = document.getElementById('spin-button');
if (spinBtn) {
    spinBtn.onclick = () => {
        if (isSpinning || balance < 100) return;
        
        balance -= 100;
        isSpinning = true;
        updateUI();
        bulutaYaz(); // Harcamayı anında yaz

        const prizeIdx = Math.floor(Math.random() * rewards.length);
        const prize = rewards[prizeIdx];
        const targetRotation = currentRotation + 1800 + (360 - (prizeIdx * (360 / rewards.length)));
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
            bulutaYaz(); // Ödülü anında yaz
            alert(`🎁 Sonuç: ${prize.text}`);
        }, 4000);
    };
}

// 7. NAVİGASYON VE MARKET
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
        const target = btn.getAttribute('data-target');
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(target).classList.add('active');
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    };
});

// Ürün Alma Fonksiyonu (Global Pencereye Bağladık)
window.buyItem = function(name, price) {
    if (balance >= price) {
        if (confirm(`${name} satın alınsın mı?`)) {
            balance -= price;
            updateUI();
            bulutaYaz();
            alert("✅ İşlem Başarılı!");
        }
    } else { alert("❌ Yetersiz bakiye!"); }
};

// 8. BAŞLAT
function init() {
    document.getElementById('username').textContent = tg.initDataUnsafe?.user?.first_name || backupName;
    updateUI();
    drawWheel();
    
    // Market Ürünlerini Yükle
    const marketList = document.getElementById('market-list');
    if (marketList) {
        const items = [
            { name: "100 Instagram Takipçi", price: 5000 },
            { name: "500 Instagram Beğeni", price: 3000 }
        ];
        marketList.innerHTML = items.map(i => `
            <div class="market-item">
                <span>${i.name}</span>
                <button class="buy-btn" onclick="buyItem('${i.name}', ${i.price})">${i.price} 💰</button>
            </div>
        `).join('');
    }
}

init();
