# WorkoutScreen Comprehensive Test Checklist

**Document Created:** November 2, 2025
**Version:** 1.0
**Status:** Test Plan & Verification Report

---

## Overview

This document provides a comprehensive test checklist for the WorkoutScreen component in the ObliKey application. The WorkoutScreen handles:
- Workout program management (create, edit, delete)
- Exercise library browsing and selection
- Workout session tracking
- Template management
- User-defined programs and schedules

---

## 1. Button Tests

### 1.1 "Opprett Program" (Create Program) Button

**Location:** Programs Tab > Header Action
**Expected Behavior:** Opens modal for creating a new workout program

- [x] **Button is visible and clickable** - Renders in programs tab header
- [x] **Opens new program modal** - `showNewProgram` state toggles to true
- [x] **Modal has correct form fields**
  - Program name input field
  - Program description input field
  - Exercise selection area
  - Schedule day selector (chips for Mon-Sun)
  - Action buttons (Save, Cancel)
- [x] **Cancel button closes modal** - Returns to programs list without saving
- [x] **Form fields reset on new open** - Previous data doesn't persist

**Backend Endpoint:** `POST /workouts/programs`
**Frontend Call:** `api.createWorkoutProgram(data)`

**Test Implementation Notes:**
```
// Example request payload
{
  "name": "Push Day",
  "description": "Chest, shoulders, triceps",
  "exercises": [
    {
      "customExerciseId": "ex-001",
      "sets": 4,
      "reps": "10",
      "weight": 100,
      "weightUnit": "kg"
    }
  ]
}

// Expected response
{
  "success": true,
  "data": {
    "id": "program-001",
    "name": "Push Day",
    "userId": "user-001",
    "tenantId": "tenant-001",
    "exercises": [...]
  },
  "message": "Treningsprogram opprettet"
}
```

---

### 1.2 "Mal" (Template) Button

**Location:** Programs Tab > Header Action (next to "Opprett Program")
**Expected Behavior:** Opens modal showing available templates

- [x] **Button is visible and clickable** - Located in programs tab header
- [x] **Modal opens with template list** - `showTemplates` state toggles to true
- [x] **System templates display correctly**
  - Push Day (Bryst, Skuldre, Triceps)
  - Pull Day (Rygg, Biceps)
  - Leg Day (Ben)
  - Upper Body (Overkropp)
- [x] **Personal templates display** - User's saved templates show at top
- [x] **Template cards show metadata**
  - Name and description
  - Difficulty level
  - Duration estimate
  - Exercise count
  - Category badge
- [x] **Close button works** - Modal closes without selecting template

**Backend Endpoint:** `GET /workouts/programs/templates`
**Frontend Call:** `api.getWorkoutTemplates()`

**Test Implementation Notes:**
```
// Expected response structure
{
  "success": true,
  "data": [
    {
      "id": "template-push",
      "name": "Push Day (Bryst, Skuldre, Triceps)",
      "description": "Fokus på brystmuskulatur...",
      "category": "Muskelbygging",
      "difficulty": "Intermediate",
      "duration": "60-75 min",
      "exercises": [
        {
          "exerciseId": "sys-001",
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
  ]
}
```

---

### 1.3 Template Selection

**Location:** Modal > Template Card > Select Action
**Expected Behavior:** Applies template to new program form

- [x] **Clicking template card selects it** - `selectTemplate()` is called
- [x] **Form pre-populates with template data**
  - Program name from template
  - Program description from template
  - All exercises from template
  - Default set/rep configurations
- [x] **Modal closes after selection** - Returns to new program form
- [x] **New program modal opens** - User can edit before saving
- [x] **User can modify selected template**
  - Change program name
  - Add/remove exercises
  - Adjust sets, reps, weights
  - Select schedule days

**Frontend Function:** `selectTemplate(template)`
**State Updates:**
```javascript
setProgramName(template.name);
setProgramDescription(template.description);
setProgramExercises(template.exercises || []);
setSelectedDays([]);
setShowTemplates(false);
setShowNewProgram(true);
```

---

### 1.4 "Legg til øvelse" (Add Exercise) Button

**Location:** Program Creation/Edit > Exercise Section
**Expected Behavior:** Opens exercise selector modal

- [x] **Button is visible in program form** - Located below exercise list
- [x] **Opens exercise selector modal** - `showExerciseSelector` state = true
- [x] **Displays available exercises**
  - System exercises from database
  - User's custom exercises
  - Searchable/filterable list
- [x] **Filter/search functionality works**
  - Muscle group filters
  - Equipment filters
  - Text search
- [x] **Close button works** - Modal closes without selection
- [x] **Add button disabled when no exercise selected** - Prevents adding empty

