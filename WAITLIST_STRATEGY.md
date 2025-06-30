# Waitlist Feature: UX/UI Design

This document outlines the user experience (UX) and user interface (UI) design for the waitlist functionality within the Hotel Management System.

## 1. Overview

The waitlist feature allows clients to register their interest in a fully booked room type for specific dates. If a room becomes available due to a cancellation, clients on the waitlist can be notified and given an opportunity to book the room.

## 2. Adding a Client to the Waitlist

There are two primary scenarios where a client can be added to the waitlist:

### 2.1. Scenario A: Proactive Addition by Staff

Hotel staff (e.g., reservation agents) can manually add a client to the waitlist.

*   **UI Location:**
    *   A new section or tab labeled 「順番待ちリスト」 (Waitlist) will be available within the main reservation management interface or CRM section.
    *   This section will feature an 「順番待ちに追加」 (Add to Waitlist) button.
*   **Process:**
    1.  Staff clicks 「順番待ちに追加」.
    2.  A modal dialog or dedicated form appears, requesting the following information (all UI text in Japanese):
        *   **顧客選択** (Select Client): Search and select an existing client or create a new client profile.
        *   **ホテル選択** (Select Hotel): Dropdown to select the relevant hotel.
        *   **希望部屋タイプ** (Desired Room Type): Dropdown listing room types for the selected hotel.
        *   **希望チェックイン日** (Desired Check-in Date): Date picker.
        *   **希望チェックアウト日** (Desired Check-out Date): Date picker.
        *   **宿泊人数** (Number of Guests): Input field.
        *   **連絡用メールアドレス** (Contact Email Address): Pre-filled from client profile, editable.
        *   **電話番号** (Phone Number): Pre-filled from client profile, editable.
        *   **備考** (Notes): Optional text area for any specific requests or comments from the client.
    3.  Upon submission, the client is added to the waitlist for the specified room type and dates.
    4.  A confirmation message 「顧客が順番待ちリストに追加されました。」 (Client added to waitlist.) is displayed to the staff.
    5.  **(Optional but Recommended):** An automated email is sent to the client confirming their addition to the waitlist, including their requested details. Email subject: 「順番待ちリスト登録完了のお知らせ」 (Waitlist Registration Confirmation).

### 2.2. Scenario B: Client Request During Booking Attempt (Room Unavailable)

When a client (or staff on behalf of a client) attempts to book a room type that is unavailable for the selected dates:

*   **UI Location:** Integrated into the existing reservation/booking interface.
*   **Process:**
    1.  After selecting dates, room type, and number of guests, if the system determines no availability, the standard "No rooms available" message will be shown.
    2.  Alongside this message, a new button/option will appear: 「順番待ちに登録しますか？」 (Add to Waitlist?).
    3.  Clicking this button will:
        *   If the client is logged in or their details are already known: Pre-fill a simplified waitlist form (modal) with the attempted booking details (dates, room type, guests). The client may only need to confirm their contact email.
        *   If the client is anonymous or details are missing: Open a similar form as in Scenario A, but with dates, room type, and guests pre-filled from the booking attempt.
    4.  Upon submission, the client is added to the waitlist.
    5.  A confirmation message 「順番待ちリストに登録されました。空室が出次第ご連絡いたします。」 (You have been added to the waitlist. We will contact you if a room becomes available.) is displayed.
    6.  An automated email confirming their addition to the waitlist is sent.

## 3. Staff Management of the Waitlist

*   **UI Location:** The 「順番待ちリスト」 (Waitlist) section.
*   **Features:**
    *   A table (PrimeVue DataTable) displaying all waitlist entries for the selected hotel.
    *   **Columns:**
        *   顧客名 (Client Name)
        *   希望部屋タイプ (Desired Room Type)
        *   希望チェックイン日 (Desired Check-in Date)
        *   希望チェックアウト日 (Desired Check-out Date)
        *   宿泊人数 (Guests)
        *   登録日時 (Registration Date/Time)
        *   ステータス (Status: e.g., 「待機中」Waiting, 「通知済」Notified, 「確定済」Confirmed, 「期限切れ」Expired, 「キャンセル済」Cancelled)
        *   備考 (Notes)
        *   アクション (Actions)
    *   **Filtering:** Ability to filter the list by status, date range, room type.
    *   **Actions per entry (e.g., in a menu or buttons):**
        *   **詳細表示** (View Details): Open a modal with full waitlist entry information.
        *   **ステータス変更** (Change Status): Manually change the status (e.g., if client calls to cancel).
        *   **削除** (Delete): Remove the entry from the waitlist (with confirmation).

## 4. Notification of Availability (Automated)

