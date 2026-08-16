import mongoose from 'mongoose';

const videoDeletionRequestSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    trim: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, { timestamps: true });

const VideoDeletionRequest = mongoose.model('VideoDeletionRequest', videoDeletionRequestSchema);
export default VideoDeletionRequest;