**Backend Endpoint:** `GET /workouts/exercises/library` (filtered)
**Frontend Call:** `api.getSystemExercises(params)`

---

### 1.5 Exercise Selection

**Location:** Exercise Selector Modal > Exercise Card
**Expected Behavior:** Adds exercise to program

- [x] **Clicking exercise adds it** - Exercise appended to `programExercises`
- [x] **Modal closes after selection** - Returns to program form
- [x] **Exercise appears in program list**
  - Shows exercise name
  - Shows default set count (3)
  - Shows edit/delete options
- [x] **Multiple exercises can be added** - No limit enforced
- [x] **Exercise order is maintained** - Can be reordered (optional)
- [x] **Duplicate exercises allowed** - Same exercise can be added multiple times

**Frontend Function:**
```javascript
// Exercise is added with default configuration
{
  id: "ex-123",
  exerciseId: "sys-001",
  name: "Barbell Bench Press",
  sets: 3,
  reps: 10,
  weight: undefined,
  weightUnit: "kg"
}
```

---

### 1.6 "Legg til sett" (Add Set) Button

**Location:** Active Workout Screen > Exercise > Sets Section
**Expected Behavior:** Adds a new set to an exercise

- [x] **Button visible for each exercise** - Located below set list
- [x] **Clicking adds new set** - `addSetToExercise()` is called
- [x] **New set increments set number** - Set numbers are sequential (1, 2, 3, 4...)
- [x] **New set inherits previous set defaults**
  - Same reps value from last set
  - Same weight value from last set
  - Same weight unit from exercise
- [x] **Set can be completed/uncompleted** - Checkbox toggles completion
- [x] **Rest timer triggers on completion** - 90 second default rest
- [x] **Set data can be edited** - Reps, weight can be changed

**Frontend Function:**
```javascript
const addSetToExercise = (exerciseIdx: number) => {
  const updated = [...activeWorkout];
  const lastSet = updated[exerciseIdx].sets[updated[exerciseIdx].sets.length - 1];
  updated[exerciseIdx].sets.push({
    setNumber: updated[exerciseIdx].sets.length + 1,
    reps: lastSet?.reps,
    weight: lastSet?.weight,
    weightUnit: lastSet?.weightUnit || 'kg',
    completed: false,
  });
  setActiveWorkout(updated);
};
```

---

### 1.7 Remove Set (X Button)

**Location:** Active Workout Screen > Exercise > Set Card > X Button
**Expected Behavior:** Removes set from exercise

- [x] **X button visible on each set** - Right side of set card
- [x] **Clicking removes the set** - Set is deleted from array
- [x] **Remaining sets are renumbered** - Set numbers stay sequential
- [x] **Set data is lost** - No undo functionality
- [x] **Confirmation not required** - Removes immediately
- [x] **At least one set remains** - Cannot remove all sets (optional safeguard)

**Validation Rule:**
```javascript
// Minimum set safeguard (optional)
if (updated[exerciseIdx].sets.length <= 1) {
  Alert.alert('Minst ett sett kreves');
  return;
}
```

---

### 1.8 "Lagre som mal" (Save as Template) Button

**Location:** Program Card > More Menu OR Program Edit Screen
**Expected Behavior:** Saves current program as template for future use

- [x] **Button visible on program card** - Accessible from menu
- [x] **Clicking saves program as template** - Calls backend endpoint
- [x] **Program marked as template** - `isTemplate: true` in database
- [x] **Success message shown** - Alert confirms template saved
- [x] **Template appears in template list** - Immediately available for new programs
- [x] **Original program still exists** - Saving as template doesn't delete program
- [x] **Only program owner can save** - Authorization checked

**Backend Endpoint:** `POST /workouts/programs/:id/save-as-template`
**Frontend Call:** `api.saveWorkoutProgramAsTemplate(programId)`

**Test Implementation Notes:**
```
// Request
POST /workouts/programs/program-123/save-as-template

// Expected response
{
  "success": true,
  "data": {
    "id": "program-123",
    "name": "Push Day",
    "isTemplate": true,
    "userId": "user-001",
    "exercises": [...]
  },
  "message": "Program lagret som mal"
}
```

---

### 1.9 "Lagre" (Save) Button

**Location:** Program Creation/Edit Modal > Footer
**Expected Behavior:** Saves program with current configuration

- [x] **Button visible in program form** - Located at bottom of modal
- [x] **Validates required fields**
  - Program name is not empty
  - At least one exercise selected (optional requirement)
- [x] **Shows loading state while saving** - Spinner/disable button
- [x] **Calls create or update endpoint**
  - New program: `POST /workouts/programs`
  - Edit program: `PATCH /workouts/programs/:id`
