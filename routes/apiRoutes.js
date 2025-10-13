import express from "express";
import { getVendors, getPoCodes, downloadGrn, getPoList, getAllPurchaseOrders, getPurchaseOrderDetails } from "../controller/apiController.js";

const router = express.Router();

// Route with type param for flexibility
router.get("/", async (req, res) => {
  const { type } = req.query;

  switch (type) {
    case "vendors":
      return getVendors(req, res);
    case "po-codes":
      return getPoCodes(req, res);
    case "download-grn":
      return downloadGrn(req, res);
    case "po-list":
      return getPoList(req, res);      
    case "get-all-pos":
      return getAllPurchaseOrders(req, res);
    case "get-po-details":
      return getPurchaseOrderDetails(req, res);      
    default:
      return res.status(400).json({ message: "Invalid type parameter" });
  }
});

export default router;
