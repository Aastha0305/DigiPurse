const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { router: authRoutes, authMiddleware } = require('./routes/authRoutes');

// Load environment variables from .env file
dotenv.config();

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
console.log('Connected to MongoDB');
})
.catch((err) => {
console.error('MongoDB connection error:', err);
});

// Swagger configuration
const swaggerOptions = {
swaggerDefinition: {
openapi: '3.0.0',
info: {
title: 'Digital Wallet API',
version: '1.0.0',
description: 'API documentation for the Digital Wallet System'
},
servers: [
{
url: `http://localhost:${process.env.PORT || 3000}`,
description: 'Development server'
}
]
},
apis: ['./routes/*.js']
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Register routes BEFORE starting the server
app.use('/api/auth', authRoutes);
app.get('/api/protected', authMiddleware, (req, res) => { // Protected route example
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