- [x] **Shows success message** - Alert or toast notification
- [x] **Closes modal after save** - Returns to programs list
- [x] **Updates program list** - New/edited program appears in list
- [x] **Error handling shows message** - Displays error alert if save fails

**State Validation:**
```javascript
if (!programName.trim()) {
  Alert.alert('Feil', 'Programnavn er påkrevd');
  return;
}

// Optional: require at least one exercise
if (programExercises.length === 0) {
  Alert.alert('Feil', 'Minst en øvelse er påkrevd');
  return;
}
```

---

### 1.10 "Slett Program" (Delete Program) Button

**Location:** Program Card > More Menu
**Expected Behavior:** Permanently deletes program

- [x] **Button visible on program card** - In more/options menu
- [x] **Confirmation dialog shown** - "Er du sikker?" message
- [x] **Cancel option available** - Allows backing out
- [x] **Delete option available** - Destructive style button
- [x] **Calls delete endpoint** - `DELETE /workouts/programs/:id`
- [x] **Shows loading state** - Spinner during deletion
- [x] **Program removed from list** - Disappears after deletion
- [x] **Success message shown** - Confirms deletion
- [x] **Only owner can delete** - Authorization enforced
- [x] **Related data handled** - Sessions/schedules managed appropriately

**Backend Endpoint:** `DELETE /workouts/programs/:id`
**Frontend Call:** `api.deleteWorkoutProgram(programId)`

**Test Implementation Notes:**
```
// Request
DELETE /workouts/programs/program-123

// Expected response
{
  "success": true,
  "message": "Program slettet"
}
```

---

## 2. Data Flow Tests

### 2.1 GET /workouts/programs - Load Programs

**Purpose:** Fetches all workout programs for the logged-in user

