import ExcelJS from "exceljs";
import db from "../db.js"; 
import { vendorReminderDays } from "../vendorReminderDays.js";
import { sendMail } from "../utils/mailer.js";

// Upload GRN (Excel) - Phase 5, 5 Slots Logic and saving recevied qty and damaged in db
// export const uploadGrn = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ message: "No file uploaded" });
//     }

//     const { poCode } = req.query;
//     if (!poCode) {
//       return res.status(400).json({ message: "PO code is required" });
//     }

//     const workbook = new ExcelJS.Workbook();
//     await workbook.xlsx.load(req.file.buffer);
//     const worksheet = workbook.getWorksheet("GRN Sheet");

//     if (!worksheet) {
//       return res.status(400).json({ message: "GRN Sheet not found in uploaded file" });
//     }

//     // Get purchaseOrderId for the given poCode
//     const [poRows] = await db.query(`SELECT id FROM purchase_order WHERE poCode = ?`, [poCode]);
//     if (poRows.length === 0) {
//       return res.status(404).json({ message: `Purchase order ${poCode} not found` });
//     }
//     const purchaseOrderId = poRows[0].id;

//     const updates = [];
//     worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
//       if (rowNumber === 1) return; // Skip header
//       const skuCode = (row.getCell(1).text || "").trim();
//       const receivedQty = parseFloat(row.getCell(4).value) || 0;
//       const damaged = parseFloat(row.getCell(5).value) || 0; // Assuming Damaged is in column 5
//       const expiryDate = row.getCell(6).value;

//       let formattedExpiry = null;
//       if (expiryDate) {
//         try {
//           const dateObj = new Date(expiryDate);
//           if (!isNaN(dateObj.getTime())) {
//             formattedExpiry = dateObj.toISOString().split("T")[0];
//           }
//         } catch {
//           formattedExpiry = null;
//         }
//       }

//       console.log(`Row ${rowNumber}, SKU: ${skuCode}, ReceivedQty: ${receivedQty}, Damaged: ${damaged}, Raw Excel expiryDate: ${expiryDate}, Formatted: ${formattedExpiry}`);

//       if (skuCode && !isNaN(receivedQty)) {
//         updates.push({
//           skuCode,
//           receivedQty,
//           damaged,
//           expiryDate: formattedExpiry,
//         });
//       }
//     });

//     if (updates.length === 0) {
//       return res.status(400).json({ message: "No valid data found in the GRN sheet" });
//     }

//     await db.query("START TRANSACTION");
//     let updatedCount = 0;
//     let skipped = [];

//     for (const update of updates) {
//       const { skuCode, receivedQty, damaged, expiryDate } = update;

//       // Get skuId
//       const [skuRows] = await db.query(`SELECT id FROM sku WHERE skuCode = ?`, [skuCode]);
//       if (skuRows.length === 0) {
//         skipped.push(skuCode);
//         continue;
//       }
//       const skuId = skuRows[0].id;
//       console.log(`SKU: ${skuCode}, Retrieved skuId: ${skuId}, Query Time: ${new Date().toISOString()}`);

//       // Update purchase_order_record
//       const [porRows] = await db.query(
//         `SELECT id FROM purchase_order_record WHERE purchaseOrderId = ? AND skuId = ?`,
//         [purchaseOrderId, skuId]
//       );
//       if (porRows.length === 0) {
//         skipped.push(`${skuCode} (no matching purchase order record)`);
//         continue;
//       }

//       await db.query(
//         `UPDATE purchase_order_record
//          SET receivedQty = ?, damaged = ?, updatedAt = NOW()
//          WHERE purchaseOrderId = ? AND skuId = ?`,
//         [receivedQty, damaged, purchaseOrderId, skuId]
//       );

//       // Update inventory (existing logic)
//       const [slots] = await db.query(
//         `SELECT id, batchId, expiryDate, quantity FROM inventory WHERE skuId = ? ORDER BY batchId ASC`,
//         [skuId]
//       );
//       console.log(`SKU: ${skuCode}, Raw Query Results Before Processing:`, slots.map(s => ({ ...s, expiryDate: s.expiryDate?.toString() })));

//       if (slots.length === 0) {
//         skipped.push(skuCode);
//         continue;
//       }

//       if (!expiryDate) {
//         skipped.push(`${skuCode} (no expiry)`);
//         continue;
//       }

