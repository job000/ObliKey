# 📱 iOS SIMULATOR TEST PLAN - PT-ØKT

## ✅ iOS Setup Status

**COMPLETED:**
- ✅ iPhone 16 Pro simulator booted (UDID: 01E43721-08D4-4D53-AA2A-C43E8EDDB439)
- ✅ Expo Go installed on simulator
- ✅ App bundled and running (1070 modules loaded)
- ✅ Backend API accessible via ngrok: `https://unstubborn-rina-unaesthetically.ngrok-free.dev/api`

**Current Status:**
```
📱 Device: iPhone 16 Pro Simulator
🔧 Status: Booted and Running
📦 App: Expo Go with ObliKey app loaded
🌐 API: Connected via ngrok tunnel
```

---

## 🧪 iOS TESTING CHECKLIST

### Test 1: App Launch and Login
**Importance:** Critical - Without login, nothing else works

1. **Check that app has launched:**
   - ✅ Look at simulator screen
   - ✅ You should see login screen

2. **Login:**
   - Email: `testadmin@oblikey.no`
   - Password: `Admin123`
   - ✅ Tap "Logg inn" button
   - ✅ Should navigate to dashboard

**Expected Console Logs:**
```
[API] Using ngrok URL for mobile
[API] Using API URL: https://unstubborn-rina-unaesthetically.ngrok-free.dev/api
```

**Troubleshooting:**
- If login fails, check that ngrok tunnel is active
- If "network error", backend might not be running

---

### Test 2: Navigate to PT-administrasjon
**Importance:** Critical - This is where we test the dropdowns

1. **From dashboard:**
   - ✅ Tap hamburger menu (three lines) or navigate to PT-administrasjon
   - ✅ Screen should show list of PT sessions

2. **Visual Check:**
   - ✅ Should see existing PT sessions (if any)
   - ✅ Should see "+" button in header (top right)

**Expected Behavior:**
- Clean navigation animation
- List renders without errors
- No console errors

---

### Test 3: Open "Ny PT-økt" Modal (CRITICAL)
**Importance:** HIGH - This is the main functionality we fixed

1. **Tap the "+" button** in top right corner
2. **Modal should slide up from bottom**
3. **Check all fields are visible:**
   - ✅ Tittel (text input)
   - ✅ Beskrivelse (text area)
   - ✅ Velg PT (dropdown button)
   - ✅ Velg kunde (dropdown button)
   - ✅ Starttid (datetime picker)
   - ✅ Sluttid (datetime picker)
   - ✅ Avbryt button (bottom left)
   - ✅ Opprett button (bottom right)

**Console Logs to Look For:**
```
[PTManagement] Loading trainers and customers...
[PTManagement] Trainers loaded: 11
[PTManagement] Customers loaded: 22
```

**If fields are missing:**
- This was the earlier bug (modalContent height issue)
- Should be fixed now with `height: '100%'`

---

### Test 4: Test PT Dropdown (THE CRITICAL TEST! 🎯)
**Importance:** CRITICAL - This is what we specifically fixed

1. **Tap on "Velg PT" button**
2. **EXPECTED: A new modal slides up from bottom**
   - ✅ Modal has search bar at top
   - ✅ List of 11 trainers shows below
   - ✅ Each trainer has:
     - Circular avatar (with initials)
     - Full name
     - Email address
   - ✅ Close button (X) in top right

3. **Test Search:**
   - ✅ Type "Super" in search field
   - ✅ List should filter to show only matching trainers
   - ✅ Clear search (tap X in search field)
   - ✅ All 11 trainers should show again

4. **Select a Trainer:**
   - ✅ Tap on any trainer in the list
   - ✅ Dropdown modal should close
   - ✅ Main form should now show selected trainer with avatar and name

**Console Logs to Look For:**
```
[PTManagement] Opening trainer dropdown. Trainers: 11
```

**🚨 IF DROPDOWN DOESN'T OPEN:**
This means the modal nesting fix didn't work. The modal structure is:
- Main modal (new session form) is inside SafeAreaView
- Dropdown modals are SIBLINGS to SafeAreaView (not children)
- This is the critical fix we implemented

**Possible Issues:**
- Modal is still nested inside ScrollView ❌
- Modal styles are conflicting ❌
- State variable not updating ❌

---

### Test 5: Test Customer Dropdown (CRITICAL TEST! 🎯)
**Importance:** CRITICAL - Same fix as PT dropdown