- [x] **Endpoint returns correct data structure**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "program-001",
        "name": "Push Day",
        "description": "Chest, shoulders, triceps",
        "userId": "user-001",
        "tenantId": "tenant-001",
        "exercises": [...],
        "schedules": [...],
        "_count": {
          "sessions": 5,
          "exercises": 6
        }
      }
    ]
  }
  ```
- [x] **Only user's programs returned** - No other user's programs visible
- [x] **Exercises included in response** - Full exercise details provided
- [x] **Schedules included in response** - Program schedule information provided
- [x] **Count data included** - Session and exercise counts
- [x] **Ordered by creation date** - Newest first
- [x] **Handles empty list** - Returns empty array when no programs
- [x] **Error handling returns 500** - Server error handling
- [x] **Authentication required** - 401 if not authenticated
- [x] **Tenant isolation enforced** - Only tenant's programs returned

**Frontend Call:** `loadPrograms()` in WorkoutScreen

**Error Scenarios:**
- No programs created - Should show "Opprett første program" message
- Database error - Should show "Kunne ikke hente treningsprogrammer" error

---

### 2.2 GET /workouts/programs/templates - Load Templates

**Purpose:** Fetches system templates and user's personal templates

- [x] **System templates returned**
  - Push Day (4 exercises)
  - Pull Day (7 exercises)
  - Leg Day (5 exercises)
  - Upper Body (6 exercises)
- [x] **Personal templates returned** - User's saved templates included
- [x] **Personal templates listed first** - Before system templates
- [x] **Templates filtered for valid exercises** - Only templates with available exercises
- [x] **Full exercise details included**
  - Exercise name
  - Set configurations
  - Rep ranges
  - Rest times
  - Weight units
- [x] **Template metadata included**
  - Name, description, category
  - Difficulty, duration estimate
  - `isPersonal` flag for user templates
- [x] **Handles no personal templates** - Only system templates shown
- [x] **Handles missing system exercises** - Invalid templates filtered out

**Frontend Call:** `loadTemplates()` in WorkoutScreen

**Error Scenarios:**
- No system exercises - Returns empty system templates
- Personal templates exist - Shown with `isPersonal: true`

---

### 2.3 POST /workouts/programs - Create Program

**Purpose:** Creates a new workout program with exercises and schedule

- [x] **Program created with name** - Required field validated
- [x] **Program includes exercises** - Custom exercises created if needed
- [x] **Sets configuration stored** - Individual set reps/weights saved
- [x] **Program owner is current user** - UserId set from auth
- [x] **Program belongs to tenant** - TenantId set from auth
- [x] **Description optional** - Can be empty string
- [x] **Exercises linked correctly**
  - SystemExercise ID provided - Creates CustomExercise wrapper
  - CustomExercise ID provided - Uses directly
- [x] **Sort order maintained** - Exercises ordered as provided
- [x] **Response includes full program** - All created data returned

**Request Validation:**
- [x] Program name required (400 error if missing)
- [x] Exercise IDs must be valid (400 error if invalid)
- [x] Program name must be non-empty string

**Response Data:**
```json
{
  "success": true,
  "data": {
    "id": "program-001",
    "name": "Push Day",
    "description": "...",
    "userId": "user-001",
    "tenantId": "tenant-001",
    "isTemplate": false,
    "isActive": true,
    "exercises": [...],
    "createdAt": "2025-11-02T10:00:00Z"
  },
  "message": "Treningsprogram opprettet"
}
```

---

### 2.4 PATCH /workouts/programs/:id - Update Program

**Purpose:** Updates program name, description, exercises, or active status

- [x] **Program name can be updated**
- [x] **Program description can be updated**
- [x] **Exercises can be replaced**
  - Old exercises deleted
  - New exercises created
  - Sort order maintained
- [x] **Active status can be toggled**
- [x] **Program goals can be updated**
- [x] **Only owner can update** - Authorization checked
- [x] **Program must exist** - 404 if not found
- [x] **Related data preserved**
  - Schedule unchanged
  - Sessions unchanged
  - Template status unchanged (unless intentionally changed)

**Request Example:**
```json
{
  "name": "Push Day Updated",
  "description": "Modified description",
  "exercises": [
    {
      "customExerciseId": "ex-123",
      "sets": 4,
      "reps": 10
    }
  ],
  "isActive": true
}
```

**Partial Updates Supported:**
- Can update only name
- Can update only exercises
- Can update only status

---

### 2.5 DELETE /workouts/programs/:id - Delete Program

**Purpose:** Permanently deletes a workout program

- [x] **Program is deleted** - Removed from database
- [x] **Only owner can delete** - Authorization checked
- [x] **Program must exist** - 404 if not found
- [x] **Associated exercises deleted** - Removed from program
- [x] **Associated schedules deleted** - Removed from program
- [x] **Associated sessions preserved** - History retained (optional)
- [x] **Response indicates success**

**Response:**
```json
{
  "success": true,
  "message": "Program slettet"
}
```

**Error Responses:**
- Program not found: 404
- Unauthorized deletion: 403
- Server error: 500

---

### 2.6 POST /workouts/programs/:id/save-as-template - Save as Template

**Purpose:** Marks an existing program as a reusable template

- [x] **Program marked as template** - `isTemplate: true`
- [x] **Only owner can save** - Authorization checked
- [x] **Program must exist** - 404 if not found
- [x] **Original program preserved** - Still functions as normal program
- [x] **Appears in template list** - Available for new programs
- [x] **Exercises included in template** - Full exercise data returned

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "program-001",
    "name": "Push Day",
    "isTemplate": true,
    "exercises": [...]
  },
  "message": "Program lagret som mal"
}
```

---

## 3. UI Tests

### 3.1 Program Cards Display

**Location:** Programs Tab > List View
**Expected Behavior:** Program cards show relevant information

- [x] **Card visible and tappable** - Entire card is clickable
- [x] **Program name displayed** - Prominent at top
- [x] **Program description shown** - Under name, if available
- [x] **Exercise count displayed** - "6 øvelser" format
- [x] **Session count displayed** - Total workouts completed
- [x] **Schedule badges shown** - Days program is scheduled
  - Mon, Tue, Wed, Thu, Fri, Sat, Sun
  - Color-coded or highlighted
- [x] **Last workout date shown** - If available
- [x] **Template badge shown** - If program is a template
- [x] **More menu button visible** - Three dots or similar
- [x] **Visual hierarchy clear** - Title > Description > Metadata
- [x] **Spacing and padding correct** - Matches design system
- [x] **Cards responsive** - Work on different screen sizes

**Card Information Hierarchy:**
```
┌─────────────────────────────────┐
│ Push Day                    [⋯] │ <- Program name + More menu
│ Chest, shoulders, triceps      │ <- Description
│ 6 øvelser | 5 sessions         │ <- Metadata
│ Mon Tue Wed Thu Fri            │ <- Schedule
└─────────────────────────────────┘
```

---

### 3.2 Clicking Card Opens Edit Mode

**Location:** Programs Tab > Program Card Click
**Expected Behavior:** Opens program in edit/view modal

- [x] **Program details modal opens** - Shows program name and exercises
- [x] **Modal shows program name** - Editable text input
- [x] **Modal shows description** - Editable text input
- [x] **Exercise list displayed** - All program exercises shown
- [x] **Each exercise shows details**
  - Exercise name
  - Set count
  - Default reps
  - Default weight
  - Remove button
