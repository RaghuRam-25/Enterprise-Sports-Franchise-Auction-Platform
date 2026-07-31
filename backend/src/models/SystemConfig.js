import mongoose from 'mongoose';

// Singleton document to persist global event configuration flags
const systemConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, default: null },
  updatedBy: { type: String, default: 'system' }
}, { timestamps: true });

export const SystemConfig = mongoose.model('SystemConfig', systemConfigSchema);

// ── Helper: Get a config value, with a default if not found ──────────────────
export const getConfig = async (key, defaultValue = null) => {
  const doc = await SystemConfig.findOne({ key });
  return doc ? doc.value : defaultValue;
};

// ── Helper: Set a config value ────────────────────────────────────────────────
export const setConfig = async (key, value, updatedBy = 'system') => {
  return SystemConfig.findOneAndUpdate(
    { key },
    { value, updatedBy },
    { upsert: true, new: true }
  );
};
