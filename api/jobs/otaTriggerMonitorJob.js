/**
 * OTA Trigger Monitor Job
 * Production-ready scheduled job to monitor for missing OTA triggers
 * Can be run as a cron job or integrated into the application scheduler
 */

const { checkMissingOTATriggers } = require('../ota_trigger_monitor');
const { sendGenericEmail } = require('../utils/emailUtils');
const logger = require('../config/logger');

class OTATriggerMonitorJob {
    constructor(options = {}) {
        this.options = {
            checkIntervalHours: options.checkIntervalHours || 1,
            alertThreshold: options.alertThreshold || 95, // Alert if success rate below 95%
            criticalThreshold: options.criticalThreshold || 80, // Critical if success rate below 80%
            enableAlerts: options.enableAlerts !== false, // Default to true
            enableLogging: options.enableLogging !== false, // Default to true
            autoRemediate: options.autoRemediate !== false, // Default to true
            baseUrl: options.baseUrl || 'http://localhost:5000',
            ...options
        };
        
        this.isRunning = false;
        this.lastCheck = null;
        this.intervalId = null;
    }

    /**
     * Start the monitoring job
     */
    start() {
        if (this.isRunning) {
            logger.warn('OTA Trigger Monitor Job is already running');
            return;
        }

        this.isRunning = true;
        logger.info('Starting OTA Trigger Monitor Job', {
            checkIntervalHours: this.options.checkIntervalHours,
            alertThreshold: this.options.alertThreshold,
            criticalThreshold: this.options.criticalThreshold,
            autoRemediate: this.options.autoRemediate
        });

        // Run initial check
        this.runCheck();

        // Schedule periodic checks
        const intervalMs = this.options.checkIntervalHours * 60 * 60 * 1000;
        this.intervalId = setInterval(() => {
            this.runCheck();
        }, intervalMs);
    }

    /**
     * Stop the monitoring job
     */
    stop() {
        if (!this.isRunning) {
            logger.warn('OTA Trigger Monitor Job is not running');
            return;
        }

        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        logger.info('Stopped OTA Trigger Monitor Job');
    }

    /**
     * Run a single monitoring check
     */
    async runCheck() {
        const checkStartTime = new Date();
        
        try {
            if (this.options.enableLogging) {
                logger.info('Running OTA trigger monitoring check');
            }

            const result = await checkMissingOTATriggers(this.options.checkIntervalHours, {
                autoRemediate: this.options.autoRemediate,
                baseUrl: this.options.baseUrl
            });
            
            this.lastCheck = {
                timestamp: checkStartTime,
                result: result,
                duration: new Date() - checkStartTime
            };

            // Log results
            if (this.options.enableLogging) {
                const logLevel = this.getLogLevel(result.successRate);
                logger[logLevel]('OTA trigger monitoring completed', {
                    successRate: result.successRate,
                    totalCandidates: result.totalCandidates,
                    missingTriggers: result.missingTriggers,
                    executionTime: result.executionTime,
                    checkDuration: this.lastCheck.duration,
                    autoRemediate: this.options.autoRemediate,
                    remediationResults: result.remediationResults
                });
            }

            // Handle alerts
            if (this.options.enableAlerts) {
                await this.handleAlerts(result);
            }

            // Store monitoring data (optional - implement if needed)
            if (this.options.storeResults) {
                await this.storeMonitoringResult(result);
            }

        } catch (error) {
            logger.error('OTA trigger monitoring check failed', {
                error: error.message,
                stack: error.stack,
                duration: new Date() - checkStartTime
            });

            this.lastCheck = {
                timestamp: checkStartTime,
                result: { success: false, error: error.message },
                duration: new Date() - checkStartTime
            };

            // Send error alert
            if (this.options.enableAlerts) {
                await this.sendAlert('ERROR', 'OTA trigger monitoring failed', {
                    error: error.message,
                    timestamp: checkStartTime
                });
            }
        }
    }

