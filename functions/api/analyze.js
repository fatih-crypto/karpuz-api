// functions/api/analyze.js
export async function onRequest(context) {
  const API_KEY = context.env.GEMINI_API_KEY;
  const MODEL = 'gemini-1.5-flash';
  try {
    const requestData = await context.request.json();
    console.log('Request data:', requestData); // Debug log

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
    console.log('Gemini API response:', geminiData); // Debug log
    
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
    console.error('API Error:', error); // Debug log
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
