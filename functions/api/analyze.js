// functions/api/analyze.js

const DAILY_LIMIT = 10; // Günlük kullanım limiti

async function checkAndUpdateUsage(context, deviceId) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // Kullanıcı verilerini al
  let userData = await context.env.USER_LIMITS.get(deviceId, 'json');
  
  if (!userData) {
    // Yeni kullanıcı
    userData = {
      deviceId,
      dailyUsage: {
        date: today,
        count: 0
      },
      totalUsage: 0,
      createdAt: now.toISOString()
    };
  }

  // Gün değiştiyse sayacı sıfırla
  if (userData.dailyUsage.date !== today) {
    userData.dailyUsage = {
      date: today,
      count: 0
    };
  }

  // Limit kontrolü
  if (userData.dailyUsage.count >= DAILY_LIMIT) {
    return {
      allowed: false,
      remainingLimit: 0,
      nextReset: `${today}T23:59:59Z`
    };
  }

  // Kullanım sayısını artır
  userData.dailyUsage.count++;
  userData.totalUsage++;
  
  // Verileri kaydet
  await context.env.USER_LIMITS.put(deviceId, JSON.stringify(userData));

  return {
    allowed: true,
    remainingLimit: DAILY_LIMIT - userData.dailyUsage.count,
    nextReset: `${today}T23:59:59Z`
  };
}

export async function onRequest(context) {
  const API_KEY = context.env.GEMINI_API_KEY;
  const MODEL = 'gemini-1.5-flash-002';
  
  try {
    const requestData = await context.request.json();
    const { image, prompt, deviceId } = requestData;

    // Device ID kontrolü
    if (!deviceId) {
      throw new Error('Device ID is required');
    }

    // Kullanım limiti kontrolü
    const usageCheck = await checkAndUpdateUsage(context, deviceId);
    if (!usageCheck.allowed) {
      return new Response(JSON.stringify({
        error: 'Daily limit exceeded',
        remainingLimit: usageCheck.remainingLimit,
        nextReset: usageCheck.nextReset,
        has_watermelon: false,
        count: 0,
        watermelons: []
      }), {
        status: 429, // Too Many Requests
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // Mevcut Gemini API çağrısı...
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
    
    // Başarılı response'a limit bilgilerini ekle
    return new Response(JSON.stringify({
      ...result,
      remainingLimit: usageCheck.remainingLimit,
      nextReset: usageCheck.nextReset
    }), {
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
