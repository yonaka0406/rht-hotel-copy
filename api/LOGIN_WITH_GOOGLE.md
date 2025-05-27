# Login with Google Feature

## 1. Feature Overview

This feature enables users from a specific Google Workspace organization to sign up or log in to the application using their existing Google accounts. It streamlines the authentication process by leveraging Google's robust security infrastructure and providing a familiar login experience.

**Key Technologies Used:**

*   **Backend:** Node.js with Express.js
*   **Frontend:** Vue.js (specifically Vue 3 with Vite, PrimeVue, and Pinia for state management)
*   **Database:** PostgreSQL
*   **Authentication Protocol:** Google OAuth 2.0

## 2. Configuration

Proper configuration is crucial for the "Login with Google" feature to function correctly and securely. This involves setting up environment variables for both the backend and frontend, and configuring credentials within the Google Cloud Console.

### Environment Variables

Ensure you have `.env` files in both your backend and frontend project roots, based on their respective `.env.example` files.

**Backend (`.env` file):**

```env
# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/google/callback" # Or your production URL

# JWT Secret for signing application-specific tokens
JWT_SECRET="YOUR_SUPER_SECRET_JWT_KEY"

# Session Secret (for OAuth state CSRF protection)
SESSION_SECRET="YOUR_STRONG_SESSION_SECRET_FOR_OAUTH_STATE"

# Google Workspace Domain for hosted domain (hd) restriction
YOUR_WORKSPACE_DOMAIN="yourcompany.com"

# PostgreSQL Database Connection
DB_USER="your_db_user"
DB_PASSWORD="your_db_password"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="your_db_name"

# Optional: Port for the backend server
PORT=3000

# Frontend URL for redirect after successful login
FRONTEND_URL="http://localhost:5173/auth/callback" # Or your production frontend callback URL
```

**Frontend (Vite `.env` file):**

```env
# URL of your backend API
VITE_API_BASE_URL="http://localhost:3000" # Or your production API URL

# Full base URL of your backend (used for constructing the Google auth redirect)
VITE_BACKEND_URL="http://localhost:3000" # Or your production backend URL
```

### Google Cloud Console Setup

1.  **Navigate to Google Cloud Console:** Go to "APIs & Services" -> "Credentials".
2.  **Create OAuth Client ID:**
    *   Click "CREATE CREDENTIALS" and select "OAuth client ID".
    *   Choose "Web application" as the application type.
    *   Give it a name (e.g., "My App Web Client").
3.  **Authorized JavaScript Origins:**
    *   Add the URL of your frontend application (e.g., `http://localhost:5173` for development, or your production frontend URL). This is important for applications that use Google's client-side libraries, though for a purely backend-handled redirect flow, it's good practice.
4.  **Authorized Redirect URIs:**
    *   **Crucially**, add the backend's callback URL. This must exactly match the `GOOGLE_CALLBACK_URL` environment variable (e.g., `http://localhost:3000/auth/google/callback` or your production equivalent).
5.  **Save Credentials:** After creation, copy the "Client ID" and "Client Secret" and set them as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in your backend's `.env` file.
6.  **Configure OAuth Consent Screen:**
    *   Go to "APIs & Services" -> "OAuth consent screen".
    *   **User Type:** Select "Internal". This restricts authentication to users within your Google Workspace organization, which is a key requirement for this feature.
    *   Fill in the application name, user support email, and developer contact information.
    *   Scopes are typically requested by the application dynamically, so explicit configuration here might not be needed unless specific APIs are used directly from the consent screen setup.
    *   Save the configuration.

## 3. Database Changes

The integration of Google authentication requires modifications to the `users` table to accommodate Google-specific user information and differentiate between locally authenticated and Google-authenticated users.

These changes are detailed in the `migration_script.sql` file.

**Summary of `users` table modifications:**

*   **`password_hash` (VARCHAR(255))**: This column was made `NULLABLE`. For users signing in via Google, a local password hash is not stored.
*   **`auth_provider` (VARCHAR(50))**: A new column added with a `DEFAULT` value of `'local'`. For users authenticated via Google, this will be set to `'google'`. It is `NOT NULL`.
*   **`provider_user_id` (VARCHAR(255))**: A new column added, which is `NULLABLE`. This column stores the unique user identifier provided by Google (the `sub` claim from the ID token).

