# BounceLive Mobile - Changelog

Bu dosya tüm değişiklikleri commit bazında takip eder.
Her yeni değişiklik bu dosyaya eklenir.

---

## Core Mechanics Durumu (Değişmedi - Teyit Edildi)

Aşağıdaki dosyalar **orijinal halinde** korunuyor (sadece bug fix'ler):

| Dosya | Durum | Not |
|-------|-------|-----|
| `src/engine/physics.js` | ✅ Korunuyor | Sadece one-way collision parametresi eklendi |
| `src/engine/utils.js` | ✅ Korunuyor | Corner collision bug fix (205fa0d) |
| `src/engine/shapes/*.js` | ✅ Korunuyor | Collision logic değişmedi, sadece visual (handle size, rotation arrow) |
| `src/engine/shapeFactory.js` | ✅ Değişmedi | |
| `src/data/levels.js` | ✅ Değişmedi | Level configs korunuyor |

### Dokunulmayan Mekanikler:
- Gravity calculations
- Rebound/restitution physics
- Ball speed ve velocity
- Segment collision detection
- Arc/curve collision handling
- Shape placement validation
- Win/fail conditions

---

## Commit History

### c28ebcd - Restore level 1 piece area hint text with fade animation
**Tarih:** 2026-02-01
**Değişiklikler:**
- Level 1'de "Place objects to submit" hint text'i geri eklendi
- Hint text herhangi bir parça hareket ettiğinde fade out yapıyor
- `go.pieceHintAlpha` animasyon state'i kullanılıyor

**Dosyalar:**
- `src/components/GameCanvas.jsx`

---

### 813a9aa - Remove trajectory direction ticks
**Tarih:** 2026-02-01
**Değişiklikler:**
- Trajectory üzerindeki ok işaretleri (direction ticks) kaldırıldı
- Sadece noktalar (dots) görünüyor

**Dosyalar:**
- `src/engine/trajectory.js`

---

### f537576 - Implement even dot distribution along trajectory
**Tarih:** 2026-02-01
**Değişiklikler:**
- Trajectory noktaları artık toplam yol boyunca eşit aralıklarla dağıtılıyor
- Önceki: segment bazlı dağıtım (uneven clustering)
- Şimdi: total arc length hesaplanıp fixed interval

**Dosyalar:**
- `src/engine/trajectory.js`

---

### f47d703 - Fix remove mode overlay to cover entire screen with animation
**Tarih:** 2026-02-01
**Değişiklikler:**
- Remove mode tint artık TÜM ekranı kaplıyor (bottom controls dahil)
- `go.removeModeAlpha` ile smooth fade in/out animasyonu
- "Tap an object to remove" hint text'i görünüyor
- One-way tutorial positioning düzeltildi

**Dosyalar:**
- `src/components/GameCanvas.jsx`
- `src/context/GameContext.jsx` (removeModeAlpha, pieceHintAlpha eklendi)

---

### 8c2dc8f - Restore powerup button icon alignment and count display
**Tarih:** 2026-02-01
**Değişiklikler:**
- Powerup iconları centered (iconCenterY offset)
- Consistent 22x22 icon bounding box
- Count butonun içinde gösteriliyor (×N format)
- Symmetric trajectory icon (parabola)
- Smaller, centered hammer icon
- Centered bidirectional arrow (widen)

**Dosyalar:**
- `src/components/GameCanvas.jsx`

---

### cf03e66 - Critical FPS optimizations for mobile performance
**Tarih:** 2026-02-01
**Değişiklikler:**
- Ball.js: Array filter -> in-place removal
- Ball.js: Trail sorting kaldırıldı
- Ball.js: Gradient -> solid color
- Basket.js: Net pattern batched (tek stroke call)
- VFX.js: splice -> in-place removal
- GameCanvas.jsx: filter().every() -> simple loop
- GameCanvas.jsx: Pre-calculated sin() values
- Shape.js: Hit check gradient -> solid color

**Dosyalar:**
- `src/engine/entities/Ball.js`
- `src/engine/entities/Basket.js`
- `src/engine/vfx.js`
- `src/components/GameCanvas.jsx`
- `src/engine/shapes/Shape.js`

---

### fa63ed2 - Restore Arcade Neon design from correct commit
**Tarih:** 2026-02-01
**Değişiklikler:**
- Arcade Neon theme restore edildi
- WelcomeScreen, WinOverlay styling
- Basket animation (ortadan açılma)
- Shape rendering improvements

**Dosyalar:**
- `src/engine/themes.js`
- `src/styles/index.css`
- `src/components/WelcomeScreen.jsx`
- `src/components/WinOverlay.jsx`
- `src/engine/entities/Basket.js`
- `src/engine/shapes/Shape.js`
- `src/engine/constants.js`

---

### 45745e7 - Re-implement FPS optimizations for mobile performance
**Tarih:** 2026-02-01
**Değişiklikler:**
- Trajectory caching sistemi
- Gradient caching
- Sourcemap disabled (production)

**Dosyalar:**
- `src/components/GameCanvas.jsx`
- `src/context/GameContext.jsx`
- `src/hooks/useGameLoop.js`
- `src/components/PowerupPopover.jsx`
- `vite.config.js`

---

### 6832383 - Fix basket opening animation, remove tint coverage, and text sizing
**Tarih:** 2026-01-30
**Değişiklikler:**
- Basket barrier ortadan açılıyor (yukarı kalkmak yerine)
- Remove powerup tint tüm ekranı kaplıyor
- Piece area hint text size 0.85
- Fail state handling

**Dosyalar:**
- `src/components/GameCanvas.jsx`
- `src/components/WinOverlay.jsx`
- `src/context/GameContext.jsx`
- `src/engine/entities/Basket.js`
- `src/styles/index.css`

---

### 205fa0d - Fix one-way corners, trajectory kinks, and add shape interaction system
**Tarih:** 2026-01-29
**Değişiklikler:**
- One-way corner collision fix (CORNER_THRESHOLD)
- Trajectory kink prevention (MIN_ENDPOINT_DIST)
- Shape interaction system (rotation handle, selection)

**Dosyalar:**
- `src/engine/physics.js`
- `src/engine/utils.js`
- `src/engine/trajectory.js`
- `src/engine/shapes/Shape.js`

---

### b696911 - Migrate BounceLive from monolithic HTML5 to React + Vite
**Tarih:** 2026-01-28
**Değişiklikler:**
- Initial React migration
- All 12 shape types
- Physics engine
- Level system
- PWA support

---

## Feature Checklist (Push Öncesi Kontrol)

Her push öncesi kontrol edilecek:

- [ ] Level 1 "Place objects to submit" hint görünüyor mu?
- [ ] Powerup icons centered mı? (×N format inside button)
- [ ] Remove mode tüm ekranı (bottom controls dahil) tintliyor mu?
- [ ] Remove mode "Tap an object to remove" text görünüyor mu?
- [ ] Trajectory sadece dots görünüyor mu? (ok yok)
- [ ] Trajectory dots eşit aralıklı mı?
- [ ] Basket ortadan açılıyor mu?
- [ ] FPS smooth mu? (60fps hedef)
- [ ] One-way shapes doğru çalışıyor mu?
- [ ] Ball physics (gravity, rebound) doğru mu?
