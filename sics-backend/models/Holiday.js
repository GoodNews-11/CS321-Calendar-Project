const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    region: {
      type: String,
      default: 'global',  // e.g. 'BD', 'US', 'global'
    },
    isRecurringYearly: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

holidaySchema.index({ date: 1, region: 1 });

module.exports = mongoose.model('Holiday', holidaySchema);