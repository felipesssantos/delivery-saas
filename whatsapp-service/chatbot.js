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
  WAITING_CEP: 'WAITING_CEP',
  MENU_SENT: 'MENU_SENT',
};

export default class Chatbot {
  constructor(nextjsUrl) {
    this.nextjsUrl = nextjsUrl || 'http://localhost:3000';
    this.conversations = new Map(); // key: `${storeId}:${phone}` → conversation data
    this.storeCache = new Map();    // key: storeId → { data, cachedAt }

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

    // Detectar se é um CEP (8 números ou 5+3 com hífen)
    const looksLikeCep = /^\d{8}$/.test(text) || /^\d{5}-\d{3}$/.test(text);

    let conversation = this.conversations.get(key);

    // Se parecer um CEP e já estivermos conversando, forçar o estado para processar o CEP
    if (looksLikeCep && conversation && conversation.state === STATES.MENU_SENT) {
      conversation.state = STATES.WAITING_CEP;
    }

    // Nova conversa
    if (!conversation) {
      conversation = {
        storeId,
        state: looksLikeCep ? STATES.WAITING_CEP : STATES.WELCOME,
        data: {},
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

      case STATES.WAITING_CEP:
        await this.handleCep(sock, senderPhone, text, store, conversation);
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
   * Estado: WELCOME — Envia boas-vindas e pede o CEP
   */
  async handleWelcome(sock, senderPhone, storeData, conversation) {
    const customMessage = storeData.welcomeMessage;

    let message;
    if (customMessage) {
      message = customMessage
        .replace(/{nome_loja}/gi, storeData.name)
        .replace(/{nome}/gi, storeData.name);
    } else {
      message = `Olá! 👋 Bem-vindo(a) à *${storeData.name}*!\n\nÉ muito bom ter você aqui! 😊`;
    }

    message += `\n\nPara verificarmos se entregamos na sua região, por favor me informe seu *CEP* (apenas números).\n\nExemplo: *40010000*`;

    await this.sendText(sock, senderPhone, message);
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
   * Helper para enviar texto
   */
  async sendText(sock, jid, text) {
    try {
      // Garantir JID correto
      const fullJid = jid.includes('@') ? jid : `${jid}@s.whatsapp.net`;
      await sock.sendMessage(fullJid, { text });
    } catch (err) {
      console.error('[Chatbot] Erro ao enviar mensagem:', err.message);
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
