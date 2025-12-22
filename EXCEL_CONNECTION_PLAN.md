# Excel Connection Plan: Read-Only User & Power Query

## 1. Create the "Read-Only" User
The "best practice" now involves using a Role to manage permissions. This makes it easier if you ever need to add a second or third person with the same access.

Run these commands in your PostgreSQL instance:

```sql
-- 1. Create the user as before
CREATE ROLE excel_user WITH LOGIN PASSWORD 'your_password';
GRANT CONNECT ON DATABASE your_db TO excel_user;
GRANT USAGE ON SCHEMA public TO excel_user;

-- 2. DO NOT grant select on all tables. 
-- Instead, create your view:
CREATE VIEW public.pivot_ready_sales AS 
SELECT 
    s.date, 
    c.customer_name, 
    p.product_name, 
    s.amount
FROM sales s
JOIN customers c ON s.customer_id = c.id
JOIN products p ON s.product_id = p.id;

-- 3. Grant access ONLY to the view
GRANT SELECT ON public.pivot_ready_sales TO excel_user;
```

## 2. Connecting via Excel (The Modern Way)
Ten years ago, you likely used an ODBC driver that you had to install manually on your Windows machine. While that still works, Excel now has a built-in feature called Power Query (Get & Transform) which is much more stable.

1. **Open Excel** and go to the **Data** tab.
2. Click **Get Data** > **From Database** > **From PostgreSQL Database**.
3. Enter your **server address** and **database name**.
4. When prompted for credentials, select **Database** (not Windows) and enter the **username** and **password** created above.
