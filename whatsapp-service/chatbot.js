/**
 * Chatbot WhatsApp — Máquina de Estados Conversacional
 * 
 * Fluxo: WELCOME → WAITING_CEP → MENU_SENT
 * 
 * O chatbot guia o cliente até o link do cardápio web.
 * O pedido é feito pela interface web (já existente).
 */

const CONVERSATION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos

// Estados do fluxo
const STATES = {
  WELCOME: 'WELCOME',
  WAITING_NAME: 'WAITING_NAME',
  WAITING_CEP: 'WAITING_CEP',
  MENU_SENT: 'MENU_SENT',
};

import MessageQueue from './message-queue.js';

export default class Chatbot {
  constructor(nextjsUrl) {
    this.nextjsUrl = nextjsUrl || 'http://localhost:3000';
    this.conversations = new Map(); // key: `${storeId}:${phone}` → conversation data
    this.storeCache = new Map();    // key: storeId → { data, cachedAt }
    this.queue = new MessageQueue(); // Instância da fila de mensagens

    // Limpar conversas expiradas a cada 5 minutos
    setInterval(() => this.cleanExpiredConversations(), 5 * 60 * 1000);
  }

  /**
   * Ponto de entrada principal — chamado pelo BaileysManager quando uma mensagem chega
   */
  async handleMessage(storeId, senderPhone, messageText, sock) {
    const text = messageText.trim();
    const key = `${storeId}:${senderPhone}`;

    console.log(`[Chatbot] Processing message from ${senderPhone} for store ${storeId}.`);

    // Comando de reset
    if (['menu', '0', 'oi', 'olá', 'ola', 'inicio', 'início'].includes(text.toLowerCase())) {
      this.conversations.delete(key);
    }

    // Detectar se há um CEP na mensagem (ex: 40010000 ou 40010-000)
    const cepMatch = text.match(/\b\d{5}-?\d{3}\b/);
    const foundCep = cepMatch ? cepMatch[0] : null;

    let conversation = this.conversations.get(key);

    // Se encontramos um CEP e já estamos conversando, pular para o processamento do CEP
    if (foundCep && conversation) {
      conversation.state = STATES.WAITING_CEP;
    }

    // Nova conversa
    if (!conversation) {
      conversation = {
        storeId,
        state: foundCep ? STATES.WAITING_CEP : STATES.WELCOME,
        data: { foundCep }, // Armazenar o CEP se já veio na primeira mensagem
        lastActivity: Date.now(),
      };
      this.conversations.set(key, conversation);
    }

    // Atualizar timestamp
    conversation.lastActivity = Date.now();

    // 1. Verificar status da loja e carregar dados
    const store = await this.getStoreData(storeId);
    
    if (!store) {
      console.error(`[Chatbot] Store not found: ${storeId}`);
      return;
    }

    console.log(`[Chatbot] Store: ${store.name}, Open: ${store.openStatus}, State: ${conversation.state}`);

    if (!store.openStatus) {
      console.log(`[Chatbot] Store ${storeId} is CLOSED. Informing user.`);
      await this.sendText(sock, senderPhone, 
        `Olá! 😊 Obrigado por entrar em contato com *${store.name}*.\n\n` +
        `⏰ Infelizmente nosso delivery está *encerrado* no momento.\n\n` +
        `Fique de olho, logo estaremos disponíveis novamente! 🙌`
      );
      this.conversations.delete(key);
      return;
    }

    // Máquina de Estados
    switch (conversation.state) {
      case STATES.WELCOME:
        await this.handleWelcome(sock, senderPhone, store, conversation);
        break;

      case STATES.WAITING_NAME:
        await this.handleName(sock, senderPhone, text, store, conversation);
        break;

      case STATES.WAITING_CEP:
        const cepToProcess = foundCep || text;
        await this.handleCep(sock, senderPhone, cepToProcess, store, conversation);
        break;

      case STATES.MENU_SENT:
        await this.handleMenuSent(sock, senderPhone, store, conversation);
        break;

      default:
        conversation.state = STATES.WELCOME;
        await this.handleWelcome(sock, senderPhone, store, conversation);
    }
  }

  /**
   * Estado: WELCOME — Identifica o cliente ou pede o nome
   */
  async handleWelcome(sock, senderPhone, storeData, conversation) {
    const customer = await this.getCustomerData(storeData.id, senderPhone);
    
    if (customer) {
      conversation.data.name = customer.name;
      const msg = `Olá, *${customer.name}*! 👋 Que bom ver você de volta na *${storeData.name}*! 😊\n\n` +
                 `Deseja fazer um novo pedido? Para começar, informe seu *CEP* para verificarmos a entrega:`;
      await this.sendText(sock, senderPhone, msg);
      conversation.state = STATES.WAITING_CEP;
    } else {
      const msg = `Olá! 👋 Bem-vindo(a) à *${storeData.name}*!\n\nPara iniciarmos seu atendimento, como posso te chamar? (Digite seu nome)`;
      await this.sendText(sock, senderPhone, msg);
      conversation.state = STATES.WAITING_NAME;
    }
  }

  /**
   * Estado: WAITING_NAME — Recebe o nome e pede o CEP
   */
  async handleName(sock, senderPhone, text, storeData, conversation) {
    const name = text.split(' ')[0]; // Pega apenas o primeiro nome para ser mais pessoal
    conversation.data.name = name;

    const msg = `Prazer em te conhecer, *${name}*! 🙌\n\nAgora, por favor, me informe seu *CEP* (apenas números) para verificarmos se entregamos na sua região.`;
    await this.sendText(sock, senderPhone, msg);
    conversation.state = STATES.WAITING_CEP;
  }