## 4. Backend Implementation Details (Node.js/Express)

The backend handles the core OAuth 2.0 flow, communication with Google, user record management, and JWT generation.

**Key Files:**

*   `app.js`: Express application setup, including session middleware for CSRF protection.
*   `routes/auth.js`: Defines the authentication endpoints and logic.
*   `config/oauth.js`: Initializes the Google OAuth2 client.
*   `db.js`: PostgreSQL connection management.

**Endpoints:**

*   **`GET /auth/google`**
    *   Initiates the Google OAuth 2.0 authentication flow.
    *   Generates a unique, random `state` string for CSRF (Cross-Site Request Forgery) protection and stores it in the user's session (`req.session.oauth_state`).
    *   Redirects the user's browser to the Google OAuth consent screen.
    *   Includes the `hd` (hosted domain) parameter in the redirect URL to Google, restricting login to the domain specified in `YOUR_WORKSPACE_DOMAIN`.
    *   Includes the `state` parameter in the redirect URL.

*   **`GET /auth/google/callback`**
    *   Handles the callback from Google after the user authenticates.
    *   **CSRF Protection:** Verifies the `state` parameter returned by Google against the `state` value stored in the session. If they don't match, the request is aborted (403 Forbidden).
    *   Exchanges the received authorization `code` for Google API tokens (access token, refresh token, ID token).
    *   **ID Token Validation:** Verifies the `id_token` received from Google using `google-auth-library`. This includes checking the signature, audience (`aud` should match `GOOGLE_CLIENT_ID`), issuer (`iss`), and expiry (`exp`).
    *   **Hosted Domain Check:** Critically, it also verifies the `hd` (hosted domain) claim within the ID token payload to ensure it matches `YOUR_WORKSPACE_DOMAIN`.
    *   Retrieves user information (Google ID, email, name) from the ID token payload.
    *   Calls user handling logic (see below).
    *   Generates a JWT (JSON Web Token) containing essential user claims (e.g., user ID, email, role).
    *   Redirects the user's browser to the frontend application's callback URL (`FRONTEND_URL`), passing the JWT as a query parameter (e.g., `?token=<JWT>`).

**User Handling Logic:**

1.  **Find by Google ID:** Attempts to find an existing user in the `users` table where `provider_user_id` matches the Google user ID and `auth_provider` is 'google'.
2.  **Find by Email (if not found by Google ID):**
    *   If no user is found, it searches for a user with a matching `email`.
    *   **Link Existing Local Account:** If a user exists with that email and `auth_provider` is 'local', the account is linked:
        *   `auth_provider` is updated to 'google'.
        *   `provider_user_id` is set to the Google user ID.
        *   `password_hash` is set to `NULL` as Google now manages authentication.
    *   **Conflict:** If an email match is found but the account is already linked to a *different* Google account, an error (409 Conflict) is returned.
3.  **Create New User:** If no user is found by Google ID or email, a new user record is created in the `users` table:
    *   `email`, `name` (from Google profile).
    *   `auth_provider` set to 'google'.
    *   `provider_user_id` set to the Google user ID.
    *   Default `status_id` and `role_id` are assigned.

**Security Measures:**

*   **CSRF Protection:** The `state` parameter is used in the OAuth flow to prevent cross-site request forgery attacks.
*   **ID Token Validation:** Thorough validation of the Google ID token ensures its authenticity and integrity.
*   **Hosted Domain (`hd`) Restriction:** Enforces that only users from the specified Google Workspace can log in.
*   **JWT Security:** Uses strong secrets (`JWT_SECRET`) for signing JWTs, with appropriate expiration times. JWTs are transmitted via HTTPS in production.
*   **Session Security:** Uses `express-session` with secure cookie settings (`httpOnly`, `secure` in production, `sameSite: 'lax'`) for managing the OAuth `state`.

## 5. Frontend Implementation Details (Vue.js)

The frontend provides the user interface for initiating the login and handles the token received from the backend.

**Key Files/Directories:**

*   `src/components/LoginButton.vue`: The UI button to start the Google login.
*   `src/views/AuthCallback.vue`: A view/page to handle the redirect from the backend.
*   `src/stores/auth.js` (Pinia): State management for authentication (token, user data, status).
*   `src/services/api.js`: Axios instance for making API calls, configured to include the JWT.
*   `src/router/index.js`: Vue Router setup, including navigation guards for protected routes.

