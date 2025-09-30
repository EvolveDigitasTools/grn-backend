import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRoutes from "./routes/apiRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import { reloadScheduledReminders } from "./controller/postController.js";

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

app.use("/api", apiRoutes);
app.use("/post", postRoutes);


//Health check
app.get("/", async (req, res) => {
    res.send("Backend is running");
});

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    reloadScheduledReminders();
});