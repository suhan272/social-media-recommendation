// server_fixed.js - Clean version of the server
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
const PORT = 3000;
const MONGO_URI = 'mongodb://localhost:27017/LostLinkerDB'; // CHANGE THIS if using Atlas
const JWT_SECRET = 'your_super_secret_key'; // CHANGE THIS in production

// Middleware
app.use(bodyParser.json({ limit: '50mb' })); // Allows large JSON bodies for Base64 images
app.use(express.json());

// CORS - Essential for Frontend (index.html) running on a different port/origin
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Allow all origins for development
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
mongoose.connect(MONGO_URI).then(() => {
    console.log('MongoDB connected successfully.');
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}).catch(err => console.error('MongoDB connection error:', err));

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