# WorkoutScreen Testing Documentation Index

**Created:** November 2, 2025
**Status:** Complete and Ready for Testing
**Total Documentation:** 3,071 lines across 2 detailed test documents

---

## Overview

This index provides a guide to the comprehensive WorkoutScreen testing documentation created for the ObliKey application. The documentation covers all button functionality, data flows, UI elements, edge cases, and includes 30+ detailed test cases.

---

## Document Map

### 1. WORKOUT_SCREEN_TESTS.md (37KB, 1,294 lines)

**Primary Reference:** Comprehensive test checklist with detailed specifications

**Contents:**
- Section 1: Button Tests (10 buttons tested)
- Section 2: Data Flow Tests (6 API endpoints tested)
- Section 3: UI Tests (7 UI elements tested)
- Section 4: Edge Cases (6 scenarios covered)
- Section 5: Integration Tests (4 workflows)
- Section 6: Backend Log Analysis
- Section 7: Security Considerations
- Section 8-9: Test Execution Summary & Checklist
- Appendix A: API Response Examples

**Key Features:**
- Detailed step-by-step verification for each feature
- Exact API endpoint mappings
- Complete JSON request/response examples
- Error message translations (Norwegian)
- Backend endpoint documentation
- Database validation rules
- Security authorization checks

**Use This Document For:**
- High-level testing overview
- Backend API verification
- Data validation rules
- Error handling verification
- Security testing
- Response structure validation

---

### 2. WORKOUT_TEST_CASES.md (31KB, 1,300 lines)

**Primary Reference:** Detailed test case scenarios with step-by-step execution

**Contents:**
- Test Case Template (for consistency)
- Category: Button Tests (11 test cases)
- Category: Data Flow Tests (6 test cases)
- Category: UI Tests (7 test cases)
- Category: Edge Cases (6 test cases)
- Test Execution Tracking Table
- Results Summary Grid

**Key Features:**
- Standardized test case format
- Preconditions listed for each test
- Step-by-step instructions
- Expected results documented
- Acceptance criteria checklist
- Network request monitoring steps
- Visual representation guides
- Test result tracking table

**Use This Document For:**
- Manual testing execution
- Step-by-step QA procedures
- Test case tracking/reporting
- Automated test development
- Regression testing
- Team testing coordination

---

## Quick Navigation

### By Test Category

#### Button Tests
**Location:** WORKOUT_SCREEN_TESTS.md - Section 1 OR WORKOUT_TEST_CASES.md - Button Tests
**Test Cases:** 11
- TC-B1: Opprett Program button
- TC-B2: Program form inputs
- TC-B3: Mal (Template) button
- TC-B4: Template selection
- TC-B5: Legg til øvelse button
- TC-B6: Exercise selection
- TC-B7: Legg til sett button
- TC-B8: Remove set button
- TC-B9: Lagre som mal button
- TC-B10: Lagre (Save) button
- TC-B11: Slett Program button

#### Data Flow Tests
**Location:** WORKOUT_SCREEN_TESTS.md - Section 2 OR WORKOUT_TEST_CASES.md - Data Flow Tests
**Test Cases:** 6
- TC-D1: GET /workouts/programs
- TC-D2: GET /workouts/programs/templates
- TC-D3: POST /workouts/programs
- TC-D4: PATCH /workouts/programs/:id
- TC-D5: DELETE /workouts/programs/:id
- TC-D6: POST /workouts/programs/:id/save-as-template

#### UI Tests
**Location:** WORKOUT_SCREEN_TESTS.md - Section 3 OR WORKOUT_TEST_CASES.md - UI Tests
**Test Cases:** 7
- TC-U1: Program card display
- TC-U2: Card click opens edit
- TC-U3: Schedule days display
- TC-U4: Template badge display
- TC-U5: Text input fields
- TC-U6: Number input fields
- TC-U7: Day selection chips

