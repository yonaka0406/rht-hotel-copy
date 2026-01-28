const { startLog, completeLog } = require('../models/cron_logs');

async function fetchAndProcessReservations() {
  const logId = await startLog('OTA Reservation Fetch');

  try {

    response = await fetch(`http://localhost:5000/api/sc/tl/reservations/fetch/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    //console.log('Reservations processed successfully.');
    await completeLog(logId, 'success', { message: 'Fetch request completed' });

    /*
            response = await fetch(`http://localhost:5000/api/sc/tl/reservations/success/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },            
            });
    */
  } catch (error) {
    console.error('Error fetching or processing reservations:', error);
    await completeLog(logId, 'failed', { error: error.message });
  } finally {
    scheduleNextRequest();
  }
}

let currentInterval;

function scheduleNextRequest() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  console.log('scheduleNextRequest hour', currentHour, 'minute', currentMinute)

  const startTimeHour = 9;
  const endTimeHour = 18;

  const isWithinWorkHours = (
    currentHour >= startTimeHour &&
    currentHour <= endTimeHour
  );

  if (isWithinWorkHours) {
    // 5 minutes and 10 seconds interval (310,000 milliseconds)
    currentInterval = 310000;
    // console.log('isWithinWorkHours, next request in 30s')
    /// currentInterval = 30000;
  } else {
    // 30 minutes interval (1,800,000 milliseconds)
    currentInterval = 1800000;
    // console.log('isNotWithinWorkHours, next request in 60s')
    // currentInterval = 60000;
  }

  setTimeout(fetchAndProcessReservations, currentInterval);
}

function startScheduling() {
  // Initial call to start the chain of requests
  // Do not run in development environment
  if (process.env.NODE_ENV === 'development') {
    console.log('Skipping OTA reservation job in development environment.');
    return;
  }
  setTimeout(fetchAndProcessReservations, 30000); // 30-second delay
}

module.exports = { startScheduling };
