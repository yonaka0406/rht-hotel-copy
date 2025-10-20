const logger = require('../config/logger');

class DatabaseListener {
  constructor(pool, environment, baseUrl, socketIo) {
    this.pool = pool;
    this.environment = environment;
    this.baseUrl = baseUrl;
    this.io = socketIo;
    this.client = null; // Store the connected client
    this.notificationHandler = this._handleNotification.bind(this); // Bind and name the handler
  }

  async start() {
    if (this.client) {
      logger.warn(`Database listener for ${this.environment} already started.`);
      return;
    }
    try {
      this.client = await this.pool.connect();
      
      this.client.on('notification', this.notificationHandler);

      await this.client.query('LISTEN logs_reservation_changed');
      await this.client.query('LISTEN reservation_log_inserted');
      
      logger.info(`Database listener started for ${this.environment}`);
    } catch (error) {
      logger.error(`Failed to start ${this.environment} listener:`, error);
      if (this.client) {
        this.client.release();
        this.client = null;
      }
    }
  }

  async cleanup() {
    if (!this.client) {
      logger.warn(`Database listener for ${this.environment} not active for cleanup.`);
      return;
    }
    try {
      this.client.removeListener('notification', this.notificationHandler);
      await this.client.query('UNLISTEN logs_reservation_changed');
      await this.client.query('UNLISTEN reservation_log_inserted');
      this.client.release();
      this.client = null;
      logger.info(`Database listener for ${this.environment} cleaned up.`);
    } catch (error) {
      logger.error(`Error during cleanup for ${this.environment} listener:`, error);
    }
  }

  async _handleNotification(msg) { // Renamed to _handleNotification
    if (msg.channel === 'logs_reservation_changed') {
      this.io.to(this.environment).emit('tableUpdate', { 
        message: 'Reservation update detected',
        environment: this.environment 
      });
    }
    
    if (msg.channel === 'reservation_log_inserted') {
      await this.handleReservationInserted(parseInt(msg.payload, 10));
    }
  }

  async handleReservationInserted(logId) {
    try {
      await this.updateGoogleSheets(logId);
    } catch (error) {
      logger.error(`handleReservationInserted: Error updating Google Sheets for logId ${logId}:`, error);
    }
    
    try {
      await this.updateSiteController(logId);
    } catch (error) {
      logger.error(`handleReservationInserted: Error updating Site Controller for logId ${logId}:`, error);
    }
  }

  async updateGoogleSheets(logId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/log/reservation-inventory/${logId}/google`);
      if (!response.ok) {
        logger.error(`updateGoogleSheets: Failed to fetch reservation inventory for logId ${logId} (Google). Status: ${response.status}`);
        return;
      }
      const data = await response.json();
      
      if (!Array.isArray(data) || data.length === 0 || !data[0].hotel_id || !data[0].check_in || !data[0].check_out) {
        logger.warn(`updateGoogleSheets: Invalid or empty data received for logId ${logId} (Google). Data: ${JSON.stringify(data)}`);
        return;
      }

      const sheetId = this.getSheetId();
      const reportResponse = await fetch(`${this.baseUrl}/api/report/res/google/${sheetId}/${data[0].hotel_id}/${data[0].check_in}/${data[0].check_out}`);
      if (!reportResponse.ok) {
        logger.error(`updateGoogleSheets: Failed to update Google Sheet (main) for logId ${logId}. Status: ${reportResponse.status}`);
      }
      
      if (this.environment === 'prod') {
        const parkingSheetId = '1LF3HOd7wyI0tlXuCqrnd-1m9OIoUb5EN7pegg0lJnt8';
        const parkingReportResponse = await fetch(`${this.baseUrl}/api/report/res/google-parking/${parkingSheetId}/${data[0].hotel_id}/${data[0].check_in}/${data[0].check_out}`);
        if (!parkingReportResponse.ok) {
          logger.error(`updateGoogleSheets: Failed to update Google Sheet (parking) for logId ${logId}. Status: ${parkingReportResponse.status}`);
        }
      }
    } catch (error) {
      logger.error(`updateGoogleSheets: Error processing logId ${logId}:`, { message: error.message, stack: error.stack });
    }
  }

  async updateSiteController(logId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/log/reservation-inventory/${logId}/site-controller`);
      if (!response.ok) {
        logger.error(`updateSiteController: Failed to fetch reservation inventory for logId ${logId} (Site Controller). Status: ${response.status}`);
        return;
      }
      const data = await response.json();
      
      if (!Array.isArray(data) || data.length === 0 || !data[0].hotel_id || !data[0].check_in || !data[0].check_out) {
        logger.warn(`updateSiteController: Invalid or empty data received for logId ${logId} (Site Controller). Data: ${JSON.stringify(data)}`);
        return;
      }

      const invResponse = await fetch(`${this.baseUrl}/api/report/res/inventory/${data[0].hotel_id}/${data[0].check_in}/${data[0].check_out}`);
      if (!invResponse.ok) {
        logger.error(`updateSiteController: Failed to fetch inventory report for hotel ${data[0].hotel_id}, logId ${logId}. Status: ${invResponse.status}`);
        return;
      }
      const inventory = await invResponse.json();

      const updateResponse = await fetch(`${this.baseUrl}/api/sc/tl/inventory/multiple/${data[0].hotel_id}/${logId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inventory)
      });
      if (!updateResponse.ok) {
        logger.error(`updateSiteController: Failed to update site controller for hotel ${data[0].hotel_id}, logId ${logId}. Status: ${updateResponse.status}`);
      }
    } catch (error) {
      logger.error(`updateSiteController: Error processing logId ${logId}:`, { message: error.message, stack: error.stack });
    }
  }

  getSheetId() {
    return this.environment === 'prod' 
      ? '1W10kEbGGk2aaVa-qhMcZ2g3ARvCkUBeHeN2L8SUTqtY'
      : '1nrtx--UdBvYfB5OH2Zki5YAVc6b9olf_T_VSNNDbZng';
  }
}

module.exports = DatabaseListener;