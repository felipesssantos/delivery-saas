const clientId = "dnr7RG5bG31qEk_vzPAzO1u4gBS9luRF";
const clientSecret = "dfjf14G4BwIxY1UYRHKhftbxzLNWgqKgTr4xK3sW";
const customerId = "d3a42b06-88f6-47bd-a043-922296873918";

async function testQuote() {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
    scope: "eats.deliveries",
  });

  const resToken = await fetch("https://auth.uber.com/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const tokenData = await resToken.json();
  const token = tokenData.access_token;
  console.log("Token obtained.");

  const payload = {
    pickup_address: '{"street_address":["123 Main St"],"city":"San Francisco","state":"CA","zip_code":"94105","country":"US"}',
    dropoff_address: '{"street_address":["456 Market St"],"city":"San Francisco","state":"CA","zip_code":"94104","country":"US"}',
  };

  const resQuote = await fetch(`https://api.uber.com/v1/customers/${customerId}/delivery_quotes`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await resQuote.text();
  console.log(`Quote Status: ${resQuote.status}`);
  console.log(`Quote Body: ${text}`);
}

testQuote();
