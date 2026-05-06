import { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class BaileysManager {
  constructor(io, chatbot) {
    this.io = io;
    this.chatbot = chatbot;
    this.sessions = new Map(); // storeId => socket
    
    this.sessionsDir = path.join(__dirname, 'sessions');
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir);
    }
  }

  async loadSessions() {
    console.log('Restoring existing sessions...');
    const folders = fs.readdirSync(this.sessionsDir);
    for (const storeId of folders) {
      const folderPath = path.join(this.sessionsDir, storeId);
      if (fs.statSync(folderPath).isDirectory()) {
        try {
          console.log(`Restoring session for store: ${storeId}`);
          await this.createSession(storeId);
        } catch (err) {
          console.error(`Failed to restore session for ${storeId}:`, err.message);
        }
      }
    }
  }

  async createSession(storeId) {
    if (this.sessions.has(storeId)) {
      return this.sessions.get(storeId);
    }

    const sessionFolder = path.join(this.sessionsDir, storeId);
    const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);

    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Using WA v${version.join('.')}, isLatest: ${isLatest}`);

    const sock = makeWASocket({
      version,
      auth: state,
      browser: ['Ubuntu', 'Chrome', '20.0.04'],
      printQRInTerminal: false,
      logger: pino({ level: 'fatal' }),
      syncFullHistory: false,
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: false,
      defaultQueryTimeoutMs: 60000,
    });
    
    sock.storeId = storeId; // Injetar ID para uso na fila do chatbot

    sock.ev.on('creds.update', async () => {
      try {
        await saveCreds();
      } catch (err) {
        console.error('Error saving creds:', err.message);
      }
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Generate base64 QR code and send it to the frontend via Socket.io
        try {
          const qrBase64 = await QRCode.toDataURL(qr);
          this.io.to(storeId).emit('qr_code', { qr: qrBase64 });
        } catch (err) {
          console.error('Failed to generate QR Code:', err);
        }
      }

      if (connection === 'close') {
        const error = lastDisconnect?.error;
        console.log(`Connection for store ${storeId} closed. Error object:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        
        const shouldReconnect = error?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log(`Reconnecting: ${shouldReconnect}`);
        
        this.sessions.delete(storeId);
        
        if (shouldReconnect) {
          setTimeout(() => this.createSession(storeId), 3000); // Reconnect after 3s
        } else {
          // If logged out, delete the session folder
          fs.rmSync(sessionFolder, { recursive: true, force: true });
          this.io.to(storeId).emit('status', { status: 'disconnected' });
        }
      } else if (connection === 'open') {
        console.log(`Connection for store ${storeId} opened!`);
        this.io.to(storeId).emit('status', { status: 'connected' });
      }
    });

    // Listener de mensagens recebidas — alimenta o chatbot
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        try {
          // Ignorar mensagens do próprio bot
          if (msg.key.fromMe) continue;

          // Ignorar mensagens de grupos
          if (msg.key.remoteJid.endsWith('@g.us')) continue;

          // Extrair texto da mensagem
          const text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            '';

          if (!text.trim()) continue; // Ignorar mensagens sem texto (imagens, stickers, etc.)

          const senderPhone = msg.key.remoteJid.replace('@s.whatsapp.net', '');

          console.log(`[${storeId}] Mensagem de ${senderPhone}: ${text.substring(0, 50)}`);

          // Delegar ao chatbot
          if (this.chatbot) {
            await this.chatbot.handleMessage(storeId, senderPhone, text, sock);
          }
        } catch (err) {
          console.error('[BaileysManager] Erro ao processar mensagem:', err.message);
        }
      }
    });

    this.sessions.set(storeId, sock);
    return sock;
  }

  async getSessionStatus(storeId) {
    const sessionFolder = path.join(this.sessionsDir, storeId);
    if (!fs.existsSync(sessionFolder)) return 'disconnected';
    
    const sock = this.sessions.get(storeId);
    if (sock && sock.user) return 'connected';
    
    return 'connecting';
  }

  async sendMessage(storeId, toPhone, message) {
    const sock = this.sessions.get(storeId);
    if (!sock) throw new Error("WhatsApp não está conectado para esta loja");

    // Format phone number (Baileys expects 5511999999999@s.whatsapp.net)
    let cleanPhone = toPhone.replace(/\D/g, '');
    
    // Add Brazil country code (55) if it has 10 or 11 digits (DDD + Number)
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = `55${cleanPhone}`;
    }

    let jid = `${cleanPhone}@s.whatsapp.net`;
    
    // Verify if the number exists on WhatsApp
    let [result] = await sock.onWhatsApp(jid);

    // Handle Brazilian 9th digit issue
    if ((!result || !result.exists) && cleanPhone.startsWith('55')) {
      if (cleanPhone.length === 13) {
        // Provided with 9, try without 9
        const ddd = cleanPhone.substring(2, 4);
        const numberWithout9 = cleanPhone.substring(5);
        const testJid = `55${ddd}${numberWithout9}@s.whatsapp.net`;
        const [testResult] = await sock.onWhatsApp(testJid);
        if (testResult && testResult.exists) jid = testResult.jid;
      } else if (cleanPhone.length === 12) {
        // Provided without 9, try with 9
        const ddd = cleanPhone.substring(2, 4);
        const number = cleanPhone.substring(4);
        const testJid = `55${ddd}9${number}@s.whatsapp.net`;
        const [testResult] = await sock.onWhatsApp(testJid);
        if (testResult && testResult.exists) jid = testResult.jid;
      }
    } else if (result && result.exists) {
      jid = result.jid;
    }
    
    // Usar a fila do chatbot para enviar, se disponível
    if (this.chatbot && this.chatbot.queue) {
      await this.chatbot.queue.enqueue(sock, storeId, jid, { text: message });
    } else {
      await sock.sendMessage(jid, { text: message });
    }
  }

  async deleteSession(storeId) {
    const sock = this.sessions.get(storeId);
    if (sock) {
      sock.logout();
      this.sessions.delete(storeId);
    }
    const sessionFolder = path.join(this.sessionsDir, storeId);
    if (fs.existsSync(sessionFolder)) {
      fs.rmSync(sessionFolder, { recursive: true, force: true });
    }
  }
}

