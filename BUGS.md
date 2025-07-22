# Bug Tracking Document

## Overview
This document tracks all reported bugs and issues in the RHT Hotel system.

## Bug Reports

### December 19, 2024

#### Bug #1
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: Calendar View scroll position doesn't reset when date is changed
- **Steps to Reproduce**: 
  1. Open calendar view
  2. Scroll down to view content lower in the page
  3. Change/update the date selection
  4. Observe that the date range updates but scroll position remains at the previous location
- **Expected Behavior**: When a date is changed, the scroll position should automatically return to the top to match the newly selected date
- **Actual Behavior**: Date range updates correctly, but scroll position stays where it was, causing misalignment between selected date and visible content
- **Environment**: 
- **Additional Notes**: The date filtering functionality works properly, but the scroll position needs to reset to top when date changes for better user experience

#### Bug #2
- **Status**: [ ] Open [ ] In Progress [x] Fixed [ ] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: Calendar View needs visual lines/borders in room cells for better visibility
- **Steps to Reproduce**: 
  1. Open calendar view
  2. Look at the room cells/rows
  3. Observe that there are no clear visual separators between rooms
- **Expected Behavior**: Room cells should have visible lines/borders to clearly separate and identify different rooms
- **Actual Behavior**: Room cells lack visual boundaries, making it difficult to distinguish between different rooms
- **Environment**: 
- **Additional Notes**: Visual clarity of the calendar view has been improved as requested. (Fixed on December 19, 2024)

#### Bug #3 / Feature Request
- **Status**: [ ] Open [x] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: When a room change is made in フリー移動 (Free Move) mode and the room type changes, show a confirmation prompt summarizing the change before applying it.
- **Steps to Reproduce**:
  1. Enter フリー移動 (Free Move) mode in the calendar view.
  2. Change a reservation to a room with a different room type.
  3. Observe that no confirmation is currently shown.
- **Expected Behavior**: If the room type changes during a free move, a confirmation dialog should appear, summarizing the old and new room types, and only proceed if the user confirms.
- **Actual Behavior**: No confirmation is shown; the change is applied immediately.
- **Environment**: 
- **Additional Notes**: This is to prevent accidental room type changes during free move operations. Spec created at `.kiro/specs/room-change-confirmation/`.

#### Bug #4 / Feature Request
- **Status**: [ ] Open [ ] In Progress [x] Fixed [ ] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: Romaji auto-capitalization should preserve all-uppercase input (e.g., 'NTT' should not become 'Ntt').
- **Steps to Reproduce**:
  1. Create a new client and enter an all-uppercase company name (e.g., 'NTT') in the Romaji field.
  2. Observe that it is auto-capitalized to 'Ntt'.
- **Expected Behavior**: All-uppercase input should be preserved as entered by the user.
- **Actual Behavior**: All-uppercase input is auto-capitalized to only the first letter being uppercase.
- **Environment**: 
- **Additional Notes**: This is important for company names and acronyms that are conventionally written in all caps.

#### Bug #5
- **Status**: [ ] Open [ ] In Progress [x] Fixed [ ] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: After creating a hold reservation and navigating to ReservationEdit, the client cannot be edited immediately without refreshing the page.
- **Steps to Reproduce**:
  1. Create a hold reservation.
  2. When redirected to the ReservationEdit page, try to edit the client.
  3. Observe that editing is not possible until the page is refreshed.
- **Expected Behavior**: The client should be editable immediately after creating a hold reservation, without needing to refresh the page.
- **Actual Behavior**: The client cannot be edited until the page is refreshed.
- **Environment**: 
- **Additional Notes**: This may be due to stale state or missing data reload after navigation.

#### Bug #6
- **Status**: [ ] Open [ ] In Progress [x] Fixed [ ] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: Addon is not reflected in the reservation edit page when added from the プラン・機関編集 (Plan/Addon Edit) button, but appears when added from the day details.
- **Steps to Reproduce**:
  1. Open a reservation and use the プラン・機関編集 button to add an addon.
  2. Observe that the addon does not appear in the reservation edit page.
  3. Add an addon from the day details instead.
  4. Observe that the addon appears correctly.
