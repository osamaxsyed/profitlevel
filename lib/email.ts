import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');

interface WeeklySummaryData {
  userName: string;
  userEmail: string;
  weeklyRevenue: number;
  weeklyProfit: number;
  weeklyHours: number;
  weeklyHourlyRate: number;
  jobsCompleted: number;
}

export async function sendWeeklySummary(data: WeeklySummaryData) {
  try {
    await resend.emails.send({
      from: 'ProfitLevel <noreply@profitlevel.app>',
      to: data.userEmail,
      subject: `Your Weekly Profit Summary - ${new Date().toLocaleDateString()}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #1a1a1a; color: white; padding: 30px 20px; text-align: center; }
              .logo { font-size: 24px; font-weight: bold; }
              .logo span { color: #ff6b00; }
              .content { background: #f5f5f5; padding: 30px 20px; }
              .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
              .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; }
              .stat-label { color: #666; font-size: 14px; margin-bottom: 8px; }
              .stat-value { font-size: 24px; font-weight: bold; color: #1a1a1a; }
              .stat-value.positive { color: #10b981; }
              .stat-value.orange { color: #ff6b00; }
              .cta { text-align: center; margin: 30px 0; }
              .cta a { background: #ff6b00; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; }
              .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">Profit<span>Level</span></div>
                <p>Your Weekly Profit Summary</p>
              </div>

              <div class="content">
                <h2>Hey ${data.userName}! 👋</h2>
                <p>Here's how your contracting business performed this week:</p>

                <div class="stat-grid">
                  <div class="stat-card">
                    <div class="stat-label">Revenue</div>
                    <div class="stat-value">$${data.weeklyRevenue.toLocaleString()}</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-label">Net Profit</div>
                    <div class="stat-value positive">$${data.weeklyProfit.toLocaleString()}</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-label">Billable Hours</div>
                    <div class="stat-value">${data.weeklyHours}</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-label">Hourly Rate</div>
                    <div class="stat-value orange">$${data.weeklyHourlyRate.toFixed(2)}/hr</div>
                  </div>
                </div>

                <p><strong>Jobs Completed:</strong> ${data.jobsCompleted}</p>

                <div class="cta">
                  <a href="https://profitlevel.app">View Full Dashboard</a>
                </div>

                <p style="margin-top: 30px; font-size: 14px; color: #666;">
                  Keep tracking your numbers to maximize your profits! 💪
                </p>
              </div>

              <div class="footer">
                <p>You're receiving this because you signed up for weekly profit summaries on ProfitLevel.</p>
                <p><a href="https://profitlevel.app/settings" style="color: #ff6b00;">Manage email preferences</a></p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send weekly summary:', error);
    return { success: false, error };
  }
}

export async function sendTaxReminder(userEmail: string, userName: string, quarter: string) {
  try {
    await resend.emails.send({
      from: 'ProfitLevel <noreply@profitlevel.app>',
      to: userEmail,
      subject: `⏰ ${quarter} Tax Deadline Approaching`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #1a1a1a; color: white; padding: 30px 20px; text-align: center; }
              .logo { font-size: 24px; font-weight: bold; }
              .logo span { color: #ff6b00; }
              .content { background: #f5f5f5; padding: 30px 20px; }
              .alert { background: #fff3cd; border-left: 4px solid #ff6b00; padding: 15px; margin: 20px 0; }
              .cta { text-align: center; margin: 30px 0; }
              .cta a { background: #ff6b00; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; }
              .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
              ul { padding-left: 20px; }
              li { margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">Profit<span>Level</span></div>
                <p>Tax Deadline Reminder</p>
              </div>

              <div class="content">
                <h2>Hi ${userName},</h2>

                <div class="alert">
                  <strong>⏰ Reminder:</strong> ${quarter} quarterly tax deadline is coming up soon!
                </div>

                <p>Don't forget to:</p>
                <ul>
                  <li>Review your ${quarter} profit and loss in ProfitLevel</li>
                  <li>Calculate your estimated tax payment</li>
                  <li>File and pay your quarterly taxes on time</li>
                  <li>Save receipts and documentation</li>
                </ul>

                <div class="cta">
                  <a href="https://profitlevel.app/financials">View ${quarter} Financials</a>
                </div>

                <p style="margin-top: 30px; font-size: 14px; color: #666;">
                  ProfitLevel makes it easy to see your taxable income and estimate your tax liability. Stay organized and avoid penalties!
                </p>
              </div>

              <div class="footer">
                <p>You're receiving this because you signed up for tax reminders on ProfitLevel.</p>
                <p><a href="https://profitlevel.app/settings" style="color: #ff6b00;">Manage email preferences</a></p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send tax reminder:', error);
    return { success: false, error };
  }
}
