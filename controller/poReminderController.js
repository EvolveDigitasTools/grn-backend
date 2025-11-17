import schedule from "node-schedule";
import db from "../db.js";
import { sendMail, verifySMTP } from "../utils/mailer.js";

export const reloadScheduledReminders = async () => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM scheduled_reminders WHERE status = 'pending'"
    );

    rows.forEach(reminder => {
      const reminderDate = new Date(reminder.reminder_date + 'Z');

      if (reminderDate > new Date()) {
        // Schedule future reminder
        schedule.scheduleJob(reminder.id.toString(), reminderDate, async () => {
          await sendScheduledReminder(reminder.id);
        });
        console.log(`📅 Reminder ID ${reminder.id} scheduled for ${reminderDate}`);
      } else {
        // Missed reminder — send immediately
        console.log(`⏰ Missed reminder ID ${reminder.id}, sending now...`);
        sendScheduledReminder(reminder.id);
      }
    });

    console.log(`🔁 Reloaded ${rows.length} pending reminders from DB`);
  } catch (err) {
    console.error("❌ Failed to reload reminders:", err);
  }
};

export const sendScheduledReminder = async (reminderId) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM scheduled_reminders WHERE id = ? AND status = 'pending'",
      [reminderId]
    );

    if (!rows.length) {
      console.log(`⚠️ Reminder ID ${reminderId} not found or already sent`);
      return;
    }

    const reminder = rows[0];

    // Format invoice date cleanly (e.g., "11-Nov-2025")
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, "0");
      const month = date.toLocaleString("en-US", { month: "short" });
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const formattedInvoiceDate = formatDate(reminder.invoice_date);

    const subject = `[Reminder] Payment Due – PO ${reminder.po_code} | Vendor: ${reminder.vendor_name} | Invoice: ${formattedInvoiceDate}`;
    const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f6f8fa; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
            <div style="background-color: #0078d4; color: #fff; padding: 15px 25px;">
              <h2 style="margin: 0; font-weight: 600; font-size: 18px;">Payment Reminder</h2>
            </div>

            <div style="padding: 25px; color: #333;">
              <p style="font-size: 15px; margin-bottom: 15px;">Dear Anu Ma'am,</p>
              <p style="font-size: 15px; line-height: 1.6;">
                This is a friendly reminder that the payment for
                <strong>Purchase Order ${reminder.po_code}</strong> from
                <strong>${reminder.vendor_name}</strong> (Invoice Date: ${formattedInvoiceDate})
                is due for processing.
              </p>

              <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border: 1px solid #e1e4e8; background: #f9fafb; font-weight: 600;">PO Code</td>
                  <td style="padding: 10px; border: 1px solid #e1e4e8;">${reminder.po_code}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e1e4e8; background: #f9fafb; font-weight: 600;">Vendor Name</td>
                  <td style="padding: 10px; border: 1px solid #e1e4e8;">${reminder.vendor_name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e1e4e8; background: #f9fafb; font-weight: 600;">Invoice Date</td>
                  <td style="padding: 10px; border: 1px solid #e1e4e8;">${formattedInvoiceDate}</td>
                </tr>
              </table>

              <p style="font-size: 15px; line-height: 1.6; margin-top: 15px;">
                Kindly ensure timely processing to avoid delays in vendor payment.
              </p>
            </div>

            <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 13px; color: #777;">
              This is an automated reminder from <strong>Global Plugin Pvt. Ltd.</strong><br>
              Please do not reply to this email.
            </div>
          </div>
        </div>
      `;

    await sendMail({
      to: reminder.send_to,
      subject,
      html,
    });

    // Mark as sent
    await db.execute(
      "UPDATE scheduled_reminders SET status = 'sent', sent_at = NOW() WHERE id = ?",
      [reminder.id]
    );

    console.log(`✅ Reminder email sent successfully (ID: ${reminder.id})`);
  } catch (err) {
    console.error("❌ Error sending scheduled reminder:", err);
  }
};

// Verify SMTP connection on startup
verifySMTP();

// Load pending reminders when server starts
reloadScheduledReminders();

// Reload every 5 minutes to ensure new reminders are picked up
setInterval(reloadScheduledReminders, 5 * 60 * 1000);
