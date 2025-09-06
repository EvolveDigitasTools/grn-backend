import ExcelJS from "exceljs";
import db from "../db.js"; // adjust path to your db connection

// ✅ Get all vendors
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

// ✅ Get all PO codes
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

// ✅ Download GRN Excel
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
};
