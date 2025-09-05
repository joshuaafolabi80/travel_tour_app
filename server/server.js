const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Your React app's URL
  credentials: true
}));
app.use(express.json());

// Simple test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// MongoDB connection with better error handling
console.log('Attempting to connect to MongoDB...');
console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Found' : 'Missing');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB Atlas connected successfully');
})
.catch((error) => {
  console.log('❌ MongoDB connection error:', error.message);
  console.log('Please check your MongoDB Atlas connection string and network access');
  process.exit(1); // Exit if DB connection fails
});

// Import routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'API endpoint not found' 
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 API available at: http://localhost:${PORT}/api`);
}).on('error', (error) => {
  console.log('❌ Server failed to start:', error.message);
});