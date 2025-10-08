const { getPool } = require('../../config/database');

const updateInvoices = async (requestId, id, hotelId, date, clientId, clientName, invoiceNumber, due_date, total_stays, comment) => {  
  const pool = getPool(requestId);
  const query = `
    UPDATE invoices SET
      display_name = $1
      ,invoice_number = $2
      ,due_date = $3
      ,total_stays = $4
      ,comment = $5
    WHERE 
      invoices.id = $6
      AND invoices.hotel_id = $7
      AND DATE_TRUNC('month', invoices.date) = DATE_TRUNC('month', $8::date)
      AND client_id = $9
    RETURNING *
  ;`;
  const values = [clientName, invoiceNumber, due_date, total_stays, comment, id, hotelId, date, clientId];

  try {
    const result = await pool.query(query, values);    
    return result.rows;
  } catch (err) {
    console.error('Error updating data:', err);
    throw new Error('Database error');
  }
};

async function saveReceiptNumber(requestId, hotelId, receiptNumber, receiptDate, amount, userId, taxBreakdownData) { 
  const pool = getPool(requestId);
  const query = `
    INSERT INTO receipts
      (hotel_id, receipt_number, receipt_date, amount, created_by, tax_breakdown, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING id;
  `;
  try {
    // Ensure taxBreakdownData is null if undefined, or an empty array if it's an empty array,
    // which are both valid for JSONB. The pg driver should handle stringifying objects/arrays.
    const values = [hotelId, receiptNumber, receiptDate, amount, userId, JSON.stringify(taxBreakdownData || [])]; // Pass taxBreakdownData
    const result = await pool.query(query, values);
    return result.rows.length > 0 ? { success: true, id: result.rows[0].id } : { success: false };
  } catch (err) {
    console.error('Error in saveReceiptNumber:', err);
    // Add more context to the error if possible
    console.error('Failed to save receipt with data:', { hotelId, receiptNumber, taxBreakdownData });
    throw new Error('Database error while saving receipt number.');
  }
}

async function linkPaymentToReceipt(requestId, paymentId, receiptId, hotelId) {
  const pool = getPool(requestId);
  const query = 'UPDATE reservation_payments SET receipt_id = $1 WHERE id = $2 AND hotel_id = $3';
  try {
    const result = await pool.query(query, [receiptId, paymentId, hotelId]);
    // Log if no row was updated, but still consider it a success if query executed
    if (result.rowCount === 0) {
      console.warn(`Attempted to link payment ${paymentId} to receipt ${receiptId}, but no payment row was updated. Payment ID might be incorrect or already linked.`);
    }
    return { success: true, rowCount: result.rowCount };
  } catch (err) {
    console.error(`Error in linkPaymentToReceipt for paymentId ${paymentId}, receiptId ${receiptId}:`, err);
    // Throw a more specific error or a generic one based on policy
    
    throw new Error('Database error while linking payment to receipt.');
  }
}

module.exports = {
  updateInvoices,
  saveReceiptNumber,
  linkPaymentToReceipt,
};
