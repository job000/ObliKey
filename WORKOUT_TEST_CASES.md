# WorkoutScreen Test Cases - Detailed Scenarios

**Document Version:** 1.0
**Created:** November 2, 2025

---

## Quick Reference: Test Case Template

```
TEST CASE: [ID] - [TITLE]
CATEGORY: [Button | DataFlow | UI | EdgeCase | Integration]
PRIORITY: [P0 | P1 | P2]
PRECONDITIONS: [What must be true before test]
STEPS:
  1. [Step 1]
  2. [Step 2]
  ...
EXPECTED: [Expected result]
ACTUAL: [To be filled during testing]
STATUS: [Pass | Fail | Blocked]
NOTES: [Any observations]
```

---

## Category: Button Tests

### TC-B1: "Opprett Program" Button Display and Click

**CATEGORY:** Button
**PRIORITY:** P0
**PRECONDITIONS:**
- User is logged in
- User is on WorkoutScreen, Programs tab
- User has no programs created (optional for cleaner test)

**STEPS:**
1. Navigate to WorkoutScreen
2. Tap on "Programs" tab (if not already there)
3. Look for "Opprett Program" button in header
4. Verify button is visible and tappable
5. Tap the button

**EXPECTED:**
- Button is visible and styled correctly
- No console errors
- Modal with title "Opprett Program" opens
- Modal contains:
  - Text input for program name
  - Text input for description
  - Button to add exercises
  - Button to select schedule days
  - "Lagre" button (disabled if no name)
  - "Avbryt" button

**ACCEPTANCE CRITERIA:**
- [ ] Button visible in header
- [ ] Button tappable without errors
- [ ] Modal opens with all fields
- [ ] Modal can be closed with "Avbryt"
- [ ] Button state updates correctly

---

### TC-B2: Create Program with Name and Description

**CATEGORY:** Button
**PRIORITY:** P0
**PRECONDITIONS:**
- "Opprett Program" modal is open
- Program name input is focused

**STEPS:**
1. Type "My First Push Workout" in program name field
2. Tap in description field
3. Type "This is my first push day workout targeting chest, shoulders, and triceps"
4. Verify text is entered correctly
5. Check character count (if displayed)

**EXPECTED:**
- Program name field shows "My First Push Workout"
- Description field shows full description
- Both fields are editable
- Character count (if shown) is accurate
- Text can be cleared and re-entered

**ACCEPTANCE CRITERIA:**
- [ ] Name input accepts text
- [ ] Description input accepts text (multiline)
- [ ] Text persists when switching between fields
- [ ] Clear functionality works
- [ ] No character encoding issues

---

### TC-B3: "Mal" (Template) Button and List Display

**CATEGORY:** Button
**PRIORITY:** P1
**PRECONDITIONS:**
- User is on Programs tab
- WorkoutScreen is loaded
- No modal is currently open

**STEPS:**
1. Look for "Mal" button in header
2. Verify button is visible
3. Tap "Mal" button
4. Wait for modal to load
5. Observe template list

**EXPECTED:**
- "Mal" button visible next to "Opprett Program"
- Modal opens with title "Velg Mal" or "Maler"
- Modal shows list of templates:
  - Push Day (Bryst, Skuldre, Triceps)
  - Pull Day (Rygg, Biceps)
  - Leg Day (Ben)
  - Upper Body (Overkropp)
- Each template shows:
  - Name
  - Description (first 100 chars)
  - Exercise count
  - Difficulty level
  - Duration estimate
- Personal templates appear first (with "Min mal" label)
- Scroll bar appears if more templates than screen height

**ACCEPTANCE CRITERIA:**
- [ ] Modal opens without errors
- [ ] All 4 system templates display
- [ ] Template metadata is accurate
- [ ] Personal templates appear first
- [ ] Modal can be scrolled
- [ ] Modal can be closed

---

### TC-B4: Select Template and Pre-populate Form

**CATEGORY:** Button
**PRIORITY:** P1
**PRECONDITIONS:**
- Template list modal is open
- At least one template is visible
- "Opprett Program" modal is not open

**STEPS:**
1. Tap on "Push Day" template card
2. Wait for modal to close
3. Observe new program form that appears
4. Check program name field
5. Check exercises section
6. Verify exercises have sets/reps

