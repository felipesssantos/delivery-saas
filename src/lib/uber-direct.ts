/**
 * Uber Direct API Client
 * 
 * Handles authentication, delivery quotes, and delivery creation
 * via the Uber Direct REST API.
 * 
 * Docs: https://developer.uber.com/docs/direct
 */

const UBER_AUTH_URL = "https://auth.uber.com/oauth/v2/token";
const UBER_API_BASE = "https://api.uber.com/v1/customers";

// Token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get OAuth2 access token using client_credentials grant
 */
export async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  const clientId = process.env.UBER_CLIENT_ID;
  const clientSecret = process.env.UBER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Credenciais Uber Direct não configuradas. Verifique UBER_CLIENT_ID e UBER_CLIENT_SECRET no .env");
  }

  const res = await fetch(UBER_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: "eats.deliveries",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Uber Auth failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

/**
 * Get customer ID from environment
 */
function getCustomerId(): string {
  const id = process.env.UBER_CUSTOMER_ID;
  if (!id) throw new Error("UBER_CUSTOMER_ID não configurado no .env");
  return id;
}

/**
 * Format an address object as JSON string (Uber Direct format)
 */
function formatAddress(street: string, number: string, city: string, state: string, cep: string) {
  return JSON.stringify({
    street_address: [`${street}, ${number}`],
    city: city,
    state: state,
    zip_code: cep.replace(/\D/g, ""),
    country: "BR",
  });
}

export type UberQuote = {
  id: string;
  fee: number; // in cents
  estimatedMinutes: number;
  expiresAt: string;
};

/**
 * Create a delivery quote (price estimate)
 */
export async function createQuote(pickup: {
  street: string;
  number: string;
  city: string;
  state: string;
  cep: string;
  latitude?: number;
  longitude?: number;
}, dropoff: {
  street: string;
  number: string;
  city: string;
  state: string;
  cep: string;
}): Promise<UberQuote> {
  const token = await getAccessToken();
  const customerId = getCustomerId();

  const body: any = {
    pickup_address: formatAddress(pickup.street, pickup.number, pickup.city, pickup.state, pickup.cep),
    dropoff_address: formatAddress(dropoff.street, dropoff.number, dropoff.city, dropoff.state, dropoff.cep),
  };

  // Add coordinates if available (improves accuracy)
  if (pickup.latitude && pickup.longitude) {
    body.pickup_latitude = pickup.latitude;
    body.pickup_longitude = pickup.longitude;
  }

  const res = await fetch(`${UBER_API_BASE}/${customerId}/delivery_quotes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[UberDirect] Quote error:", errText);
    
    // Tenta extrair a mensagem de erro específica da Uber
    try {
      const errJson = JSON.parse(errText);
      if (errJson.message) {
        throw new Error(errJson.message);
      }
    } catch (e) {
      // Se não for JSON, joga o erro genérico
    }
    
    throw new Error(`Erro ${res.status} ao cotar entrega. Verifique o endereço.`);
  }

  const data = await res.json();

  return {
    id: data.id,
    fee: data.fee, // value in cents
    estimatedMinutes: Math.round((data.duration || 0) / 60),
    expiresAt: data.expires_at || "",
  };
}

export type UberDelivery = {
  id: string;
  trackingUrl: string;
  fee: number;
  status: string;
};

/**
 * Create a delivery (dispatch a courier)
 */
export async function createDelivery(params: {
  quoteId: string;
  // Pickup (store)
  pickupName: string;
  pickupPhone: string;
  pickupStreet: string;
  pickupNumber: string;
  pickupCity: string;
  pickupState: string;
  pickupCep: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  pickupNotes?: string;
  // Dropoff (customer)
  dropoffName: string;
  dropoffPhone: string;
  dropoffStreet: string;
  dropoffNumber: string;
  dropoffComplement?: string;
  dropoffNeighborhood: string;
  dropoffCity: string;
  dropoffState: string;
  dropoffCep: string;
  dropoffNotes?: string;
  // Manifest
  items: { name: string; quantity: number; price: number }[];
}): Promise<UberDelivery> {
  const token = await getAccessToken();
  const customerId = getCustomerId();

  const dropoffNotes = [
    params.dropoffComplement,
    params.dropoffNotes,
  ].filter(Boolean).join(" - ");

  const body: any = {
    quote_id: params.quoteId,
    pickup_name: params.pickupName,
    pickup_address: formatAddress(params.pickupStreet, params.pickupNumber, params.pickupCity, params.pickupState, params.pickupCep),
    pickup_phone_number: formatPhone(params.pickupPhone),
    pickup_notes: params.pickupNotes || "",
    dropoff_name: params.dropoffName,
    dropoff_address: formatAddress(params.dropoffStreet, params.dropoffNumber, params.dropoffCity, params.dropoffState, params.dropoffCep),
    dropoff_phone_number: formatPhone(params.dropoffPhone),
    dropoff_notes: dropoffNotes || "",
    manifest_items: params.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      size: "small",
      price: Math.round(item.price * 100), // API expects cents
    })),
    pickup_ready_dt: new Date().toISOString(), // Informs Uber the order is already prepared
  };

  if (params.pickupLatitude && params.pickupLongitude) {
    body.pickup_latitude = params.pickupLatitude;
    body.pickup_longitude = params.pickupLongitude;
  }

  const res = await fetch(`${UBER_API_BASE}/${customerId}/deliveries`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[UberDirect] Create delivery error:", err);
    throw new Error(`Erro ao criar entrega Uber: ${res.status}`);
  }

  const data = await res.json();

  return {
    id: data.id,
    trackingUrl: data.tracking_url || "",
    fee: data.fee || 0,
    status: data.status || "pending",
  };
}

/**
 * Cancel an active delivery
 */
export async function cancelDelivery(deliveryId: string): Promise<void> {
  const token = await getAccessToken();
  const customerId = getCustomerId();

  const res = await fetch(`${UBER_API_BASE}/${customerId}/deliveries/${deliveryId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[UberDirect] Cancel error:", err);
    throw new Error(`Erro ao cancelar entrega Uber: ${res.status}`);
  }
}

/**
 * Get delivery status
 */
export async function getDeliveryStatus(deliveryId: string) {
  const token = await getAccessToken();
  const customerId = getCustomerId();

  const res = await fetch(`${UBER_API_BASE}/${customerId}/deliveries/${deliveryId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) return null;
  return await res.json();
}

/**
 * Format phone to E.164 for Uber API
 */
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55")) return `+${digits}`;
  return `+55${digits}`;
}
