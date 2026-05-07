import mongoose from 'mongoose';

export const deviceSchema = new mongoose.Schema(
  {
    device: { type: String, required: true, trim: true, maxlength: 50 },
    room: { type: String, required: true, trim: true, maxlength: 30 },
    status: { type: String, enum: ['on', 'off'], default: 'off' },
    description: { type: String, default: '', maxlength: 255 },
    image: { type: String, default: null },
  },
  {
    timestamps: true,
  },
);

export const DeviceModel = mongoose.model('Device', deviceSchema);
