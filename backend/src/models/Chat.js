import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    default: ''
  },
  isGroup: {
    type: Boolean,
    default: false
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  adminMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  groupPic: {
    type: String,
    default: ''
  },
  latestMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  syncPlay: {
    active: {
      type: Boolean,
      default: false
    },
    videoId: {
      type: String,
      default: ''
    },
    videoTitle: {
      type: String,
      default: ''
    },
    videoUrl: {
      type: String,
      default: ''
    },
    downloadStatus: {
      type: String,
      enum: ['idle', 'downloading', 'completed', 'failed'],
      default: 'idle'
    },
    downloadProgress: {
      type: Number,
      default: 0
    },
    downloadError: {
      type: String,
      default: ''
    },
    downloadStage: {
      type: String,
      default: 'metadata'
    },
    downloadSpeed: {
      type: String,
      default: ''
    },
    downloadEta: {
      type: String,
      default: ''
    },
    downloadedSize: {
      type: String,
      default: ''
    },
    totalSize: {
      type: String,
      default: ''
    },
    currentTime: {
      type: Number,
      default: 0
    },
    durationSec: {
      type: Number,
      default: 0
    },
    isPlaying: {
      type: Boolean,
      default: false
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastUpdatedAt: {
      type: Date
    },
    history: [{
      videoId: {
        type: String,
        required: true
      },
      videoTitle: {
        type: String,
        default: ''
      },
      videoUrl: {
        type: String,
        default: ''
      },
      durationSec: {
        type: Number,
        default: 0
      },
      addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      addedByName: {
        type: String,
        default: ''
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  hiddenBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  mutedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  clearedHistory: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    clearedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

const Chat = mongoose.model('Chat', chatSchema);
export default Chat;
