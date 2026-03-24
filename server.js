const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
 
const app = express();
const PORT = process.env.PORT || 5000;
 
// ---- MIDDLEWARE ----
app.use(cors());
app.use(express.json());
 
// ---- DATABASE CONNECTION ----
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));
 
// ---- ROUTES ----
const eventRoutes = require("./routes/events");
 
app.use("/api/events", eventRoutes);
 
// Test route - confirm server is running
app.get("/", (req, res) => {
  res.json({ message: "SICS Backend is running" });
});
 
// ---- START SERVER ----
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});