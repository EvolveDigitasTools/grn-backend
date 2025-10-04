import ExcelJS from "exceljs";
import nodemailer from "nodemailer";
import db from "../db.js"; 
import schedule from "node-schedule";
import { vendorReminderDays } from "../vendorReminderDays.js";

// ✅ Upload GRN (Excel) - Phase 1 Working
// export const uploadGrn = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ message: "No file uploaded" });
//     }

//     const workbook = new ExcelJS.Workbook();
//     await workbook.xlsx.load(req.file.buffer);
//     const worksheet = workbook.getWorksheet("GRN Sheet");

//     if (!worksheet) {
//       return res.status(400).json({ message: "GRN Sheet not found in uploaded file" });
//     }

//     const updates = [];
//     worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
//       if (rowNumber === 1) return; // Skip header row
//       const skuCode = (row.getCell(1).text || "").trim();
//       const receivedQty = parseFloat(row.getCell(4).value) || 0;
//       const expiryDate = row.getCell(6).value;

//       if (skuCode && !isNaN(receivedQty)) {
//         updates.push({
//           skuCode,
//           receivedQty,
//           expiryDate: expiryDate ? new Date(expiryDate) : null,
//         });
//       }
//     });

//     if (updates.length === 0) {
//       return res.status(400).json({ message: "No valid data found in the GRN sheet" });
//     }

//     // Begin transaction
//     await db.query("START TRANSACTION");

//     try {
//       let updatedCount = 0;
//       let insertedCount = 0;
//       let skipped = [];

//       for (const update of updates) {
//         const [skuRows] = await db.query(`SELECT id FROM sku WHERE skuCode = ?`, [update.skuCode]);

//         if (skuRows.length === 0) {
//           skipped.push(update.skuCode);
//           continue;
//         }

//         const skuId = skuRows[0].id;

//         let [result] = await db.query(
//           `UPDATE inventory 
//              SET quantity = quantity + ?, 
//                  expiryDate = IFNULL(?, expiryDate)
//            WHERE skuId = ?`,
//           [update.receivedQty, update.expiryDate, skuId]
//         );

//         if (result.affectedRows > 0) {
//           updatedCount++;
//         } else {
//           [result] = await db.query(
//             `INSERT INTO inventory (skuId, quantity, expiryDate) VALUES (?, ?, ?)`,
//             [skuId, update.receivedQty, update.expiryDate]
//           );
//           insertedCount++;
//         }
//       }

//       await db.query("COMMIT");

//       res.json({
//         message: "GRN processed successfully",
//         totalRows: updates.length,
//         updatedRows: updatedCount,
//         insertedRows: insertedCount,
//         skippedSkus: skipped,
//       });
//     } catch (err) {
//       await db.query("ROLLBACK");
//       throw err;
//     }
//   } catch (err) {
//     console.error("Error processing GRN upload:", {
//       message: err.message,
//       stack: err.stack,
//       sqlMessage: err.sqlMessage,
//       sqlState: err.sqlState,
//     });
//     res.status(500).json({ message: "Server error processing GRN upload", error: err.message });
//   }
// };


// ✅ Upload GRN (Excel) - Phase 2 Working
export const uploadGrn = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet("GRN Sheet");

    if (!worksheet) {
      return res.status(400).json({ message: "GRN Sheet not found in uploaded file" });
    }

    const updates = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row
      const skuCode = (row.getCell(1).text || "").trim();
      const receivedQty = parseFloat(row.getCell(4).value) || 0;
      const expiryDate = row.getCell(6).value;

      // 🔹 Convert any date format to yyyy-mm-dd
      let formattedExpiry = null;
      if (expiryDate) {
        try {
          const dateObj = new Date(expiryDate);
          if (!isNaN(dateObj)) {
            formattedExpiry = dateObj.toISOString().split("T")[0]; // yyyy-mm-dd
          }
        } catch (err) {
          formattedExpiry = null;
        }
      }

      if (skuCode && !isNaN(receivedQty)) {
        updates.push({
          skuCode,
          receivedQty,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
        });
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ message: "No valid data found in the GRN sheet" });
    }

    // Begin transaction
    await db.query("START TRANSACTION");

    try {
      let updatedCount = 0;
      let insertedCount = 0;
      let skipped = [];

      for (const update of updates) {
        const [skuRows] = await db.query(`SELECT id FROM sku WHERE skuCode = ?`, [update.skuCode]);

        if (skuRows.length === 0) {
          skipped.push(update.skuCode);
          continue;
        }

        const skuId = skuRows[0].id;

        let [result] = await db.query(
          `UPDATE inventory 
             SET quantity = quantity + ?, 
                 expiryDate = IFNULL(?, expiryDate),
                 inventoryUpdatedAt = NOW()
           WHERE skuId = ?`,
          [update.receivedQty, update.expiryDate, skuId]
        );

        if (result.affectedRows > 0) {
          updatedCount++;
        } else {
          [result] = await db.query(
            `INSERT INTO inventory (skuId, quantity, expiryDate, inventoryUpdatedAt) VALUES (?, ?, ?, NOW())`,
            [skuId, update.receivedQty, update.expiryDate]
          );
          insertedCount++;
        }
      }

      await db.query("COMMIT");

      res.json({
        message: "GRN processed successfully",
        totalRows: updates.length,
        updatedRows: updatedCount,
        insertedRows: insertedCount,
        skippedSkus: skipped,
      });
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    }
  } catch (err) {
    console.error("Error processing GRN upload:", {
      message: err.message,
      stack: err.stack,
      sqlMessage: err.sqlMessage,
      sqlState: err.sqlState,
    });
    res.status(500).json({ message: "Server error processing GRN upload", error: err.message });
  }
};




