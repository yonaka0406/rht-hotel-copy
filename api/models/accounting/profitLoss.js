const { getPool } = require('../../config/database');

/**
 * Get Profit & Loss statement data with detailed tax information for CSV export
 * @param {String} requestId - Request ID for logging
 * @param {Object} filters - { startMonth, endMonth, departmentNames }
 * @param {Object} dbClient - Optional database client
 * @returns {Promise<Array>} P&L data with tax details
 */
async function getProfitLossDetailed(requestId, filters = {}, dbClient = null) {
  const pool = getPool(requestId);
  const client = dbClient || await pool.connect();
  const shouldRelease = !dbClient;

  try {
    const { startMonth, endMonth, departmentNames } = filters;
    
    console.log('[P&L Model] Detailed Filters:', { startMonth, endMonth, departmentNames });
  
    // First, let's check if there's any data in acc_yayoi_data
    const checkQuery = `SELECT COUNT(*) as count FROM acc_yayoi_data`;
    const checkResult = await client.query(checkQuery);
    console.log('[P&L Model] Total yayoi_data records:', checkResult.rows[0].count);
    
    // If no yayoi data, fall back to using the acc_profit_loss view data
    if (parseInt(checkResult.rows[0].count) === 0) {
      console.log('[P&L Model] No yayoi_data found, using acc_profit_loss view');
      
      let fallbackQuery = `
        SELECT 
          (month || '-01')::date as transaction_date,
          EXTRACT(MONTH FROM (month || '-01')::date) as month_num,
          month,
          account_code,
          account_name,
          '' as sub_account,
          department,
          '' as tax_class,
          net_amount as amount_with_tax,
          0 as tax_amount,
          '' as counterpart_account_code,
          '' as counterpart_sub_account,
          '' as counterpart_department,
          COALESCE(management_group_name, '') || ' - ' || COALESCE(account_name, '') as summary,
          management_group_name,
          management_group_display_order,
          COALESCE(LPAD(management_group_display_order::text, 2, '0') || '_' || management_group_name, '') as management_group_formatted,
          hotel_id,
          hotel_name
        FROM acc_profit_loss
        WHERE 1=1
      `;
      
      const params = [];
      let paramIndex = 1;
      
      if (startMonth) {
        fallbackQuery += ` AND month >= $${paramIndex}`;
        params.push(startMonth.substring(0, 7)); // Extract YYYY-MM from YYYY-MM-DD
        paramIndex++;
      }
      
      if (endMonth) {
        fallbackQuery += ` AND month <= $${paramIndex}`;
        params.push(endMonth.substring(0, 7)); // Extract YYYY-MM from YYYY-MM-DD
        paramIndex++;
      }
      
      if (departmentNames && departmentNames.length > 0) {
        fallbackQuery += ` AND department = ANY($${paramIndex})`;
        params.push(departmentNames);
        paramIndex++;
      }
      
      fallbackQuery += `
        ORDER BY 
          month,
          department,
          management_group_display_order,
          account_code
      `;
      
      console.log('[P&L Model] Fallback Query:', fallbackQuery);
      console.log('[P&L Model] Fallback Params:', params);
      
      const result = await client.query(fallbackQuery, params);
      console.log('[P&L Model] Fallback Result count:', result.rows.length);
      
      return result.rows;
    }
    
    // Original yayoi_data query (if data exists) - with fixed parameters and date filtering
    let query = `
      SELECT 
        yd.transaction_date,
        EXTRACT(MONTH FROM yd.transaction_date) as month_num,
        TO_CHAR(yd.transaction_date, 'YYYY-MM') as month,
        ac.code as account_code,
        ac.name as account_name,
        yd.debit_sub_account as sub_account,
        yd.debit_department as department,
        yd.debit_tax_class as tax_class,
        CASE 
          WHEN mg.name IN ('売上高', '営業外収入', '特別利益') THEN -yd.debit_amount -- Revenue accounts: debit is negative
          ELSE yd.debit_amount -- Expense accounts: debit is positive
        END as amount_with_tax,
        CASE 
          WHEN mg.name IN ('売上高', '営業外収入', '特別利益') THEN -yd.debit_tax_amount -- Revenue accounts: debit is negative
          ELSE yd.debit_tax_amount -- Expense accounts: debit is positive
        END as tax_amount,
        yd.credit_account_code as counterpart_account_code,
        yd.credit_sub_account as counterpart_sub_account,
        yd.credit_department as counterpart_department,
        yd.summary,
        mg.name as management_group_name,
        mg.display_order as management_group_display_order,
        COALESCE(LPAD(mg.display_order::text, 2, '0') || '_' || mg.name, '') as management_group_formatted,
        dhm.hotel_id,
        dhm.hotel_name
      FROM acc_yayoi_data yd
      LEFT JOIN acc_account_codes ac ON yd.debit_account_code = ac.name
      LEFT JOIN acc_management_groups mg ON ac.management_group_id = mg.id
      LEFT JOIN (
        SELECT DISTINCT
          ad.name as department_name,
          ad.hotel_id,
          h.name as hotel_name
        FROM acc_departments ad
        JOIN hotels h ON ad.hotel_id = h.id
      ) dhm ON yd.debit_department = dhm.department_name
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (startMonth) {
      query += ` AND TO_CHAR(yd.transaction_date, 'YYYY-MM') >= $${paramIndex}`;
      params.push(startMonth.substring(0, 7)); // Extract YYYY-MM from YYYY-MM-DD
      paramIndex++;
    }
    
    if (endMonth) {
      query += ` AND TO_CHAR(yd.transaction_date, 'YYYY-MM') <= $${paramIndex}`;
      params.push(endMonth.substring(0, 7)); // Extract YYYY-MM from YYYY-MM-DD
      paramIndex++;
    }
    
    if (departmentNames && departmentNames.length > 0) {
      query += ` AND yd.debit_department = ANY($${paramIndex})`;
      params.push(departmentNames);
      paramIndex++;
    }
    
    query += `
      UNION ALL
      
      SELECT 
        yd.transaction_date,
        EXTRACT(MONTH FROM yd.transaction_date) as month_num,
        TO_CHAR(yd.transaction_date, 'YYYY-MM') as month,
        ac.code as account_code,
        ac.name as account_name,
        yd.credit_sub_account as sub_account,
        yd.credit_department as department,
        yd.credit_tax_class as tax_class,
        CASE 
          WHEN mg.name IN ('売上高', '営業外収入', '特別利益') THEN yd.credit_amount -- Revenue accounts: credit is positive
          ELSE -yd.credit_amount -- Expense accounts: credit is negative
        END as amount_with_tax,
        CASE 
          WHEN mg.name IN ('売上高', '営業外収入', '特別利益') THEN yd.credit_tax_amount -- Revenue accounts: credit is positive
          ELSE -yd.credit_tax_amount -- Expense accounts: credit is negative
        END as tax_amount,
        yd.debit_account_code as counterpart_account_code,
        yd.debit_sub_account as counterpart_sub_account,
        yd.debit_department as counterpart_department,
        yd.summary,
        mg.name as management_group_name,
        mg.display_order as management_group_display_order,
        COALESCE(LPAD(mg.display_order::text, 2, '0') || '_' || mg.name, '') as management_group_formatted,
        dhm.hotel_id,
        dhm.hotel_name
      FROM acc_yayoi_data yd
      LEFT JOIN acc_account_codes ac ON yd.credit_account_code = ac.name
      LEFT JOIN acc_management_groups mg ON ac.management_group_id = mg.id
      LEFT JOIN (
        SELECT DISTINCT
          ad.name as department_name,
          ad.hotel_id,
          h.name as hotel_name
        FROM acc_departments ad
        JOIN hotels h ON ad.hotel_id = h.id
      ) dhm ON yd.credit_department = dhm.department_name
      WHERE 1=1
    `;
    
    // Reset paramIndex for the second part of UNION
    let secondParamIndex = paramIndex;
    
    if (startMonth) {
      query += ` AND TO_CHAR(yd.transaction_date, 'YYYY-MM') >= $${secondParamIndex}`;
      params.push(startMonth.substring(0, 7)); // Extract YYYY-MM from YYYY-MM-DD
      secondParamIndex++;
    }
    
    if (endMonth) {
      query += ` AND TO_CHAR(yd.transaction_date, 'YYYY-MM') <= $${secondParamIndex}`;
      params.push(endMonth.substring(0, 7)); // Extract YYYY-MM from YYYY-MM-DD
      secondParamIndex++;
    }
    
    if (departmentNames && departmentNames.length > 0) {
      query += ` AND yd.credit_department = ANY($${secondParamIndex})`;
      params.push(departmentNames);
      secondParamIndex++;
    }
    
    query += `
      ORDER BY 
        transaction_date,
        department,
        management_group_display_order,
        account_code
    `;
    
    console.log('[P&L Model] Detailed Query:', query);
    console.log('[P&L Model] Detailed Params:', params);
    
    const result = await client.query(query, params);
    
    console.log('[P&L Model] Detailed Result count:', result.rows.length);
    
    return result.rows;
  } finally {
    if (shouldRelease) client.release();
  }
}

/**
 * Get Profit & Loss statement data
 * @param {String} requestId - Request ID for logging
 * @param {Object} filters - { startMonth, endMonth, departmentNames }
 * @param {Object} dbClient - Optional database client
 * @returns {Promise<Array>} P&L data grouped by management group
 * 
 * Note: hotelIds filter is not used because departments in raw data may not be mapped to hotels.
 * The department name from the raw Yayoi data is the primary identifier.
 * Users should map departments to hotels in acc_departments settings.
 */
async function getProfitLoss(requestId, filters = {}, dbClient = null) {
  const pool = getPool(requestId);
  const client = dbClient || await pool.connect();
  const shouldRelease = !dbClient;

  try {
    const { startMonth, endMonth, departmentNames } = filters;
    
    console.log('[P&L Model] Filters:', { startMonth, endMonth, departmentNames });
  
  let query = `
    SELECT 
      month,
      department,
      hotel_id,
      hotel_name,
      management_group_name,
      management_group_display_order,
      account_code,
      account_name,
      SUM(net_amount) as net_amount,
      SUM(revenue) as revenue,
      SUM(cost_of_sales) as cost_of_sales,
      SUM(operating_expenses) as operating_expenses,
      SUM(non_operating_income) as non_operating_income,
      SUM(non_operating_expenses) as non_operating_expenses,
      SUM(extraordinary_income) as extraordinary_income,
      SUM(extraordinary_losses) as extraordinary_losses,
      SUM(income_tax) as income_tax
    FROM acc_profit_loss
    WHERE 1=1
  `;
  
  const params = [];
  let paramIndex = 1;
  
  if (startMonth) {
    query += ` AND month >= $${paramIndex}`;
    params.push(startMonth);
    paramIndex++;
  }
  
  if (endMonth) {
    query += ` AND month <= $${paramIndex}`;
    params.push(endMonth);
    paramIndex++;
  }
  
  if (departmentNames && departmentNames.length > 0) {
    query += ` AND department = ANY($${paramIndex})`;
    params.push(departmentNames);
    paramIndex++;
  }
  
  query += `
    GROUP BY 
      month,
      department,
      hotel_id,
      hotel_name,
      management_group_name,
      management_group_display_order,
      account_code,
      account_name
    ORDER BY 
      month,
      department,
      management_group_display_order,
      account_code
  `;
  
    console.log('[P&L Model] Query:', query);
    console.log('[P&L Model] Params:', params);
    
    const result = await client.query(query, params);
    
    console.log('[P&L Model] Result count:', result.rows.length);
    
    return result.rows;
  } finally {
    if (shouldRelease) client.release();
  }
}

/**
 * Get P&L summary by management group
 * @param {String} requestId - Request ID for logging
 * @param {Object} filters - { startMonth, endMonth, departmentNames, groupBy }
 * @param {Object} dbClient - Optional database client
 * @returns {Promise<Array>} Summarized P&L data
 */
async function getProfitLossSummary(requestId, filters = {}, dbClient = null) {
  const pool = getPool(requestId);
  const client = dbClient || await pool.connect();
  const shouldRelease = !dbClient;

  try {
    const { startMonth, endMonth, departmentNames, groupBy = 'month' } = filters;
  
  // Determine grouping columns
  const groupColumns = ['management_group_name', 'management_group_display_order'];
  
  if (groupBy === 'hotel') {
    groupColumns.unshift('hotel_id', 'hotel_name');
  } else if (groupBy === 'department') {
    groupColumns.unshift('department');
  } else if (groupBy === 'hotel_month') {
    groupColumns.unshift('month', 'hotel_id', 'hotel_name');
  } else if (groupBy === 'department_month') {
    groupColumns.unshift('month', 'department');
  } else {
    groupColumns.unshift('month');
  }
  
  let query = `
    SELECT 
      ${groupColumns.join(', ')},
      SUM(net_amount) as net_amount,
      SUM(revenue) as revenue,
      SUM(cost_of_sales) as cost_of_sales,
      SUM(operating_expenses) as operating_expenses,
      SUM(non_operating_income) as non_operating_income,
      SUM(non_operating_expenses) as non_operating_expenses,
      SUM(extraordinary_income) as extraordinary_income,
      SUM(extraordinary_losses) as extraordinary_losses,
      SUM(income_tax) as income_tax
    FROM acc_profit_loss
    WHERE 1=1
  `;
  
  const params = [];
  let paramIndex = 1;
  
  if (startMonth) {
    query += ` AND month >= $${paramIndex}`;
    params.push(startMonth);
    paramIndex++;
  }
  
  if (endMonth) {
    query += ` AND month <= $${paramIndex}`;
    params.push(endMonth);
    paramIndex++;
  }
  
  if (departmentNames && departmentNames.length > 0) {
    query += ` AND department = ANY($${paramIndex})`;
    params.push(departmentNames);
    paramIndex++;
  }
  
  query += `
    GROUP BY ${groupColumns.join(', ')}
    ORDER BY ${groupColumns.join(', ')}
  `;
  
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    if (shouldRelease) client.release();
  }
}

/**
 * Get available months from P&L data
 * @param {String} requestId - Request ID for logging
 * @param {Object} dbClient - Optional database client
 * @returns {Promise<Array>} List of available months
 */
async function getAvailableMonths(requestId, dbClient = null) {
  const pool = getPool(requestId);
  const client = dbClient || await pool.connect();
  const shouldRelease = !dbClient;

  try {
    const query = `
      SELECT DISTINCT month
      FROM acc_profit_loss
      ORDER BY month DESC
    `;
    
    const result = await client.query(query);
    return result.rows.map(row => row.month);
  } finally {
    if (shouldRelease) client.release();
  }
}

/**
 * Get available departments from P&L data
 * @param {String} requestId - Request ID for logging
 * @param {Object} dbClient - Optional database client
 * @returns {Promise<Array>} List of departments with hotel info
 */
async function getAvailableDepartments(requestId, dbClient = null) {
  const pool = getPool(requestId);
  const client = dbClient || await pool.connect();
  const shouldRelease = !dbClient;

  try {
    const query = `
      SELECT DISTINCT 
        department,
        hotel_id,
        hotel_name
      FROM acc_profit_loss
      WHERE department IS NOT NULL
      ORDER BY department
    `;
    
    const result = await client.query(query);
    return result.rows;
  } finally {
    if (shouldRelease) client.release();
  }
}

module.exports = {
  getProfitLoss,
  getProfitLossDetailed,
  getProfitLossSummary,
  getAvailableMonths,
  getAvailableDepartments
};