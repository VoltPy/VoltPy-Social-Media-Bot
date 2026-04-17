/**
 * VOLTPY SMM BOT - MAIN.JS (CANVAS ÇARK & BULUT SİSTEMİ)
 * Geliştirici: Berke (VoltPy)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// 2. TELEGRAM & KULLANICI VERİLERİ
const tg = window.Telegram?.WebApp || {};
if (tg.expand) tg.expand();

const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('uid'); 
const backupName = urlParams.get('name') || "Oyuncu";

let balance = parseInt(urlParams.get('bal')) || 0;
let currentEnergy = parseInt(urlParams.get('en')) || 500;
const maxEnergy = 500;
let isSpinning = false;
let sonKaydedilenBakiye = balance; 

// 3. BULUTA SESSİZ KAYIT SİSTEMİ
function bulutaYaz() {
    if (!userId) {
        console.warn("⚠️ Telegram UserID yok! Veriler kaydedilmiyor.");
        return;
    }
    
    set(ref(db, 'users/' + userId), {
        balance: balance,
        energy: currentEnergy,
        username: backupName,
        lastUpdate: Date.now()
    }).then(() => {
        sonKaydedilenBakiye = balance;
        console.log(`✅ Bulut Güncellendi: ${balance} 💰`);
    }).catch(err => console.error("❌ Kayıt Hatası:", err));
}

// ⏱️ HER 3 SANİYEDE BİR DEĞİŞİKLİK VARSA KAYDET
setInterval(() => {
    if (balance !== sonKaydedilenBakiye) bulutaYaz();
}, 3000);

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === 'hidden' && balance !== sonKaydedilenBakiye) bulutaYaz();
});

// 4. UI GÜNCELLEME
function updateUI() {
    const balEl = document.getElementById('balance');
    const enText = document.getElementById('energy-text');
    const enBar = document.getElementById('energy-bar');
    
    if (balEl) balEl.textContent = balance;
    if (enText) enText.textContent = `${currentEnergy} / ${maxEnergy}`;
    if (enBar) enBar.style.width = `${(currentEnergy / maxEnergy) * 100}%`;
}

// 5. TAPPER (TIKLAMA) SİSTEMİ
const tapButton = document.getElementById('tap-button');
if (tapButton) {
    tapButton.addEventListener('pointerdown', (e) => {
        if (currentEnergy > 0) {
            balance++;
            currentEnergy--;
            updateUI();

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

// 6. CANVAS ÇARK SİSTEMİ (JİLET GİBİ NET VE KAYMAZ)
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

let currentRotation = 0; // Çarkın mevcut açısını hafızada tutarız

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
        const angle = i * arc - (Math.PI / 2) - (arc / 2); // 0. index tam tepeye gelsin diye
        
        // Dilimi Çiz
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, angle, angle + arc);
        ctx.fillStyle = i % 2 === 0 ? '#00ff88' : '#1e293b'; // Volt Yeşili & Lacivert
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.2)"; // İnce siyah çizgi
        ctx.lineWidth = 1;
        ctx.stroke();

        // Yazıyı Ekle
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle + arc / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = i % 2 === 0 ? '#000000' : '#ffffff'; // Yeşile siyah, Laciverte beyaz
        ctx.font = "bold 16px Arial";
        ctx.fillText(rewards[i].text, radius - 20, 5); // Yazıyı uca yakın yerleştir
        ctx.restore();
    }
}

const spinBtn = document.getElementById('spin-button');
if (spinBtn) {
    spinBtn.onclick = () => {
        if (isSpinning) return;
        
        if (balance < 100) {
            alert("❌ Yetersiz bakiye! (Gereken: 100 💰)");
            return;
        }

        balance -= 100; 
        isSpinning = true;
        updateUI();
        bulutaYaz();

        // 1. Ödülü önceden belirliyoruz
        const prizeIdx = Math.floor(Math.random() * rewards.length);
        const prize = rewards[prizeIdx];

        // 2. Çarkın o ödülde durması için gereken açıyı hesaplıyoruz
        const segmentAngle = 360 / rewards.length;
        // Tam tur atması için (5 tur = 1800 derece) + hedefe ulaşması için gereken açı
        const targetRotation = currentRotation + 1800 + (360 - (prizeIdx * segmentAngle));
        
        currentRotation = targetRotation;

        // 3. Canvas'ı CSS ile döndürüyoruz (En akıcı yöntem)
        const canvas = document.getElementById('wheel-canvas');
        canvas.style.transition = 'transform 4s cubic-bezier(0.1, 0, 0.1, 1)';
        canvas.style.transform = `rotate(${currentRotation}deg)`;

        // 4. Dönüş bitince ödülü ver
        setTimeout(() => {
            isSpinning = false;

            if (prize.type === "coin") balance += prize.val;
            if (prize.type === "energy") currentEnergy = maxEnergy; 
            if (prize.type === "free") balance += 100; 

            updateUI();
            alert(`🎁 Sonuç: ${prize.text}`);
            bulutaYaz();
        }, 4000); 
    };
}

// 7. SMM MARKET SİSTEMİ
function loadMarket() {
    const marketList = document.getElementById('market-list');
    if (!marketList) return;

    const items = [
        { name: "100 Instagram Takipçi", price: 5000 },
        { name: "500 Instagram Beğeni", price: 3000 },
        { name: "1000 YouTube İzlenme", price: 10000 },
        { name: "100 TikTok Takipçi", price: 2000 }
    ];

    marketList.innerHTML = items.map(i => `
        <div class="market-item">
            <div class="item-details">
                <h3 style="margin: 0; font-size: 15px;">${i.name}</h3>
            </div>
            <button class="buy-btn" onclick="buyItem('${i.name}', ${i.price})">${i.price} 💰</button>
        </div>
    `).join('');
}

window.buyItem = (name, price) => {
    if (balance >= price) {
        if (confirm(`${name} hizmetini başlatmak istiyor musun?`)) {
            balance -= price;
            updateUI();
            bulutaYaz(); 
            alert("✅ Sipariş alındı! Bakiyen güncellendi.");
        }
    } else {
        alert("❌ Bakiye yetersiz!");
    }
};

// 8. MENÜ NAVİGASYONU
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const targetId = btn.getAttribute('data-target');
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');
        
        if (balance !== sonKaydedilenBakiye) bulutaYaz();
    };
});

// 9. MOTORU ÇALIŞTIR
function init() {
    const userEl = document.getElementById('username');
    if (userEl) userEl.textContent = tg.initDataUnsafe?.user?.first_name || backupName;
    
    updateUI();
    drawWheel(); // Çarkı çiz
    loadMarket();
}

init();
