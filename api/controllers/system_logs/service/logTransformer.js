const transformLogs = (logs) => {
  const reservationStatuses = new Map();
  const actionCounts = {};

  logs.forEach(log => {
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

    if (log.table_name && log.table_name.startsWith('reservations_')) {
      if (log.action === 'INSERT') {
        reservationStatuses.set(log.record_id, 'new_reservation');
      } else if (log.action === 'UPDATE') {
        reservationStatuses.set(log.record_id, 'reservation_edit');
      } else if (log.action === 'DELETE') {
        reservationStatuses.set(log.record_id, 'reservation_delete');
      }
    }
  });

  console.log('Log Action Counts:', actionCounts);

  return Array.from(reservationStatuses).map(([id, status]) => ({
    id,
    status
  }));
};

module.exports = {
  transformLogs,
};