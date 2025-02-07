export async function onRequest(context) {
  const API_KEY = context.env.GEMINI_API_KEY;
  const MODEL = "gemini-2.0-flash";

  try {
    const requestData = await context.request.json();
    console.log('Request data:', requestData);

    const { prompt } = requestData;
    
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt }
            ]
          }]
        })
      }
    );

    const geminiData = await geminiResponse.json();
    console.log('Gemini API response:', geminiData);
    
    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${JSON.stringify(geminiData)}`);
    }

    const response = geminiData.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ response }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
