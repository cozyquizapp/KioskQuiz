# 🧪 Accessibility Testing Quick Guide

## Screen Reader Setup

### Windows (NVDA - Free)
1. Download: https://www.nvaccess.org/download/
2. Install and run
3. Press `Ctrl + Alt + N` to start
4. Use `Insert` key for NVDA commands

### macOS (VoiceOver - Built-in)
1. System Preferences → Accessibility → VoiceOver
2. Check "Enable VoiceOver"
3. Use `Cmd + F5` to toggle or `Cmd + Fn + F5`
4. Training available: `Cmd + F7`

### Chrome DevTools Accessibility Inspector
1. Open DevTools (F12)
2. Tab: "Accessibility"
3. Right-click element → "Inspect accessibility properties"
4. Check: Name, Role, Value

---

## Test Scenarios

### Scenario 1: Join Team (Without Mouse/Trackpad)
**Start:** TeamView join screen  
**Goal:** Join a team using only keyboard

**Steps:**
1. Tab to team name field → Focus visible? ✓
2. Type team name (max 24 chars) → Field accepts? ✓
3. Press Tab → Focus moves to avatar carousel
4. Press Enter on avatar → Selects? ✓ OR
   - Use arrow keys? (if implemented)
5. Press Tab → Focus to "Join" button
6. Press Enter → Team joins? ✓

**Screen Reader Announcements to Expect:**
- "Team name input, edit text"
- "Team fortsetzen button, disabled" (if incomplete)
- "Join button, join quiz with team name and avatar"

**Accessibility Violations to Flag:**
- ❌ No focus outline visible
- ❌ Field labeled but no aria-label
- ❌ Keyboard cannot select avatar
- ❌ Enter key doesn't work
- ❌ Screen reader doesn't announce button purpose

---

### Scenario 2: Submit Answer
**Start:** Question answering phase  
**Goal:** Answer question and submit using screen reader

**Steps:**
1. Screen reader reads question text
2. Tab through answer choices → Each choice announced
3. Enter/Space to select answer
4. Tab to Submit button
5. Screen reader announces: "Submit your answer, button, {timer} seconds remaining"
6. Press Enter → Answer submitted

**Expected Announcements:**
- Question category
- Multiple choice options (A, B, C)
- Timer countdown: "30 seconds", "15 seconds", "5 seconds"
- Submit button state change when answer submitted

**Accessibility Violations to Flag:**
- ❌ Question not announced
- ❌ Answer options not clearly labeled
- ❌ Timer announced only once (not updated)
- ❌ No feedback when answer submitted
- ❌ Submit button tooltip missing

---

### Scenario 3: ESC Key Navigation
**Goal:** Verify ESC key to leave team works

**Steps:**
1. Any game state (e.g., answering question)
2. Press Escape key
3. Should return to join screen
4. Screen reader announces: join screen content

**Expected Result:**
- ✓ Returns to join screen
- ✓ All state reset
- ✓ Team name cleared (or resume option shown)

---

### Scenario 4: Tab Order Navigation
**Goal:** Verify Tab key navigates all controls

**Path on Join Screen:**
```
Tab 1: Team Name Input
  ↓ (Tab)
Tab 2: Avatar Selection Button
  ↓ (Tab)
Tab 3: Avatar Random Button (🎲)
  ↓ (Tab)
Tab 4: Join Button
  ↓ (Tab)
Tab 5: Resume Team Button (if saved)
  ↓ (Tab)
Tab 6: Start New Team Button (if saved)
  ↓ (Tab)
Tab 1: Loop back to Team Name Input
```

**Expected Behavior:**
- ✓ Focus outline visible on each element
- ✓ Tab order is logical (left→right, top→bottom)
- ✓ No elements skipped or trapped
- ✓ Shift+Tab goes backward

---

## ARIA Test Commands

### NVDA Commands
```
Insert + F7  → Open Elements List (see headings, links, buttons)
Insert + T   → Read page title
Insert + B   → Announce current button
Insert + E   → Read edit field name
Insert + U   → List unvisited links
↓ Arrow      → Read next line
Ctrl + ↑     → Jump to form field
```

