# Mobile Game Premium Design Specification V2

Bu döküman, dev agent tarafından implemente edilecek tasarım iyileştirmelerini içerir.

---

## ONAYLANAN DEĞİŞİKLİKLER

### 1. TOP (Ball) Geliştirmeleri

| Özellik | Açıklama | Dosya |
|---------|----------|-------|
| Glow Pulse | Top etrafında nefes alan (breathing) glow efekti. `sin(time * 2.5) * 0.2` ile 0.4-0.6 arası pulse | `Ball.js` |
| Motion Blur | Yüksek hızda (>400 speed) trail noktalarına blur efekti ekle | `Ball.js` |
| Enhanced Squash/Stretch | Mevcut squash amount'u 1.3x artır, decay'i 0.8x yavaşlat | `Ball.js` |
| Impact Rings | Çarpmalarda genişleyen halka. `impactSpeed > 100` ise spawn et, 400+ ise kırmızı, altı cyan | `Ball.js` |

**NOT:** Ball'a yüz/ifade EKLENMEYecek.

---

### 2. ŞEKİLLER (Shapes) Geliştirmeleri

| Özellik | Açıklama | Dosya |
|---------|----------|-------|
| 3D Bevel | Sol-üstten sağ-alta linear gradient ile highlight/shadow. Top: `rgba(255,255,255,0.15)`, bottom: `rgba(0,0,0,0.1)` | `Shape.js` |
| Gradient Fill | Flat renk yerine diagonal gradient. Selected: cyan tones, Unselected: gray tones | `Shape.js` |
| Placement Glow | Shape yerleştirilince 0.5s fade glow. `placementGlow` property ekle, `triggerPlacementGlow()` method | `Shape.js` |
| Magnetic Snap Feedback | Snap noktalarında görsel ipucu (isteğe bağlı, düşük öncelik) | `Shape.js` |
| Material Texture | Hafif noise/texture overlay (isteğe bağlı, performans maliyeti var) | `Shape.js` |
| Selection Ring | Seçildiğinde etrafında dönen kesik çizgili daire. `setLineDash([8, 6])`, `lineDashOffset` animate | `Shape.js` |