- **Expected Behavior**: Addons added from either method should appear immediately in the reservation edit page.
- **Actual Behavior**: Addons added from プラン・機関編集 do not appear, but those added from day details do.
- **Environment**: 
- **Additional Notes**: This may be due to a missing state update or data fetch after editing via the plan/addon dialog.

#### Feature Request #7
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: Implement a 'Copy Reservation' function that allows copying a reservation to a different booker, keeping all other reservation details the same.
- **Steps to Reproduce**:
  1. Select a reservation.
  2. Use the 'Copy to a different booker' function.
  3. Choose a new booker/client.
  4. Confirm that a new reservation is created with the same details but a different booker.
- **Expected Behavior**: The system should allow users to duplicate a reservation for a different booker, with all other details (dates, rooms, addons, etc.) copied.
- **Actual Behavior**: Backend implementation completed. Frontend UI integration in progress.
- **Environment**: 
- **Additional Notes**: Backend functionality for copying reservations including all rates, addons, and details has been implemented and tested. Spec created at `.kiro/specs/reservation-copy-feature/`.

#### Bug #8 / Feature Request
- **Status**: [ ] Open [ ] In Progress [x] Fixed [ ] Closed
- **Priority**: [x] Low [ ] Medium [ ] High [ ] Critical
- **Description**: When exporting the meals quantity report and there are no addons, the toast response should be more informative (e.g., 'No meal data to export') instead of a generic or silent response.
- **Steps to Reproduce**:
  1. Attempt to export the meals quantity report when there are no meal addons in the selected period.
  2. Observe the toast or lack of feedback.
- **Expected Behavior**: The user should see a clear message like 'No meal data to export' if there are no relevant addons.
- **Actual Behavior**: The toast is generic or missing, which can be confusing.
- **Environment**: 
- **Additional Notes**: Improves user experience and reduces confusion when no data is available for export.

#### Bug #9
- **Status**: [ ] Open [ ] In Progress [x] Fixed [ ] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: The count of addons (especially meals) may not be correct in the all reservations export CSV. For the same period, reservation_details CSV showed meal addons that did not appear in the meals report, indicating a possible data extraction or filtering bug.
- **Steps to Reproduce**:
  1. Export the all reservations CSV and the reservation_details CSV for the same period.
  2. Compare the count of meal addons in both files.
  3. Observe that meal addons present in reservation_details may be missing or miscounted in the all reservations export and meals report.
- **Expected Behavior**: All meal addons should be correctly counted and appear in both the all reservations export and the meals report for the same period.
- **Actual Behavior**: Meal addons are missing or miscounted in the all reservations export and meals report.
- **Environment**: 
- **Additional Notes**: This may be due to a bug in the data extraction or filtering logic for exports and reports.

#### Feature Request #10
- **Status**: [ ] Open [x] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: Create a page for part-time staff that displays only limited, essential information in a defined format, such as in/out clients and rooms for the week.
- **Steps to Reproduce**:
  1. Log in as a part-time staff member.
  2. Access the dedicated part-time staff page.
  3. View a simple, clear list of clients/rooms checking in and out for the week.
- **Expected Behavior**: Part-time staff see only the information they need (e.g., in/out clients and rooms for the week) in a clear, defined format.
- **Actual Behavior**: No such dedicated page currently exists.
- **Environment**: 
- **Additional Notes**: This will help part-time staff focus on their tasks without being overwhelmed by unnecessary details. Spec created at `.kiro/specs/part-time-staff-dashboard/`.

#### Feature Request #11
- **Status**: [ ] Open [ ] In Progress [x] Fixed [ ] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: Remove the requirement to have a reservation client in order to perform check-in.
- **Steps to Reproduce**:
  1. Attempt to check in a reservation without a client assigned.
  2. Observe that the system currently requires a client to be set.
- **Expected Behavior**: It should be possible to perform check-in even if no reservation client is assigned.
- **Actual Behavior**: The system currently blocks check-in if there is no client assigned.
- **Environment**: 
- **Additional Notes**: This will make the check-in process more flexible for cases where a client is not yet registered or known at the time of check-in.

