// 1. TELEGRAM WEB APP BAĞLANTISI
const tg = window.Telegram?.WebApp || {};
if (tg.expand) tg.expand();
if (tg.ready) tg.ready();

// 2. DEĞİŞKENLER VE VERİ YÖNETİMİ
const urlParams = new URLSearchParams(window.location.search);
let balance = parseInt(urlParams.get('bal')) || 0;
let currentEnergy = parseInt(urlParams.get('en')) || 500;
let hourlyAdLimit = parseInt(urlParams.get('ad')) || 20;
const maxEnergy = 500;

// 3. ELEMENTLERİ SEÇ
const balanceEl = document.getElementById('balance');
const energyTextEl = document.getElementById('energy-text');
const energyBarEl = document.getElementById('energy-bar');
const tapButton = document.getElementById('tap-button');
const usernameEl = document.getElementById('username');
const spinBtn = document.getElementById('spin-button');

// 4. BAŞLATMA FONKSİYONU
function init() {
    // Kullanıcı adını Telegram'dan çek, yoksa varsayılan yap
    if (usernameEl) {
        usernameEl.textContent = tg.initDataUnsafe?.user?.first_name || "VoltPy Oyuncusu";
    }
    updateUI();
    loadMarket();
}

// 5. TIKLAMA VE +1 ANİMASYONU (Geliştirilmiş Koordinat Sistemi)
function handleTap(e) {
    if (e) e.preventDefault(); // Sayfa kaymasını ve zoom'u engelle

    if (currentEnergy > 0) {
        currentEnergy--;
        balance++;
        updateUI();

        // --- +1 ANİMASYONU OLUŞTURMA ---
        const plusOne = document.createElement('div');
        plusOne.innerText = '+1';
        plusOne.className = 'plus-one';

        // Tıklama koordinatlarını tam olarak yakala
        let x, y;
        if (e.clientX) {
            // Mouse veya Pointer olayları için
            x = e.clientX;
            y = e.clientY;
        } else if (e.touches && e.touches[0]) {
            // Saf dokunmatik olaylar için yedek
            x = e.touches[0].clientX;
            y = e.touches[0].clientY;
        } else {
            // Koordinat alınamazsa butonun merkezine koy
            const rect = tapButton.getBoundingClientRect();
            x = rect.left + rect.width / 2;
            y = rect.top + rect.height / 2;
        }

        plusOne.style.left = `${x}px`;
        plusOne.style.top = `${y}px`;

        document.body.appendChild(plusOne);

        // Animasyon bitince elementi yok et (Hafıza temizliği)
        setTimeout(() => {
            plusOne.remove();
        }, 700);

        // Telegram Titreşimi
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    } else {
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
        }
        // Enerji bittiyse kullanıcıya küçük bir uyarı
        console.log("Enerji tükendi!");
    }
}

// Buton olay dinleyicisi
if (tapButton) {
    // pointerdown: Hem mouse hem parmak için en hızlı tepkiyi verir
    tapButton.addEventListener('pointerdown', handleTap);
}

// 6. ŞANS ÇARKI (KAZAN SAYFASI)
if (spinBtn) {
    spinBtn.onclick = () => {
        const cost = 100;
        if (balance < cost) {
            alert("Çarkı çevirmek için 100 Coin gerekiyor!");
            return;
        }

        balance -= cost;
        updateUI();

        // Kasa kazansın mantığı: %15 ihtimalle ödül
        const winAmount = Math.random() < 0.15 ? 500 : 0;

        // Çark görseline dönme animasyonu ekle (CSS'deki ID ile uyumlu)
        const wheelImg = document.getElementById('lucky-wheel');
        if (wheelImg) {
            wheelImg.style.transition = "transform 1.5s cubic-bezier(0.1, 0, 0.3, 1)";
            wheelImg.style.transform = "rotate(1080deg)";
        }

        setTimeout(() => {
            balance += winAmount;
            updateUI();
            if (wheelImg) wheelImg.style.transform = "rotate(0deg)"; // Resetle
            
            if (winAmount > 0) {
                alert(`🔥 Harika! ${winAmount} Coin kazandın!`);
            } else {
                alert("😥 Maalesef bir şey çıkmadı.");
            }
        }, 1500);
    };
}

// 7. MARKET SİSTEMİ (OTOMATİK LİSTELEME)
function loadMarket() {
    const marketContainer = document.querySelector('.market-list');
    if (!marketContainer) return;

    const products = [
        { id: 1, name: "100 Instagram Takipçi", price: 5000, desc: "Global - Hızlı" },
        { id: 2, name: "500 Instagram Beğeni", price: 3000, desc: "Organik Görünümlü" },
        { id: 3, name: "1000 YouTube İzlenme", price: 10000, desc: "Kalıcı Servis" }
    ];

    marketContainer.innerHTML = ""; // Temizle
    products.forEach(p => {
        marketContainer.innerHTML += `
            <div class="market-item">
                <div class="item-details">
                    <h3 class="item-title">${p.name}</h3>
                    <p>${p.desc}</p>
                </div>
                <button class="buy-btn" data-price="${p.price}" data-name="${p.name}">
                    ${p.price} 💰
                </button>
            </div>
        `;
    });

    // Satın alma butonlarını aktifleştir
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.onclick = function() {
            const price = parseInt(this.getAttribute('data-price'));
            const name = this.getAttribute('data-name');

            if (balance >= price) {
                if(confirm(`${name} satın almak istiyor musun?`)) {
                    balance -= price;
                    updateUI();
                    sendDataToBot("buy", name);
                }
            } else {
                alert("Yetersiz bakiye!");
            }
        };
    });
}

// 8. MENÜ GEÇİŞLERİ (GÜVENLİ VE HIZLI)
const navButtons = document.querySelectorAll('.nav-btn');
const screens = document.querySelectorAll('.screen');

navButtons.forEach(btn => {
    btn.onclick = function() {
        const targetId = this.getAttribute('data-target');
        
        // Buton stillerini güncelle
        navButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        // Ekranları değiştir
        screens.forEach(s => {
            s.classList.remove('active');
            if (s.id === targetId) {
                s.classList.add('active');
            }
        });
    };
});

// 9. YARDIMCI FONKSİYONLAR
function updateUI() {
    if (balanceEl) balanceEl.textContent = balance;
    if (energyTextEl) energyTextEl.textContent = `${currentEnergy} / ${maxEnergy}`;
    if (energyBarEl) {
        const perc = (currentEnergy / maxEnergy) * 100;
        energyBarEl.style.width = `${perc}%`;
    }
}

function sendDataToBot(action, item = "") {
    const data = {
        action: action,
        user_id: tg.initDataUnsafe?.user?.id || 0,
        balance: balance,
        energy: currentEnergy,
        item: item
    };
    
    if (tg.sendData) {
        tg.sendData(JSON.stringify(data));
    } else {
        console.log("Bot Verisi (Simülasyon):", data);
    }
}

// Kaydet Butonu
const saveBtn = document.getElementById('save-btn');
if(saveBtn) saveBtn.onclick = () => sendDataToBot("save");

// SİSTEMİ BAŞLAT
init();