**NOT:** Rounded corners EKLENMEYecek (fizik engine'i etkiler).

---

### 3. BASKET Geliştirmeleri

| Özellik | Açıklama | Dosya |
|---------|----------|-------|
| Glowing Rim | Kenarlar sürekli pulse. `sin(time * 3) * 0.2 + 0.4` shadowBlur | `Basket.js` |
| Particle Attraction | Ball yaklaşınca (dist < 200px) basket'e doğru çekilen parçacıklar | `Basket.js` |
| Win Celebration | `triggerWinPulse()` çağrıldığında extra glow + gold çerçeve animasyonu | `Basket.js` |
| Color Shift | Ball proximity'ye göre yeşil→altın geçişi. `ballProximity = 1 - dist/200` | `Basket.js` |
| Depth Illusion | İç fill için gradient: üstte açık, altta koyu | `Basket.js` |

---

### 4. UI PANELS Geliştirmeleri

| Özellik | Açıklama | Dosya |
|---------|----------|-------|
| Animated Borders | Panel kenarında akan ışık efekti (CSS veya canvas) | `GameCanvas.jsx`, `index.css` |
| Micro-interactions | Tıklamada scale bounce | `index.css` |
| Progress Indicator | Lives yanında dolup boşalan bar (isteğe bağlı) | `GameCanvas.jsx` |
| Floating Labels | Değer değiştiğinde "+1" / "-1" animasyonu | `GameCanvas.jsx` |

**NOT:** Glassmorphism/backdrop-filter KULLANILMAYACAK (Safari uyumsuz).

---

### 5. POWERUP BUTONLARI Geliştirmeleri

| Özellik | Açıklama | Dosya |
|---------|----------|-------|
| Glow When Available | Kullanılabilirken nefes alan glow | `GameCanvas.jsx` |
| Shake When Low | Son 1 kaldığında hafif titreme | `GameCanvas.jsx` |
| Usage Animation | Kullanıldığında dramatik efekt (patlama, küçülme) | `GameCanvas.jsx` |

**NOT:** Cooldown visual ve Tooltip EKLENMEYecek.

---

### 6. SUBMIT BUTONU Geliştirmeleri

| Özellik | Açıklama | Dosya |
|---------|----------|-------|
| Pulsing Glow | Hazır olduğunda dikkat çekici pulse (mevcut var, güçlendir) | `GameCanvas.jsx` |
| 3D Press Effect | Basıldığında aşağı inen, gölge değişen efekt | `GameCanvas.jsx` |
| Ripple Effect | Tıklandığında material design ripple | `GameCanvas.jsx` |
| Sound Wave Visual | Basıldığında yayılan ring animasyonu | `GameCanvas.jsx` |

**NOT:** Icon integration EKLENMEYecek.

---

### 7. WIN/FAIL OVERLAYS Geliştirmeleri

| Özellik | Açıklama | Dosya |
|---------|----------|-------|
| Full Screen Takeover | Sadece popup değil, tüm ekran animasyonu | `WinOverlay.jsx`, `index.css` |
| Star Animation | Yıldızlar tek tek dolsun (staggered, 300ms arası) | `WinOverlay.jsx` |
| Particle Explosion | Win: confetti, Fail: kırık parça animasyonu | `WinOverlay.jsx`, `index.css` |
| Score Counter | Sayılar slot makinesi gibi dönsün (50ms interval) | `WinOverlay.jsx` |
| Background Change | Win: altın radial gradient, Fail: kırmızı radial gradient | `index.css` |

**NOT:** Character reaction EKLENMEYecek (ball'da yüz yok).

---

### 8. WELCOME SCREEN Geliştirmeleri

| Özellik | Açıklama | Dosya |
|---------|----------|-------|
| Animated Logo | Gradient kayması + float animasyonu | `WelcomeScreen.jsx`, `index.css` |
| Button Hover Effects | Hover'da glow artışı, active'de scale down | `index.css` |
| Loading Transition | Oyuna geçişte smooth fade/slide (400ms) | `WelcomeScreen.jsx` |
| Achievement Preview | Highest level büyük ve gurur verici gösterilsin | `index.css` |

**NOT:** Demo animation EKLENMEYecek.

---

### 9. ARKA PLAN Geliştirmeleri

| Özellik | Açıklama | Dosya |
|---------|----------|-------|
| Floating Particles | 25 adet yavaşça hareket eden neon parçacık | `vfx.js`, `GameCanvas.jsx` |

---

### 10. MIKRO ANİMASYONLAR

| Özellik | Açıklama | Dosya |
|---------|----------|-------|
| Tutorial Arrows | İlk seviyede animasyonlu yönlendirme okları | `GameCanvas.jsx` |

---

## İMPLEMENTASYON SIRALAMA ÖNERİSİ

1. **Floating Particles** (arka plan) - Düşük risk, yüksek görsel etki
2. **Ball Glow + Impact Rings** - Karakter kazandırır
3. **Win/Fail Overlay Animasyonları** - Ödül hissi
4. **Shape 3D Bevel + Selection Ring** - Görsel kalite
5. **Basket Glowing Rim + Color Shift** - Interaktif feedback
6. **Submit Button Effects** - UX iyileştirme
7. **Welcome Screen Animations** - İlk izlenim
8. **Powerup Button Effects** - Son rötuşlar

---

## TEKNİK NOTLAR

### Performans
- Gradient'ler frame başına oluşturulmamalı, cache'lenmeli
- Floating particles max 30 adet (Safari'de 30+ lag yapar)
- Impact rings self-limiting (max 3-4 aynı anda)
- CSS animasyonlarında `will-change` kullanma (Safari override'ları)

### Safari Uyumluluğu
- `backdrop-filter` KULLANMA
- Box-shadow blur max 15px (production'da)
- Transition'ları `box-shadow` üzerinde kullanma
- Animation'lar için `transform` ve `opacity` tercih et

### Test Senaryoları
Her değişiklik sonrası:
1. Safari iOS'ta test et
2. Chrome Android'de test et
3. FPS drop olup olmadığını kontrol et
4. Memory leak olup olmadığını DevTools'tan kontrol et

---

## DOSYA YAPISI

```
src/
├── engine/
│   ├── entities/
│   │   ├── Ball.js      # Glow pulse, impact rings, squash
│   │   └── Basket.js    # Glowing rim, color shift, particles
│   ├── shapes/
│   │   ├── Shape.js     # 3D bevel, gradient, selection ring
│   │   └── Triangle.js  # (ve diğer shape'ler)
│   └── vfx.js           # Floating particles
├── components/
│   ├── GameCanvas.jsx   # UI panel effects, powerup effects
│   ├── WinOverlay.jsx   # Win/fail animations
│   └── WelcomeScreen.jsx # Welcome animations
└── styles/
    └── index.css        # CSS animations
```

---

## LOCALHOST TEST

```bash
# Development server başlat
npm run dev -- --port 3005

# Test adresi
http://localhost:3005
```

---

## ROLLBACK

Herhangi bir sorun durumunda:

```bash
git checkout 6832383 -- <dosya_yolu>
```

Tüm değişiklikleri geri almak için:

```bash
git reset --hard 6832383
```