// ✅ Upload Invoice (send via email) and scheduling mail - Phase 4 (Scheduling storing in mysql - Working)
export const uploadInvoice = async (req, res) => {
  try {
    if (!req.files || !req.files.invoiceFile) {
      return res.status(400).json({ message: "Invoice file is required" });
    }

    const invoiceFile = req.files.invoiceFile[0];
    const grnFile = req.files.grnFile[0];
    const { invoiceDate, vendor, vendorCode, poCode } = req.body;

    const sendTo = "accounts@globalplugin.com, commerce@globalplugin.com"; // Production
    // const sendTo = "hemantk@evolvedigitas.com"; // Development

    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_USER,
        pass: process.env.ZOHO_PASS,
      },
      from: process.env.ZOHO_USER,
    });

    transporter.verify((error, success) => {
      if (error) {
        console.error("SMTP connection error:", error);
      } else {
        console.log("SMTP server is ready:", success);
      }
    });

    // 1 Send Invoice Email Immediately
    const mailOptions = {
      from: `"Hemant K" <${process.env.ZOHO_USER}>`,
      to: sendTo,
      subject: `${poCode} - GRN Completion for ${vendor} (Code: ${vendorCode}) on - ${invoiceDate}`,
      text: `Dear Mam/Sir,\n\nVendor: ${vendor}\nVendor Code: ${vendorCode}\nPO Code: ${poCode}\n\nPlease find attached purchase order and GRN file.`,
      attachments: [
        { filename: grnFile.originalname, content: grnFile.buffer },
        { filename: invoiceFile.originalname, content: invoiceFile.buffer },
      ],
    };

    await transporter.sendMail(mailOptions);

    // Get vendor-specific days 
    const reminderDays = vendorReminderDays[vendor] || vendorReminderDays["Default"];

    const reminderDate = new Date(invoiceDate);
    reminderDate.setDate(reminderDate.getDate() + reminderDays);
    reminderDate.setHours(12, 0, 0, 0); // 12:00 PM exactly

    // 3 Insert reminder record in DB
    const [result] = await db.execute(
      `INSERT INTO scheduled_reminders 
       (vendor_name, send_to, po_code, invoice_date, reminder_date, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [vendor, sendTo, poCode, invoiceDate, reminderDate]
    );

    const reminderId = result.insertId; 

    schedule.scheduleJob(reminderDate, async () => {
      try {
        await transporter.sendMail({
          from: `"Hemant K" <${process.env.ZOHO_USER}>`,
          // to: sendTo, // Dev mode
          to: sendTo || "accounts@globalplugin.com, commerce@globalplugin.com", // Production Mode
          subject: `Payment Reminder for ${poCode} ${vendor || "Vendor"} - Invoice dated ${invoiceDate}`,
          text: `Dear Team,\n\nThis is a friendly reminder that the payment for ${poCode} against invoice dated ${invoiceDate} is due.\n\nBest Regards,\nHemant`,
        });

        // ✅ Update DB status
        await db.execute(
          `UPDATE scheduled_reminders SET status = 'sent' WHERE id = ?`,
          [reminderId]
        );

        console.log(`
          ✅ Reminder email sent for vendor ${vendor || "Unknown"} (${invoiceDate}) 
          & status updated for ID ${reminderId}`);
      } catch (err) {
        console.error("❌ Failed to send reminder email:", err);
      }
    });

    res.json({
      message: "Invoice sent successfully via email. Reminder scheduled.",
      reminderDate,
      dbId: reminderId,
    });

    console.log(`
    📅 Reminder scheduled for vendor: ${vendor}
    📌 PO Code: ${poCode}
    ⏳ Reminder Days: ${reminderDays}
    🕛 Exact Date/Time: ${reminderDate}
    `);
  } catch (err) {
    console.error("Mail error:", err);
    res.status(500).json({ message: "Failed to send invoice", error: err.message });
  }
};

// Phase 4 version 2 - Reload Scheduled Reminders
export const reloadScheduledReminders = async () => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM scheduled_reminders WHERE status = 'pending'"
    );

    rows.forEach(reminder => {
      const reminderDate = new Date(reminder.reminder_date);

      if (reminderDate > new Date()) {
        // ✅ Reschedule it
        schedule.scheduleJob(reminderDate, async () => {
          try {
            // Fetch latest data from DB before sending
            const [current] = await db.execute(
              "SELECT * FROM scheduled_reminders WHERE id = ?",
              [reminder.id]
            );
            if (!current.length || current[0].status !== "pending") return;

            // Send email here...
            console.log(`Sending reminder for ID ${reminder.id} at ${new Date()}`);

            await db.execute(
              "UPDATE scheduled_reminders SET status = 'sent', sent_at = NOW() WHERE id = ?",
              [reminder.id]
            );
          } catch (err) {
            console.error("❌ Failed to send reminder email:", err);
          }
        });
      } else {
        // Missed reminders -> send immediately
        console.log(`⏰ Missed reminder for ID ${reminder.id}, sending now...`);
        // send immediately then mark as sent
      }
    });

    console.log(`🔁 Reloaded ${rows.length} reminders from DB`);
  } catch (err) {
    console.error("❌ Failed to reload reminders:", err);
  }
};
