const transformLogs = (logs, logger) => {
  if (!Array.isArray(logs)) {
    logger.warn('transformLogs received non-array input for logs. Returning empty result.', { inputType: typeof logs, inputValue: logs });
    return {}; // Return empty object as transformedData is typically an object
  }
  //logger.info('First 2 log entries:', logs.slice(0, 2));
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
        // Initialize if not present
        if (!transformedData[reservationId]) {
          transformedData[reservationId] = {
            hotel_id: log.hotel_id,
            hotel_name: log.hotel_name,
            'UPDATE': { changed: false },
            'INSERT': { changed: false },
            'DELETE': { changed: false }
          };
        }

        let extractedValues = {
          status: null,
          check_in: null,
          check_out: null,
          number_of_people: null,
          type: null,
          comment: null // Add comment here
        };

        if (log.changes) {
          let source = null;
          if (log.action === 'INSERT' || log.action === 'DELETE') {
            source = log.changes;
          } else if (log.action === 'UPDATE' && log.changes.new) {
            source = log.changes.new;
          }

          if (source) {
            extractedValues.status = source.status;
            extractedValues.check_in = source.check_in;
            extractedValues.check_out = source.check_out;
            extractedValues.number_of_people = source.number_of_people;
            extractedValues.type = source.type;
            extractedValues.comment = source.comment; // Extract comment here
          }
        }

        // Update the specific action object
        if (transformedData[reservationId][log.action]) { // Check if the action key exists
          transformedData[reservationId][log.action] = {
            changed: true,
            ...extractedValues // Include all extracted values
          };
        }
      }
    }
    // --- End Transformation Logic ---
  });

  //logger.info('Log Action Counts:', actionCounts);
  //logger.info('Transformed Data (first 2 entries):', Object.values(transformedData).slice(0, 2));

  return transformedData;
};

module.exports = {
  transformLogs,
};