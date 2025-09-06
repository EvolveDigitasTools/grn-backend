import express from "express";
import upload from "../middleware/upload.js";
import { uploadGrn, uploadInvoice } from "../controller/postController.js";

const router = express.Router();

router.post("/upload-grn", upload.single("grnFile"), uploadGrn);
// router.post("/upload-invoice", upload.single("invoiceFile"), uploadInvoice);
router.post(
  "/upload-invoice",
  upload.fields([
    { name: "grnFile", maxCount: 1 },
    { name: "invoiceFile", maxCount: 1 },
  ]),
  uploadInvoice
);

export default router;
