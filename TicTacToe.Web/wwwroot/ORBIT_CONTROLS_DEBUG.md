# 🎮 OrbitControls Debugging Guide

## Quick Test Instructions

### 1. **Open the App**
   - Run the app: `dotnet run --project TicTacToe.Web`
   - Navigate to `/play3d`
   - Open browser **DevTools Console** (F12)

### 2. **Check Console Logs**
   Look for these initialization messages:
   ```
   [INIT] ✓ OrbitControls initialized
   [INIT]   - enableDamping: true
   [INIT]   - enableZoom: true
   [INIT]   - enableRotate: true
   [INIT]   - enablePan: true
   [INIT] ✓ Debug: window.debugControls and window.debugCamera available
   [INIT] ✓ Keyboard shortcuts enabled (Press 'C' to toggle click detection)
   ```

### 3. **Test OrbitControls Manually**

#### **Test 1: Mouse Drag (Rotate)**
   - **Left-click + Drag** on the 3D canvas
   - **Expected:** Console shows:
     ```
     [CONTROLS] 🎮 User interaction started
     [CONTROLS] Change event #1 - Camera position: (7.80, 6.24, 7.80)
     [CONTROLS] 🎮 User interaction ended
     ```
   - **Expected:** Board rotates smoothly
   - **If drag is short:** May also show `[POINTER] Drag detected` message

#### **Test 2: Mouse Wheel (Zoom)**
   - **Scroll wheel** over canvas
   - **Expected:** Console shows `[CONTROLS] Change event` messages
   - **Expected:** Camera zooms in/out

#### **Test 3: Right-Click + Drag (Pan)**
   - **Right-click + Drag**
   - **Expected:** Console shows `[CONTROLS]` events
   - **Expected:** Camera pans

### 4. **Test Click Detection vs. OrbitControls**

#### **Scenario A: Short Click (Should trigger cell selection)**
   - **Quick left-click** on a cube (< 300ms, < 5px movement)
   - **Expected Console:**
     ```
     [POINTER] Click detected (dx=1, dy=0, time=120ms)
     [CLICK] 🎯 3D cell clicked: (2, 2, 1)
     ```
   - **Expected:** Move is made on that cell

#### **Scenario B: Drag (Should rotate, NOT click)**
   - **Left-click + Drag** > 5 pixels
   - **Expected Console:**
     ```
     [CONTROLS] 🎮 User interaction started
     [POINTER] Drag detected (dx=45, dy=23, time=450ms) - ignoring
     [CONTROLS] 🎮 User interaction ended
     ```
   - **Expected:** Board rotates, NO cell selected

### 5. **Toggle Click Detection (Press 'C')**
   - **Press 'C' key** anywhere on the page
   - **Expected Console:**
     ```
     [KEYBOARD] 🔘 Click detection: DISABLED
     [KEYBOARD] Press 'C' again to toggle
     ```
   - Now try clicking cubes - they should NOT respond
   - OrbitControls should still work perfectly
   - **Press 'C' again** to re-enable click detection

### 6. **Manual Console Tests**

Run these in the browser console:

```javascript
// Check if controls exist
console.log('Controls:', window.debugControls);
console.log('Camera:', window.debugCamera);

// Manually move camera
window.debugCamera.position.set(10, 10, 10);
window.debugControls.update();

// Check control settings
console.log('Rotate enabled:', window.debugControls.enableRotate);
console.log('Zoom enabled:', window.debugControls.enableZoom);
console.log('Pan enabled:', window.debugControls.enablePan);

// Test if controls respond to manual changes
window.debugControls.target.set(1, 1, 1);
window.debugControls.update();
```

---

## 🐛 Troubleshooting

### **Issue: No `[CONTROLS]` events when dragging**
- **Problem:** OrbitControls not working
- **Check:**
  1. Console for `[INIT] ✗ FATAL: Failed to create` errors
  2. Browser console for THREE.OrbitControls errors
  3. Network tab: verify `OrbitControls.js` loaded (Status 200)
  4. Run: `typeof THREE.OrbitControls` in console → should be `"function"`

### **Issue: Clicks trigger cell selection during drag**
- **Problem:** Click detection too sensitive
- **Solution:** Increase threshold in `onPointerUp`:
  ```javascript
  const isClick = (dx < 8 && dy < 8 && elapsed < 500); // More lenient
  ```

### **Issue: Clicks don't register cells**
- **Problem:** Click detection too strict
- **Test:** Press 'C' to disable, then re-enable
- **Check:** Console for `[CLICK]` messages when clicking
- **Solution:** Decrease threshold:
  ```javascript
  const isClick = (dx < 3 && dy < 3 && elapsed < 200); // Stricter
  ```

### **Issue: Controls feel sluggish**
- **Adjust damping:**
  ```javascript
  window.debugControls.dampingFactor = 0.1; // Higher = slower
  window.debugControls.update();
  ```

### **Issue: Can't zoom close enough**
- **Adjust distance limits:**
  ```javascript
  window.debugControls.minDistance = 1; // Closer
  window.debugControls.maxDistance = 100; // Farther
  ```

---

## ✅ Expected Behavior Summary

| Action | Result | Console Output |
|--------|--------|----------------|
| **Left-click (quick)** | Select cell | `[CLICK] 🎯 3D cell clicked` |
| **Left-drag** | Rotate board | `[CONTROLS] 🎮 User interaction` |
| **Scroll wheel** | Zoom in/out | `[CONTROLS] Change event` |
| **Right-drag** | Pan camera | `[CONTROLS] Change event` |
| **Press 'C'** | Toggle clicks | `[KEYBOARD] 🔘 Click detection` |
| **Camera preset button** | Jump to view | `[CAMERA] View: front` |

---

## 📊 Common Console Patterns

### **Healthy Session:**
```
[INIT] ========== init3DBoard START ==========
[INIT] ✓ Container found
[INIT] ✓ Scene created
[INIT] ✓ Camera created at (7.5, 6, 7.5)
[INIT] ✓ Renderer created (800x600)
[INIT] ✓ OrbitControls initialized
[INIT] ✓ Keyboard shortcuts enabled
[CONTROLS] 🎮 User interaction started
[CONTROLS] Change event #1
[CONTROLS] 🎮 User interaction ended
[POINTER] Click detected (dx=2, dy=1, time=150ms)
[CLICK] 🎯 3D cell clicked: (2, 2, 2)
```

### **Problem Session (Controls Not Working):**
```
[INIT] ✓ Renderer created
[INIT] OrbitControls not available in global THREE build  ← PROBLEM!
```
**Fix:** Check `App.razor` has OrbitControls script tag

---

## 🎯 Final Verification Checklist

- [ ] Console shows `[INIT] ✓ OrbitControls initialized`
- [ ] `window.debugControls` exists in console
- [ ] Left-drag rotates board
- [ ] Scroll wheel zooms
- [ ] Right-drag pans
- [ ] Quick clicks select cells
- [ ] Long drags don't select cells
- [ ] Pressing 'C' toggles click detection
- [ ] No JavaScript errors in console
