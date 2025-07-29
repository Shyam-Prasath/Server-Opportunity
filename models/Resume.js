const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  skills: [String],
  summary: String,
  academic: [String],
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Resume', resumeSchema);
