import mongoose from 'mongoose';

const externalVideoSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  uploadedByName: {
    type: String,
    default: 'Server Admin'
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    default: null
  }
}, { timestamps: true });

const ExternalVideo = mongoose.model('ExternalVideo', externalVideoSchema);
export default ExternalVideo;
