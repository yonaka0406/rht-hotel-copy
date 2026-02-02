## 2026-02-01 - SQL Injection in Dynamic Update Queries
**Vulnerability:** The `updateImpediment` function in `api/models/clients.js` was vulnerable to SQL injection through object keys. It used `Object.entries(updatedFields)` to dynamically build a `SET` clause without validating the keys.
**Learning:** Using user-provided object keys directly in SQL queries is dangerous. Even if values are parameterized, the keys themselves can contain malicious SQL.
**Prevention:** Always use a whitelist of allowed field names when building dynamic SQL queries. Ensure that only expected columns can be included in the `SET` or `WHERE` clauses.

## 2026-02-01 - Brute-Force Protection with Rate Limiting
**Vulnerability:** Sensitive authentication routes (login, password reset) were unprotected from brute-force attacks, allowing unlimited attempts.
**Learning:** Publicly accessible auth endpoints are high-value targets for automated brute-force and credential stuffing.
**Prevention:** Implement rate limiting on all sensitive endpoints. Use `express-rate-limit` to restrict attempts per IP address and window of time.