//       const normalizeDate = (date) => {
//         if (!date) return null;
//         try {
//           console.log(`Normalizing date: ${JSON.stringify(date)}, Type: ${typeof date}`);
//           let normalized;
//           if (typeof date === 'string') {
//             normalized = date.trim();
//           } else {
//             const d = new Date(date);
//             if (isNaN(d.getTime())) return null;
//             normalized = d.toISOString().split("T")[0];
//           }
//           if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
//           return normalized;
//         } catch (e) {
//           console.log(`Normalization error for date ${date}: ${e.message}`);
//           return null;
//         }
//       };

//       const formattedExpiry = normalizeDate(expiryDate);

//       console.log(`SKU: ${skuCode}, Slots:`, slots.map(s => ({
//         batchId: s.batchId,
//         rawExpiryDate: s.expiryDate,
//         normalizedExpiryDate: normalizeDate(s.expiryDate)
//       })));

//       // Find existing slot with matching expiry
//       let matchedSlot = slots.find(s => {
//         const dbDate = normalizeDate(s.expiryDate);
//         console.log(`SKU: ${skuCode}, batchId: ${s.batchId}, dbDate: ${dbDate}, formattedExpiry: ${formattedExpiry}, match: ${dbDate && dbDate === formattedExpiry}`);
//         return dbDate && dbDate === formattedExpiry;
//       });

//       if (matchedSlot) {
//         // Update existing expiry slot
//         const newQty = matchedSlot.quantity + receivedQty;
//         await db.query(
//           `UPDATE inventory
//            SET quantity = ?, expiryDate = ?, inventoryUpdatedAt = NOW()
//            WHERE skuId = ? AND batchId = ?`,
//           [newQty, formattedExpiry, skuId, matchedSlot.batchId]
//         );
//         updatedCount++;
//         continue;
//       }

//       // Find blank slot (no expiry + qty=0)
//       const blankSlot = slots.find(s => (!s.expiryDate || s.expiryDate === null || s.expiryDate === '') && s.quantity === 0);

//       if (blankSlot) {
//         await db.query(
//           `UPDATE inventory
//            SET quantity = ?, expiryDate = ?, inventoryUpdatedAt = NOW()
//            WHERE skuId = ? AND batchId = ?`,
//           [receivedQty, formattedExpiry, skuId, blankSlot.batchId]
//         );
//         updatedCount++;
//         continue;
//       }

//       // No matching or blank slot found
//       skipped.push(`${skuCode} (all slots filled)`);
//     }

//     await db.query("COMMIT");

//     res.json({
//       message: "GRN processed successfully",
//       totalRows: updates.length,
//       updatedRows: updatedCount,
//       skippedSkus: skipped,
//     });
//   } catch (err) {
//     await db.query("ROLLBACK");
//     console.error("Error processing GRN upload:", err);
//     res.status(500).json({
//       message: "Server error processing GRN upload",
//       error: err.message,
//     });
//   }
// };

