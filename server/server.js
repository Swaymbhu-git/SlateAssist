import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';

import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import { initializeSocket } from './socket/socketHandler.js';

// --- CONFIGURATION AND SETUP ---
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
await mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch((err) => console.error('MongoDB connection error:', err));

// --- API ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// --- SERVER AND SOCKET.IO SETUP ---
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
initializeSocket(io);

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Listening on PORT ${PORT}`));