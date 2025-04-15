async function fetchAndProcessReservations() {
    console.log('fetchAndProcessReservations');
    try {
        
        response = await fetch(`http://localhost:5000/api/sc/tl/reservations/fetch/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },            
        });        

        console.log('Reservations processed successfully.');
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
    fetchAndProcessReservations();
  }
  
  module.exports = { startScheduling };