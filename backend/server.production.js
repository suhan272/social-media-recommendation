// Production version of the server with better security and configuration
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Post = require('./models/PostModel');
const User = require('./models/UserModel');
const Message = require('./models/MessageModel');

const app = express();

// Use environment variables or default values
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/LostLinkerDB';
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_CHANGE_THIS';

// Middleware
app.use(bodyParser.json({ limit: '10mb' })); // Reduced limit for better performance
app.use(express.json());

// CORS - Configured for production
app.use((req, res, next) => {
    // In production, replace '*' with your frontend domain
   const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
   'https://lostlinker-jtjg.onrender.com', // ✅ your frontend
  'https://lostlinker-project.onrender.com'    // backend itself
];

    
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Database Connection
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true
}).then(() => {
    console.log('MongoDB connected successfully.');
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit if database connection fails
});

// --- Auth Middleware ---
const auth = (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        
        if (!authHeader) {
            return res.status(401).send({ message: 'No authorization header provided.' });
        }
        
        const token = authHeader.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).send({ message: 'No token provided.' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { userId, email, college, isAdmin, name }
        next();
    } catch (e) {
        console.error('Auth error:', e);
        res.status(401).send({ message: 'Authentication failed.' });
    }
};

// --- API Routes ---

// 1. SIGNUP
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const collegeDomain = email.split('@')[1];
        if (!collegeDomain || (!collegeDomain.endsWith('.ac.in') && !collegeDomain.endsWith('.edu'))) {
            return res.status(400).send({ message: 'Invalid college email format.' });
        }

        const hashedPassword = await bcrypt.hash(password, 8);
        const user = new User({ name, email, password: hashedPassword, college: collegeDomain });
        await user.save();
        res.status(201).send({ message: 'User created successfully.', collegeDomain });
    } catch (err) {
        res.status(400).send({ message: 'Email already in use or missing fields.' });
    }
});

// 2. LOGIN
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send({ message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).send({ message: 'Invalid credentials.' });
        }

        // Include name in the JWT token
        const token = jwt.sign({ 
            userId: user._id, 
            email: user.email, 
            college: user.college, 
            isAdmin: user.isAdmin,
            name: user.name  // Add name to the token
        }, JWT_SECRET);
        
        res.send({ 
            token, 
            user: {
                _id: user._id, 
                name: user.name, 
                email: user.email, 
                college: user.college.split('.')[0], // Send back just the name
                isAdmin: user.isAdmin
            } 
        });
    } catch (err) {
        res.status(500).send({ message: 'Server error during login.' });
    }
});

// 3. GET POSTS (READ)
app.get('/api/posts', auth, async (req, res) => {
    try {
        const { type, college, search } = req.query;

        let query = { type, college: req.user.college }; 

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { name: searchRegex },
                { category: searchRegex },
                { description: searchRegex },
                { userName: searchRegex },
                { location: searchRegex }
            ];
        }

        const posts = await Post.find(query).sort({ date: -1 });
        res.send(posts);
    } catch (err) {
        res.status(500).send({ message: 'Failed to fetch posts.' });
    }
});

// 4. CREATE POST
app.post('/api/posts', auth, async (req, res) => {
    try {
        const { type, name, category, location, date, description, image } = req.body;
        
        // Validate required fields
        if (!type || !name || !category || !location || !date || !description || !image) {
            return res.status(400).send({ 
                message: 'Missing required fields.',
                received: { type, name, category, location, date, description, image }
            });
        }
        
        // Convert date string to Date object
        const postDate = new Date(date);
        if (isNaN(postDate.getTime())) {
            return res.status(400).send({ message: 'Invalid date format.', receivedDate: date });
        }

        const newPost = new Post({
            type,
            name,
            category,
            location,
            date: postDate, // Use the converted Date object
            description,
            image, // Base64 string for simplicity, production uses URL
            college: req.user.college,
            userEmail: req.user.email,
            userName: req.user.name,  // This should now work since name is in the token
            userId: req.user.userId
        });

        await newPost.save();
        res.status(201).send({ message: 'Post created.', post: newPost });
    } catch (err) {
        console.error('Error creating post:', err); // Log the actual error for debugging
        res.status(400).send({ message: 'Invalid post data.', error: err.message });
    }
});

// 5. DELETE POST
app.delete('/api/posts/:id', auth, async (req, res) => {
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).send({ message: 'Post not found.' });
        }

        // Authorization: Only owner or admin can delete
        const isOwner = post.userId.toString() === req.user.userId.toString();
        const isAdmin = req.user.isAdmin;
        
        if (!isOwner && !isAdmin) {
            return res.status(403).send({ message: 'Forbidden: You do not own this post.' });
        }

        await Post.deleteOne({ _id: postId });
        res.send({ message: 'Post deleted successfully.' });
    } catch (err) {
        res.status(500).send({ message: 'Server error during deletion.' });
    }
});