1. **Tap on "Velg kunde" button**
2. **EXPECTED: A new modal slides up from bottom**
   - ✅ Modal has search bar at top
   - ✅ List of 22 customers shows below
   - ✅ Each customer has:
     - Circular avatar (with initials)
     - Full name
     - Email address
   - ✅ Close button (X) in top right

3. **Test Search:**
   - ✅ Type "Andreas" in search field
   - ✅ List should filter to show matching customers
   - ✅ Clear search
   - ✅ All 22 customers should show

4. **Select a Customer:**
   - ✅ Tap on any customer in the list
   - ✅ Dropdown modal should close
   - ✅ Main form should show selected customer

**Console Logs to Look For:**
```
[PTManagement] Opening customer dropdown. Customers: 22
```

---

### Test 6: Create New PT Session on iOS
**Importance:** HIGH - End-to-end functionality test

1. **With modal still open:**
   - ✅ Fill in Tittel: "iOS Test Session"
   - ✅ Fill in Beskrivelse: "Testing på iPhone simulator"
   - ✅ Select a PT (using dropdown)
   - ✅ Select a kunde (using dropdown)
   - ✅ Set start time (tomorrow at 10:00)
   - ✅ Set end time (tomorrow at 11:00)

2. **Tap "Opprett" button**
3. **EXPECTED:**
   - ✅ Loading indicator shows briefly
   - ✅ Success message appears
   - ✅ Modal closes
   - ✅ New session appears in list
   - ✅ Session card shows:
     - Title: "iOS Test Session"
     - Trainer name
     - Customer name
     - Date and time
     - Status badge

**Console Logs:**
```
[PTManagement] Creating session...
[PTManagement] Session created successfully
```

**API Call:**
```
POST https://unstubborn-rina-unaesthetically.ngrok-free.dev/api/pt/sessions
Response: 200 OK
```

---

### Test 7: Edit Existing PT Session on iOS
**Importance:** HIGH - Tests the same dropdowns in edit mode

1. **Find the newly created session in list**
2. **Tap the pencil icon (Oppdater button)**
3. **Modal opens with pre-filled data:**
   - ✅ Title shows "iOS Test Session"
   - ✅ PT is pre-selected (shows name and avatar)
   - ✅ Customer is pre-selected
   - ✅ Times are pre-filled

4. **Test Changing PT:**
   - ✅ Tap on PT field (should show current selection)
   - ✅ Dropdown opens
   - ✅ Current PT has checkmark (✓)
   - ✅ Select a different PT
   - ✅ Modal closes, new PT shown

5. **Test Changing Customer:**
   - ✅ Tap on Customer field
   - ✅ Dropdown opens
   - ✅ Current customer has checkmark
   - ✅ Select a different customer
   - ✅ Modal closes, new customer shown

6. **Update the session:**
   - ✅ Change title to "UPDATED iOS Test"
   - ✅ Tap "Oppdater" button
   - ✅ Success message
   - ✅ List updates with new data

**Console Logs:**
```
[PTManagement] Loading session for edit
[PTManagement] Opening trainer dropdown. Current: [trainer name]
[PTManagement] Updating session...
```

---

### Test 8: Modal Animations and UX (iOS Specific)
**Importance:** MEDIUM - iOS has different animation behavior

1. **Test Modal Slide Animation:**
   - ✅ Modals should slide up smoothly from bottom
   - ✅ Background should dim (semi-transparent black overlay)
   - ✅ Tapping outside modal should NOT close it (iOS behavior)
   - ✅ Swipe down gesture should close modal

2. **Test Keyboard Behavior:**
   - ✅ When tapping text input, keyboard slides up
   - ✅ Modal content should scroll to show focused field
   - ✅ KeyboardAvoidingView should work properly
   - ✅ Tapping outside keyboard dismisses it

3. **Test Nested Modal Behavior:**
   - ✅ Open main modal (Ny PT-økt)
   - ✅ Open PT dropdown (nested modal)
   - ✅ Both modals should be visible
   - ✅ Dropdown should be on top
   - ✅ Closing dropdown should show main modal again

---

### Test 9: Search Performance on iOS
**Importance:** MEDIUM - Mobile devices have different performance

1. **Open PT dropdown**
2. **Type quickly in search field:**
   - ✅ Search should be responsive (no lag)
   - ✅ Results filter in real-time
   - ✅ No visual stuttering
   - ✅ Keyboard remains smooth

3. **Test with long list (Customer dropdown with 22 items):**
   - ✅ Scrolling should be smooth (60fps)
   - ✅ No dropped frames
   - ✅ FlatList optimization working

---

### Test 10: Error Scenarios on iOS
**Importance:** HIGH - Mobile apps often have connectivity issues

