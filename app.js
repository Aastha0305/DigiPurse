const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');  // Removed duplicate import
const fs = require('fs');
const YAML = require('yaml');
const { router: authRoutes, authMiddleware } = require('./routes/authRoutes');
const walletRoutes = require('./routes/walletRoutes');

// Load environment variables from .env file
dotenv.config();

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Load Swagger documentation
const swaggerDocument = YAML.parse(fs.readFileSync('./swagger.yaml', 'utf8'));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
});

// Swagger UI Setup (only one instance needed)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);

// Protected route example
app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({ message: 'Protected route accessed!', userId: req.user });
});

// Basic route
app.get('/', (req, res) => {
  res.send('Digital Wallet Backend is running!');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
