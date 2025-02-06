export async function onRequest(context) {
  const API_KEY = context.env.GEMINI_API_KEY;
  const MODEL = 'gemini-1.5-flash-002';
  
  // Retry configuration
  const MAX_RETRIES = 3;
  const INITIAL_DELAY = 1000; // 1 second

  async function makeRequest(retryCount = 0) {
    try {
      const requestData = await context.request.json();
      console.log('Request data:', requestData);
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
      console.log('Gemini API response:', geminiData);

      // Check for 503 error
      if (geminiResponse.status === 503 && retryCount < MAX_RETRIES) {
        const delay = INITIAL_DELAY * Math.pow(2, retryCount); // Exponential backoff
        console.log(`Retry attempt ${retryCount + 1} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return makeRequest(retryCount + 1);
      }

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
      if (retryCount < MAX_RETRIES && error.message.includes('503')) {
        const delay = INITIAL_DELAY * Math.pow(2, retryCount);
        console.log(`Retry attempt ${retryCount + 1} after ${delay}ms due to error:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        return makeRequest(retryCount + 1);
      }

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

  return makeRequest();
}