#### Edge Case Tests
**Location:** WORKOUT_SCREEN_TESTS.md - Section 4 OR WORKOUT_TEST_CASES.md - Edge Cases
**Test Cases:** 6
- TC-E1: Empty program list
- TC-E2: Empty template list
- TC-E3: No exercises selected
- TC-E4: Negative numbers in input
- TC-E5: Missing required fields
- TC-E6: Network error handling

---

## Frontend Files Tested

### Main Component
- `/Users/johnmichaelobligar/Documents/Development/ObliKey/frontend/src/screens/WorkoutScreen.tsx` (3,713 lines)
  - Programs management (create, read, update, delete)
  - Exercise library browsing
  - Workout session tracking
  - Session history
  - Statistics and analytics

### API Service
- `/Users/johnmichaelobligar/Documents/Development/ObliKey/frontend/src/services/api.ts`
  - `getSystemExercises()`
  - `getCustomExercises()`
  - `getWorkoutPrograms()`
  - `getWorkoutTemplates()`
  - `createWorkoutProgram()`
  - `updateWorkoutProgram()`
  - `deleteWorkoutProgram()`
  - `saveWorkoutProgramAsTemplate()`
  - `addExerciseToProgram()`
  - `removeProgramExercise()`
  - And more (see WORKOUT_SCREEN_TESTS.md for complete list)

---

## Backend Files Tested

