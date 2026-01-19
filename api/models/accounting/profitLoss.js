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
    console.log('[P&L Model] Date formats - startMonth type:', typeof startMonth, 'value:', startMonth);
    console.log('[P&L Model] Date formats - endMonth type:', typeof endMonth, 'value:', endMonth);
  
    // Always use the acc_profit_loss view to match the main P&L page
    console.log('[P&L Model] Using acc_profit_loss view for consistency');
    
    let fallbackQuery = `
      SELECT 
        month as transaction_date,
        EXTRACT(MONTH FROM month) as month_num,
        TO_CHAR(month, 'YYYY-MM') as month,
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
      params.push(startMonth); // startMonth is already in YYYY-MM-DD format
      paramIndex++;
    }
    
    if (endMonth) {
      fallbackQuery += ` AND month <= $${paramIndex}`;
      params.push(endMonth); // endMonth is already in YYYY-MM-DD format
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
    
    console.log('[P&L Model] Query:', fallbackQuery);
    console.log('[P&L Model] Params:', params);
    
    const result = await client.query(fallbackQuery, params);
    console.log('[P&L Model] Result count:', result.rows.length);
    
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