**EXPECTED:**
- Template modal closes
- New program modal opens
- Program name pre-filled: "Push Day (Bryst, Skuldre, Triceps)"
- Description pre-filled with template description
- 6 exercises pre-loaded:
  1. Barbell Bench Press - 4 sets (12, 10, 8, 6 reps)
  2. Incline Barbell Bench Press - 4 sets (10, 10, 8, 8 reps)
  3. Dumbbell Flyes - 3 sets (12, 12, 10 reps)
  4. Overhead Press - 4 sets (10, 8, 8, 6 reps)
  5. Lateral Raise - 3 sets (15, 12, 10 reps)
  6. Tricep Pushdown - 3 sets (12, 12, 10 reps)
- Each exercise shows set count and rep ranges

**ACCEPTANCE CRITERIA:**
- [ ] Template selection closes modal
- [ ] New program form opens automatically
- [ ] Program name matches template
- [ ] All exercises loaded with correct sets
- [ ] User can edit before saving

---

### TC-B5: "Legg til øvelse" Button and Exercise Selection

**CATEGORY:** Button
**PRIORITY:** P0
**PRECONDITIONS:**
- Program creation/edit modal is open
- "Legg til øvelse" button is visible

**STEPS:**
1. Look for "Legg til øvelse" button
2. Verify button is visible and enabled
3. Tap the button
4. Wait for exercise selector modal to load
5. Observe exercise list

**EXPECTED:**
- Button is visible below exercise list
- Modal opens with exercise library
- Modal shows:
  - Search bar at top
  - Muscle group filter tabs (All, Chest, Back, Shoulders, etc.)
  - List of available exercises
  - Exercise cards with:
    - Exercise image (if available)
    - Exercise name
    - Type badge (Strength, Cardio, etc.)
    - Equipment tags
- Search bar is focused by default
- Exercises list is scrollable
- Can close modal with back/X button

**ACCEPTANCE CRITERIA:**
- [ ] Modal opens without errors
- [ ] Exercise list loads and displays
- [ ] Search functionality works
- [ ] Filter tabs work
- [ ] Modal closes properly

---

### TC-B6: Add Exercise to Program

**CATEGORY:** Button
**PRIORITY:** P0
**PRECONDITIONS:**
- Exercise selector modal is open
- Exercise list is visible
- "Barbell Bench Press" is visible in list

**STEPS:**
1. Scroll to find "Barbell Bench Press" (or search for it)
2. Tap on exercise name or card
3. Wait for modal to close
4. Check exercises section of program form

**EXPECTED:**
- Tapping exercise adds it to program
- Modal closes automatically
- Exercise appears in program exercise list
- Exercise shows:
  - Name: "Barbell Bench Press"
  - Default sets: 3
  - Default reps: 10 (or as configured)
  - Remove button (X or trash icon)
  - Edit option (if available)
- "Legg til øvelse" button still available to add more

**ACCEPTANCE CRITERIA:**
- [ ] Exercise added to list
- [ ] Exercise data displayed correctly
- [ ] Can add multiple exercises
- [ ] Exercise order preserved

---

### TC-B7: "Legg til sett" (Add Set) Button

**CATEGORY:** Button
**PRIORITY:** P0
**PRECONDITIONS:**
- Active workout is in progress (or create workout from program)
- Exercise with sets is displayed
- "Legg til sett" button is visible

**STEPS:**
1. Start workout from any program
2. Exercise displays with 3 default sets
3. Locate "Legg til sett" button
4. Verify button is visible below sets
5. Tap button
6. Observe sets list update

**EXPECTED:**
- Fourth set appears below third set
- New set shows:
  - Set number: 4
  - Reps field: empty or inherited from last set
  - Weight field: empty or inherited from last set
  - Completed checkbox: unchecked
  - Delete/remove option
- Set numbering is sequential (1, 2, 3, 4)
- Can continue adding sets (5, 6, 7, etc.)

**ACCEPTANCE CRITERIA:**
- [ ] Set is added to list
- [ ] Set number increments correctly
- [ ] Default values inherited from last set
- [ ] Multiple sets can be added
- [ ] Sets can be completed independently

---

### TC-B8: Remove Set (X Button)

**CATEGORY:** Button
**PRIORITY:** P1
**PRECONDITIONS:**
- Active workout with exercise showing multiple sets
- Exercise has at least 2 sets
- Set has a delete/remove button visible

**STEPS:**
1. Exercise displays 4 sets (from previous test)
2. Find X button on third set
3. Tap X button on third set
4. Observe sets update

