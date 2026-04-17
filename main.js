/**
 * VoltPy SMM Bot - Frontend Logic
 * Her şeyin eksiksiz çalışması için optimize edildi.
 */

// 1. TELEGRAM WEB APP BAĞLANTISI (Güvenli Başlatma)
const tg = window.Telegram?.WebApp || {};
if (tg.expand) tg.expand();
if (tg.ready) tg.ready();

// 2. BAŞLANGIÇ VERİLERİ (URL'den veya varsayılan)
const urlParams = new URLSearchParams(window.location.search);
let balance = parseInt(urlParams.get('bal')) || 0;
let currentEnergy = parseInt(urlParams.get('en')) || 500;
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

// 4. BAŞLATMA (INIT)
function init() {
    // Kullanıcı Adını Çek
    if (elements.username) {
        const user = tg.initDataUnsafe?.user;
        elements.username.textContent = user ? user.first_name : "Geliştirici";
    }

    setupNavigation();
    loadMarket();
    updateUI();
    
    console.log("VoltPy Sistemi Hazır.");
}

// 5. TIKLAMA VE +1 ANİMASYONU
function handleTap(e) {
    if (e) e.preventDefault();

    if (currentEnergy > 0) {
        currentEnergy--;
        balance++;
        updateUI();

        // --- +1 Yazısı Oluştur ---
        const plusOne = document.createElement('div');
        plusOne.innerText = '+1';
        plusOne.className = 'plus-one';

        // Tıklanan tam nokta (Koordinatlar)
        const x = e.clientX || (e.touches ? e.touches[0].clientX : window.innerWidth / 2);
        const y = e.clientY || (e.touches ? e.touches[0].clientY : window.innerHeight / 2);

        plusOne.style.left = `${x}px`;
        plusOne.style.top = `${y}px`;

        document.body.appendChild(plusOne);

        // Animasyon bitince temizle
        setTimeout(() => plusOne.remove(), 800);

        // Titreşim (Sadece Telegram'da)
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    } else {
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        alert("Enerjin bitti! Biraz bekle.");
    }
}

// 6. MENÜ GEÇİŞLERİ
function setupNavigation() {
    elements.navBtns.forEach(btn => {
        btn.onclick = () => {
            const targetId = btn.getAttribute('data-target');

            // Buton Aktifliği
            elements.navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Ekran Aktifliği
            elements.screens.forEach(s => {
                s.classList.remove('active');
                if (s.id === targetId) s.classList.add('active');
            });
        };
    });
}

// 7. ŞANS ÇARKI (KUMAR)
if (elements.spinBtn) {
    elements.spinBtn.onclick = () => {
        const cost = 100;
        if (balance < cost) {
            alert("100 Coin gerekiyor!");
            return;
        }

        balance -= cost;
        updateUI();

        // Görsel Dönme Efekti
        if (elements.wheel) {
            elements.wheel.style.transition = "transform 1.5s cubic-bezier(0.1, 0, 0.2, 1)";
            elements.wheel.style.transform = "rotate(1080deg)";
        }

        // Sonuç ( %20 kazanma ihtimali )
        const isWin = Math.random() < 0.20;
        const prize = isWin ? 500 : 0;

        setTimeout(() => {
            balance += prize;
            updateUI();
            if (elements.wheel) elements.wheel.style.transform = "rotate(0deg)";
            
            if (isWin) {
                alert(`🔥 Jackpot! ${prize} Coin kazandın!`);
            } else {
                alert("😥 Maalesef bir şey çıkmadı.");
            }
        }, 1500);
    };
}

// 8. MARKET YÜKLEME
function loadMarket() {
    if (!elements.marketList) return;

    const products = [
        { name: "100 Instagram Takipçi", price: 5000, desc: "Hızlı Gönderim" },
        { name: "500 Instagram Beğeni", price: 3000, desc: "Gerçek Hesaplar" },
        { name: "1000 YouTube İzlenme", price: 10000, desc: "Organik & Kalıcı" }
    ];

    elements.marketList.innerHTML = "";
    products.forEach(p => {
        const item = document.createElement('div');
        item.className = 'market-item';
        item.innerHTML = `
            <div class="item-details">
                <h3>${p.name}</h3>
                <p>${p.desc}</p>
            </div>
            <button class="buy-btn" onclick="buyItem('${p.name}', ${p.price})">
                ${p.price} 💰
            </button>
        `;
        elements.marketList.appendChild(item);
    });
}

window.buyItem = (name, price) => {
    if (balance >= price) {
        if (confirm(`${name} satın alınsın mı?`)) {
            balance -= price;
            updateUI();
            sendToBot("buy", name);
        }
    } else {
        alert("Yetersiz bakiye!");
    }
};

// 9. UI VE VERİ GÜNCELLEME
function updateUI() {
    if (elements.balance) elements.balance.textContent = balance;
    if (elements.energyText) elements.energyText.textContent = `${currentEnergy} / ${maxEnergy}`;
    if (elements.energyBar) {
        const perc = (currentEnergy / maxEnergy) * 100;
        elements.energyBar.style.width = `${perc}%`;
    }
}

// Bot'a veri fırlatma (Kaydet butonu için)
function sendToBot(action, item = "") {
    const data = JSON.stringify({
        action: action,
        balance: balance,
        energy: currentEnergy,
        item: item
    });

    if (tg.sendData) {
        tg.sendData(data);
    } else {
        console.log("Tarayıcıda Veri Gönderimi (Simüle):", data);
        alert("Veriler kaydedildi (Simülasyon).");
    }
}

// Olay Dinleyicileri
if (elements.tapButton) elements.tapButton.addEventListener('pointerdown', handleTap);
if (elements.saveBtn) elements.saveBtn.onclick = () => sendToBot("save");

// BAŞLAT
init();
