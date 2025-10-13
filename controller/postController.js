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

//       // 🔹 Convert any date format to yyyy-mm-dd
//       let formattedExpiry = null;
//       if (expiryDate) {
//         try {
//           const dateObj = new Date(expiryDate);
//           if (!isNaN(dateObj)) {
//             formattedExpiry = dateObj.toISOString().split("T")[0]; // yyyy-mm-dd
//           }
//         } catch (err) {
//           formattedExpiry = null;
//         }
//       }

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
//                  expiryDate = IFNULL(?, expiryDate),
//                  inventoryUpdatedAt = NOW()
//            WHERE skuId = ?`,
//           [update.receivedQty, update.expiryDate, skuId]
//         );

//         if (result.affectedRows > 0) {
//           updatedCount++;
//         } else {
//           [result] = await db.query(
//             `INSERT INTO inventory (skuId, quantity, expiryDate, inventoryUpdatedAt) VALUES (?, ?, ?, NOW())`,
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

// ✅ Upload GRN (Excel) - Phase 3 Testing with 5 Slots Logic
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
//       if (rowNumber === 1) return; // Skip header
//       const skuCode = (row.getCell(1).text || "").trim();
//       const receivedQty = parseFloat(row.getCell(4).value) || 0;
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

//       // Log raw Excel expiryDate for debugging
//       console.log(`Row ${rowNumber}, SKU: ${skuCode}, Raw Excel expiryDate: ${expiryDate}, Formatted: ${formattedExpiry}`);

//       if (skuCode && !isNaN(receivedQty)) {
//         updates.push({
//           skuCode,
//           receivedQty,
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
//       const { skuCode, receivedQty, expiryDate } = update;

//       const [skuRows] = await db.query(`SELECT id FROM sku WHERE skuCode = ?`, [skuCode]);
//       if (skuRows.length === 0) {
//         skipped.push(skuCode);
//         continue;
//       }

//       const skuId = skuRows[0].id;
//       console.log(`SKU: ${skuCode}, Retrieved skuId: ${skuId}, Query Time: ${new Date().toISOString()}`); // Log skuId and time

//       // Get all 5 slots for that SKU
//       const [slots] = await db.query(
//         `SELECT id, batchId, expiryDate, quantity FROM inventory WHERE skuId = ? ORDER BY batchId ASC`,
//         [skuId]
//       );
//       console.log(`SKU: ${skuCode}, Raw Query Results Before Processing:`, slots.map(s => ({ ...s, expiryDate: s.expiryDate?.toString() }))); // Log raw data

//       // Skip if no slots found
//       if (slots.length === 0) {
//         skipped.push(skuCode);
//         continue;
//       }

//       // If no expiryDate provided → skip this SKU (barely case)
//       if (!expiryDate) {
//         skipped.push(`${skuCode} (no expiry)`);
//         continue;
//       }

//       // 1️⃣ Normalize both DB and sheet dates for safe comparison
//       const normalizeDate = (date) => {
//         if (!date) return null;
//         try {
//           console.log(`Normalizing date: ${JSON.stringify(date)}, Type: ${typeof date}`); // Log raw input
//           let normalized;
//           if (typeof date === 'string') {
//             // Handle as YYYY-MM-DD string
//             normalized = date.trim();
//           } else {
//             // Handle Date object or other types
//             const d = new Date(date);
//             if (isNaN(d.getTime())) return null;
//             normalized = d.toISOString().split("T")[0];
//           }
//           // Validate format (optional, can be removed if data is guaranteed correct)
//           if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
//           return normalized;
//         } catch (e) {
//           console.log(`Normalization error for date ${date}: ${e.message}`);
//           return null;
//         }
//       };

//       const formattedExpiry = normalizeDate(expiryDate);

//       // Log all slots for this SKU to verify database expiryDate values
//       console.log(`SKU: ${skuCode}, Slots:`, slots.map(s => ({
//         batchId: s.batchId,
//         rawExpiryDate: s.expiryDate,
//         normalizedExpiryDate: normalizeDate(s.expiryDate)
//       })));

