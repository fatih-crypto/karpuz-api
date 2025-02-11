export async function onRequest(context) {
  const API_KEY = context.env.GEMINI_API_KEY;
  const SECRET_KEY = context.env.SECRET_KEY;
  const MODEL = 'gemini-2.0-flash-lite-preview-02-05';

  try {
    // HMAC doğrulaması
    const timestamp = context.request.headers.get('X-Timestamp');
    const signature = context.request.headers.get('X-Signature');
    
    if (!timestamp || !signature) {
      return new Response(JSON.stringify({ error: 'Missing authentication headers' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // İstek body'sini al ve doğrula
    const body = await context.request.text();
    const expectedSignature = generateSignature(timestamp, body, SECRET_KEY);

    if (signature !== expectedSignature) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // İstek body'sini parse et
    const requestData = JSON.parse(body);
    const { image, prompt } = requestData;
    
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: image
                }
              }
            ]
          }]
        })
      }
    );

    const geminiData = await geminiResponse.json();
    
    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${JSON.stringify(geminiData)}`);
    }

    const text = geminiData.candidates[0].content.parts[0].text;
    const jsonMatch = text.match(/\{.*\}/s);
    
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]);
    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      has_watermelon: false,
      count: 0,
      watermelons: []
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// HMAC imza oluşturma fonksiyonu
function generateSignature(timestamp, body, secretKey) {
  const message = timestamp + body;
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const key = encoder.encode(secretKey);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    data
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