    /**
     * Handle alerts based on monitoring results
     */
    async handleAlerts(result) {
        if (!result.success) {
            await this.sendAlert('ERROR', 'OTA trigger monitoring system failure', result);
            return;
        }

        const { successRate, missingTriggers, totalCandidates } = result;

        if (successRate < this.options.criticalThreshold) {
            await this.sendAlert('CRITICAL', `OTA trigger system failure: ${successRate.toFixed(1)}% success rate`, {
                successRate,
                missingTriggers,
                totalCandidates,
                message: 'Immediate action required - OTA inventory synchronization failing'
            });
        } else if (successRate < this.options.alertThreshold) {
            await this.sendAlert('WARNING', `OTA trigger system degraded: ${successRate.toFixed(1)}% success rate`, {
                successRate,
                missingTriggers,
                totalCandidates,
                message: 'Investigation recommended - some OTA triggers are failing'
            });
        } else if (missingTriggers > 0) {
            await this.sendAlert('INFO', `Minor OTA trigger issues: ${missingTriggers} missing triggers`, {
                successRate,
                missingTriggers,
                totalCandidates,
                message: 'Monitor for trends - isolated trigger failures detected'
            });
        }
    }

    /**
     * Send alert (implement based on your alerting system)
     */
    async sendAlert(level, message, data) {
        // Log the alert
        const logLevel = level === 'CRITICAL' ? 'error' : 
                        level === 'WARNING' ? 'warn' : 'info';
        
        logger[logLevel](`OTA TRIGGER ALERT [${level}]: ${message}`, data);

        // Send email notification if enabled
        if (this.options.enableAlerts) {
            try {
                await this.sendEmailAlert(level, message, data);
            } catch (error) {
                logger.error('Failed to send email alert', { error: error.message });
            }
        }
        
        // TODO: Implement additional alerting mechanisms here
        // Examples:
        // - Send Slack/Teams message
        // - Create monitoring system ticket
        // - Send webhook to external monitoring service
        
        // Example webhook implementation:
        /*
        if (this.options.webhookUrl) {
            try {
                await fetch(this.options.webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        level,
                        message,
                        data,
                        timestamp: new Date().toISOString(),
                        service: 'OTA Trigger Monitor'
                    })
                });
            } catch (error) {
                logger.error('Failed to send webhook alert', { error: error.message });
            }
        }
        */
    }

