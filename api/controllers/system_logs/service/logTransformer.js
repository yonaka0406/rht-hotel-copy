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
      let logEntry = { ...log }; // Copy the log entry

      if (log.table_name.startsWith('reservations_')) {
        reservationId = log.record_id; // Assuming record_id is the reservation ID for reservations tables
      }

      if (reservationId && log.action) {
        if (!transformedData[reservationId]) {
          transformedData[reservationId] = {
            'UPDATE': false,
            'INSERT': false,
            'DELETE': false
          };
        }
        transformedData[reservationId][log.action] = true;
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