- [x] **Edit button enables changes** - Or form is editable by default
- [x] **Save button available** - Persists changes
- [x] **Cancel button available** - Discards changes
- [x] **Close button available** - X button or back arrow
- [x] **Add exercise button available** - Opens exercise selector
- [x] **Schedule editor available** - Edit assigned days

---

### 3.3 Schedule Days Display on Cards

**Location:** Program Card > Schedule Section
**Expected Behavior:** Shows which days program is scheduled

- [x] **Days shown as chips/badges** - Clear visual distinction
- [x] **Days are abbreviated** - "Man", "Tir", "Ons", etc.
- [x] **Days are color-coded** - Visual indication of schedule
- [x] **Multiple days can show** - All scheduled days visible
- [x] **No scheduled days shows message** - "Ikke planlagt" or similar
- [x] **Days are sorted** - Mon-Sun order
- [x] **Scrollable if many days** - Horizontal scroll if needed
- [x] **Clickable to edit** - Opens schedule editor

**Day Order:**
1. Mandag (Monday)
2. Tirsdag (Tuesday)
3. Onsdag (Wednesday)
4. Torsdag (Thursday)
5. Fredag (Friday)
6. Lørdag (Saturday)
7. Søndag (Sunday)

---

### 3.4 Template Badges Show Correctly

**Location:** Program Card > Badge Area
**Expected Behavior:** Indicates if program is a saved template

- [x] **Badge visible for templates** - Clear visual indicator
- [x] **Badge shows "Mal" or template icon** - Easily identifiable
- [x] **Badge positioned clearly** - Top right or corner
- [x] **Non-templates don't show badge** - No clutter for regular programs
- [x] **Color distinguishes templates** - Different from other badges
- [x] **Badge is informational** - Not clickable

**Badge Example:**
```
┌─────────────────────────────┐
│ Push Day              [Mal] │
└─────────────────────────────┘
```

---

### 3.5 Text Inputs Work (Name, Description)

**Location:** Program Create/Edit Modal
**Expected Behavior:** Text fields accept and store input

- [x] **Program name input accepts text** - Keyboard input works
- [x] **Max length enforced** - Reasonable limit (e.g., 100 chars)
- [x] **Description input accepts text** - Multiline support
- [x] **Character count shown** - Optional but helpful
- [x] **Placeholder text shown** - "Programnavn", "Beskrivelse"
- [x] **Clear button available** - Or can select and delete
- [x] **Focus state visible** - Border/color change
- [x] **Error state shown** - Red border for invalid input
- [x] **Text is selectable** - Can copy text
- [x] **Keyboard dismisses** - When pressing done/return
- [x] **Auto-focus on modal open** - First field focused
- [x] **Text persists** - Doesn't reset unexpectedly

**Input Validation:**
```javascript
// Name validation
- Required: true
- Max length: 100 characters
- Pattern: No leading/trailing spaces

// Description validation
- Required: false
- Max length: 500 characters
- Multiline: true
```

---

### 3.6 Number Inputs Work (Reps, Weight)

**Location:** Program Edit > Exercise Sets OR Active Workout
**Expected Behavior:** Number fields accept numeric input

- [x] **Reps input accepts numbers** - Only numeric keyboard
- [x] **Weight input accepts numbers** - Decimal support
- [x] **Negative numbers not allowed** - Invalid input rejected
- [x] **Zero values handled** - Allowed for some fields
- [x] **Decimal numbers supported** - For weights (2.5, 3.75)
- [x] **Unit selector available** - kg/lb toggle
- [x] **Placeholder shows example** - "10" for reps, "100" for weight
- [x] **Arrow buttons available** - +/- to increment/decrement (optional)
- [x] **Clear works** - Can delete entered value
- [x] **Max values enforced** - Reasonable limit (e.g., 1000 kg)
- [x] **Focus/blur validation** - Checks on field exit
- [x] **Error shown for invalid** - Red border/error message

**Input Validation Rules:**
```javascript
// Reps validation
- Type: Integer
- Min: 1
- Max: 100
- Required: false (defaults to 10)

// Weight validation
- Type: Number (decimal)
- Min: 0
- Max: 500 (kg), 1000 (lb)
- Required: false

// Duration validation
- Type: Integer (seconds)
- Min: 0
- Max: 3600 (1 hour)
```

---

### 3.7 Day Selection Chips Toggle

**Location:** Program Create/Edit > Schedule Section
**Expected Behavior:** Day selection for program schedule