// Upload GRN (Excel) - Phase 6, 5 Slots Logic and saving recevied qty, damaged and expiry date in db
export const uploadGrn = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { poCode } = req.body;
    if (!poCode) {
      return res.status(400).json({ message: "PO code is required" });
    }

    console.log(`📦 Incoming GRN Upload for PO: ${poCode}`);
    console.log(`File received: Yes`);
    console.log(`Query params:`, req.query);

    // Get purchaseOrderId for the given poCode
    const [poRows] = await db.query(`SELECT id FROM purchase_order WHERE poCode = ?`, [poCode]);
    if (poRows.length === 0) {
      return res.status(404).json({ message: `Purchase order ${poCode} not found` });
    }
    const purchaseOrderId = poRows[0].id;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet("GRN Sheet");

    if (!worksheet) {
      return res.status(400).json({ message: "GRN Sheet not found in uploaded file" });
    }

    const updates = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      const skuCode = (row.getCell(1).text || "").trim();
      const receivedQty = parseFloat(row.getCell(4).value) || 0;
      const damaged = parseFloat(row.getCell(5).value) || 0;
      const expiryDate = row.getCell(6).value;

      let formattedExpiry = null;
      if (expiryDate) {
        try {
          const dateObj = new Date(expiryDate);
          if (!isNaN(dateObj.getTime())) {
            formattedExpiry = dateObj.toISOString().split("T")[0];
          }
        } catch {
          formattedExpiry = null;
        }
      }

      if (skuCode && !isNaN(receivedQty)) {
        updates.push({ skuCode, receivedQty, damaged, expiryDate: formattedExpiry });
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ message: "No valid data found in the GRN sheet" });
    }

    await db.query("START TRANSACTION");
    let updatedCount = 0;
    let skipped = [];

    const normalizeDate = (date) => {
      if (!date) return null;
      try {
        let normalized;
        if (typeof date === "string") {
          normalized = date.trim();
        } else {
          const d = new Date(date);
          if (isNaN(d.getTime())) return null;
          normalized = d.toISOString().split("T")[0];
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
        return normalized;
      } catch {
        return null;
      }
    };

    for (const update of updates) {
      const { skuCode, receivedQty, damaged, expiryDate } = update;

      // Get skuId
      const [skuRows] = await db.query(`SELECT id FROM sku WHERE skuCode = ?`, [skuCode]);
      if (skuRows.length === 0) {
        skipped.push(`${skuCode} (SKU not found)`);
        continue;
      }
      const skuId = skuRows[0].id;

      // Update purchase_order_record
      const [porRows] = await db.query(
        `SELECT id FROM purchase_order_record WHERE purchaseOrderId = ? AND skuId = ?`,
        [purchaseOrderId, skuId]
      );
      if (porRows.length === 0) {
        skipped.push(`${skuCode} (no matching PO record)`);
        continue;
      }

      await db.query(
        `UPDATE purchase_order_record
         SET receivedQty = ?, damaged = ?, expiryDate = ?, updatedAt = NOW()
         WHERE purchaseOrderId = ? AND skuId = ?`,
        [receivedQty, damaged, expiryDate, purchaseOrderId, skuId]
      );

      // Fetch all 5 slots for this SKU
const [slots] = await db.query(
  `SELECT id, skuId, quantity, expiryDate, batchId FROM inventory WHERE skuId = ?`,
  [skuId]
);

if (slots.length === 0) {
  skipped.push(`${skuCode} (no inventory slots)`);
  continue;
}

const formattedExpiry = normalizeDate(expiryDate);

// 1️⃣ Check for existing slot with same expiry
let matchedSlot = slots.find(s => normalizeDate(s.expiryDate) === formattedExpiry);
if (matchedSlot) {
  const newQty = matchedSlot.quantity + receivedQty;
  await db.query(
    `UPDATE inventory
     SET quantity = ?, expiryDate = ?, inventoryUpdatedAt = NOW()
     WHERE id = ?`,
    [newQty, formattedExpiry, matchedSlot.id]
  );
  updatedCount++;
  continue;
}

// 2️⃣ Check for first blank or zero slot
let blankSlot = slots.find(s => !s.expiryDate || s.expiryDate === null || s.quantity === 0);
if (blankSlot) {
  await db.query(
    `UPDATE inventory
     SET quantity = ?, expiryDate = ?, inventoryUpdatedAt = NOW()
     WHERE id = ?`,
    [receivedQty, formattedExpiry, blankSlot.id]
  );
  updatedCount++;
  continue;
}

// 3️⃣ If all slots filled, update slot_1
let slot1 = slots.find(s => s.batchId.endsWith("_slot_1"));
if (slot1) {
  await db.query(
    `UPDATE inventory
     SET quantity = ?, expiryDate = ?, inventoryUpdatedAt = NOW()
     WHERE id = ?`,
    [receivedQty, formattedExpiry, slot1.id]
  );
  updatedCount++;
} else {
  skipped.push(`${skuCode} (no slot_1 found)`);
}

    }

    await db.query("COMMIT");

    res.json({
      message: "GRN processed successfully",
      totalRows: updates.length,
      updatedRows: updatedCount,
      skippedSkus: skipped,
    });
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("Error processing GRN upload:", err);
    res.status(500).json({
      message: "Server error processing GRN upload",
      error: err.message,
    });
  }
};

// Upload Invoice (send via email) and scheduling mail - Phase 4 (Scheduling storing in mysql - Working)
// export const uploadInvoice = async (req, res) => {
//   try {
//     if (!req.files || !req.files.invoiceFile) {
//       return res.status(400).json({ message: "Invoice file is required" });
//     }

//     const invoiceFile = req.files.invoiceFile[0];
//     const grnFile = req.files.grnFile[0];
//     const { invoiceDate, vendor, vendorCode, poCode } = req.body;

