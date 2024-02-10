// server.js

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const jwtStrategy = require('passport-jwt').Strategy;
const extractJwt = require('passport-jwt').ExtractJwt;
const http = require('http');
const socketIo = require('socket.io');
const Message = require('./models/Message');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(passport.initialize());

mongoose.connect('mongodb://localhost:27017/chatbot', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => console.log('Connected to MongoDB'));

passport.use(new jwtStrategy({
    jwtFromRequest: extractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: 'your-secret-key' // Replace with your actual secret key
}, (jwtPayload, done) => {
    User.findById(jwtPayload.sub, (err, user) => {
        if (err) return done(err, false);
        if (user) return done(null, user);
        else return done(null, false);
    });
}));

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Username or email already in use' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ success: true, message: 'User registered successfully' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }

        const token = jwt.sign({ sub: user._id }, 'your-secret-key', { expiresIn: '1h' });

        res.json({ success: true, token });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.get('/api/messages', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const messages = await Message.find().sort({ timestamp: -1 }).skip(skip).limit(limit);
        res.json(messages);
    } catch (error) {
        console.error('Error fetching conversation history:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.get('/api/messages/search', async (req, res) => {
    try {
        const { query } = req.query;
        const messages = await Message.find({ message: { $regex: query, $options: 'i' } });
        res.json(messages);
    } catch (error) {
        console.error('Error searching messages:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.post('/api/messages', async (req, res) => {
    const { message } = req.body;

    try {
        const botResponse = 'This is a bot response based on NLP analysis.';
        const userMessage = new Message({ user: 'user', message });
        const botMessage = new Message({ user: 'bot', message: botResponse });

        await userMessage.save();
        await botMessage.save();

        io.emit('message', { user: 'user', message });
        io.emit('message', { user: 'bot', message: botResponse });

        res.json({ success: true, botResponse });
    } catch (error) {
        console.error('Error processing message:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
