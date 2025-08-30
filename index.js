import express from "express";
import cors from "express";
import db from "./db.js";
import dotenv from "dotenv";
import ExcelJS from "exceljs";
import multer from "multer";

dotenv.config();

const app = express();

//Configure multer for file upload
const upload = multer({ storage: multer.memoryStorage() });

//Cors
app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

//Force Access-Control-Allow-Origin
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.use(express.json());

// Get all vendors - Done
app.get("/vendors", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT vendorCode, companyName FROM vendor"
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching vendors:", err);
    res.status(500).json({ message: "Database query failed" });
  }
});


// Get all the PO Code - Phase 1 
// app.get("/get-po-codes", (req, res) => {
//   const query = "SELECT poCode FROM purchase_order";
//   db.query(query, (err, results) => {
//     if (err) {
//       console.error("DB error fetching PO codes:", err);
//       return res.status(500).json({ error: "DB error fetching PO codes" });
//     }
//     res.json(results); // results will be like [{poCode: "PO123"}, {poCode: "PO456"}]
//   });
// });

// Get all the PO Code with createdBy and createdAt - Phase 2 
app.get("/get-po-codes", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT poCode, createdBy, createdAt FROM purchase_order ORDER BY createdAt DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("DB error fetching PO codes:", err);
    res.status(500).json({ error: "DB error fetching PO codes" });
  }
});


// Download GRN Excel - Phase 1
// app.get("/download-grn", async (req, res) => {
//   try {
//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet("GRN Sheet");

//     // Define headers (1 to 6, as discussed earlier)
//     worksheet.columns = [
//       { header: "SKU Code", key: "skuCode", width: 20 },
//       { header: "SKU Name", key: "name", width: 30 },
//       { header: "Expected Qty", key: "expectedQty", width: 20 },
//       { header: "Received Qty", key: "receivedQty", width: 15 },
//       { header: "Damaged", key: "damaged", width: 15 },
//       { header: "Expiry Date", key: "expiryDate", width: 20 },
//     ];

//     // Generate filename with today’s date
//     const today = new Date();
//     const formattedDate = today.toLocaleDateString("en-GB", {
//       day: "2-digit",
//       month: "long",
//       year: "numeric",
//     }).replace(/ /g, "-");

//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename=GRN-${formattedDate}.xlsx`
//     );
//     res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

//     await workbook.xlsx.write(res);
//     res.end();
//   } catch (error) {
//     console.error("Error generating GRN sheet:", error);
//     res.status(500).json({ error: "Failed to generate GRN sheet" });
//   }
// });

// Download GRN Excel with Create PO and Pulling SKUS - Done
app.get("/download-grn", async (req, res) => {
  try {
    const { poCode } = req.query;
    if (!poCode || poCode === "undefined") {
      return res.status(400).json({ message: "PO code is required" });
    }

    // Fetch items related to this PO from purchase_order, purchase_order_record, and sku
    const [items] = await db.query(
      `SELECT s.skuCode, s.name, por.expectedQty
       FROM purchase_order po
       JOIN purchase_order_record por ON po.id = por.purchaseOrderId
       JOIN sku s ON por.skuId = s.id
       WHERE po.poCode = ?`,
      [poCode]
    );

    if (items.length === 0) {
      return res.status(404).json({ message: `No items found for PO ${poCode}` });
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("GRN Sheet");

    // Define headers
    worksheet.columns = [
      { header: "SKU Code", key: "skuCode", width: 20 },
      { header: "SKU Name", key: "name", width: 30 },
      { header: "Expected Qty", key: "expectedQty", width: 20 },
      { header: "Received Qty", key: "receivedQty", width: 15 },
      { header: "Damaged", key: "damaged", width: 15 },
      { header: "Expiry Date", key: "expiryDate", width: 20 },
    ];

    // Add rows with pre-filled data
    items.forEach(item => {
      worksheet.addRow({
        skuCode: item.skuCode || "N/A",
        name: item.name || "N/A",
        expectedQty: item.expectedQty || 0,
        receivedQty: "",
        damaged: "",
        expiryDate: ""
      });
    });

    // Generate filename
    const today = new Date();
    const formattedDate = today.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).replace(/ /g, "-");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=GRN-${poCode}-${formattedDate}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error generating GRN:", {
      message: err.message,
      stack: err.stack,
      sqlMessage: err.sqlMessage,
      sqlState: err.sqlState,
    });
    res.status(500).json({ message: "Server error generating GRN", error: err.message });
  }
});