This is triggered when a reservation is cancelled, and the system finds a matching entry on the waitlist.

*   **Process:**
    1.  A room becomes available due to cancellation.
    2.  The system automatically searches the waitlist for matching entries (hotel, room type, overlapping dates, status 'waiting'), ordered by registration time (oldest first).
    3.  For the first matching entry:
        *   The waitlist entry status is changed to 「通知済」 (Notified).
        *   An automated email is sent to the client's registered email address.
*   **Email Content:**
    *   **Subject:** 「ご希望のお部屋に空きが出ました！」 (A Room You Requested is Now Available!)
    *   **Body (Key Information - Japanese):**
        *   Polite greeting.
        *   Notification that a room they were waitlisted for (mentioning room type, dates) is now available.
        *   A clear call to action: 「ご予約を確定するには、以下のリンクをクリックしてください。」 (To confirm your reservation, please click the link below.)
        *   A unique confirmation link.
        *   **Important:** A deadline for confirmation: 「このオファーは [日付 時刻] まで有効です。期限内にご確定いただけない場合、次の方にご案内させていただきます。」 (This offer is valid until [Date Time]. If you do not confirm by the deadline, the offer will be extended to the next person on the waitlist.) Typically 24-48 hours.
        *   Contact information for the hotel if they have questions.

## 5. Client Confirmation of Reservation from Waitlist

*   **Process:**
    1.  Client receives the notification email.
    2.  Client clicks the unique confirmation link.
    3.  The link directs them to a dedicated page on the hotel's booking website.
*   **Confirmation Page UI:**
    *   **URL:** Should be unique and tokenized (e.g., `https://[hoteldomain]/waitlist/confirm/[token]`)
    *   **Content (Japanese):**
        *   Page Title: 「順番待ち予約の確定」 (Waitlist Reservation Confirmation)
        *   Summary of the offered reservation:
            *   ホテル名 (Hotel Name)
            *   部屋タイプ (Room Type)
            *   チェックイン日 (Check-in Date)
            *   チェックアウト日 (Check-out Date)
            *   宿泊人数 (Number of Guests)
            *   合計料金 (Total Price - if applicable, or note that standard rates apply)
        *   A prominent button: 「予約を確定する」 (Confirm Reservation).
        *   A message indicating the confirmation deadline: 「この予約は [日付 時刻] までに確定してください。」 (Please confirm this reservation by [Date Time].)
        *   Option to decline: 「今回は見送る」 (Decline this time).
    4.  **Client clicks 「予約を確定する」:**
        *   The system verifies the token and deadline.
        *   The waitlist entry status is changed to 「確定済」 (Confirmed).
        *   A new reservation is created in the system based on the waitlist details.
        *   The client is redirected to a standard booking confirmation page: 「ご予約ありがとうございました。」 (Thank you for your reservation.)
        *   A standard reservation confirmation email is sent.
    5.  **Client clicks 「今回は見送る」 or if the deadline expires:**
        *   The waitlist entry status is changed to 「期限切れ」 (Expired) or 「キャンセル済」 (Cancelled by client).
        *   The system may then attempt to notify the next eligible client on the waitlist (if any).
        *   A polite message is shown: 「ご連絡ありがとうございます。またのご利用をお待ちしております。」 (Thank you for letting us know. We hope to welcome you in the future.)

## 6. Edge Cases & Considerations

*   **Multiple Openings:** If multiple rooms of the same type become available simultaneously, the system should notify clients sequentially based on their waitlist order.
*   **Partial Availability:** If a client requested a 5-night stay, but only 3 nights become available, current design would likely not notify. Further complexity could allow offering partial stays, but this is out of scope for the initial implementation.
*   **Pricing:** The price offered to the waitlisted client should be based on the rates active at the time of notification/confirmation, not necessarily at the time they joined the waitlist, unless specified otherwise by hotel policy. This should be clear in the notification email.
*   **Staff Real-time Notifications:** Staff should receive real-time notifications (e.g., via Socket.io toast messages on their dashboard) when:
    *   A client confirms a reservation from the waitlist.
    *   A waitlist notification email fails to send.
    *   A confirmation token is about to expire for a 'notified' client.

This document provides a foundational UX/UI. Further refinements can be made based on feedback and specific operational needs.

---

## Implementation Plan Details

The following outlines the planned technical steps to implement the waitlist feature:

