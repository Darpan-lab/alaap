import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 30
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['Regular', 'Admin', 'Root'],
    default: 'Regular'
  },
  profilePic: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['online', 'offline'],
    default: 'offline'
  },
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

// Prevent sending password back in JSON responses
userSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    delete returnedObject.password;
  }
});

const User = mongoose.model('User', userSchema);
export default User;