#### Feature Request #12
- **Status**: [ ] Open [x] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: Add indicators in the calendar view for (1) clients who can have their room moved, and (2) clients who do not have a preference for room type. These indicators should be easily visible in the calendar.
- **Steps to Reproduce**:
  1. Open the calendar view.
  2. Look for reservations with clients who can have their room moved or have no room type preference.
- **Expected Behavior**: There are clear, easily visible indicators in the calendar for these two client types.
- **Actual Behavior**: No such indicators currently exist.
- **Environment**: 
- **Additional Notes**: This will help staff quickly identify flexible clients and optimize room assignments. Spec created at `.kiro/specs/calendar-visual-indicators/`.

#### Feature Request #13
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: Add a legend to the Calendar view explaining the meaning of all icons used.
- **Steps to Reproduce**:
  1. Open the calendar view.
  2. Observe the icons used for reservations, statuses, and indicators.
  3. Look for a legend explaining their meaning.
- **Expected Behavior**: There is a clear, accessible legend in the calendar view that explains all icons and their meanings.
- **Actual Behavior**: No such legend currently exists.
- **Environment**: 
- **Additional Notes**: This will help users quickly understand the meaning of icons and improve usability.

### July 21, 2025

#### Bug #13
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: The user opened a 3 room reservation and tried to edit one room to a different check in check out period. In the calendar view, when that happens the different room is moved to a new reservation. In the ReservationEdit the same behaviour was expected, but nothing happens.
- **Steps to Reproduce**: 
  1. Open a reservation with multiple rooms.
  2. Edit one room to have a different check-in/check-out period.
  3. Observe that the room is not moved to a new reservation.
- **Expected Behavior**: When a room's check-in/check-out period is changed to be different from the other rooms in the reservation, it should be moved to a new reservation.
- **Actual Behavior**: The room's dates are changed, but it is not moved to a new reservation.
- **Environment**: ReservationEdit
- **Additional Notes**: This behavior is inconsistent with the calendar view, where a new reservation is created in this scenario.

### July 15, 2025

#### Bug #10
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: After deleting a reservation, the confirmation prompt '保留中予約を削除してもよろしいですか?' remains on screen instead of closing automatically.
- **Steps to Reproduce**:
  1. Attempt to delete a hold reservation (保留中予約).
  2. Confirm the deletion in the prompt.
  3. Observe that the prompt does not close after the reservation is deleted.
- **Expected Behavior**: The confirmation prompt should close automatically after the reservation is deleted.
- **Actual Behavior**: The prompt remains visible even after deletion.
- **Environment**: 
- **Additional Notes**: This can confuse users, making them think the action was not completed.

#### Feature Request #14
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: Add a function to send fax (via email) to the client through the reservation Panel splitbutton.
- **Steps to Reproduce**:
  1. Open the reservation Panel.
  2. Use the splitbutton for reservation actions.
  3. Select the new 'Send Fax' option.
- **Expected Behavior**: The system should allow sending a fax (via email gateway) to the client directly from the reservation panel.
- **Actual Behavior**: This functionality does not currently exist.
- **Environment**: 
- **Additional Notes**: Useful for quickly sending reservation confirmations or details to clients who require fax communication.

#### Feature Request #15
- **Status**: [ ] Open [x] In Progress [ ] Fixed [x] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: Add a FAQ page of the system with instructions for the use of the system.
- **Steps to Reproduce**:
  1. Access the system.
  2. Navigate to the FAQ page.
  3. View instructions and answers to common questions about system usage.
- **Expected Behavior**: Users can easily find instructions and answers to common questions about system usage.
- **Actual Behavior**: No FAQ page currently exists.
- **Environment**: 
- **Additional Notes**: This will help new and existing users understand how to use the system efficiently. Comprehensive spec created at `.kiro/specs/about-and-faq-system/` including FAQ functionality and Japanese changelog display.

### Bug #11
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: After a psql server DoS and restart, OTA reservations were added multiple times because confirmation was not sent to the OTA. This resulted in duplicate reservations and failures when attempting to edit the reservation.
- **Steps to Reproduce**:
  1. Experience a psql server outage (e.g., due to DoS).
  2. Restart the psql server.
  3. Observe that OTA reservations are added, but confirmation is not sent to the OTA.
  4. Multiple copies of the same reservation are created.
  5. Attempt to edit the reservation and observe that the edit fails.
