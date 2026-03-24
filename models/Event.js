const mongoose = require("mongoose");
 
const eventSchema = new mongoose.Schema(
  {
    date: {
      type: String, // format: "YYYY-MM-DD" to match frontend
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      default: "#4a90e2", // matches frontend default color
    },
    done: {
      type: Boolean,
      default: false,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // optional for now, required once auth is added
    },
  },
  { timestamps: true }
);
 
module.exports = mongoose.model("Event", eventSchema);
 