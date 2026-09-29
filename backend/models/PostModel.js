// models/PostModel.js
const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    type: { type: String, enum: ['Lost', 'Found'], required: true }, // 'Lost' or 'Found'
    name: { type: String, required: true },
    category: { type: String, required: true },
    location: { type: String, required: true },
    date: { type: Date, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true }, // Base64 string from frontend
    
    // College/User data for filtering and ownership
    college: { type: String, required: true }, 
    userEmail: { type: String, required: true },
    userName: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', PostSchema);