**EXPECTED:**
- Third set is removed
- Remaining sets renumbered:
  - Set 1: unchanged
  - Set 2: unchanged
  - Set 3: (was previously set 4)
- Fourth set no longer exists
- Data from deleted set is lost
- Can still add more sets

**ACCEPTANCE CRITERIA:**
- [ ] Set is deleted
- [ ] Set numbers resequence
- [ ] Other sets unaffected
- [ ] Can continue workout

---

### TC-B9: "Lagre som mal" (Save as Template) Button

**CATEGORY:** Button
**PRIORITY:** P1
**PRECONDITIONS:**
- Program exists and is displayed (edit mode or card view)
- Program has at least one exercise
- "Lagre som mal" button is accessible

**STEPS:**
1. Navigate to Programs tab
2. Find a program card for existing program
3. Tap menu/options button (three dots)
4. Look for "Lagre som mal" option
5. Tap "Lagre som mal"
6. Wait for response

**EXPECTED:**
- Success alert shown: "Program lagret som mal"
- Program remains in list (not deleted)
- Program now marked as template (badge appears)
- Template becomes available in "Mal" selector
- User can press OK to dismiss alert

**ACCEPTANCE CRITERIA:**
- [ ] Option is visible in menu
- [ ] Success message shown
- [ ] Program still exists
- [ ] Template badge appears
- [ ] Available in future program creation

---

### TC-B10: "Lagre" (Save) Button - New Program

**CATEGORY:** Button
**PRIORITY:** P0
**PRECONDITIONS:**
- Program creation modal is open
- Program name is filled: "My Push Workout"
- At least 2 exercises are added
- Schedule days are selected

**STEPS:**
1. Verify all fields filled
2. Look for "Lagre" button
3. Verify button is enabled (not grayed out)
4. Tap "Lagre" button
5. Wait for save operation
6. Observe result

**EXPECTED:**
- Save button changes to loading state (spinner)
- Network request sent: POST /workouts/programs
- After ~2-3 seconds:
  - Modal closes
  - Success alert shown (optional)
  - Program appears in list
  - New program has all data:
    - Name: "My Push Workout"
    - 2+ exercises
    - Schedule days visible
    - _count.sessions = 0 (new program)

**ACCEPTANCE CRITERIA:**
- [ ] Save button enabled
- [ ] Loading state shown
- [ ] Program created
- [ ] Program appears in list
- [ ] All data preserved
- [ ] No console errors

---

### TC-B11: "Slett Program" (Delete Program) Button

**CATEGORY:** Button
**PRIORITY:** P1
**PRECONDITIONS:**
- Program exists and is displayed on card
- "Lagre som mal" test completed (we have created programs)

**STEPS:**
1. Navigate to Programs tab
2. Find test program to delete
3. Tap menu/options button (three dots)
4. Look for "Slett Program" option
5. Tap "Slett Program"
6. Observe confirmation dialog

**EXPECTED:**
- Confirmation dialog appears:
  - Title: "Slett Program?"
  - Message: "Er du sikker på at du vil slette 'Program Name'? Dette kan ikke angres."
  - Cancel button: "Avbryt" (gray style)
  - Delete button: "Slett" (red/destructive style)
- If "Avbryt" tapped: dialog closes, program remains
- If "Slett" tapped:
  - Dialog closes
  - Loading state shown briefly
  - Program removed from list
  - Success message shown (optional)
  - Network request sent: DELETE /workouts/programs/:id

**ACCEPTANCE CRITERIA:**
- [ ] Delete option visible in menu
- [ ] Confirmation dialog shown
- [ ] Cancel works (program preserved)
- [ ] Delete works (program removed)
- [ ] Success feedback provided
- [ ] No orphaned data

---

## Category: Data Flow Tests

### TC-D1: GET /workouts/programs - Load All Programs

**CATEGORY:** DataFlow
**PRIORITY:** P0
**PRECONDITIONS:**
- User is logged in
- User has created at least 2 programs
- No network issues

**STEPS:**
1. Navigate to Programs tab
2. Wait for programs list to load
3. Open browser/network inspector
4. Observe network requests
5. Check response payload

**EXPECTED:**
- GET request to: `/workouts/programs`
- Request headers include:
  - Authorization: Bearer [token]
  - x-tenant-id: [tenant-id]