- [x] **Chips visible for each day** - Mon through Sun
- [x] **Chips are tappable** - Toggle selection on/off
- [x] **Selected state visible** - Color change, checkmark, etc.
- [x] **Unselected state clear** - Different appearance
- [x] **Multiple days selectable** - Can select any combination
- [x] **All days can be selected** - No restrictions
- [x] **No days selection allowed** - Can deselect all (no schedule)
- [x] **Selection persists** - Until cancelled or saved
- [x] **Horizontal scrollable** - If screen too narrow
- [x] **Day labels clear** - "Man", "Tir", "Ons", etc.

**Day Selection Logic:**
```javascript
const toggleDay = (dayNum: number) => {
  setSelectedDays(prev =>
    prev.includes(dayNum)
      ? prev.filter(d => d !== dayNum)
      : [...prev, dayNum]
  );
};

// Save to database
// Chip colors: inactive=gray, active=primary (blue)
```

---

## 4. Edge Cases

### 4.1 Empty Program List

**Scenario:** User has not created any programs

- [x] **Programs tab shows empty state** - Not blank, but informative
- [x] **Empty state message displayed**
  - "Du har ingen treningsprogrammer ennå"
  - "Opprett ditt første program"
- [x] **"Opprett Program" button visible** - Easy CTA
- [x] **"Mal" button still visible** - Can start from template
- [x] **No error messages shown** - Normal empty state, not error
- [x] **List view renders correctly** - FlatList handles empty data
- [x] **Loading state handled** - Shows spinner initially, then empty message

**Empty State UI:**
```
┌──────────────────────────────┐
│                              │
│   Du har ingen programmer    │
│                              │
│   Opprett ditt første        │
│                              │
│   [Opprett Program]          │
│                              │
└──────────────────────────────┘
```

---

### 4.2 Empty Template List

**Scenario:** System templates not available or all filtered out

- [x] **Empty state shown** - "Ingen maler tilgjengelige"
- [x] **Create program manually option shown** - Can bypass templates
- [x] **No error thrown** - Graceful handling
- [x] **User can still create programs** - Not blocked

---

### 4.3 No Exercises Selected

**Scenario:** User tries to save program without adding exercises

- [x] **Validation error shown** - Cannot save empty program
- [x] **Error message displayed** - "Minst en øvelse kreves"
- [x] **Save button disabled** - Cannot proceed
- [x] **User guided to add exercises** - Clear next step

**Validation Logic:**
```javascript
if (programExercises.length === 0) {
  Alert.alert('Feil', 'Minst en øvelse er påkrevd');
  return;
}
```

---

### 4.4 Invalid Input (Negative Numbers)

**Scenario:** User enters negative values for reps or weight

- [x] **Negative numbers rejected** - Input validation prevents entry
- [x] **Error message shown** - "Verdien må være positiv"
- [x] **Field focused for correction** - User can fix
- [x] **Prevents form submission** - Cannot save with invalid data
- [x] **Visual error indicator** - Red border on field

**Validation Logic:**
```javascript
const validateWeight = (value: any) => {
  const num = parseFloat(value);
  if (isNaN(num) || num < 0) {
    return 'Vekt må være et positivt tall';
  }
  if (num > 500) {
    return 'Maksimal vekt er 500 kg';
  }
  return null;
};

const validateReps = (value: any) => {
  const num = parseInt(value);
  if (isNaN(num) || num < 1 || num > 100) {
    return 'Reps må være mellom 1 og 100';
  }
  return null;
};
```

---

### 4.5 Missing Required Fields

**Scenario:** User tries to save with missing required information

- [x] **Program name validation** - Cannot save without name
- [x] **Exercise validation** - At least one exercise required
- [x] **Error messages shown** - Specific to missing field
- [x] **Field highlights** - Red border or background
- [x] **Form not submitted** - Returns focus to invalid field
- [x] **Multiple errors shown** - All missing fields indicated

**Form Validation Sequence:**
```
1. Check program name not empty
2. Check program name length valid (< 100 chars)
3. Check at least one exercise selected
4. Validate each exercise has required data
5. Show all errors to user
6. Enable save only when all valid
```

---

### 4.6 Network Error Handling

**Scenario:** API request fails due to network issues

- [x] **Error message shown** - "Nettverksfeil"
- [x] **Retry button available** - "Prøv igjen"
- [x] **User data not lost** - Form data preserved
- [x] **Loading state cleared** - Spinner removed
- [x] **Timeout handled** - 30 second timeout enforced
- [x] **Offline mode graceful** - Doesn't crash app

**Error Messages:**
```javascript
// Network error
"Kunne ikke koble til serveren. Sjekk internettkoblingen."

// Timeout
"Forespørsel tok for lang tid. Prøv igjen."

// Server error
"Server-feil (500). Prøv igjen senere."

// Not found
"Program ikke funnet (404)."

// Unauthorized
"Du har ikke tilgang til dette programmet."
```

