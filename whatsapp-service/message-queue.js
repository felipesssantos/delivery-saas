/**
 * MessageQueue — Gerenciador de Fila de Envios
 * 
 * Evita o envio simultâneo de muitas mensagens, o que pode disparar
 * filtros de spam do WhatsApp. Simula comportamento humano com "digitando..."
 * e intervalos aleatórios.
 */

export default class MessageQueue {
  constructor() {
    this.queues = new Map(); // key: storeId (ou socket ID) -> queue array
    this.isProcessing = new Map(); // key: storeId -> boolean
  }

  /**
   * Adiciona uma mensagem à fila de envio de um socket específico
   */
  async enqueue(sock, storeId, jid, content) {
    if (!this.queues.has(storeId)) {
      this.queues.set(storeId, []);
      this.isProcessing.set(storeId, false);
    }

    this.queues.get(storeId).push({ sock, jid, content });

    if (!this.isProcessing.get(storeId)) {
      this.processQueue(storeId);
    }
  }

  async processQueue(storeId) {
    this.isProcessing.set(storeId, true);
    const queue = this.queues.get(storeId);

    while (queue.length > 0) {
      const { sock, jid, content } = queue.shift();

      try {
        console.log(`[Queue] Preparando envio para ${jid}...`);
        // 1. Simular "Digitando..."
        await sock.sendPresenceUpdate('composing', jid);
        
        // 2. Tempo de "digitação" proporcional ao tamanho do texto (mínimo 2.5s)
        const textLength = content.text ? content.text.length : 10;
        const typingDuration = Math.min(Math.max(textLength * 50, 2500), 6000);
        
        console.log(`[Queue] Simulando digitação por ${typingDuration}ms...`);
        await new Promise(resolve => setTimeout(resolve, typingDuration));

        // 3. Parar de digitar e enviar
        await sock.sendPresenceUpdate('paused', jid);
        await sock.sendMessage(jid, content);

        console.log(`[Queue] Mensagem enviada para ${jid} (Loja: ${storeId})`);

        // 4. Intervalo de segurança aleatório entre mensagens (1 a 3 segundos)
        const delay = Math.floor(Math.random() * 2000) + 1000;
        await new Promise(resolve => setTimeout(resolve, delay));

      } catch (err) {
        console.error(`[Queue] Erro ao processar envio para ${jid}:`, err.message);
      }
    }

    this.isProcessing.set(storeId, false);
  }
}
