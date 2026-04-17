/**
 * VOLTPY SMM BOT - MAIN.JS (Full Stable Version)
 */

// 1. TELEGRAM SDK BAĞLANTISI
const tg = window.Telegram?.WebApp || {};
if (tg.expand) tg.expand();
if (tg.ready) tg.ready();

// 2. VERİLERİ URL PARAMETRELERİNDEN ÇEK (Python'dan gelenler)
const urlParams = new URLSearchParams(window.location.search);
let balance = parseInt(urlParams.get('bal')) || 0;
let currentEnergy = parseInt(urlParams.get('en')) || 500;
const backupName = urlParams.get('name') || "Oyuncu"; // İsim gelmezse "Oyuncu" yaz
const maxEnergy = 500;

// 3. ELEMENTLERİ SEÇ
const elements = {
    balance: document.getElementById('balance'),
    energyText: document.getElementById('energy-text'),
    energyBar: document.getElementById('energy-bar'),
    tapButton: document.getElementById('tap-button'),
    username: document.getElementById('username'),
    marketList: document.getElementById('market-list'),
    spinBtn: document.getElementById('spin-button'),
    wheel: document.getElementById('lucky-wheel'),
    saveBtn: document.getElementById('save-btn'),
    navBtns: document.querySelectorAll('.nav-btn'),
    screens: document.querySelectorAll('.screen')
};

// 4. BAŞLATMA FONKSİYONU
function init() {
    // Profil ismini ayarla (Telegram SDK öncelikli, URL parametresi yedek)
    if (elements.username) {
        const tgName = tg.initDataUnsafe?.user?.first_name;
        elements.username.textContent = tgName || backupName;
    }

    setupNavigation();
    loadMarket();
    updateUI();
    
    console.log("VoltPy UI Başlatıldı.");
}

// 5. TIKLAMA VE +1 ANİMASYONU
function handleTap(e) {
    if (e) e.preventDefault();

    if (currentEnergy > 0) {
        currentEnergy--;
        balance++;
        updateUI();

        // +1 Yazısı Oluştur
        const plusOne = document.createElement('div');
        plusOne.innerText = '+1';
        plusOne.className = 'plus-one';

        // Tıklanan koordinatları bul
        const x = e.clientX || (e.touches ? e.touches[0].clientX : window.innerWidth / 2);
        const y = e.clientY || (e.touches ? e.touches[0].clientY : window.innerHeight / 2);

        plusOne.style.left = `${x}px`;
        plusOne.style.top = `${y}px`;

        document.body.appendChild(plusOne);
        setTimeout(() => plusOne.remove(), 800);

        // Telegram Titreşimi
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    } else {
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
    }
}

// 6. MENÜ GEÇİŞLERİ (EKRAN DEĞİŞTİRME)
function setupNavigation() {
    elements.navBtns.forEach(btn => {
        btn.onclick = () => {
            const targetId = btn.getAttribute('data-target');

            // Menü butonlarının rengini güncelle
            elements.navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Ekranları gizle/göster
            elements.screens.forEach(s => {
                s.classList.remove('active');
                if (s.id === targetId) s.classList.add('active');
            });
        };
    });
}

// 7. ŞANS ÇARKI (KAZAN SAYFASI)
if (elements.spinBtn) {
    elements.spinBtn.onclick = () => {
        if (balance < 100) {
            alert("En az 100 Coin gerekiyor!");
            return;
        }

        balance -= 100;
        updateUI();

        if (elements.wheel) {
            elements.wheel.style.transition = "transform 1.5s cubic-bezier(0.1, 0, 0.2, 1)";
            elements.wheel.style.transform = "rotate(1080deg)";
        }

        setTimeout(() => {
            const prize = Math.random() < 0.2 ? 500 : 0; // %20 şansla 500 coin
            balance += prize;
            updateUI();
            if (elements.wheel) elements.wheel.style.transform = "rotate(0deg)";
            alert(prize > 0 ? `🔥 Tebrikler! ${prize} kazandın!` : "😥 Şansına küs...");
        }, 1500);
    };
}

// 8. MARKETİ DOLDUR
function loadMarket() {
    if (!elements.marketList) return;
    const items = [
        { name: "100 Instagram Takipçi", price: 5000 },
        { name: "500 Instagram Beğeni", price: 3000 },
        { name: "1000 YouTube İzlenme", price: 10000 }
    ];

    elements.marketList.innerHTML = items.map(item => `
        <div class="market-item">
            <div class="item-details"><h3>${item.name}</h3></div>
            <button class="buy-btn" onclick="buyItem('${item.name}', ${item.price})">${item.price} 💰</button>
        </div>
    `).join('');
}

// Satın alma fonksiyonu (Global yapıldı ki HTML'den erişilebilsin)
window.buyItem = (name, price) => {
    if (balance >= price) {
        if (confirm(`${name} satın alınsın mı?`)) {
            balance -= price;
            updateUI();
            sendToBot("buy", name);
        }
    } else {
        alert("Bakiye yetersiz!");
    }
};

// 9. VERİ GÜNCELLEME VE BOT'A GÖNDERME
function updateUI() {
    if (elements.balance) elements.balance.textContent = balance;
    if (elements.energyText) elements.energyText.textContent = `${currentEnergy} / ${maxEnergy}`;
    if (elements.energyBar) {
        elements.energyBar.style.width = `${(currentEnergy / maxEnergy) * 100}%`;
    }
}

function sendToBot(action, item = "") {
    const data = JSON.stringify({ action, balance, energy: currentEnergy, item });
    if (tg.sendData) {
        tg.sendData(data);
    } else {
        console.log("Bot Verisi:", data);
        alert("Kaydedildi!");
    }
}

// Olay Dinleyicileri
if (elements.tapButton) elements.tapButton.addEventListener('pointerdown', handleTap);
if (elements.saveBtn) elements.saveBtn.onclick = () => sendToBot("save");

// SİSTEMİ ATEŞLE
init();