//     // const sendTo = "accounts@globalplugin.com, commerce@globalplugin.com"; // Production
//     const sendTo = "hemantk@evolvedigitas.com"; // For Testing

//     const transporter = nodemailer.createTransport({
//       host: "smtp.zoho.com",
//       port: 465,
//       secure: true,
//       auth: {
//         user: process.env.ZOHO_USER,
//         pass: process.env.ZOHO_PASS,
//       },
//       from: process.env.ZOHO_USER,
//     });

//     transporter.verify((error, success) => {
//       if (error) {
//         console.error("SMTP connection error:", error);
//       } else {
//         console.log("SMTP server is ready:", success);
//       }
//     });

//     // 1 Send Invoice Email Immediately
//     const mailOptions = {
//       from: `"Hemant K" <${process.env.ZOHO_USER}>`,
//       to: sendTo,
//       subject: `${poCode} - GRN Completion for ${vendor} (Code: ${vendorCode}) on - ${invoiceDate}`,
//       text: `Dear Mam/Sir,\n\nVendor: ${vendor}\nVendor Code: ${vendorCode}\nPO Code: ${poCode}\n\nPlease find attached purchase order and GRN file.`,
//       attachments: [
//         { filename: grnFile.originalname, content: grnFile.buffer },
//         { filename: invoiceFile.originalname, content: invoiceFile.buffer },
//       ],
//     };

//     await transporter.sendMail(mailOptions);

//     // Get vendor-specific days 
//     const reminderDays = vendorReminderDays[vendor] || vendorReminderDays["Default"];

//     const reminderDate = new Date(invoiceDate);
//     reminderDate.setDate(reminderDate.getDate() + reminderDays);
//     reminderDate.setHours(12, 0, 0, 0); // 12:00 PM exactly

//     // 3 Insert reminder record in DB
//     const [result] = await db.execute(
//       `INSERT INTO scheduled_reminders 
//        (vendor_name, send_to, po_code, invoice_date, reminder_date, status)
//        VALUES (?, ?, ?, ?, ?, 'pending')`,
//       [vendor, sendTo, poCode, invoiceDate, reminderDate]
//     );

//     const reminderId = result.insertId; 

//     schedule.scheduleJob(reminderDate, async () => {
//       try {
//         // ✅ Fetch latest data from DB — ensures we always have correct info
//         const [rows] = await db.execute(
//           `SELECT vendor_name, send_to, po_code, invoice_date 
//           FROM scheduled_reminders WHERE id = ?`,
//           [reminderId]
//         );

//         if (!rows.length) {
//           console.error(`⚠️ No reminder found for ID ${reminderId}`);
//           return;
//         }

//         const { vendor_name, send_to, po_code, invoice_date } = rows[0];

//         // ✅ Send email using DB data
//         await transporter.sendMail({
//           from: `"Hemant K" <${process.env.ZOHO_USER}>`,
//           to: send_to || "accounts@globalplugin.com, commerce@globalplugin.com",
//           subject: `Payment Reminder for ${po_code} (${vendor_name}) - Invoice dated ${invoice_date}`,
//           text: `Dear Team,\n\nThis is a friendly reminder that the payment for ${po_code} against invoice dated ${invoice_date} is due.\n\nBest Regards,\nHemant`,
//           html: `
//             <div style="font-family: Arial, sans-serif; color: #333;">
//               <p>Dear Team,</p>
//               <p>This is a friendly reminder that the payment for 
//               <b>Purchase Order ${po_code}</b> from <b>${vendor_name}</b> (Invoice Date: ${invoice_date}) 
//               is due.</p>
//               <p>Please ensure timely processing.</p>
//               <p>Best Regards,<br><b>Hemant</b></p>
//             </div>
//           `,
//         });

//         // ✅ Update DB status once mail is sent
//         await db.execute(
//           `UPDATE scheduled_reminders 
//           SET status = 'sent', sent_at = NOW() 
//           WHERE id = ?`,
//           [reminderId]
//         );

//         console.log(`✅ Reminder email sent for ${vendor_name} (PO: ${po_code})`);
//       } catch (err) {
//         console.error("❌ Failed to send reminder email:", err);
//       }
//     });


//     res.json({
//       message: "Invoice sent successfully via email. Reminder scheduled.",
//       reminderDate,
//       dbId: reminderId,
//     });