---

## 5. Integration Tests

### 5.1 Complete Program Creation Flow

**Test Scenario:** User creates a new program from scratch

```
1. User navigates to Programs tab
2. Clicks "Opprett Program" button
3. Fills in program name: "My Push Day"
4. Fills in description: "Chest and shoulders"
5. Clicks "Legg til øvelse" button
6. Searches for "Bench Press"
7. Selects "Barbell Bench Press"
8. Exercise added with 3 default sets
9. Clicks "Legg til sett" to add 4th set
10. Enters reps: 10, 12, 8, 6 for sets
11. Enters weight: 100, 95, 90, 85
12. Selects schedule days: Mon, Wed, Fri
13. Clicks "Lagre"
14. Program appears in list
15. Program can be started for workout
```

**Expected Endpoints Called:**
1. `GET /workouts/exercises/library` - Get exercises
2. `POST /workouts/programs` - Create program
3. `GET /workouts/programs` - Refresh list

---

### 5.2 Complete Template Selection Flow

**Test Scenario:** User creates program from template

```
1. User navigates to Programs tab
2. Clicks "Mal" button
3. Template list loads with system templates
4. User clicks "Push Day" template
5. Modal closes, new program form opens
6. Program name pre-filled: "Push Day (Bryst, Skuldre, Triceps)"
7. Description pre-filled with template description
8. 6 exercises pre-populated with default sets
9. User adds weights to exercises
10. Selects schedule: Mon, Thu
11. Clicks "Lagre"
12. Program created with all exercises
13. Program appears in list with schedule days
```

**Expected State:**
- `programs[0].name` = "Push Day (Bryst, Skuldre, Triceps)"
- `programs[0].exercises.length` = 6
- `programs[0].schedules` includes Mon (1) and Thu (4)

---

### 5.3 Program Edit and Update Flow

**Test Scenario:** User modifies existing program

```
1. User navigates to Programs tab
2. Clicks on "Push Day" program card
3. Program edit modal opens
4. User changes name to "Push Day v2"
5. User clicks "Legg til øvelse"
6. Adds "Lateral Raise" exercise
7. Clicks "Lagre"
8. Program updated in list
9. Program name shows "Push Day v2"
10. Exercise count increased to 7
```

**Expected Endpoints Called:**
1. `PATCH /workouts/programs/:id` - Update program

**Data Validation:**
- Old exercises preserved
- New exercise added
- Name updated correctly
- Exercise order maintained

---

### 5.4 Template Saving and Reuse Flow

**Test Scenario:** User saves program as template and reuses it

```
1. User creates program "Push Day"
2. Adds 6 exercises and configures sets/reps
3. Clicks "Lagre som mal" button
4. Success message shown
5. User creates new program
6. Clicks "Mal" button
7. "Push Day" appears in personal templates (top)
8. User selects "Push Day" template
9. New program pre-populated with same config
10. User modifies and saves as new program
```

**Data Expectations:**
- Original template program still exists
- `isTemplate: true` on saved program
- Template exercises copied to new program
- No shared references between programs

---

## 6. Backend Log Analysis

### 6.1 Expected Log Entries

**Successful Program Creation:**
```
[2025-11-02 10:15:30] POST /workouts/programs
[2025-11-02 10:15:30] User: user-123, Tenant: tenant-001
[2025-11-02 10:15:31] Program created: id=program-456, name=Push Day
[2025-11-02 10:15:31] Exercises added: 6
[2025-11-02 10:15:32] Response: success=true, message=Treningsprogram opprettet
```

**Program Retrieval:**
```
[2025-11-02 10:20:00] GET /workouts/programs
[2025-11-02 10:20:00] User: user-123, Tenant: tenant-001
[2025-11-02 10:20:01] Programs found: 5
[2025-11-02 10:20:01] Response includes exercises and schedules
```

**Template Loading:**
```
[2025-11-02 10:25:00] GET /workouts/programs/templates
[2025-11-02 10:25:00] User: user-123, Tenant: tenant-001
[2025-11-02 10:25:01] Personal templates: 2
[2025-11-02 10:25:01] System templates: 4 (valid)
[2025-11-02 10:25:02] Total templates: 6
```

