import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import BaileysManager from './baileys-manager.js';
import Chatbot from './chatbot.js';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For development. In production, restrict to your SaaS domain
    methods: ['GET', 'POST']
  }
});

const chatbot = new Chatbot(process.env.NEXTJS_URL || 'http://localhost:3000');
const manager = new BaileysManager(io, chatbot);

// Socket.io Connection Handler
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Join a specific store room to receive its updates
  socket.on('join_store', async (storeId) => {
    socket.join(storeId);
    console.log(`Socket ${socket.id} joined store room: ${storeId}`);
    
    // Check current status and notify frontend
    const status = await manager.getSessionStatus(storeId);
    socket.emit('status', { status });

    // If not connected, start session to generate QR
    if (status !== 'connected') {
      await manager.createSession(storeId);
    }
  });

  socket.on('logout_store', async (storeId) => {
    await manager.deleteSession(storeId);
    io.to(storeId).emit('status', { status: 'disconnected' });
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// REST API for Next.js to send messages (e.g. order updates)
app.post('/api/send-message', async (req, res) => {
  const { storeId, toPhone, message, secret } = req.body;

  // Simple auth to ensure only Next.js backend can call this
  if (secret !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await manager.sendMessage(storeId, toPhone, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REST API for CEP verification against store blacklist
app.post('/api/check-cep', async (req, res) => {
  const { storeId, cep, secret } = req.body;

  if (secret !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Fetch address from ViaCEP
    const viaCepRes = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g, '')}/json/`);
    const viaCepData = await viaCepRes.json();

    if (viaCepData.erro) {
      return res.json({ valid: false, reason: 'CEP não encontrado.' });
    }

    const bairro = (viaCepData.bairro || '').toLowerCase();

    // Check blacklist via Next.js database
    // For now, we'll pass through. The actual check happens in the Next.js app.
    // The WhatsApp bot will call the Next.js API for blacklist verification.
    res.json({ 
      valid: true, 
      address: {
        street: viaCepData.logradouro,
        neighborhood: viaCepData.bairro,
        city: viaCepData.localidade,
        state: viaCepData.uf
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
  console.log(`🚀 WhatsApp Service running on port ${PORT}`);
  await manager.loadSessions();
});