//       // 2️⃣ Find existing slot with matching expiry using normalized dates
//       let matchedSlot = slots.find(s => {
//         const dbDate = normalizeDate(s.expiryDate);
//         // Log comparison for debugging
//         console.log(`SKU: ${skuCode}, batchId: ${s.batchId}, dbDate: ${dbDate}, formattedExpiry: ${formattedExpiry}, match: ${dbDate && dbDate === formattedExpiry}`);
//         return dbDate && dbDate === formattedExpiry;
//       });

//       if (matchedSlot) {
//         // Update quantity in the matching slot
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

//       // 3️⃣ If no matching expiry, find the first blank slot
//       const blankSlot = slots.find(s => !s.expiryDate);
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

//       // 3️⃣ If all slots are filled, skip this one
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

// ✅ Upload GRN (Excel) - Phase 4 Working with 5 Slots Logic
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
//       if (rowNumber === 1) return; // Skip header
//       const skuCode = (row.getCell(1).text || "").trim();
//       const receivedQty = parseFloat(row.getCell(4).value) || 0;
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

//       console.log(`Row ${rowNumber}, SKU: ${skuCode}, Raw Excel expiryDate: ${expiryDate}, Formatted: ${formattedExpiry}`);

//       if (skuCode && !isNaN(receivedQty)) {
//         updates.push({
//           skuCode,
//           receivedQty,
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
//       const { skuCode, receivedQty, expiryDate } = update;

//       const [skuRows] = await db.query(`SELECT id FROM sku WHERE skuCode = ?`, [skuCode]);
//       if (skuRows.length === 0) {
//         skipped.push(skuCode);
//         continue;
//       }

//       const skuId = skuRows[0].id;
//       console.log(`SKU: ${skuCode}, Retrieved skuId: ${skuId}, Query Time: ${new Date().toISOString()}`);

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

//       // ✅ FIXED SECTION BELOW
//       // 1️⃣ Find existing slot with matching expiry
//       let matchedSlot = slots.find(s => {
//         const dbDate = normalizeDate(s.expiryDate);
//         console.log(`SKU: ${skuCode}, batchId: ${s.batchId}, dbDate: ${dbDate}, formattedExpiry: ${formattedExpiry}, match: ${dbDate && dbDate === formattedExpiry}`);
//         return dbDate && dbDate === formattedExpiry;
//       });

//       if (matchedSlot) {
//         // ✅ Update existing expiry slot
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

//       // ✅ NEW LOGIC: If expiry not found, find blank slot (no expiry + qty=0)
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

//       // ❌ No matching or blank slot found
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

