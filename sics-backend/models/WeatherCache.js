const mongoose = require('mongoose');

const weatherCacheSchema = new mongoose.Schema(
  {
    lat: {
      type: Number,
      required: true,
    },
    lon: {
      type: Number,
      required: true,
    },
    data: {
      type: Object,
      required: true,
    },
    fetchedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },  // TTL index — MongoDB auto-deletes when expiresAt is reached
    },
  }
);

weatherCacheSchema.index({ lat: 1, lon: 1 });

module.exports = mongoose.model('WeatherCache', weatherCacheSchema);