- **Expected Behavior**: OTA reservations should be confirmed and not duplicated after a server restart. Editing should work as expected.
- **Actual Behavior**: Multiple copies of the same reservation are created, and editing fails.
- **Environment**: psql server outage and restart, OTA integration
- **Additional Notes**: This can cause significant data integrity issues and confusion for both staff and clients. Needs a mechanism to prevent duplicate OTA reservations after server recovery.

### Bug #12
- **Status**: [x] Fixed [ ] Open [ ] In Progress [x] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: The PrimeVue ConfirmDialog in the ReservationPayments component did not close automatically after adding or deleting a payment, causing the dialog to remain visible and confuse users. This was fixed by programmatically closing the dialog after the action. All Confirm dialogs in the system should be checked to ensure they close properly after actions.
- **Steps to Reproduce**:
  1. Attempt to add or delete a payment in the ReservationPayments component.
  2. Confirm the action in the dialog.
  3. Observe that the dialog remains open after the action is completed.
- **Expected Behavior**: The confirmation dialog should close automatically after the action is performed.
- **Actual Behavior**: The dialog remained visible after the action.
- **Environment**: ReservationPayments.vue, PrimeVue ConfirmDialog
- **Additional Notes**: This issue may affect other Confirm dialogs in the system and should be checked throughout the application.

### Feature Request #16
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: Implement a room type hierarchy to systematically identify upgrades and support business logic for OTA reservations. When a requested room type is unavailable, the system should be able to upgrade the client based on the hierarchy. Additionally, improve the OTA import logic: convert OTA XML reservation data to PMS format and save in a temp table, attempt to add to PMS reservations, and if any fail, cache the data and only clear the cache upon successful confirmation to the OTA. Notify users of unimported data in PMS, allowing them to change room types before the next OTA retry, which would use the updated mapping.
- **Steps to Reproduce**:
  1. Receive an OTA reservation for an unavailable room type.
  2. System should identify possible upgrades using the room type hierarchy.
  3. OTA XML data is converted and saved in a temp table.
  4. If PMS import fails, data is cached and not cleared until OTA confirmation is successful.
  5. User is notified of unimported data and can adjust room types in PMS.
  6. On next OTA retry, the updated mapping is used.
- **Expected Behavior**: Room upgrades are handled systematically, OTA import is robust, and users are notified of and can resolve import issues.
- **Actual Behavior**: No room type hierarchy, OTA keeps sending duplicate reservations if import fails, and users are not notified of unimported data.
- **Environment**: OTA integration, PMS import logic
- **Additional Notes**: This will prevent duplicate reservations, improve upgrade handling, and provide better user feedback and control over OTA import issues.

---

## Bug Status Legend
- **Open**: Bug reported, not yet assigned
- **In Progress**: Bug is being worked on
- **Fixed**: Bug has been resolved, pending verification
- **Closed**: Bug has been verified as fixed

## Priority Levels
- **Low**: Minor issue, doesn't affect core functionality
- **Medium**: Noticeable issue, affects user experience
- **High**: Significant issue, affects core functionality
- **Critical**: Blocking issue, prevents system from working properly

---

*Last Updated: July 22, 2025*
*Total Bugs: 13*
*Open: 4*
*Fixed: 9*

# Backlog

The following bugs and feature requests are not yet completed (status: Open or In Progress):

#### Bug #3 / Feature Request
- **Status**: [ ] Open [x] In Progress [ ] Fixed [ ] Closed
- **Description**: When a room change is made in フリー移動 (Free Move) mode and the room type changes, show a confirmation prompt summarizing the change before applying it.

#### Feature Request #10
- **Status**: [ ] Open [x] In Progress [ ] Fixed [ ] Closed
- **Description**: Create a page for part-time staff that displays only limited, essential information in a defined format, such as in/out clients and rooms for the week.

#### Feature Request #12
- **Status**: [ ] Open [x] In Progress [ ] Fixed [ ] Closed
- **Description**: Add indicators in the calendar view for (1) clients who can have their room moved, and (2) clients who do not have a preference for room type.

#### Feature Request #14
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**: Add a function to send fax (via email) to the client through the reservation Panel splitbutton. 