//     console.log(`
//     📅 Reminder scheduled for vendor: ${vendor}
//     📌 PO Code: ${poCode}
//     ⏳ Reminder Days: ${reminderDays}
//     🕛 Exact Date/Time: ${reminderDate}
//     `);
//   } catch (err) {
//     console.error("Mail error:", err);
//     res.status(500).json({ message: "Failed to send invoice", error: err.message });
//   }
// };

// Upload Invoice (send via email) and scheduling mail - Phase 5 (Scheduling storing in mysql - Working)
export const uploadInvoice = async (req, res) => {
  try {
    if (!req.files || !req.files.invoiceFile) {
      return res.status(400).json({ message: "Invoice file is required" });
    }

    const invoiceFile = req.files.invoiceFile[0];
    const grnFile = req.files.grnFile[0];
    const { invoiceDate, vendor, vendorCode, poCode } = req.body;

    const sendTo = "accounts@globalplugin.com"; // Production
    // const sendTo = "hemantk@evolvedigitas.com"; // For Testing

    const html = `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f6f8fa; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
      
      <div style="background-color: #2d7ff9; color: #fff; padding: 15px 25px;">
        <h2 style="margin: 0; font-weight: 600; font-size: 18px;">GRN Completion Notice</h2>
      </div>

      <div style="padding: 25px; color: #333;">
        <p style="font-size: 15px; margin-bottom: 15px;">Dear Anu Ma'am,</p>
        <p style="font-size: 15px; line-height: 1.6;">
          The <strong>Goods Received Note (GRN)</strong> for the following Purchase Order has been completed.
          Please find attached the related <strong>GRN</strong> and <strong>Invoice</strong> files for your reference.
        </p>

        <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px; border: 1px solid #e1e4e8; background: #f9fafb; font-weight: 600;">Vendor Name</td>
            <td style="padding: 10px; border: 1px solid #e1e4e8;">${vendor}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e1e4e8; background: #f9fafb; font-weight: 600;">Vendor Code</td>
            <td style="padding: 10px; border: 1px solid #e1e4e8;">${vendorCode}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e1e4e8; background: #f9fafb; font-weight: 600;">PO Code</td>
            <td style="padding: 10px; border: 1px solid #e1e4e8;">${poCode}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e1e4e8; background: #f9fafb; font-weight: 600;">GRN Date</td>
            <td style="padding: 10px; border: 1px solid #e1e4e8;">${invoiceDate}</td>
          </tr>
        </table>

        <p style="font-size: 15px; margin-top: 20px;">
          Kindly verify the attached files and confirm if further action is needed.
        </p>
      </div>

      <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 13px; color: #777;">
        This is an automated notification from <strong>Global Pluugin Pvt. Ltd.</strong><br>
        Please do not reply to this email.
      </div>
    </div>
  </div>
`;

    // 1️⃣ Send invoice email immediately
    await sendMail({
      to: sendTo,
      subject: `GRN Completed ${poCode} | Vendor: ${vendor} (Code: ${vendorCode}) | Date: ${invoiceDate}`,
      html,
      attachments: [
        { filename: grnFile.originalname, content: grnFile.buffer },
        { filename: invoiceFile.originalname, content: invoiceFile.buffer },
      ],
    });

    // 2️⃣ Calculate reminder date
    const reminderDays = vendorReminderDays[vendor] || vendorReminderDays["Default"];
    const reminderDate = new Date(invoiceDate);
    reminderDate.setDate(reminderDate.getDate() + reminderDays);
    reminderDate.setHours(12, 0, 0, 0); // 12:00 PM

    // 3️⃣ Insert reminder record (existing table structure)
    await db.execute(
      `INSERT INTO scheduled_reminders 
       (vendor_name, send_to, po_code, invoice_date, reminder_date, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [vendor, sendTo, poCode, invoiceDate, reminderDate]
    );

    res.json({
      message: "Invoice sent successfully via email. Reminder scheduled.",
      reminderDate,
    });

    console.log(`
    📦 Vendor: ${vendor}
    📌 PO Code: ${poCode}
    ⏳ Reminder Days: ${reminderDays}
    🕛 Reminder Date: ${reminderDate}
    `);
  } catch (err) {
    console.error("Mail error:", err);
    res.status(500).json({ message: "Failed to send invoice", error: err.message });
  }
};