### Controller
- `/Users/johnmichaelobligar/Documents/Development/ObliKey/backend/src/controllers/workout.controller.ts`
  - System exercises (browse library)
  - Custom exercises (user's personal exercises)
  - Workout programs (full CRUD)
  - Program exercises (add/update/remove)
  - Workout schedules
  - Workout sessions (tracking)
  - Statistics and progress tracking

### Routes
- `/Users/johnmichaelobligar/Documents/Development/ObliKey/backend/src/routes/workout.routes.ts`
  - All endpoints with correct HTTP methods
  - Authentication middleware
  - Tenant isolation
  - Error handling

---

## API Endpoints Tested

### System Exercises (Browse Library)
- `GET /workouts/exercises/library` - Get exercises with filters
- `GET /workouts/exercises/library/:id` - Get single exercise

### Custom Exercises (User's Personal)
- `GET /workouts/exercises` - Get user's custom exercises
- `POST /workouts/exercises` - Create custom exercise
- `PATCH /workouts/exercises/:id` - Update custom exercise
- `DELETE /workouts/exercises/:id` - Delete custom exercise

### Workout Programs
- `GET /workouts/programs/templates` - Get system and personal templates
- `GET /workouts/programs` - Get user's programs
- `GET /workouts/programs/:id` - Get single program
- `POST /workouts/programs` - Create program
- `PATCH /workouts/programs/:id` - Update program
- `DELETE /workouts/programs/:id` - Delete program
- `POST /workouts/programs/:id/save-as-template` - Save as template

### Program Exercises
- `POST /workouts/programs/:programId/exercises` - Add exercise
- `PATCH /workouts/program-exercises/:id` - Update exercise
- `DELETE /workouts/program-exercises/:id` - Remove exercise

### Workout Schedules
- `GET /workouts/schedules` - Get user's schedules
- `POST /workouts/schedules` - Create schedule
- `DELETE /workouts/schedules/:id` - Delete schedule

### Workout Sessions (Tracking)
- `GET /workouts/sessions` - Get user's sessions
- `POST /workouts/sessions/start` - Start workout session
- `POST /workouts/sessions/:id/complete` - Complete session
- `POST /workouts/sessions/:sessionId/exercises` - Log exercise

### Statistics
- `GET /workouts/stats` - Get workout statistics
- `GET /workouts/exercises/:customExerciseId/progress` - Get exercise progress

---

## Test Execution Checklist

### Before Testing
- [ ] Backend server running (`npm run dev` in backend)
- [ ] Frontend app running (`npm start` in frontend)
- [ ] Logged in with test user credentials
- [ ] Network inspector/dev tools open (for API monitoring)
- [ ] Test database has sample data (exercises, users)

### During Testing
- [ ] Follow test case steps sequentially
- [ ] Monitor network requests in dev tools
- [ ] Check console for errors
- [ ] Verify response status codes
- [ ] Validate response JSON structure
- [ ] Check UI updates after API calls
- [ ] Verify error handling and messages

### After Testing
- [ ] Document results in test execution table
- [ ] Note any failures or unexpected behavior
- [ ] Record error messages and logs
- [ ] Report bugs with:
  - Steps to reproduce
  - Expected vs actual result
  - Error messages/logs
  - Device/browser information
  - Network request details

---

## Validation Rules Reference

### Program Name
- **Required:** Yes
- **Max Length:** 100 characters
- **Format:** Text
- **Validation:** Non-empty, trimmed

### Program Description
- **Required:** No
- **Max Length:** 500 characters
- **Format:** Text (multiline)
- **Validation:** Optional

### Program Exercises
- **Required:** At minimum 1
- **Format:** Array of exercise objects
- **Validation:** Each exercise must have customExerciseId

### Exercise Sets
- **Range:** 1-10 sets (typical)
- **Format:** Integer
- **Validation:** Positive integer

### Exercise Reps
- **Range:** 1-100
- **Format:** Integer
- **Validation:** Positive integer

### Exercise Weight
- **Range:** 0-500 kg (0-1000 lb)
- **Format:** Decimal number
- **Validation:** Non-negative, unit-specific max

### Schedule Days
- **Values:** 0-6 (Sunday-Saturday)
- **Format:** Array of integers
- **Validation:** Valid day numbers, optional

---

## Error Messages Tested

### Program Creation
- "Programnavn er påkrevd" - Name required
- "Minst en øvelse er påkrevd" - At least one exercise required
- "Treningsprogram opprettet" - Success message

### Program Update
- "Program oppdatert" - Update successful
- "Program ikke funnet" - 404 error
- "Ingen tilgang til dette programmet" - 403 authorization

### Program Deletion
- "Slett Program?" - Confirmation dialog
- "Er du sikker på at du vil slette..." - Confirmation message
- "Program slettet" - Deletion successful

### Template Operations
- "Program lagret som mal" - Template save successful
- "Maler" - Template list title
- "Velg Mal" - Template selection title

### Exercise Operations
- "Legg til øvelse" - Add exercise button
- "Øvelse lagt til program" - Exercise added
- "Øvelse fjernet fra program" - Exercise removed

### Network Errors
- "Nettverksfeil" - Network error
- "Kunne ikke koble til serveren" - Server connection error
- "Forespørsel tok for lang tid" - Timeout error

---

## Data Validation Examples

### Valid Program Creation Request
```json
{
  "name": "Push Day",
  "description": "Chest, shoulders, triceps",
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

### Valid Program Update Request
```json
{
  "name": "Push Day v2",
  "description": "Updated description",
  "isActive": true
}
```

### Invalid Program Request (Missing Name)
```json
{
  "description": "No name provided",
  "exercises": []
}
// Error: 400 - "Programnavn er påkrevd"
```

---

## Testing Tools & Techniques

### Manual Testing
1. **Using Test Documents**
   - Follow WORKOUT_TEST_CASES.md step-by-step
   - Check off acceptance criteria
   - Record results in tracking table

2. **Network Monitoring**
   - Use browser dev tools (F12)
   - Monitor Network tab during operations
   - Verify request/response payloads
   - Check response status codes

3. **Error Injection**
   - Turn off network for timeout testing
   - Enter invalid data for validation testing
   - Try unauthorized operations for auth testing

### Automated Testing (Future)
- Use Jest for unit tests
- Use Detox for E2E tests
- Use Postman/Insomnia for API testing
- Monitor logs with Winston/Pino

---

## Common Test Scenarios

### Scenario 1: New User Workflow
1. Login → Programs tab (empty) → Create first program
2. Use template or create manually
3. Add 3-5 exercises
4. Select schedule days
5. Save program
6. View in list
7. Edit and add more exercises
8. Save as template
9. Create new program from template

### Scenario 2: Program Management
1. Load all programs
2. View program details
3. Edit program name
4. Add new exercise
5. Remove exercise
6. Update exercise sets/reps
7. Change schedule
8. Save changes
9. Verify updated in list

### Scenario 3: Error Handling
1. Try save with no name → Error shown
2. Try delete → Confirm → Verify deleted
3. Turn off network during save → Timeout error
4. Enter negative weight → Validation error
5. Select no exercises → Save blocked

---

## Performance Testing Considerations

### Metrics to Monitor
- Program list load time (target: <2s)
- Template list load time (target: <2s)
- Program creation time (target: <3s)
- Exercise search time (target: <1s)
- Large program with 20+ exercises load time

### Test Scenarios
- User with 50+ programs
- Program with 20+ exercises
- Template list with many personal templates
- Slow network conditions (3G)
- Large payload responses

---

## Security Testing Checklist

- [ ] User can only view own programs
- [ ] User cannot edit other users' programs
- [ ] User cannot delete other users' programs
- [ ] SQL injection attempts rejected
- [ ] XSS attempts handled safely
- [ ] Negative numbers validated
- [ ] Large numbers rejected (limits enforced)
- [ ] Tenant isolation maintained
- [ ] Authorization headers required
- [ ] Authentication tokens validated

---

## Known Limitations & TODOs

### Current Implementation
- Programs are owned by individual users
- Templates can be personal or system-wide
- No program sharing between users (by design)
- No program versioning/history
- No bulk operations

### Future Enhancements
- [ ] Program collaboration/sharing
- [ ] Program versioning
- [ ] Bulk import/export
- [ ] Advanced filtering and sorting
- [ ] Program cloning
- [ ] Scheduled notifications
- [ ] Progress tracking graphs

---

## Document Maintenance

**Last Updated:** November 2, 2025
**Maintained By:** QA Team
**Review Schedule:** Before each major release

### Changes Log
| Date | Change | Author |
|------|--------|--------|
| 2025-11-02 | Initial comprehensive test documentation | QA Team |

---

## Quick Links for Developers

### Testing
- **Test Cases:** See WORKOUT_TEST_CASES.md
- **API Specs:** See WORKOUT_SCREEN_TESTS.md Section 2
- **Error Messages:** See WORKOUT_SCREEN_TESTS.md Section 1

### Implementation
- **Frontend Component:** `/frontend/src/screens/WorkoutScreen.tsx`
- **API Service:** `/frontend/src/services/api.ts`
- **Backend Controller:** `/backend/src/controllers/workout.controller.ts`
- **Backend Routes:** `/backend/src/routes/workout.routes.ts`

### Database
- **Models:** Check Prisma schema for WorkoutProgram, WorkoutProgramExercise, etc.
- **Migrations:** Latest migration handles workout tables

---

## Support & Questions

**For Test Case Questions:**
- Refer to WORKOUT_TEST_CASES.md for detailed steps

**For API Specifications:**
- Refer to WORKOUT_SCREEN_TESTS.md Section 2

**For Error Handling:**
- Refer to WORKOUT_SCREEN_TESTS.md Sections 4 & 6

**For Backend Logs:**
- Check backend console/logs during test execution
- Look for error messages matching documented scenarios

---

**End of Index**

---

## Document Files Generated

All test documentation files are located in:
`/Users/johnmichaelobligar/Documents/Development/ObliKey/`

1. **WORKOUT_SCREEN_TESTS.md** (37KB) - Comprehensive checklist
2. **WORKOUT_TEST_CASES.md** (31KB) - Detailed test cases
3. **WORKOUT_TESTING_INDEX.md** (this file) - Quick reference guide

**Total:** 3,071 lines of test documentation
