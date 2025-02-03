// functions/api/analyze.js
export async function onRequest(context) {
  const API_KEY = context.env.GEMINI_API_KEY;
  const MODEL = 'gemini-1.5-flash-002';

  try {
    const requestData = await context.request.json();
    const { image, prompt } = requestData;

    const response = await fetch(
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

    const data = await response.json();
    
    // API yanıtından JSON stringi çıkar ve parse et
    const text = data.candidates[0].content.parts[0].text;
    const jsonMatch = text.match(/\{.*\}/s);
    
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    // Parse edilmiş JSON'ı döndür
    const result = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
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