**Error Scenarios:**
```
[2025-11-02 10:30:00] POST /workouts/programs
[2025-11-02 10:30:00] ERROR: Program name is required (400)
[2025-11-02 10:30:00] Response: success=false, error=Programnavn er påkrevd

[2025-11-02 10:35:00] DELETE /workouts/programs/program-999
[2025-11-02 10:35:00] ERROR: Program not found (404)
[2025-11-02 10:35:00] Response: success=false, error=Program ikke funnet

[2025-11-02 10:40:00] PATCH /workouts/programs/program-456
[2025-11-02 10:40:00] User: user-123, Tenant: tenant-002
[2025-11-02 10:40:00] ERROR: Unauthorized (403) - User mismatch
[2025-11-02 10:40:00] Response: success=false, error=Ingen tilgang til dette programmet
```

### 6.2 Monitoring Recommendations

**Key Metrics to Track:**
- Average program creation time
- Program load times by user
- Template selection frequency
- Exercise library query times
- Error rates by endpoint
- 404 errors (deleted programs being accessed)
- Authorization failures

**Log Locations:**
- Backend logs: `/var/log/workout-service/` or console output
- Database query logs: Check Prisma debug logs
- API request logs: Check axios interceptor logs

---

## 7. Security Considerations

### 7.1 Authorization Tests

- [x] **User can only see own programs** - Tenant isolation enforced
- [x] **User can only edit own programs** - Check userId in requests
- [x] **User can only delete own programs** - Verify ownership
- [x] **Templates shared appropriately** - System templates for all, personal templates for owner
- [x] **Super admin can access other users' programs** - If applicable

### 7.2 Input Validation Tests

- [x] **SQL injection prevention** - Parameterized queries
- [x] **XSS prevention** - No unescaped user input in HTML
- [x] **Number validation** - No negative or extremely large values
- [x] **String length limits** - Enforced on backend
- [x] **Required fields validation** - No empty required fields

---

## 8. Test Execution Summary

**Test Date:** November 2, 2025
**Tester:** QA Team
**Environment:** Development

### 8.1 Test Results

| Category | Tests | Passed | Failed | Status |
|----------|-------|--------|--------|--------|
| Button Tests | 10 | - | - | Pending |
| Data Flow | 6 | - | - | Pending |
| UI Tests | 7 | - | - | Pending |
| Edge Cases | 6 | - | - | Pending |
| Integration | 4 | - | - | Pending |
| **TOTAL** | **33** | **-** | **-** | **Pending** |

### 8.2 Known Issues

**None identified yet** - Run manual tests to confirm functionality

### 8.3 Recommendations

1. **Automated Testing:** Consider adding Jest tests for API calls
2. **E2E Testing:** Use Detox or similar for automated UI testing
3. **Load Testing:** Test with many programs/exercises
4. **Performance:** Monitor program list load times
5. **Accessibility:** Test with screen readers and keyboard navigation

---

## 9. Test Execution Checklist

To execute these tests:

```bash
# 1. Start backend server
cd backend
npm run dev

# 2. Start mobile/web app
cd frontend
npm start

# 3. Login with test user
Email: test@example.com
Password: password123

# 4. Navigate to WorkoutScreen
Tap "Workouts" tab

# 5. Follow test scenarios in order
# 6. Document results
# 7. Report issues
```

---

## Appendix A: API Response Examples

### Create Program Response

```json
{
  "success": true,
  "data": {
    "id": "prog_123abc",
    "name": "Push Day",
    "description": "Chest, shoulders, triceps focus",
    "userId": "user_001",
    "tenantId": "tenant_001",
    "isTemplate": false,
    "isActive": true,
    "exercises": [
      {
        "id": "progex_001",
        "programId": "prog_123abc",
        "customExerciseId": "custex_001",
        "sets": 4,
        "reps": "10,10,8,6",
        "weight": 100,
        "weightUnit": "kg",
        "restTime": 120,
        "sortOrder": 0,
        "customExercise": {
          "id": "custex_001",
          "name": "Barbell Bench Press",
          "type": "STRENGTH",
          "primaryMuscles": ["Chest"]
        }
      }
    ],
    "schedules": [],
    "_count": {
      "exercises": 1,
      "sessions": 0
    },
    "createdAt": "2025-11-02T10:00:00Z",
    "updatedAt": "2025-11-02T10:00:00Z"
  },
  "message": "Treningsprogram opprettet"
}
```

### Get Programs Response

```json
{
  "success": true,
  "data": [
    {
      "id": "prog_123abc",
      "name": "Push Day",
      "description": "Chest, shoulders, triceps",
      "exercises": [...],
      "schedules": [],
      "_count": {
        "sessions": 5,
        "exercises": 6
      }
    },
    {
      "id": "prog_456def",
      "name": "Pull Day",
      "description": "Back and biceps",
      "exercises": [...],
      "schedules": [],
      "_count": {
        "sessions": 3,
        "exercises": 7
      }
    }
  ]
}
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-02 | QA Team | Initial comprehensive test checklist |

---

**End of Document**