1.  **Define Database Schema:**
    *   Create a new SQL table named `waitlist_entries`.
    *   Columns will include:
        *   `id` (Primary Key, UUID, default gen_random_uuid())
        *   `client_id` (Foreign Key referencing `clients(id)`)
        *   `hotel_id` (Foreign Key referencing `hotels(id)`)
        *   `room_type_id` (Foreign Key referencing `room_types(id)`) - Part of composite FK with `hotel_id` as `room_types` is partitioned.
        *   `requested_check_in_date` (Date)
        *   `requested_check_out_date` (Date)
        *   `number_of_guests` (Integer)
        *   `status` (Text: Enum-like check constraint for 'waiting', 'notified', 'confirmed', 'expired', 'cancelled'; default 'waiting')
        *   `notes` (Text, optional)
        *   `confirmation_token` (Text, UNIQUE - for email confirmation link)
        *   `token_expires_at` (Timestamp with time zone - for token expiry)
        *   `created_at` (Timestamp with time zone, default CURRENT_TIMESTAMP)
        *   `updated_at` (Timestamp with time zone, default CURRENT_TIMESTAMP)
        *   `created_by` (Integer, Foreign Key referencing `users(id)`)
        *   `updated_by` (Integer, Foreign Key referencing `users(id)`)
    *   Add this new table definition to `api/sql.sql`.
    *   Include constraint `chk_dates` to ensure `requested_check_out_date > requested_check_in_date`.
    *   Add indexes on `(hotel_id, status)`, `(requested_check_in_date, requested_check_out_date)`, and `(room_type_id, hotel_id)`.

2.  **Backend API Implementation (Node.js/Express.js):**
    *   **Model (`api/models/waitlistEntry.js`):**
        *   Create a new model file for waitlist entries.
        *   Implement functions for:
            *   `createWaitlistEntry(requestId, data)`
            *   `getWaitlistEntries(requestId, hotelId, filters)` (e.g., filter by status, date range)
            *   `getWaitlistEntryById(requestId, id)`
            *   `updateWaitlistEntry(requestId, id, updatedData)` (handles status, notes, token, expiry)
            *   `deleteWaitlistEntry(requestId, id)`
            *   `findMatchingWaitlistEntries(requestId, hotelId, roomTypeId, checkInDate, checkOutDate)` (to find 'waiting' entries when a cancellation occurs, ordered by `created_at`)
        *   Ensure all database interactions correctly use `requestId` for pool connection as per `instructions.md`.
    *   **Controller (`api/controllers/waitlistController.js`):**
        *   Create a new controller for waitlist operations.
        *   Implement handler functions for API endpoints, utilizing validation utilities from `api/utils/validationUtils.js` for all inputs.
            *   `POST /api/waitlist` (Create new entry)
            *   `GET /api/waitlist/hotel/:hotelId` (Get all entries for a hotel, with optional query param filters for status, startDate, endDate)
            *   `GET /api/waitlist/:id` (Get specific entry)
            *   `PUT /api/waitlist/:id` (Update status, notes, token, expiry; requires `updated_by`)
            *   `DELETE /api/waitlist/:id` (Remove entry)
            *   **(Internal/Service Call) `handleReservationCancellation(requestId, hotelId, roomTypeId, cancelledCheckInDate, cancelledCheckOutDate)`:** This function will be called by the reservations controller upon cancellation. It will use `findMatchingWaitlistEntries` and if matches are found, update the first entry to 'notified', generate a token, set expiry, and prepare for email notification.
    *   **Routes (`api/routes/waitlistRoutes.js`):**
        *   Create a new routes file to map endpoints to controller functions.
        *   Ensure routes are protected by `protect` and `authorize` middleware as appropriate (e.g., Admin/Manager for general management, specific roles for creation/viewing).
    *   **Integrate with Cancellation Process:**
        *   Modify the existing reservation cancellation logic in `api/controllers/reservationsController.js`.
        *   After a reservation is successfully cancelled and its associated room inventory is effectively freed up, call the `waitlistController.handleReservationCancellation` function with the relevant details (hotel, room type, dates of the cancelled booking).

