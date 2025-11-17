import ExcelJS from "exceljs";
import db from "../db.js"; // adjust path to your db connection

// Get all vendors
export const getVendors = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT vendorCode, companyName FROM vendor"
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching vendors:", err);
    res.status(500).json({ message: "Database query failed" });
  }
};

// Get all PO codes
export const getPoCodes = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT poCode, createdBy, createdAt FROM purchase_order ORDER BY createdAt DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("DB error fetching PO codes:", err);
    res.status(500).json({ error: "DB error fetching PO codes" });
  }
};

// Download GRN Excel - Phase 1
// export const downloadGrn = async (req, res) => {
//   try {
//     const { poCode } = req.query;
//     if (!poCode || poCode === "undefined") {
//       return res.status(400).json({ message: "PO code is required" });
//     }

//     const [items] = await db.query(
//       `SELECT s.skuCode, s.name, por.expectedQty
//        FROM purchase_order po
//        JOIN purchase_order_record por ON po.id = por.purchaseOrderId
//        JOIN sku s ON por.skuId = s.id
//        WHERE po.poCode = ?`,
//       [poCode]
//     );

//     if (items.length === 0) {
//       return res.status(404).json({ message: `No items found for PO ${poCode}` });
//     }

//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet("GRN Sheet");

//     worksheet.columns = [
//       { header: "SKU Code", key: "skuCode", width: 20 },
//       { header: "SKU Name", key: "name", width: 30 },
//       { header: "Expected Qty", key: "expectedQty", width: 20 },
//       { header: "Received Qty", key: "receivedQty", width: 15 },
//       { header: "Damaged", key: "damaged", width: 15 },
//       { header: "Expiry Date", key: "expiryDate", width: 20 },
//     ];

//     items.forEach(item => {
//       worksheet.addRow({
//         skuCode: item.skuCode || "N/A",
//         name: item.name || "N/A",
//         expectedQty: item.expectedQty || 0,
//         receivedQty: "",
//         damaged: "",
//         expiryDate: ""
//       });
//     });

//     const today = new Date();
//     const formattedDate = today.toLocaleDateString("en-GB", {
//       day: "2-digit",
//       month: "long",
//       year: "numeric",
//     }).replace(/ /g, "-");

//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename=GRN-${poCode}-${formattedDate}.xlsx`
//     );
//     res.setHeader(
//       "Content-Type",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//     );

//     await workbook.xlsx.write(res);
//     res.end();
//   } catch (err) {
//     console.error("Error generating GRN:", {
//       message: err.message,
//       stack: err.stack,
//       sqlMessage: err.sqlMessage,
//       sqlState: err.sqlState,
//     });
//     res.status(500).json({ message: "Server error generating GRN", error: err.message });
//   }
// };

// Download GRN Excel - Phase 2 with multiple po number
export const downloadGrn = async (req, res) => {
  try {
    const { poCode } = req.query;
    if (!poCode || poCode === "undefined") {
      return res.status(400).json({ message: "PO code is required" });
    }

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

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("GRN Sheet");

    worksheet.columns = [
      { header: "SKU Code", key: "skuCode", width: 20 },
      { header: "SKU Name", key: "name", width: 30 },
      { header: "Expected Qty", key: "expectedQty", width: 20 },
      { header: "Received Qty", key: "receivedQty", width: 15 },
      { header: "Damaged", key: "damaged", width: 15 },
      { header: "Expiry Date", key: "expiryDate", width: 20 },
    ];

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

    const today = new Date();
    const formattedDate = today.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).replace(/ /g, "-");
    
    const safePoCode = poCode.replace(/[, ]/g, "_");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=GRN-${safePoCode }-${formattedDate}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    // ✅ Fix: write workbook directly to response without calling res.end()
    await workbook.xlsx.write(res);
    // remove res.end(); ← this was causing multiple headers issue
  } catch (err) {
    console.error("Error generating GRN:", {
      message: err.message,
      stack: err.stack,
      sqlMessage: err.sqlMessage,
      sqlState: err.sqlState,
    });
    res.status(500).json({ message: "Server error generating GRN", error: err.message });
  }
};

