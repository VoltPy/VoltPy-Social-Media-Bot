/**
 * VOLTPY SMM BOT - MAIN.JS (TAM SÜRÜM - SÜREKLİ TARAMA)
 * Geliştirici: Berke (VoltPy)
 */

// 1. FIREBASE İÇE AKTARMA (MODÜL)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 2. FIREBASE YAPILANDIRMASI (voltpy1 Projesi)
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

// 3. TELEGRAM VE URL PARAMETRELERİ
const tg = window.Telegram?.WebApp || {};
if (tg.expand) tg.expand();
if (tg.ready) tg.ready();

// Python botundan gelen kimlik verilerini URL'den çekiyoruz
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('uid'); 
const backupName = urlParams.get('name') || "Oyuncu";

let balance = parseInt(urlParams.get('bal')) || 0;
let currentEnergy = parseInt(urlParams.get('en')) || 500;
const maxEnergy = 500;
let isSpinning = false;

// KONTROL NOKTASI (Sistemi yormamak için sadece değişince kaydeder)
let sonKaydedilenBakiye = balance; 

// 4. BULUTA SESSİZ KAYIT FONKSİYONU
function bulutaYaz() {
    if (!userId) return; // Kullanıcı ID yoksa (bottan girilmediyse) kaydetme
    
    set(ref(db, 'users/' + userId), {
        balance: balance,
        energy: currentEnergy,
        username: backupName,
        lastUpdate: Date.now()
    }).then(() => {
        sonKaydedilenBakiye = balance;
        console.log(`✅ VoltPy Cloud: Kayıt Başarılı -> ${balance} 💰`);
    }).catch(err => console.error("Kayıt Hatası:", err));
}

// ⏱️ OTOMATİK SENKRONİZASYON (HER 3 SANİYEDE BİR)
setInterval(() => {
    if (balance !== sonKaydedilenBakiye) {
        bulutaYaz();
    }
}, 3000);

// 🔒 KULLANICI ÇIKARKEN / UYGULAMAYI KAPATIRKEN SON KAYIT
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === 'hidden' && balance !== sonKaydedilenBakiye) {
        bulutaYaz();
    }
});

// 5. BAŞLANGIÇ (INIT) VE UI GÜNCELLEME
function updateUI() {
    const balEl = document.getElementById('balance');
    const enText = document.getElementById('energy-text');
    const enBar = document.getElementById('energy-bar');
    
    if (balEl) balEl.textContent = balance;
    if (enText) enText.textContent = `${currentEnergy} / ${maxEnergy}`;
    if (enBar) enBar.style.width = `${(currentEnergy / maxEnergy) * 100}%`;
}

function init() {
    const userEl = document.getElementById('username');
    if (userEl) userEl.textContent = tg.initDataUnsafe?.user?.first_name || backupName;
    
    updateUI();
    createWheel();
    loadMarket();
}

// 6. TAPPER (TIKLAMA) SİSTEMİ VE EFEKTLER
const tapButton = document.getElementById('tap-button');
if (tapButton) {
    tapButton.addEventListener('pointerdown', (e) => {
        if (currentEnergy > 0) {
            balance++;
            currentEnergy--;
            updateUI();

            // +1 Efektini Yaratma
            const plusOne = document.createElement('div');
            plusOne.innerText = '+1';
            plusOne.className = 'plus-one';
            
            const x = e.clientX || (e.touches && e.touches[0].clientX) || window.innerWidth / 2;
            const y = e.clientY || (e.touches && e.touches[0].clientY) || window.innerHeight / 2;
            plusOne.style.left = `${x}px`;
            plusOne.style.top = `${y}px`;
            
            document.body.appendChild(plusOne);
            setTimeout(() => plusOne.remove(), 800);

            // Telefonda titreme hissi
            if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        }
    });
}

// 7. ŞANS ÇARKI MANTIĞI
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

function createWheel() {
    const wheel = document.getElementById('lucky-wheel');
    if (!wheel) return;
    const deg = 360 / rewards.length; 

    rewards.forEach((r, i) => {
        const seg = document.createElement('div');
        seg.className = 'segment';
        seg.style.transform = `rotate(${i * deg}deg) skewY(${90 - deg}deg)`;

        const span = document.createElement('span');
        span.innerText = r.text;
        span.style.transform = `skewY(-${90 - deg}deg) rotate(${deg / 2}deg)`;

        seg.appendChild(span);
        wheel.appendChild(seg);
    });
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
        bulutaYaz(); // Çevirme parası kesildi, hemen kaydet

        const rotation = Math.floor(Math.random() * 3600) + 1800; 
        const wheel = document.getElementById('lucky-wheel');
        wheel.style.transform = `rotate(${rotation}deg)`;

        setTimeout(() => {
            isSpinning = false;
            const actualDeg = rotation % 360;
            const prizeIdx = Math.floor((360 - actualDeg) / (360 / rewards.length)) % rewards.length;
            const prize = rewards[prizeIdx];

            if (prize.type === "coin") balance += prize.val;
            if (prize.type === "energy") currentEnergy = maxEnergy; 
            if (prize.type === "free") balance += 100; 

            updateUI();
            alert(`🎁 Sonuç: ${prize.text}`);
            
            bulutaYaz(); // Ödül geldi, hemen kaydet
        }, 4000); 
    };
}

// 8. SMM MARKET EKRANI
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
        <div class="market-item" style="background: #1e293b; padding: 15px; margin-bottom: 10px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
            <div class="item-details">
                <h3 style="margin: 0; font-size: 16px;">${i.name}</h3>
            </div>
            <button class="buy-btn" onclick="buyItem('${i.name}', ${i.price})" style="background: #00ff88; color: black; border: none; padding: 8px 15px; border-radius: 5px; font-weight: bold; cursor: pointer;">${i.price} 💰</button>
        </div>
    `).join('');
}

window.buyItem = (name, price) => {
    if (balance >= price) {
        if (confirm(`${name} hizmetini başlatmak istiyor musun?`)) {
            balance -= price;
            updateUI();
            bulutaYaz(); // Satın alma sonrası ANINDA kaydet
            alert("✅ Sipariş başarıyla alındı! Bakiyen bulutta güncellendi.");
        }
    } else {
        alert("❌ Bakiye yetersiz!");
    }
};

// 9. ALT MENÜ NAVİGASYONU
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const targetId = btn.getAttribute('data-target');
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');
        
        // Sayfa geçişinde kaydet
        if (balance !== sonKaydedilenBakiye) {
            bulutaYaz();
        }
    };
});

// MOTORU ÇALIŞTIR
init();
