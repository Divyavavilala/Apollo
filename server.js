import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';

import userRoutes from './routes/users.js';
import chatRoutes from './routes/chats.js';

dotenv.config();

const app = express();
const DEFAULT_PORT = parseInt(process.env.PORT || '5000', 10);

// Groq Client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
}));

app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/cura-app'
    );

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

connectDB();

// Root Route
app.get('/', (req, res) => {
  res.json({
    message: 'Cura API Server Running with Groq',
    model: 'llama-3.3-70b-versatile',
  });
});

// AI CHAT ENDPOINT
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        error: 'Message is required',
      });
    }

    console.log(`🤖 User Message: ${message}`);

    // GROQ API CALL
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',

      messages: [
        {
          role: 'system',
          content:
            'You are Cura AI, a helpful multilingual medical assistant.',
        },
        {
          role: 'user',
          content: message,
        },
      ],

      temperature: 0.7,
      max_tokens: 1024,
    });

    const reply = completion.choices[0]?.message?.content || 'No response generated';

    console.log('✅ Groq Response Generated');

    res.json({
      reply,
      confidence: 0.99,
    });
  } catch (error) {
    console.error('❌ Groq API Error:', error);

    res.status(500).json({
      error: 'Failed to generate AI response',
      details: error.message,
    });
  }
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);

// Error Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
  });
});

// Start Server
const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log('⚡ Powered by Groq API');
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      console.warn(`Port ${port} busy. Retrying on ${nextPort}`);
      startServer(nextPort);
    } else {
      throw err;
    }
  });
};

startServer(DEFAULT_PORT);