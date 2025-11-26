/**
 * Helper function to generate a new invoice number.
 * If a previous invoice number exists, it increments it.
 * If no previous invoice number is found, it generates an initial one based on hotelId and date.
 * 
 * @param {Array} maxInvoiceResult - The result from the database query for max invoice number.
 * @param {number} hotelId - The ID of the hotel.
 * @param {string|Date} date - The date of the invoice.
 * @returns {number} The new invoice number.
 */
const generateNewInvoiceNumber = async (maxInvoiceResult, hotelId, date) => {
  const last_invoice_number = maxInvoiceResult.length > 0 ? maxInvoiceResult[0].last_invoice_number : null;

  let new_invoice_number;
  if (last_invoice_number) {
    new_invoice_number = parseInt(last_invoice_number, 10) + 1;
  } else {
    const d = new Date(date);
    const year = d.getFullYear() % 100; // last two digits of year
    const month = d.getMonth() + 1; // getMonth returns 0-11
    
    // Initial invoice number generation logic
    new_invoice_number = hotelId * 10000000 + year * 100000 + month * 1000 + 1;
  }
  return new_invoice_number;
};

module.exports = {
  generateNewInvoiceNumber
};