- Response status: 200 OK
- Response body:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "prog_xyz",
        "name": "Push Day",
        "description": "...",
        "userId": "user_123",
        "tenantId": "tenant_001",
        "exercises": [
          {
            "id": "progex_001",
            "customExerciseId": "custex_001",
            "sets": 4,
            "reps": "10",
            "weight": 100,
            "customExercise": {
              "id": "custex_001",
              "name": "Barbell Bench Press"
            }
          }
        ],
        "schedules": [],
        "_count": {
          "exercises": 6,
          "sessions": 2
        }
      }
    ]
  }
  ```
- Programs displayed in list
- No missing data errors

**ACCEPTANCE CRITERIA:**
- [ ] Request sent with correct URL
- [ ] Authentication headers present
- [ ] Response is valid JSON
- [ ] All programs returned
- [ ] Exercise data included
- [ ] Count data included
- [ ] Only user's programs shown

---

### TC-D2: GET /workouts/programs/templates - Load Templates

**CATEGORY:** DataFlow
**PRIORITY:** P1
**PRECONDITIONS:**
- User is logged in
- "Mal" button will be tapped
- Network is available

**STEPS:**
1. On Programs tab, tap "Mal" button
2. Wait for modal to load
3. Monitor network tab
4. Observe request and response

**EXPECTED:**
- GET request to: `/workouts/programs/templates`
- Response status: 200 OK
- Response includes:
  - 4 system templates (Push, Pull, Legs, Upper)
  - Personal templates (if any)
  - Personal templates first in array
  - Each template has exercises array with full config:
    ```json
    {
      "id": "template-push",
      "name": "Push Day (Bryst, Skuldre, Triceps)",
      "description": "...",
      "category": "Muskelbygging",
      "difficulty": "Intermediate",
      "duration": "60-75 min",
      "exercises": [
        {
          "exerciseId": "sys_001",
          "name": "Barbell Bench Press",
          "sets": [
            { "setNumber": 1, "reps": 12, "weight": null },
            { "setNumber": 2, "reps": 10, "weight": null },
            { "setNumber": 3, "reps": 8, "weight": null },
            { "setNumber": 4, "reps": 6, "weight": null }
          ],
          "weightUnit": "kg",
          "restTime": 120
        }
      ]
    }
    ```
- Modal displays all templates

**ACCEPTANCE CRITERIA:**
- [ ] Request sent correctly
- [ ] Response includes all templates
- [ ] Template structure is correct
- [ ] Exercise data is complete
- [ ] Personal templates prioritized

---

### TC-D3: POST /workouts/programs - Create Program

**CATEGORY:** DataFlow
**PRIORITY:** P0
**PRECONDITIONS:**
- User is on Program creation modal
- Program form is filled with:
  - Name: "Test Push Day"
  - Description: "Test description"
  - 2+ exercises selected

**STEPS:**
1. Fill program form completely
2. Tap "Lagre" button
3. Monitor network tab
4. Observe request payload
5. Wait for response
6. Check response data

**EXPECTED:**
- POST request to: `/workouts/programs`
- Request body:
  ```json
  {
    "name": "Test Push Day",
    "description": "Test description",
    "exercises": [
      {
        "exerciseId": "sys_001",
        "sets": 4,
        "reps": "10",
        "weight": 100,
        "weightUnit": "kg"
      }
    ]
  }
  ```
- Response status: 200 OK (or 201 Created)
- Response includes:
  - created program with id
  - all exercises linked
  - createdAt timestamp
  - userId set to current user
  - tenantId set correctly
  - success: true

**ACCEPTANCE CRITERIA:**
- [ ] Request body is valid
- [ ] All required fields included
- [ ] Response has created program
- [ ] Program has unique ID
- [ ] Exercises are linked
- [ ] Timestamps are present

---

### TC-D4: PATCH /workouts/programs/:id - Update Program

**CATEGORY:** DataFlow
**PRIORITY:** P0
**PRECONDITIONS:**
- Program exists with id "prog_123"
- Program edit modal is open
- Program name is changed to "Updated Name"
- One exercise is removed, one is added

**STEPS:**
1. Edit program details
2. Click "Lagre" button
3. Monitor network requests
4. Observe PATCH request

**EXPECTED:**
- PATCH request to: `/workouts/programs/prog_123`
- Request body:
  ```json
  {
    "name": "Updated Name",
    "description": "...",
    "exercises": [
      {
        "customExerciseId": "custex_001",
        "sets": 4
      },
      {
        "customExerciseId": "custex_002",
        "sets": 3
      }
    ]
  }
  ```
- Old exercises deleted first
- New exercises created
- Response includes updated program
- All changes reflected

**ACCEPTANCE CRITERIA:**
- [ ] PATCH method used (not POST)
- [ ] Correct URL with program ID
- [ ] Request body has changes only
- [ ] Response includes full program
- [ ] Old exercises removed
- [ ] New exercises added
- [ ] Sort order maintained

---

### TC-D5: DELETE /workouts/programs/:id - Delete Program

**CATEGORY:** DataFlow
**PRIORITY:** P1
**PRECONDITIONS:**
- Program exists with id "prog_to_delete"
- Program is displayed
- Delete option is selected
- Confirmation given

**STEPS:**
1. Tap "Slett Program" from menu
2. Confirm deletion
3. Monitor network requests
4. Observe DELETE request

**EXPECTED:**
- DELETE request to: `/workouts/programs/prog_to_delete`
- No request body
- Response status: 200 OK
- Response body:
  ```json
  {
    "success": true,
    "message": "Program slettet"
  }
  ```
- Program removed from list
- No associated data orphaned

**ACCEPTANCE CRITERIA:**
- [ ] DELETE method used
- [ ] Correct URL
- [ ] No request body
- [ ] Response is success
- [ ] Program removed from UI
- [ ] List updates

---

### TC-D6: POST /workouts/programs/:id/save-as-template

**CATEGORY:** DataFlow
**PRIORITY:** P1
**PRECONDITIONS:**
- Program exists (saved from push day test)
- Program is in list
- Delete menu is accessible

**STEPS:**
1. Tap "Lagre som mal" from program menu
2. Observe confirmation (if any)
3. Monitor network tab
4. Check response

**EXPECTED:**
- POST request to: `/workouts/programs/prog_123/save-as-template`
- No request body needed
- Response status: 200 OK
- Response includes:
  - Updated program with isTemplate: true
  - All exercises preserved
  - Success message: "Program lagret som mal"
- Program remains in list
- Template appears in "Mal" selector next time

**ACCEPTANCE CRITERIA:**
- [ ] POST request sent
- [ ] Correct endpoint
- [ ] Response status 200
- [ ] isTemplate flag set to true
- [ ] Program still exists
- [ ] Available as template

---

## Category: UI Tests

### TC-U1: Program Card Display and Layout

**CATEGORY:** UI
**PRIORITY:** P1
**PRECONDITIONS:**
- Programs tab is open
- At least one program exists
- Program card is visible

**STEPS:**
1. Look at program card on screen
2. Verify all information is displayed
3. Check spacing and alignment
4. Verify colors and styles
5. Check text readability

**EXPECTED:**
- Card displays:
  - Program name (bold, large text)
  - Description (gray, smaller text)
  - Exercise count: "6 øvelser"
  - Session count: "5 sessions"
  - Schedule days: "Mon Wed Fri" (as chips/badges)
  - More menu button (three dots, top right)
- Card spacing:
  - 16px padding around content
  - 12px margin between elements
  - Consistent with design system
- Colors:
  - Background: white
  - Text: dark gray/black
  - Badges: light blue background, blue text
  - Days chips: colored badges (one color per day or gradient)
- Typography:
  - Title: Bold, 16-18px
  - Description: Regular, 14px
  - Metadata: Regular, 12px

**ACCEPTANCE CRITERIA:**
- [ ] All information displayed
- [ ] Proper spacing and alignment
- [ ] Colors match design system
- [ ] Text is readable
- [ ] Card is tappable
- [ ] Responsive to different screens

---

### TC-U2: Card Click Opens Edit/View Modal

**CATEGORY:** UI
**PRIORITY:** P0
**PRECONDITIONS:**
- Program card is visible
- Card is ready to tap

**STEPS:**
1. Tap program card (anywhere except menu button)
2. Wait for modal to appear
3. Observe modal contents
4. Check if form is editable

**EXPECTED:**
- Modal appears with animation
- Modal shows:
  - Program name (editable input)
  - Description (editable textarea)
  - Exercise list with each exercise showing:
    - Name
    - Set count
    - Reps
    - Weight
    - Remove button
  - "Legg til øvelse" button
  - "Lagre" button (enabled)
  - "Avbryt" button
  - Schedule editor
- Form inputs are editable immediately
- Can modify any field
- No loading state (data already loaded in card)

**ACCEPTANCE CRITERIA:**
- [ ] Modal opens on card tap
- [ ] All program data shown
- [ ] Form fields are editable
- [ ] Can add/remove exercises
- [ ] Can save changes

---

### TC-U3: Schedule Days Display on Card

**CATEGORY:** UI
**PRIORITY:** P1
**PRECONDITIONS:**
- Program card is visible
- Program has scheduled days (create one first)

**STEPS:**
1. Look at program card
2. Find schedule section
3. Count visible days
4. Check day abbreviations
5. Check colors/styles

**EXPECTED:**
- Days displayed as horizontal chips
- Shows: "Man Tir Ons Tor Fre Lør Søn" (if all selected)
- Abbreviated format (3 chars for each)
- Color-coded or styled clearly
- If multiple days: shows all or scrolls horizontally
- If no days: shows "Ikke planlagt" or similar
- Days are in correct order (Mon-Sun)
- Tapping a day opens edit schedule (optional)

**ACCEPTANCE CRITERIA:**
- [ ] Days displayed with correct abbreviations
- [ ] All scheduled days shown
- [ ] Proper color/style
- [ ] Order is correct
- [ ] Responsive to long day lists

---

### TC-U4: Template Badges Display

**CATEGORY:** UI
**PRIORITY:** P1
**PRECONDITIONS:**
- At least one program is a template (from save-as-template test)
- At least one program is not a template
- Both cards are visible

**STEPS:**
1. Look at template program card
2. Look for "Mal" badge
3. Look at non-template card
4. Verify no badge shown
5. Check badge styling

**EXPECTED:**
- Template card shows badge labeled "Mal"
- Badge positioned top-right of card
- Badge styling:
  - Background: light blue or gold
  - Text: dark blue or dark
  - Rounded corners
  - Small font (11-12px)
- Non-template cards have no badge
- Badge doesn't interfere with other content
- Badge is informational only (not interactive)

**ACCEPTANCE CRITERIA:**
- [ ] Badge visible on templates
- [ ] Badge not shown on regular programs
- [ ] Badge positioned clearly
- [ ] Badge styled appropriately
- [ ] Badge doesn't obscure info

---

### TC-U5: Text Input Fields (Name, Description)

**CATEGORY:** UI
**PRIORITY:** P0
**PRECONDITIONS:**
- Program form is open
- Input fields are visible and empty (or have content)

**STEPS:**
1. Tap program name input
2. Type text: "My Awesome Workout"
3. Verify text appears
4. Clear field (select all, delete)
5. Tap description field
6. Type multiline text
7. Verify wrapping
8. Test max length

**EXPECTED:**
- Name input:
  - Placeholder: "Programnavn" (gray)
  - Focus state: blue border
  - Error state: red border (if invalid)
  - Cursor visible
  - Keyboard appears (mobile)
  - Text input works
  - Max length ~100 characters
- Description input:
  - Placeholder: "Beskrivelse"
  - Multiline support
  - Text wraps correctly
  - Can be empty
  - Max length ~500 characters
- Both fields:
  - Show character count (optional)
  - Can be cleared completely
  - Persist after tab switch
  - No character encoding issues

**ACCEPTANCE CRITERIA:**
- [ ] Keyboard input works
- [ ] Text displays correctly
- [ ] Max length enforced
- [ ] Focus/error states visible
- [ ] Text persists
- [ ] Can clear fields

---

### TC-U6: Number Input Fields (Reps, Weight)

**CATEGORY:** UI
**PRIORITY:** P0
**PRECONDITIONS:**
- Program/workout with exercises is displayed
- Sets/reps/weight fields are visible

**STEPS:**
1. Tap reps input field
2. Type number: "12"
3. Verify only numbers appear
4. Try typing letter: "A"
5. Clear and test decimal: "12.5"
6. Test weight field similarly
7. Try negative: "-10"
8. Test zero: "0"

**EXPECTED:**
- Reps field:
  - Only numeric keyboard shows (mobile)
  - Only integers accepted (0-1, 2-100)
  - Decimal numbers rejected
  - Negative numbers rejected/cleared
  - Zero allowed (rest sets)
  - Max value ~100
  - Placeholder: "10" or empty
  - Can be empty
- Weight field:
  - Numeric keyboard with decimal point
  - Decimal numbers accepted (e.g., 12.5)
  - Negative numbers rejected
  - Zero allowed
  - Max value ~500 (kg)
  - Unit selector (kg/lb) nearby
  - Can be empty
  - Placeholder shows unit: "100 kg"
- Both fields:
  - Validation on blur (field exit)
  - Error message if invalid
  - Red border if error
  - Clear/backspace works

**ACCEPTANCE CRITERIA:**
- [ ] Numeric input only
- [ ] Decimal support for weight
- [ ] Negative numbers rejected
- [ ] Max values enforced
- [ ] Unit selector works
- [ ] Validation clear
- [ ] Error states visible

---

### TC-U7: Day Selection Chips (Toggle)

**CATEGORY:** UI
**PRIORITY:** P1
**PRECONDITIONS:**
- Program schedule section is visible
- Day selector chips are displayed
- No days currently selected

**STEPS:**
1. Look at day chips (Mon, Tue, Wed, etc.)
2. Tap "Monday" chip
3. Observe color/style change
4. Tap "Wednesday" chip
5. Verify both are now selected
6. Tap "Monday" again
7. Verify deselection
8. Select all days (7 taps or select-all option)
9. Test if scrollable (if many days)

**EXPECTED:**
- Unselected chip:
  - Light gray background
  - Dark text
  - Border or outline
- Selected chip:
  - Blue/primary color background
  - White or contrasting text
  - Checkmark (optional)
- Chip behavior:
  - Single tap toggles selection
  - Multiple days can be selected
  - All days can be selected
  - All days can be deselected
  - Selection persists until save/cancel
  - Horizontal scroll if needed
- Day abbreviations clear: Mon, Tue, Wed, Thu, Fri, Sat, Sun
- Days in correct order

**ACCEPTANCE CRITERIA:**
- [ ] Chips toggle correctly
- [ ] Selection state visible
- [ ] Multiple days selectable
- [ ] No errors on selection
- [ ] Scrolls if needed
- [ ] Order is correct

---

## Category: Edge Cases

### TC-E1: Empty Program List

**CATEGORY:** EdgeCase
**PRIORITY:** P2
**PRECONDITIONS:**
- User account with no programs created
- Programs tab is accessible

**STEPS:**
1. Navigate to Programs tab
2. Wait for list to load
3. Observe empty state

**EXPECTED:**
- No error message or crash
- Empty state message displayed:
  - Text: "Du har ingen treningsprogrammer ennå"
  - CTA: "Opprett ditt første program"
- "Opprett Program" button visible and active
- "Mal" button visible and active
- User can create program or select template
- No loading spinner (state is final)

**ACCEPTANCE CRITERIA:**
- [ ] No crash on empty state
- [ ] Empty message shown
- [ ] CTA buttons visible
- [ ] Can create program from empty state
- [ ] Can select template

---

### TC-E2: Empty Template List

**CATEGORY:** EdgeCase
**PRIORITY:** P2
**PRECONDITIONS:**
- (System templates should always exist, but test graceful handling)
- Tap "Mal" button when templates failing to load

**STEPS:**
1. Tap "Mal" button
2. Wait for modal
3. (Simulate network error if needed)
4. Observe response

**EXPECTED:**
- If templates load normally: shows 4 system templates minimum
- If no templates available:
  - Message: "Ingen maler tilgjengelige"
  - Offer to create program manually
  - Close button available
- No crash or infinite loading
- User can dismiss and create program without template

**ACCEPTANCE CRITERIA:**
- [ ] Graceful handling
- [ ] No crash
- [ ] Fallback option provided
- [ ] Can dismiss modal

---

### TC-E3: No Exercises Selected

**CATEGORY:** EdgeCase
**PRIORITY:** P0
**PRECONDITIONS:**
- Program creation modal is open
- Program name is filled
- No exercises added

**STEPS:**
1. Enter program name: "Empty Workout"
2. Leave exercise list empty
3. Try to click "Lagre" button

**EXPECTED:**
- "Lagre" button might be disabled (grayed out)
- OR clicking shows error alert:
  - "Minst en øvelse kreves"
  - "Du må legge til minst en øvelse for å opprette et program"
- Form submission is blocked
- User is guided to add exercises
- No empty program created

**ACCEPTANCE CRITERIA:**
- [ ] Cannot save empty program
- [ ] Error message shown
- [ ] User guided to add exercises
- [ ] Form stays open for editing

---

### TC-E4: Invalid Input (Negative Numbers)

**CATEGORY:** EdgeCase
**PRIORITY:** P1
**PRECONDITIONS:**
- Exercise with sets is displayed
- Reps/weight fields are visible

**STEPS:**
1. Tap weight field
2. Type: "-50"
3. Try to blur/exit field
4. Observe validation

**EXPECTED:**
- Field rejects negative input (keyboard prevents or field clears)
- Error message shows: "Vekt må være et positivt tall"
- Field highlighted red
- Cannot save with invalid value
- On save attempt, error prevents submission

**ACCEPTANCE CRITERIA:**
- [ ] Negative numbers rejected
- [ ] Error message clear
- [ ] Cannot submit form
- [ ] User can correct

---

### TC-E5: Missing Required Fields

**CATEGORY:** EdgeCase
**PRIORITY:** P0
**PRECONDITIONS:**
- Program form is open
- Multiple fields are to be validated

**STEPS:**
1. Clear program name field completely
2. Leave description empty (OK, optional)
3. Try to save with no exercises
4. Try to click "Lagre"

**EXPECTED:**
- Validation happens on save attempt
- Errors shown for:
  - Missing name: "Programnavn er påkrevd"
  - No exercises: "Minst en øvelse er påkrevd"
- All errors listed (not one at a time)
- Form doesn't submit
- Focus returns to first invalid field

**ACCEPTANCE CRITERIA:**
- [ ] Required field validation works
- [ ] All errors shown
- [ ] Clear error messages
- [ ] Form doesn't submit
- [ ] User can correct

---

### TC-E6: Network Error Handling

**CATEGORY:** EdgeCase
**PRIORITY:** P1
**PRECONDITIONS:**
- Network is available initially
- Will simulate network error

**STEPS:**
1. Start saving program
2. Turn off network (WiFi/data)
3. Observe request timeout
4. Wait for error handling
5. Look for error message

**EXPECTED:**
- Save attempt starts
- After ~30 seconds timeout:
  - Error alert appears: "Nettverksfeil"
  - Message: "Kunne ikke koble til serveren. Sjekk internettkoblingen."
  - Retry button available
  - Form data preserved (not cleared)
  - Loading state cleared
- User can:
  - Reconnect to network
  - Tap retry
  - Try save again
  - Or cancel and lose changes

**ACCEPTANCE CRITERIA:**
- [ ] Timeout handled
- [ ] Error message shown
- [ ] Retry available
- [ ] Form data preserved
- [ ] User can recover

---

## Test Execution Tracking

### Test Run Date: ___________

| Test Case ID | Title | Status | Notes |
|-------------|-------|--------|-------|
| TC-B1 | Opprett Program Button | [ ] | |
| TC-B2 | Program Name/Description | [ ] | |
| TC-B3 | Mal Button | [ ] | |
| TC-B4 | Select Template | [ ] | |
| TC-B5 | Legg til øvelse Button | [ ] | |
| TC-B6 | Add Exercise | [ ] | |
| TC-B7 | Legg til sett Button | [ ] | |
| TC-B8 | Remove Set | [ ] | |
| TC-B9 | Lagre som mal Button | [ ] | |
| TC-B10 | Lagre Button | [ ] | |
| TC-B11 | Slett Program Button | [ ] | |
| TC-D1 | GET /programs | [ ] | |
| TC-D2 | GET /templates | [ ] | |
| TC-D3 | POST /programs | [ ] | |
| TC-D4 | PATCH /programs/:id | [ ] | |
| TC-D5 | DELETE /programs/:id | [ ] | |
| TC-D6 | Save as Template | [ ] | |
| TC-U1 | Program Card Display | [ ] | |
| TC-U2 | Card Click Edit | [ ] | |
| TC-U3 | Schedule Days | [ ] | |
| TC-U4 | Template Badge | [ ] | |
| TC-U5 | Text Input Fields | [ ] | |
| TC-U6 | Number Input Fields | [ ] | |
| TC-U7 | Day Selection Chips | [ ] | |
| TC-E1 | Empty Program List | [ ] | |
| TC-E2 | Empty Template List | [ ] | |
| TC-E3 | No Exercises Selected | [ ] | |
| TC-E4 | Negative Numbers | [ ] | |
| TC-E5 | Missing Fields | [ ] | |
| TC-E6 | Network Error | [ ] | |

---

**End of Document**