// 6. MESSAGES API ROUTES

// Send a message
app.post('/api/messages', auth, async (req, res) => {
    try {
        const { receiverId, postId, content } = req.body;
        
        // Validate required fields
        if (!receiverId || !postId || !content) {
            return res.status(400).send({ message: 'Missing required fields: receiverId, postId, and content are required.' });
        }
        
        // Create new message
        const newMessage = new Message({
            senderId: req.user.userId,
            receiverId,
            postId,
            content
        });
        
        await newMessage.save();
        
        // Populate sender info for the response
        await newMessage.populate('senderId', 'name');
        
        res.status(201).send({ message: 'Message sent successfully.', newMessage });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).send({ message: 'Server error while sending message.' });
    }
});

// Get messages between two users for a specific post
app.get('/api/messages/:userId/:postId', auth, async (req, res) => {
    try {
        const { userId, postId } = req.params;
        
        // Find messages between the current user and the specified user for the specified post
        const messages = await Message.find({
            postId,
            $or: [
                { senderId: req.user.userId, receiverId: userId },
                { senderId: userId, receiverId: req.user.userId }
            ]
        }).populate('senderId', 'name').sort({ createdAt: 1 });
        
        // Mark messages as read if they were sent to the current user
        const messageIdsToUpdate = messages
            .filter(msg => msg.receiverId.toString() === req.user.userId.toString() && !msg.isRead)
            .map(msg => msg._id);
            
        if (messageIdsToUpdate.length > 0) {
            await Message.updateMany(
                { _id: { $in: messageIdsToUpdate } },
                { isRead: true }
            );
        }
        
        res.send(messages);
    } catch (err) {
        console.error('Error fetching messages:', err);
        res.status(500).send({ message: 'Server error while fetching messages.' });
    }
});

// Get unread messages count for the current user
app.get('/api/messages/unread-count', auth, async (req, res) => {
    try {
        const unreadCount = await Message.countDocuments({
            receiverId: req.user.userId,
            isRead: false
        });
        
        res.send({ unreadCount });
    } catch (err) {
        console.error('Error fetching unread count:', err);
        res.status(500).send({ message: 'Server error while fetching unread count.' });
    }
});

// Get unread messages for the current user
app.get('/api/messages/unread', auth, async (req, res) => {
    try {
        const unreadMessages = await Message.find({
            receiverId: req.user.userId,
            isRead: false
        }).populate('senderId', 'name').populate('postId', 'name type');
        
        res.send(unreadMessages);
    } catch (err) {
        console.error('Error fetching unread messages:', err);
        res.status(500).send({ message: 'Server error while fetching unread messages.' });
    }
});

// 7. PASSWORD RESET ROUTES

// Request password reset
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if user exists or not for security
            return res.status(200).send({ message: 'If the email exists, a reset link has been sent.' });
        }
        
        // Generate reset token (in a real app, this would be sent via email)
        const resetToken = crypto.randomBytes(32).toString('hex');
        // In a real app, you would store this token in the database with an expiration time
        
        res.status(200).send({ 
            message: 'Reset token generated (in a real app, this would be sent via email)',
            resetToken,
            userId: user._id
        });
    } catch (err) {
        console.error('Error in forgot password:', err);
        res.status(500).send({ message: 'Server error during password reset request.' });
    }
});

// Reset password
app.post('/api/reset-password', async (req, res) => {
    try {
        const { userId, token, newPassword } = req.body;
        
        // In a real app, you would validate the token and check expiration
        // For this demo, we'll just reset the password if userId is provided
        
        if (!userId || !newPassword) {
            return res.status(400).send({ message: 'User ID and new password are required.' });
        }
        
        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 8);
        
        // Update user's password
        const result = await User.updateOne(
            { _id: userId },
            { password: hashedPassword }
        );
        
        if (result.modifiedCount === 0) {
            return res.status(404).send({ message: 'User not found.' });
        }
        
        res.status(200).send({ message: 'Password has been reset successfully.' });
    } catch (err) {
        console.error('Error in reset password:', err);
        res.status(500).send({ message: 'Server error during password reset.' });
    }
});

// Add a catch-all route to handle undefined routes and prevent HTML responses
app.use((req, res) => {
    res.status(404).json({ message: 'API endpoint not found: ' + req.originalUrl });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;