1. **Test with network delay:**
   - ✅ Create session
   - ✅ Loading indicator shows
   - ✅ Timeout handled gracefully (if any)

2. **Test validation:**
   - ✅ Try to create session without PT → Should show error
   - ✅ Try to create session without customer → Should show error
   - ✅ Try to create session with end time before start → Should show error

---

## 🐛 Common iOS-Specific Issues to Check

### Issue 1: Modals Not Opening on iOS
**Symptoms:**
- Tapping "Velg PT" or "Velg kunde" does nothing
- No animation, no new modal appears

**Debugging:**
1. Check simulator console for errors
2. Verify `showTrainerDropdown` state changes:
   ```
   [PTManagement] Opening trainer dropdown. Trainers: 11
   ```
3. If no log appears, button onPress not firing
4. If log appears but modal doesn't open, modal positioning issue

**Fix:**
- Modals MUST be siblings to SafeAreaView
- Check PTManagementScreen.tsx lines 972-1131
- Modals should be AFTER `</SafeAreaView>` closing tag

### Issue 2: Modals Open But Are Empty
**Symptoms:**
- Modal appears with background dim
- But no content visible inside modal

**Possible Causes:**
- FlatList data is empty (backend not returning data)
- Modal content styles are wrong (height: 0, opacity: 0)
- Z-index issues on iOS

**Debugging:**
1. Check that trainers/customers loaded:
   ```
   [PTManagement] Trainers loaded: 11
   [PTManagement] Customers loaded: 22
   ```
2. Check modal content styles in PTManagementScreen.tsx
3. Verify FlatList has data prop set

### Issue 3: Keyboard Covering Input Fields
**Symptoms:**
- Keyboard slides up and covers the input field
- Can't see what you're typing

**Fix:**
- Verify KeyboardAvoidingView is configured:
  ```tsx
  <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
  ```

### Issue 4: Search Not Working
**Symptoms:**
- Typing in search field doesn't filter list

**Debugging:**
1. Check if `trainerSearch` state is updating
2. Verify `filterTrainers()` function logic
3. Check FlatList data prop uses filtered data

---

## 📊 Success Criteria

### Minimum Requirements (Must Pass):
- ✅ App launches and login works
- ✅ Can navigate to PT-administrasjon
- ✅ Can open "Ny PT-økt" modal
- ✅ Can open PT dropdown and see 11 trainers
- ✅ Can open customer dropdown and see 22 customers
- ✅ Can select PT and customer from dropdowns
- ✅ Can create new PT session
- ✅ Can edit existing PT session

### Nice to Have:
- ✅ Search works smoothly
- ✅ Animations are smooth (60fps)
- ✅ Keyboard behavior is good
- ✅ Error messages are clear

---

## 🚀 Next Steps After iOS Testing

1. **If all tests pass:**
   - ✅ Test on physical iPhone device
   - ✅ Test on different iOS versions
   - ✅ Test on iPad (if supported)

2. **If tests fail:**
   - 📝 Document which test failed
   - 🔍 Check console logs
   - 🐛 Debug with React Native Debugger
   - 💬 Report back with specific error

---

## 📱 Simulator Controls

**Useful Shortcuts:**
- `Cmd + Shift + H` - Go to home screen
- `Cmd + K` - Toggle keyboard
- `Cmd + Shift + K` - Toggle keyboard
- `Cmd + R` - Reload app
- `Cmd + D` - Open developer menu

**Developer Menu Options:**
- Reload
- Debug Remote JS (for Chrome DevTools)
- Enable Fast Refresh
- Show Inspector
- Show Performance Monitor

---

## 💡 Testing Tips

1. **Use Expo logs:**
   - All logs appear in terminal where you ran `npx expo start --ios`
   - Look for `[PTManagement]` prefixed logs

2. **Test incrementally:**
   - Don't test everything at once
   - Test one dropdown at a time
   - Verify each step works before moving on

3. **Take notes:**
   - If something doesn't work, note exactly what happened
   - Screenshot if helpful (Cmd + S in simulator)

4. **Fresh reload:**
   - If something seems broken, try reloading app (Cmd + R)
   - Sometimes cache needs clearing

---

## ✅ Current Status

```
📱 DEVICE: iPhone 16 Pro Simulator (Booted)
📦 APP: Running on Expo Go
🌐 API: Connected via ngrok tunnel
🔧 BACKEND: Verified working (all endpoints tested)
💾 DATA: 11 trainers, 22 customers available
🎯 READY: All components in place, ready for testing
```

**You can now test the app in the simulator! 🚀**

Start with Test 1 (Login) and work through the checklist.
