import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import getAllGrnDetailsRoutes from "./routes/getAllGrnDetailsRoutes.js";
import uploadGrnRoutes from "./routes/uploadGrnRoutes.js";
import "./controller/poReminderController.js";

dotenv.config();

const app = express();

app.use(express.json());
//Cors
app.use(cors({
  origin: process.env.FRONTEND_URL,
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

app.use("/api", getAllGrnDetailsRoutes);
app.use("/post", uploadGrnRoutes);


//Health check
app.get("/", async (req, res) => {
    res.send("Backend is running");
});

const PORT = process.env.PORT || 5000

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
});