 
export async function onRequest(context) {
  // API anahtarını Cloudflare'in environment variables'dan alacağız
  const API_KEY = context.env.GEMINI_API_KEY;
  const MODEL = 'gemini-1.5-flash-002';

  try {
    // Gelen isteğin body'sini al
    const requestData = await context.request.json();
    const { image, prompt } = requestData;

    // Gemini API'ye istek at
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
    
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}