// Upload GRN Excel and update inventory * 1000 - Phase 1
app.post("/upload-grn", upload.single("grnFile"), async (req, res) => {
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
      const skuCode = row.getCell(1).value; // SKU Code (column 1)
      const receivedQty = parseFloat(row.getCell(4).value); // Received Qty (column 4)
      if (skuCode && !isNaN(receivedQty)) {
        updates.push({ skuCode, receivedQty });
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ message: "No valid data found in the GRN sheet" });
    }

    // Begin transaction to ensure atomic updates
    await db.query("START TRANSACTION");

    try {
      for (const update of updates) {
        // Get sku.id for the given skuCode
        const [skuRows] = await db.query(
          `SELECT id FROM sku WHERE skuCode = ?`,
          [update.skuCode]
        );

        if (skuRows.length === 0) {
          throw new Error(`SKU Code ${update.skuCode} not found`);
        }

        const skuId = skuRows[0].id;

        // Update inventory.quantity for the matching skuId
        const [result] = await db.query(
        `UPDATE inventory SET quantity = quantity + ? WHERE skuId = ?`,
        [update.receivedQty, skuId]
        );

        if (result.affectedRows === 0) {
          throw new Error(`No inventory record found for SKU Code ${update.skuCode}`);
        }
      }

      // Commit transaction
      await db.query("COMMIT");
      res.json({ message: "Inventory updated successfully", updatedRows: updates.length });
    } catch (err) {
      // Rollback transaction on error
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
});

// Upload GRN Excel and update inventory - Phase 2 Done
// app.post("/upload-grn", upload.single("grnFile"), async (req, res) => {
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

//     const updatesMap = new Map();

//     worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
//       if (rowNumber === 1) return; // skip header row

//       const skuCode = row.getCell(1).value?.toString().trim();

//       // Extract Received Qty safely
//       let receivedQty = row.getCell(4).value;
//       if (typeof receivedQty === "object" && receivedQty?.result !== undefined) {
//         receivedQty = receivedQty.result; // handle formula cell
//       }
//       receivedQty = Number(receivedQty);

//       if (skuCode && !isNaN(receivedQty)) {
//         // aggregate by SKU
//         if (updatesMap.has(skuCode)) {
//           updatesMap.set(skuCode, updatesMap.get(skuCode) + receivedQty);
//         } else {
//           updatesMap.set(skuCode, receivedQty);
//         }
//       }
//     });

//     // Convert Map → Array
//     const updates = Array.from(updatesMap, ([skuCode, receivedQty]) => ({
//       skuCode,
//       receivedQty,
//     }));

//     if (updates.length === 0) {
//       return res.status(400).json({ message: "No valid data found in the GRN sheet" });
//     }

//     // Start transaction
//     await db.query("START TRANSACTION");

//     try {
//       for (const update of updates) {
//         console.log(`SKU: ${update.skuCode}, Received: ${update.receivedQty}`);

//         const [skuRows] = await db.query(
//           `SELECT i.id, i.quantity 
//            FROM inventory i
//            JOIN sku s ON i.skuId = s.id
//            WHERE s.skuCode = ?`,
//           [update.skuCode]
//         );

//         if (skuRows.length === 0) {
//           throw new Error(`SKU Code ${update.skuCode} not found`);
//         }

//         const skuId = skuRows[0].id;
//         const oldQty = skuRows[0].quantity;

//         console.log(`Before Update → SKU: ${update.skuCode}, OldQty: ${oldQty}, Adding: ${update.receivedQty}`);

//         await db.query(
//           `UPDATE inventory SET quantity = quantity + ? WHERE id = ?`,
//           [update.receivedQty, skuId]
//         );

//         const [afterRows] = await db.query(
//           `SELECT quantity FROM inventory WHERE id = ?`,
//           [skuId]
//         );

//         console.log(`After Update → SKU: ${update.skuCode}, NewQty: ${afterRows[0].quantity}`);
//       }

//       // Commit
//       await db.query("COMMIT");
//       res.json({ 
//         message: "Inventory updated successfully",
//         skuCode,
//         oldQty,
//         newQty, 
//         updatedQty: quantity,
//         afterQty,
//         updatedRows: updates.length 
//     });
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
// });




const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});