    /**
     * Send email alert for OTA trigger issues
     */
    async sendEmailAlert(level, message, data) {
        const emailRecipient = 'dx@redhorse-group.co.jp';
        const timestamp = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
        const { successRate, missingTriggers, totalCandidates } = data;
        
        let subject, text, html;
        let bgColor, textColor, icon;
        
        // Set styling based on alert level
        switch (level) {
            case 'CRITICAL':
                bgColor = '#f8d7da';
                textColor = '#721c24';
                icon = '🚨';
                break;
            case 'WARNING':
                bgColor = '#fff3cd';
                textColor = '#856404';
                icon = '⚠️';
                break;
            default:
                bgColor = '#d1ecf1';
                textColor = '#0c5460';
                icon = 'ℹ️';
        }
        
        const levelJapanese = level === 'CRITICAL' ? '緊急' : level === 'WARNING' ? '警告' : '情報';
        
        subject = `${icon} OTA連携アラート [${levelJapanese}] - 成功率${successRate.toFixed(1)}%`;
        
        text = `OTA連携監視アラート

レベル: ${levelJapanese}
時刻: ${timestamp} JST
メッセージ: ${message}

システム状況:
- 成功率: ${successRate.toFixed(1)}%
- 総候補数: ${totalCandidates}
- 未送信トリガー: ${missingTriggers}件

${level === 'CRITICAL' ? '緊急対応が必要です' : '適宜調査をお願いします'}

これはOTA連携監視システムからの自動アラートです。`;

        html = `
        <div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: ${bgColor}; color: ${textColor}; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <h2 style="margin: 0; color: ${textColor};">
                    ${icon} OTA連携アラート [${levelJapanese}]
                </h2>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>アラート詳細</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 5px; font-weight: bold;">レベル:</td><td style="padding: 5px; color: ${textColor}; font-weight: bold;">${levelJapanese}</td></tr>
                    <tr><td style="padding: 5px; font-weight: bold;">時刻:</td><td style="padding: 5px;">${timestamp} JST</td></tr>
                    <tr><td style="padding: 5px; font-weight: bold;">メッセージ:</td><td style="padding: 5px;">${message}</td></tr>
                </table>
            </div>

            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>システム状況</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 5px; font-weight: bold;">成功率:</td><td style="padding: 5px; color: ${textColor}; font-weight: bold;">${successRate.toFixed(1)}%</td></tr>
                    <tr><td style="padding: 5px; font-weight: bold;">総候補数:</td><td style="padding: 5px;">${totalCandidates}</td></tr>
                    <tr><td style="padding: 5px; font-weight: bold;">未送信トリガー:</td><td style="padding: 5px; color: ${textColor}; font-weight: bold;">${missingTriggers}件</td></tr>
                </table>
            </div>

            <div style="background-color: ${level === 'CRITICAL' ? '#f8d7da' : '#e2e3e5'}; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold; color: ${level === 'CRITICAL' ? '#721c24' : '#383d41'};">
                    ${level === 'CRITICAL' ? '🚨 緊急対応が必要です' : '📋 適宜調査をお願いします'}
                </p>
            </div>

            <p style="color: #6c757d; font-size: 12px; margin-top: 20px;">
                これはOTA連携監視システムからの自動アラートです。
            </p>
        </div>`;

        await sendGenericEmail(emailRecipient, subject, text, html);
        logger.info(`Email alert sent to ${emailRecipient}`, { level, successRate });
    }

    /**
     * Store monitoring results (implement if needed for historical analysis)
     */
    async storeMonitoringResult(result) {
        // TODO: Implement storage mechanism
        // Examples:
        // - Store in database table for trend analysis
        // - Send to time-series database (InfluxDB, etc.)
        // - Store in monitoring system (Prometheus, etc.)
        
        // Example database storage:
        /*
        const { pool } = require('../config/database');
        const client = await pool.connect();
        try {
            await client.query(`
                INSERT INTO ota_trigger_monitoring (
                    timestamp, success_rate, total_candidates, missing_triggers, 
                    execution_time, check_duration, details
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                new Date(),
                result.successRate,
                result.totalCandidates,
                result.missingTriggers,
                result.executionTime,
                this.lastCheck.duration,
                JSON.stringify(result.missingTriggerDetails || [])
            ]);
        } finally {
            client.release();
        }
        */
    }

    /**
     * Get appropriate log level based on success rate
     */
    getLogLevel(successRate) {
        if (successRate < this.options.criticalThreshold) return 'error';
        if (successRate < this.options.alertThreshold) return 'warn';
        return 'info';
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastCheck: this.lastCheck,
            options: this.options
        };
    }

    /**
     * Run a manual check (for testing or on-demand monitoring)
     */
    async runManualCheck() {
        logger.info('Running manual OTA trigger monitoring check');
        await this.runCheck();
        return this.lastCheck;
    }
}

// Factory function for easy integration
function createOTATriggerMonitor(options = {}) {
    return new OTATriggerMonitorJob(options);
}

// Default instance for immediate use
const defaultMonitor = new OTATriggerMonitorJob({
    checkIntervalHours: 1,
    alertThreshold: 95,
    criticalThreshold: 80,
    enableAlerts: true,
    enableLogging: true,
    autoRemediate: true  // Enable auto-remediation by default
});

module.exports = {
    OTATriggerMonitorJob,
    createOTATriggerMonitor,
    defaultMonitor
};