// Get PO list with vendor info for table
export const getPoList = async (req, res) => {
  try {
    const { vendorCode, month, poCode, search } = req.query;

    let baseQuery = `
      SELECT 
        po.poCode,
        po.createdAt AS poCreatedDate,
        po.estimatedDeliveryDate AS grnReceivedDate,
        v.companyName,
        v.vendorCode,
        COALESCE((
          SELECT MAX(por.updatedAt)
          FROM purchase_order_record por
          WHERE por.purchaseOrderId = po.id
        ), po.updatedAt) AS grnUpdatedAt
      FROM purchase_order po
      LEFT JOIN vendor v ON po.vendorProfileId = v.id
      WHERE 1=1
    `;

    const params = [];

    if (vendorCode) {
      baseQuery += ` AND v.vendorCode = ?`;
      params.push(vendorCode);
    }

    if (month) {
      baseQuery += ` AND MONTH(po.createdAt) = MONTH(?) AND YEAR(po.createdAt) = YEAR(?)`;
      params.push(`${month}-01`, `${month}-01`);
    }

    if (poCode) {
      baseQuery += ` AND po.poCode = ?`;
      params.push(poCode);
    }

    if (search) {
      baseQuery += ` AND po.poCode LIKE ?`;
      params.push(`%${search}%`);
    }

    baseQuery += ` ORDER BY po.createdAt DESC`;

    const [rows] = await db.query(baseQuery, params);
    console.log("getPoList response:", rows); // Debug
    res.json(rows);
  } catch (err) {
    console.error("Error fetching PO list:", err);
    res.status(500).json({ message: "Database query failed" });
  }
};

// Get all PO list with vendor info and GRN details (unchanged, keep for get-all-pos)
export const getAllPurchaseOrders = async (req, res) => {
  try {
    const { vendorCode, month, poCode, search } = req.query;

    let baseQuery = `
      SELECT 
        po.poCode,
        po.createdAt AS poCreatedDate,
        po.estimatedDeliveryDate AS grnReceivedDate,
        v.companyName,
        v.vendorCode,
        COALESCE((
          SELECT MAX(por.updatedAt)
          FROM purchase_order_record por
          WHERE por.purchaseOrderId = po.id
        ), '1970-01-01') AS grnUpdatedAt
      FROM purchase_order po
      LEFT JOIN vendor v ON po.vendorProfileId = v.id
      WHERE 1=1
    `;

    const params = [];

    if (vendorCode) {
      baseQuery += ` AND v.vendorCode = ?`;
      params.push(vendorCode);
    }

    if (month) {
      baseQuery += ` AND MONTH(po.createdAt) = MONTH(?) AND YEAR(po.createdAt) = YEAR(?)`;
      params.push(month, month);
    }

    if (poCode) {
      baseQuery += ` AND po.poCode = ?`;
      params.push(poCode);
    }

    if (search) {
      baseQuery += ` AND po.poCode LIKE ?`;
      params.push(`%${search}%`);
    }

    baseQuery += ` ORDER BY po.createdAt DESC`;

    const [rows] = await db.query(baseQuery, params);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching purchase orders:", err);
    res.status(500).json({ message: "Database query failed" });
  }
};

// Only showing getPurchaseOrderDetails
export const getPurchaseOrderDetails = async (req, res) => {
  try {
    const { poCode } = req.query;
    if (!poCode) {
      return res.status(400).json({ message: "PO code is required" });
    }

    const [rows] = await db.query(`
      SELECT 
        s.skuCode,
        s.name AS skuName,
        por.expectedQty,
        COALESCE(por.receivedQty, 0) AS receivedQty,
        COALESCE(por.damaged, 0) AS damaged,
        por.expiryDate
      FROM purchase_order po
      JOIN purchase_order_record por ON po.id = por.purchaseOrderId
      JOIN sku s ON por.skuId = s.id
      WHERE po.poCode = ?
    `, [poCode]);

    console.log(`getPurchaseOrderDetails for poCode=${poCode}:`, rows);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching PO details:", err);
    res.status(500).json({ message: "Database query failed" });
  }
};
