async function main() {
  const cep = process.argv[2] || "40283565"; // Default CEP
  console.log(`Checking CEP: ${cep}`);
  
  const viaCepRes = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  const viaCepData = await viaCepRes.json();
  console.log("ViaCEP:", viaCepData);
  
  const city = viaCepData.localidade || '';
  const neighborhood = viaCepData.bairro || '';
  const storeId = "cmoi48yvy0000in30lzun75zm";
  
  const body = { storeId, city, neighborhood };
  console.log("Requesting check-neighborhood API:", body);
  
  const res = await fetch('http://localhost:3000/api/delivery/check-neighborhood', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text);
}

main();