  /**
   * Estado: WAITING_CEP — Valida o CEP e envia o link ou erro
   */
  async handleCep(sock, senderPhone, text, storeData, conversation) {
    const cep = text.replace(/\D/g, '');

    if (cep.length !== 8) {
      await this.sendText(sock, senderPhone, 
        '❌ Por favor, informe um CEP válido com 8 números.\n\nExemplo: *40010000*'
      );
      return;
    }

    await this.sendText(sock, senderPhone, '🔍 Verificando disponibilidade...');

    try {
      // 1. Buscar endereço no ViaCEP
      const viaCepRes = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const viaCepData = await viaCepRes.json();

      if (viaCepData.erro) {
        await this.sendText(sock, senderPhone, '❌ CEP não encontrado. Verifique o número e tente novamente.');
        return;
      }

      const neighborhood = viaCepData.bairro || '';
      const city = viaCepData.localidade || '';

      // 2. Verificar na API do Next.js se atende esse bairro (POST)
      const checkRes = await fetch(`${this.nextjsUrl}/api/delivery/check-neighborhood`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: storeData.id,
          city: city,
          neighborhood: neighborhood
        })
      });
      
      const checkData = await checkRes.json();

      if (checkData.allowed) {
        const fee = checkData.deliveryFee > 0 ? `*R$ ${checkData.deliveryFee.toFixed(2).replace('.', ',')}*` : '_Grátis_';
        
        await this.sendText(sock, senderPhone, 
          `✅ Boas notícias! Entregamos na sua região.\n\n` +
          `📍 *Endereço:* ${viaCepData.logradouro}, ${neighborhood} - ${city}\n` +
          `🚚 *Taxa de entrega:* ${fee}\n\n` +
          `👇 *Clique no link abaixo para fazer seu pedido:*`
        );

        // Enviar o link em uma mensagem separada para garantir que seja clicável
        await this.sendText(sock, senderPhone, `${this.nextjsUrl}/${storeData.slug}`);
        
        conversation.state = STATES.MENU_SENT;
      } else {
        await this.sendText(sock, senderPhone, 
          `😔 Infelizmente ainda não entregamos em *${neighborhood} - ${city}*.\n\n` +
          `Mas você pode fazer um pedido para *retirada no local*!\n\n` +
          `Confira nosso cardápio aqui:`
        );

        // Link em mensagem separada
        await this.sendText(sock, senderPhone, `${this.nextjsUrl}/${storeData.slug}`);

        conversation.state = STATES.MENU_SENT;
      }
    } catch (err) {
      console.error('[Chatbot] Erro ao validar CEP:', err.message);
      await this.sendText(sock, senderPhone, '❌ Ocorreu um erro ao validar seu CEP. Tente novamente em instantes.');
    }
  }

  /**
   * Estado: MENU_SENT — Se o cliente mandar mais mensagens, oferece o link novamente
   */
  async handleMenuSent(sock, senderPhone, storeData, conversation) {
    await this.sendText(sock, senderPhone, 
      `Deseja ver o cardápio novamente?\n\n` +
      `Acesse aqui: ${this.nextjsUrl}/${storeData.slug}\n\n` +
      `Se desejar reiniciar o atendimento, digite *0* ou *Menu*.`
    );
  }

  /**
   * Busca dados do cliente pelo telefone
   */
  async getCustomerData(storeId, phone) {
    try {
      const res = await fetch(`${this.nextjsUrl}/api/customer/by-phone?storeId=${storeId}&phone=${phone}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error(`[Chatbot] Erro ao buscar cliente ${phone}:`, err.message);
      return null;
    }
  }

  /**
   * Busca dados da loja na API interna do Next.js (com cache de 5 min)
   */
  async getStoreData(storeId) {
    const cached = this.storeCache.get(storeId);
    if (cached && (Date.now() - cached.cachedAt < 5 * 60 * 1000)) {
      return cached.data;
    }

    try {
      const res = await fetch(`${this.nextjsUrl}/api/store/by-id?storeId=${storeId}`);
      if (!res.ok) return null;
      
      const data = await res.json();
      this.storeCache.set(storeId, { data, cachedAt: Date.now() });
      return data;
    } catch (err) {
      console.error(`[Chatbot] Erro ao buscar dados da loja ${storeId}:`, err.message);
      return null;
    }
  }

  /**
   * Helper para enviar texto usando a FILA de segurança
   */
  async sendText(sock, jid, text) {
    try {
      // Garantir JID correto
      const fullJid = jid.includes('@') ? jid : `${jid}@s.whatsapp.net`;
      const storeId = sock.storeId || 'unknown'; // O storeId deve estar injetado no sock
      
      await this.queue.enqueue(sock, storeId, fullJid, { text });
    } catch (err) {
      console.error('[Chatbot] Erro ao agendar mensagem na fila:', err.message);
    }
  }

  cleanExpiredConversations() {
    const now = Date.now();
    for (const [key, conversation] of this.conversations.entries()) {
      if (now - conversation.lastActivity > CONVERSATION_TIMEOUT_MS) {
        this.conversations.delete(key);
      }
    }
  }
}