// ✅ Upload GRN (Excel) - Phase 55 Slots Logic and saving recevied qty and damaged in db
export const uploadGrn = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { poCode } = req.query;
    if (!poCode) {
      return res.status(400).json({ message: "PO code is required" });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet("GRN Sheet");

    if (!worksheet) {
      return res.status(400).json({ message: "GRN Sheet not found in uploaded file" });
    }

    // Get purchaseOrderId for the given poCode
    const [poRows] = await db.query(`SELECT id FROM purchase_order WHERE poCode = ?`, [poCode]);
    if (poRows.length === 0) {
      return res.status(404).json({ message: `Purchase order ${poCode} not found` });
    }
    const purchaseOrderId = poRows[0].id;

    const updates = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      const skuCode = (row.getCell(1).text || "").trim();
      const receivedQty = parseFloat(row.getCell(4).value) || 0;
      const damaged = parseFloat(row.getCell(5).value) || 0; // Assuming Damaged is in column 5
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

      console.log(`Row ${rowNumber}, SKU: ${skuCode}, ReceivedQty: ${receivedQty}, Damaged: ${damaged}, Raw Excel expiryDate: ${expiryDate}, Formatted: ${formattedExpiry}`);

      if (skuCode && !isNaN(receivedQty)) {
        updates.push({
          skuCode,
          receivedQty,
          damaged,
          expiryDate: formattedExpiry,
        });
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ message: "No valid data found in the GRN sheet" });
    }

    await db.query("START TRANSACTION");
    let updatedCount = 0;
    let skipped = [];

    for (const update of updates) {
      const { skuCode, receivedQty, damaged, expiryDate } = update;

      // Get skuId
      const [skuRows] = await db.query(`SELECT id FROM sku WHERE skuCode = ?`, [skuCode]);
      if (skuRows.length === 0) {
        skipped.push(skuCode);
        continue;
      }
      const skuId = skuRows[0].id;
      console.log(`SKU: ${skuCode}, Retrieved skuId: ${skuId}, Query Time: ${new Date().toISOString()}`);

      // Update purchase_order_record
      const [porRows] = await db.query(
        `SELECT id FROM purchase_order_record WHERE purchaseOrderId = ? AND skuId = ?`,
        [purchaseOrderId, skuId]
      );
      if (porRows.length === 0) {
        skipped.push(`${skuCode} (no matching purchase order record)`);
        continue;
      }

      await db.query(
        `UPDATE purchase_order_record
         SET receivedQty = ?, damaged = ?, updatedAt = NOW()
         WHERE purchaseOrderId = ? AND skuId = ?`,
        [receivedQty, damaged, purchaseOrderId, skuId]
      );

      // Update inventory (existing logic)
      const [slots] = await db.query(
        `SELECT id, batchId, expiryDate, quantity FROM inventory WHERE skuId = ? ORDER BY batchId ASC`,
        [skuId]
      );
      console.log(`SKU: ${skuCode}, Raw Query Results Before Processing:`, slots.map(s => ({ ...s, expiryDate: s.expiryDate?.toString() })));

      if (slots.length === 0) {
        skipped.push(skuCode);
        continue;
      }

      if (!expiryDate) {
        skipped.push(`${skuCode} (no expiry)`);
        continue;
      }

      const normalizeDate = (date) => {
        if (!date) return null;
        try {
          console.log(`Normalizing date: ${JSON.stringify(date)}, Type: ${typeof date}`);
          let normalized;
          if (typeof date === 'string') {
            normalized = date.trim();
          } else {
            const d = new Date(date);
            if (isNaN(d.getTime())) return null;
            normalized = d.toISOString().split("T")[0];
          }
          if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
          return normalized;
        } catch (e) {
          console.log(`Normalization error for date ${date}: ${e.message}`);
          return null;
        }
      };

      const formattedExpiry = normalizeDate(expiryDate);

      console.log(`SKU: ${skuCode}, Slots:`, slots.map(s => ({
        batchId: s.batchId,
        rawExpiryDate: s.expiryDate,
        normalizedExpiryDate: normalizeDate(s.expiryDate)
      })));

      // Find existing slot with matching expiry
      let matchedSlot = slots.find(s => {
        const dbDate = normalizeDate(s.expiryDate);
        console.log(`SKU: ${skuCode}, batchId: ${s.batchId}, dbDate: ${dbDate}, formattedExpiry: ${formattedExpiry}, match: ${dbDate && dbDate === formattedExpiry}`);
        return dbDate && dbDate === formattedExpiry;
      });

      if (matchedSlot) {
        // Update existing expiry slot
        const newQty = matchedSlot.quantity + receivedQty;
        await db.query(
          `UPDATE inventory
           SET quantity = ?, expiryDate = ?, inventoryUpdatedAt = NOW()
           WHERE skuId = ? AND batchId = ?`,
          [newQty, formattedExpiry, skuId, matchedSlot.batchId]
        );
        updatedCount++;
        continue;
      }

      // Find blank slot (no expiry + qty=0)
      const blankSlot = slots.find(s => (!s.expiryDate || s.expiryDate === null || s.expiryDate === '') && s.quantity === 0);

      if (blankSlot) {
        await db.query(
          `UPDATE inventory
           SET quantity = ?, expiryDate = ?, inventoryUpdatedAt = NOW()
           WHERE skuId = ? AND batchId = ?`,
          [receivedQty, formattedExpiry, skuId, blankSlot.batchId]
        );
        updatedCount++;
        continue;
      }

      // No matching or blank slot found
      skipped.push(`${skuCode} (all slots filled)`);
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
