// functions/api/analyze.js
export async function onRequest(context) {
  const API_KEY = context.env.GEMINI_API_KEY;
  const MODEL = 'gemini-1.5-flash-002';
  
  try {
    const requestData = await context.request.json();
    const { image, prompt, deviceId } = requestData;  // deviceId'yi de alıyoruz
    
    // Kullanıcı limitini kontrol et
    const userLimits = context.env.USER_LIMITS;
    const today = new Date().toISOString().split('T')[0];
    const userKey = `${deviceId}:${today}`;
    
    // Kullanıcının günlük kullanımını kontrol et
    let usageData = await userLimits.get(userKey);
    usageData = usageData ? JSON.parse(usageData) : { count: 0 };
    
    if (usageData.count >= 3) {  // Günlük 3 deneme hakkı
      return new Response(JSON.stringify({
        error: 'DAILY_LIMIT_EXCEEDED',
        message: 'Günlük deneme hakkınız doldu. Yarın tekrar deneyin.',
        has_watermelon: false,
        count: 0,
        watermelons: []
      }), {
        status: 429,  // Too Many Requests
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Gemini API çağrısı
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
    
    // Başarılı analiz sonrası kullanım sayısını artır
    usageData.count++;
    await userLimits.put(userKey, JSON.stringify(usageData));
    
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