### VoiceOver Commands (Mac)
```
VO + U       → Open Rotor (lists headings, links, form fields)
VO + Right   → Next element
VO + Left    → Previous element
VO + Space   → Interact/Click
VO + ↓       → Read next line
```

### Chrome DevTools
```
F12 → Accessibility Tab → Right-click element → "Inspect accessibility"
→ Check "Name", "Role", "Value"
→ Check for warnings/violations
```

---

## Automated Testing Tools

### axe DevTools (Chrome Extension)
1. Install: https://www.deque.com/axe/devtools/
2. Open DevTools → axe DevTools tab
3. "Scan ALL of my page"
4. Review violations (red) and needs review (yellow)

### WebAIM Wave
1. Open: https://wave.webaim.org/
2. Enter site URL
3. Review: Errors, Contrast, Missing labels, Missing alt text

### Lighthouse (Built-in)
1. DevTools → Lighthouse
2. Check "Accessibility"
3. Run audit → See score + violations

---

## Contrast Checker

### WebAIM Contrast Checker
https://webaim.org/resources/contrastchecker/

**Test these colors:**
- Text on background
- Button text on button bg
- Focus outline on any background

**Required Ratios:**
- Normal text: 4.5:1 (AA), 7:1 (AAA)
- Large text: 3:1 (AA), 4.5:1 (AAA)

---

## Common Issues to Check

### 🔴 Missing Labels
```jsx
❌ <input type="text" />           // No label
❌ <button>Click me</button>       // No aria-label (if text not clear)

✅ <input aria-label="Search" />
✅ <label htmlFor="search">Search</label>
✅ <button aria-label="Close dialog">×</button>
```

### 🔴 No Focus Visible
```css
❌ button:focus { outline: none; }     // Removes focus outline

✅ button:focus-visible {
     outline: 2px solid #0066cc;
     outline-offset: 2px;
   }
```

### 🔴 Color-Only Information
```jsx
❌ <p style={{color: 'red'}}>Error</p>    // Only color indicates error

✅ <p style={{color: 'red'}}>❌ Error: Field required</p>
✅ <p role="alert">Error: Field required</p>
```

### 🔴 No Live Regions
```jsx
❌ Timer countdown updated but not announced
❌ Score updated but no announcement

✅ <div aria-live="polite" aria-atomic="true">
     Time: {timeRemaining}s
   </div>
```

---

## Validation Checklist

### Before Deployment
- [ ] All interactive elements have keyboard access
- [ ] All buttons/links have aria-label or visible text
- [ ] All form inputs have labels (visible or aria-label)
- [ ] Color contrast ≥ 4.5:1 for normal text
- [ ] Focus outline always visible
- [ ] No keyboard traps
- [ ] Screen reader announces state changes
- [ ] Axe DevTools shows 0 violations
- [ ] Lighthouse accessibility score ≥ 90

### Phase 1 Status (Current)
- ✅ Keyboard navigation (Tab, Enter, ESC)
- ✅ ARIA labels on all buttons
- ✅ ARIA labels on all form inputs
- ✅ Alt text on avatar images
- ✅ Hidden hints for descriptive text
- 🔄 Live regions (Timer, score updates) - TODO Phase 2
- 🔄 Accessible table markup - TODO Phase 2
- 🔄 prefers-reduced-motion - TODO Phase 2

---

## Resources

- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- MDN ARIA: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA
- WebAIM: https://webaim.org/
- Deque: https://www.deque.com/
- A11y Project: https://www.a11yproject.com/

---

## Team Notes

For QA:
1. Test with both NVDA and Chrome DevTools
2. Use keyboard only (no mouse)
3. Report any missing aria-labels or focus issues
4. Check focus outline is always visible

For Developers:
1. aria-label = for screen readers only (no visual text)
2. aria-describedby = links to ID of description text
3. aria-live="polite" = announce changes without interrupting
4. role="alert" = announce immediately and assertively