3.  **Frontend UI Implementation (Vue.js/PrimeVue):**
    *   **Store (`frontend/src/composables/useWaitlistStore.js`):**
        *   Create a new Pinia-like composable store for managing waitlist state and API interactions.
        *   Include actions for:
            *   `fetchWaitlistEntries(hotelId, filters)`
            *   `addWaitlistEntry(data)`
            *   `fetchWaitlistEntryById(id)`
            *   `updateWaitlistEntry(id, data)`
            *   `removeWaitlistEntry(id)`
    *   **Waitlist Management Page (`frontend/src/pages/MainPage/WaitlistManagementPage.vue` or similar):**
        *   Create a new Vue component.
        *   Display waitlist entries in a PrimeVue `<DataTable>` with columns as described in UX section.
        *   Implement filtering UI (dropdown for status, date pickers for date range).
        *   Provide UI for actions (view details, change status, delete) using dialogs and forms adhering to PrimeVue/Tailwind guidelines in `instructions.md`.
        *   Ensure all UI text is in **Japanese**.
    *   **Integration with Reservation Form/Process:**
        *   Modify the existing reservation creation UI.
        *   When a booking attempt fails due to no availability, display an 「順番待ちに追加」 (Add to Waitlist) button.
        *   Clicking this button opens a PrimeVue `<Dialog>` with a form to collect/confirm waitlist details (pre-fill from booking attempt).
    *   **Waitlist Confirmation Page (`frontend/src/pages/ConfirmWaitlistPage.vue`):**
        *   Create a new page component that accepts a token from the URL path.
        *   On mount, call a backend API endpoint to validate the token.
        *   If valid: display reservation details and 「予約を確定する」 (Confirm Reservation) / 「今回は見送る」 (Decline) buttons.
        *   If invalid/expired: display an appropriate error message.
        *   Confirm action calls a backend endpoint to finalize the reservation. Decline action calls an endpoint to update status to 'cancelled'.

4.  **Notification System:** (Skipped as per user request)
    *   **Email Utility (`api/utils/emailUtils.js` or new `api/services/notificationService.js`):**
        *   Add functions to send waitlist-related emails using Nodemailer:
            *   `sendWaitlistConfirmationEmail(clientEmail, entryDetails)`: Sent when client is added to waitlist.
            *   `sendWaitlistAvailabilityEmail(clientEmail, entryDetails, confirmationLink)`: Sent when a spot opens.
            *   `sendWaitlistBookingConfirmedEmail(clientEmail, reservationDetails)`: Standard booking confirmation after client confirms from waitlist.
        *   Use HTML templates for emails (or plain text if simpler for MVP).
    *   **Backend Logic for Notification Trigger & Token Generation:**
        *   In `waitlistController.handleReservationCancellation`:
            *   When a suitable waitlist entry is found and status is to be changed to 'notified':
                *   Generate a cryptographically secure unique token (e.g., `crypto.randomBytes(32).toString('hex')`).
                *   Set an expiry time for the token (e.g., 24-48 hours from now).
                *   Store the hashed token (optional, for security) and expiry in the `waitlist_entries` table.
                *   Construct the confirmation link (e.g., `FRONTEND_URL/waitlist/confirm/[token]`)
                *   Call the email sending function.
    *   **API Endpoint for Client Confirmation (`POST /api/waitlist/confirm/:token`):**
        *   Create in `waitlistController.js` and `waitlistRoutes.js`.
        *   Accepts the token from the URL.
        *   Validates the token:
            *   Finds the waitlist entry by the (hashed) token.
            *   Checks if token is expired and status is 'notified'.
        *   If valid:
            *   Update waitlist entry status to 'confirmed'.
            *   Create a new reservation in the `reservations` and `reservation_details` tables.
            *   (Important) Ensure the room inventory is correctly updated/allocated for this new reservation.
            *   Send booking confirmation email.
            *   Return success response.
        *   If invalid: Return error response.
    *   **(Optional) Real-time Staff Notifications (Socket.io):**
        *   Emit Socket.io events from the backend in `waitlistController` or relevant services for:
            *   `waitlist_confirmed_reservation`: When a client confirms.
            *   `waitlist_notification_failed`: If email sending fails.
        *   Frontend listens for these events to display toast notifications to staff.

5.  **Testing:** (Skipped as per user request)
    *   **Backend:**
        *   Unit tests for `waitlistEntry.js` model functions (mocking `getPool`).
        *   Integration tests for `waitlistController.js` (mocking model functions or using a test database).
        *   Test the `handleReservationCancellation` logic thoroughly.
        *   Test token generation, validation, and expiry.
    *   **Frontend:**
        *   Component tests for the Waitlist Management Page and Confirmation Page.
        *   Test form submissions and store actions.
    *   **End-to-End Testing:**
        *   Full flow: Add to waitlist -> Cancel original booking -> Receive notification email -> Click link -> Confirm reservation -> Verify new reservation and updated statuses.
        *   Test edge cases: token expired, client declines, multiple waitlist entries for same room.

6.  **Documentation:**
    *   The `WAITLIST_UX_DESIGN.md` file (this file) will serve as the primary documentation for the feature's design and planned implementation.
    *   Update `README.md` or `api/README.md` if there are significant new services or configurations.

7.  **Submit Changes:**
    *   Commit changes with a clear, descriptive message (e.g., "feat: Implement waitlist functionality").
    *   Create a Pull Request for review.
    *   Address any feedback and merge once approved.