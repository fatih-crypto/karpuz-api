export async function onRequest(context) {
  const API_KEY = context.env.GEMINI_API_KEY;
  const MODEL = 'gemini-1.5-flash-002';
  
  try {
    console.log('=== Starting API request processing ===');
    
    // Request validation logs
    const requestData = await context.request.json();
    console.log('Incoming request data:', {
      hasImage: !!requestData.image,
      imageLength: requestData.image?.length,
      promptLength: requestData.prompt?.length,
      prompt: requestData.prompt?.substring(0, 100) + '...' // Log first 100 chars of prompt
    });

    const { image, prompt } = requestData;
    
    if (!image || !prompt) {
      throw new Error('Missing required fields: ' + 
        (!image ? 'image ' : '') + 
        (!prompt ? 'prompt' : '')
      );
    }

    // Pre-API call logging
    console.log('Preparing Gemini API request for model:', MODEL);
    
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

    // API response validation logs
    console.log('Gemini API response status:', geminiResponse.status);
    console.log('Gemini API response headers:', Object.fromEntries(geminiResponse.headers));

    const geminiData = await geminiResponse.json();
    
    // Detailed API response logging
    console.log('Gemini API response structure:', {
      hasCandidates: !!geminiData.candidates,
      candidatesCount: geminiData.candidates?.length,
      firstCandidateStructure: geminiData.candidates?.[0] ? 
        Object.keys(geminiData.candidates[0]) : 'No candidates',
      error: geminiData.error
    });

    if (!geminiResponse.ok) {
      console.error('Gemini API error details:', {
        status: geminiResponse.status,
        statusText: geminiResponse.statusText,
        error: geminiData.error,
        rawResponse: geminiData
      });
      throw new Error(`Gemini API error: ${JSON.stringify(geminiData)}`);
    }

    const text = geminiData.candidates[0].content.parts[0].text;
    console.log('Extracted text from response:', text.substring(0, 200) + '...'); // Log first 200 chars

    const jsonMatch = text.match(/\{.*\}/s);
    
    if (!jsonMatch) {
      console.error('JSON parsing error - Raw text received:', text);
      throw new Error('No JSON found in response');
    }

    // Parse and validate result
    const result = JSON.parse(jsonMatch[0]);
    console.log('Parsed result structure:', {
      hasWatermelon: result.has_watermelon,
      count: result.count,
      watermelonsCount: result.watermelons?.length
    });

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    // Enhanced error logging
    console.error('Detailed error information:', {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name,
      // Additional context if available
      cause: error.cause,
      code: error.code
    });

    // Log the full error object for debugging
    console.error('Full error object:', error);

    return new Response(JSON.stringify({
      error: error.message,
      error_type: error.constructor.name,
      error_details: error.stack,
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
  } finally {
    console.log('=== Request processing completed ===');
  }
}
