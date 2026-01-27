/**
 * Test script for OTA trigger monitor email notifications
 */

require('dotenv').config({ path: './api/.env' });
const { sendGenericEmail } = require('../../utils/emailUtils');

async function testEmailNotifications() {
    console.log('🧪 Testing OTA Trigger Monitor Email Notifications');
    console.log('================================================\n');
    
    const emailRecipient = 'dx@redhorse-group.co.jp';
    console.log(`📧 Sending test emails to: ${emailRecipient}`);
    
    try {
        // Test 1: Inconsistency notification
        console.log('\n1. Testing INCONSISTENCY notification...');
        
        const mockMissingTriggers = [
            {
                hotel_id: 12,
                hotel_name: 'テストホテル',
                action: 'INSERT',
                client_name: 'テスト顧客',
                log_time: new Date(),
                check_in: '2026-01-25',
                status: 'confirmed'
            },
            {
                hotel_id: 25,
                hotel_name: '別のホテル',
                action: 'UPDATE',
                client_name: '別の顧客',
                log_time: new Date(),
                check_in: '2026-01-26',
                status: 'cancelled'
            }
        ];
        
        const timestamp = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
        const successRate = 85.5;
        const totalCandidates = 20;
        const hoursBack = 1;
        
        const subject = `🚨 OTA連携エラー検出（テスト） - 成功率${successRate.toFixed(1)}%`;
        
        const text = `OTA連携監視アラート（テスト）

時刻: ${timestamp} JST
監視期間: 過去${hoursBack}時間
成功率: ${successRate.toFixed(1)}%
総候補数: ${totalCandidates}
未送信トリガー: ${mockMissingTriggers.length}件

これはOTA連携監視システムのテストメールです。`;

        const html = `
        <div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 800px; margin: 0 auto;">
            <h2 style="color: #e74c3c; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">
                🚨 OTA連携エラー検出（テスト）
            </h2>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>アラート概要</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 5px; font-weight: bold;">時刻:</td><td style="padding: 5px;">${timestamp} JST</td></tr>
                    <tr><td style="padding: 5px; font-weight: bold;">監視期間:</td><td style="padding: 5px;">過去${hoursBack}時間</td></tr>
                    <tr><td style="padding: 5px; font-weight: bold;">成功率:</td><td style="padding: 5px; color: #e74c3c; font-weight: bold;">${successRate.toFixed(1)}%</td></tr>
                    <tr><td style="padding: 5px; font-weight: bold;">総候補数:</td><td style="padding: 5px;">${totalCandidates}</td></tr>
                    <tr><td style="padding: 5px; font-weight: bold;">未送信トリガー:</td><td style="padding: 5px; color: #e74c3c; font-weight: bold;">${mockMissingTriggers.length}件</td></tr>
                </table>
            </div>

            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
                <p><strong>これはOTA連携監視システムのテストメールです。</strong></p>
                <p>このメールを受信した場合、通知システムが正常に動作しています。</p>
            </div>
        </div>`;
        
        await sendGenericEmail(emailRecipient, subject, text, html);
        console.log('   ✅ Inconsistency notification sent successfully');
        
        // Test 2: Remediation notification
        console.log('\n2. Testing REMEDIATION notification...');
        
        const mockRemediationResults = {
            successful: 2,
            failed: 0,
            skipped: 1,
            details: [
                {
                    hotel_id: 12,
                    date_range: '2026-01-25 to 2026-01-27',
                    status: 'success',
                    triggers_count: 2
                },
                {
                    hotel_id: 25,
                    date_range: '2026-01-26 to 2026-01-28',
                    status: 'skipped',
                    reason: 'No inventory data returned',
                    triggers_count: 1
                }
            ]
        };
        
        const remediationSubject = `⚡ OTA自動修復実行（テスト） - ${mockRemediationResults.successful}件修復完了`;
        
        const remediationText = `OTA自動修復レポート（テスト）

時刻: ${timestamp} JST
成功: ${mockRemediationResults.successful}件
失敗: ${mockRemediationResults.failed}件
スキップ: ${mockRemediationResults.skipped}件

これはOTA自動修復システムのテストメールです。`;

        const remediationHtml = `
        <div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 800px; margin: 0 auto;">
            <h2 style="color: #28a745; border-bottom: 2px solid #28a745; padding-bottom: 10px;">
                ⚡ OTA自動修復実行（テスト）
            </h2>
            
            <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>修復概要</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 5px; font-weight: bold;">時刻:</td><td style="padding: 5px;">${timestamp} JST</td></tr>
                    <tr><td style="padding: 5px; font-weight: bold;">成功:</td><td style="padding: 5px; color: #28a745; font-weight: bold;">${mockRemediationResults.successful}件</td></tr>
                    <tr><td style="padding: 5px; font-weight: bold;">失敗:</td><td style="padding: 5px; color: #dc3545; font-weight: bold;">${mockRemediationResults.failed}件</td></tr>
                    <tr><td style="padding: 5px; font-weight: bold;">スキップ:</td><td style="padding: 5px;">${mockRemediationResults.skipped}件</td></tr>
                </table>
            </div>

            <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; border-left: 4px solid #bee5eb;">
                <p><strong>これはOTA自動修復システムのテストメールです。</strong></p>
                <p>このメールを受信した場合、修復通知システムが正常に動作しています。</p>
            </div>
        </div>`;
        
        await sendGenericEmail(emailRecipient, remediationSubject, remediationText, remediationHtml);
        console.log('   ✅ Remediation notification sent successfully');
        
        console.log('\n✅ All email notifications sent successfully!');
        console.log(`📧 Check your inbox at: ${emailRecipient}`);
        
    } catch (error) {
        console.error('❌ Email test failed:', error.message);
        console.error('   Please check your email configuration');
    }
}

testEmailNotifications().then(() => {
    console.log('\n🎉 Email notification test completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
});