**Components/Views:**

*   **`LoginButton.vue`:**
    *   Displays a "Login with Google" button.
    *   When clicked, it redirects the browser to the backend's `GET /auth/google` endpoint, effectively starting the OAuth flow. The backend URL is typically configured via `VITE_BACKEND_URL`.

*   **`AuthCallback.vue` (Route: `/auth/callback`):**
    *   This page is the destination for the redirect from the backend after successful Google authentication.
    *   It extracts the JWT from the URL query parameter (`?token=<JWT>`).
    *   Calls the Pinia `authStore.login(token)` action to:
        *   Store the JWT in `localStorage`.
        *   Decode the JWT (using `jwt-decode`) to extract user information (ID, email, name, role).
        *   Update the Pinia store's state (`token`, `user`, `isAuthenticated`).
        *   Redirect the user to their dashboard or intended page.
    *   Handles potential errors passed in URL parameters from the backend.

**State Management (Pinia - `stores/auth.js`):**

*   `token`: Stores the JWT.
*   `user`: Stores user information decoded from the JWT.
*   `isAuthenticated`: Boolean flag indicating authentication status.
*   `login(token)` action: Processes the JWT, updates state, and stores data in `localStorage`.
*   `logout()` action: Clears token and user data from state and `localStorage`, redirects to login.
*   `checkAuth()` action: Called on application startup to initialize auth state from `localStorage` and verify token expiry.

**API Calls (`services/api.js`):**

*   An `axios` instance (`apiClient`) is configured.
*   A request interceptor automatically adds the JWT (from `authStore.token`) as an `Authorization: Bearer <JWT>` header to all outgoing API requests.
*   A response interceptor can handle global API error responses (e.g., logging out the user on a 401 error).

**Routing (`router/index.js`):**

*   Defines routes, including `/auth/callback` for `AuthCallback.vue`.
*   Implements navigation guards (`router.beforeEach`):
    *   Protects routes marked with `meta: { requiresAuth: true }`. If a user is not authenticated, they are redirected to the login page, and their intended destination is stored (`authStore.setReturnUrl()`).
    *   Prevents authenticated users from accessing guest-only pages (e.g., login page, marked with `meta: { requiresGuest: true }`).

## 6. Authentication Flow Summary

1.  **User Action:** The user clicks the "Login with Google" button on the frontend.
2.  **Frontend Redirect to Backend:** The browser is redirected to the backend's `GET /auth/google` endpoint.
3.  **Backend Redirect to Google:** The backend generates a `state` for CSRF protection (stored in session), then redirects the user's browser to the Google OAuth 2.0 consent screen. The `hd` parameter is included to filter by the specified Google Workspace domain.
4.  **User Authentication with Google:** The user selects their Google account and authenticates with Google. They may be asked to grant permissions if it's the first time.
5.  **Google Redirect to Backend Callback:** Google redirects the user's browser back to the backend's `GET /auth/google/callback` endpoint, providing an authorization `code` and the `state` parameter.
6.  **Backend Processing:**
    *   The backend verifies the `state` parameter against the value stored in the session.
    *   It exchanges the authorization `code` for an ID token and access token from Google.
    *   It validates the ID token (signature, audience, issuer, expiry, and the `hd` claim).
    *   It processes the user: finds an existing user (by Google ID or email) or creates a new one in the PostgreSQL database.
    *   It generates a JWT containing the user's identity and role information.
7.  **Backend Redirect to Frontend Callback:** The backend redirects the user's browser to the frontend's callback route (e.g., `/auth/callback`), appending the generated JWT as a query parameter (`?token=<JWT>`).
8.  **Frontend Processing:**
    *   The frontend's `AuthCallback.vue` component extracts the JWT from the URL.
    *   The JWT is stored in `localStorage` and the Pinia `authStore` is updated with the token and user details.
    *   The user is redirected to their dashboard or the originally requested protected route.
9.  **Authenticated API Calls:** Subsequent API calls from the frontend to the backend will include the JWT in the `Authorization` header, allowing the backend to verify the user's identity.
```
