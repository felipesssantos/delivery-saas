const clientId = "dnr7RG5bG31qEk_vzPAzO1u4gBS9luRF";
const clientSecret = "dfjf14G4BwIxY1UYRHKhftbxzLNWgqKgTr4xK3sW";

async function testAuth(url, scope) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });
  if (scope) body.append("scope", scope);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await res.text();
  console.log(`URL: ${url} | Scope: ${scope || "NONE"}`);
  console.log(`Status: ${res.status}`);
  console.log(`Body: ${text}\n`);
}

async function run() {
  const urls = ["https://auth.uber.com/oauth/v2/token"];
  const scopes = ["eats.deliveries"];

  for (const url of urls) {
    for (const scope of scopes) {
      await testAuth(url, scope);
    }
  }
}

run();
