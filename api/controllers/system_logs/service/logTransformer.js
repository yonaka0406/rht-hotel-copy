const transformLogs = (logs, logger) => {
  logger.info('First 2 log entries:', logs.slice(0, 2));
  const actionCounts = {}; // Keep this for the console log
  const transformedData = {}; // This will store the final structured output

  logs.forEach(log => {
    // --- Logging Logic (from previous step) ---
    if (log.table_name && log.action && log.log_time) {
      let baseTableName = log.table_name;
      const lastUnderscoreIndex = log.table_name.lastIndexOf('_');
      if (lastUnderscoreIndex !== -1) {
        const potentialPartition = log.table_name.substring(lastUnderscoreIndex + 1);
        if (!isNaN(potentialPartition) && !isNaN(parseFloat(potentialPartition))) {
          baseTableName = log.table_name.substring(0, lastUnderscoreIndex);
        }
      }

      const logDate = new Date(log.log_time).toISOString().split('T')[0]; // YYYY-MM-DD

      if (!actionCounts[logDate]) {
        actionCounts[logDate] = {};
      }
      if (!actionCounts[logDate][baseTableName]) {
        actionCounts[logDate][baseTableName] = {};
      }
      if (!actionCounts[logDate][baseTableName][log.action]) {
        actionCounts[logDate][baseTableName][log.action] = 0;
      }
      actionCounts[logDate][baseTableName][log.action]++;
    }
    // --- End Logging Logic ---

    // --- Transformation Logic ---
    if (log.table_name && log.action) {
      let reservationId = null;
      let status = null;
      let logEntry = { ...log }; // Copy the log entry

      if (log.table_name.startsWith('reservations_')) {
        reservationId = log.record_id; // Assuming record_id is the reservation ID for reservations tables
        if (log.action === 'INSERT') {
          status = 'new_reservation';
        } else if (log.action === 'UPDATE') {
          status = 'reservation_edit';
        } else if (log.action === 'DELETE') {
          status = 'reservation_delete';
        }
        logEntry.status = status; // Add status to the log entry
        logEntry.type = 'reservation'; // Add type for easier categorization
      } else if (log.table_name.startsWith('reservation_payments_')) {
        if (log.changes) {
          if ((log.action === 'INSERT' || log.action === 'DELETE') && log.changes.reservation_id) {
            reservationId = log.changes.reservation_id;
          } else if (log.changes.new && log.changes.new.reservation_id) {
            reservationId = log.changes.new.reservation_id;
          } else if (log.changes.old && log.changes.old.reservation_id) {
            reservationId = log.changes.old.reservation_id;
          } else if (log.changes.reservation_id) {
            reservationId = log.changes.reservation_id;
          }
        }
        if (!reservationId) {
          logger.warn('reservation_id not found in log.changes for reservation_payments_', log);
        }
        if (log.action === 'INSERT') {
          status = 'payment_insert';
        } else if (log.action === 'UPDATE') {
          status = 'payment_update';
        } else if (log.action === 'DELETE') {
          status = 'payment_delete';
        }
        logEntry.status = status; // Add status to the log entry
        logEntry.type = 'payment'; // Add type for easier categorization
      }

      if (reservationId && status) {
        if (!transformedData[reservationId]) {
          transformedData[reservationId] = {
            reservations: [],
            reservation_payments: []
          };
        }

        if (logEntry.type === 'reservation') {
          transformedData[reservationId].reservations.push(logEntry);
        } else if (logEntry.type === 'payment') {
          transformedData[reservationId].reservation_payments.push(logEntry);
        }
      }
    }
    // --- End Transformation Logic ---
  });

  logger.info('Log Action Counts:', actionCounts);
  logger.info('Transformed Data (first 2 entries):', Object.values(transformedData).slice(0, 2));

  return transformedData;
};

module.exports = {
  transformLogs,
};