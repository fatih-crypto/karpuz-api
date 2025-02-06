// functions/api/analyze.js
export async function onRequest(context) {
  const API_KEY = context.env.GEMINI_API_KEY;
  const MODEL = 'gemini-1.5-flash-002'; // Kullandığınız modele göre güncelleyebilirsiniz
  const MAX_RETRIES = 3; // Yeniden deneme sayısı
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const requestData = await context.request.json();
      const { image, prompt } = requestData;

      // İstek verilerini kontrol etme (gerekirse daha detaylı doğrulama ekleyebilirsiniz)
      if (!image || !prompt) {
        throw new Error("Eksik istek verisi: 'image' ve 'prompt' gereklidir.");
      }

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
                    mimeType: "image/jpeg", // Resmin base64 formatında olduğundan emin olun
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
        if (geminiResponse.status === 503) {  // 503 hatası için özel işlem
          retries++;
          const waitTime = 2 ** (retries - 1) * 1000; // Üstel geri çekilme
          console.log(`Gemini API aşırı yüklendi. ${waitTime / 1000} saniye sonra tekrar deniyor...`);
          await new Promise(resolve => setTimeout(resolve, waitTime)); // Bekleme
          continue; // Döngüyü tekrar başlat
        } else {
          // Diğer hatalar için daha detaylı bilgi ekleyerek hatayı fırlat
          throw new Error(`Gemini API hatası: ${geminiResponse.status} - ${JSON.stringify(geminiData)}`);
        }
      }

      // JSON ayrıştırma işlemini daha güvenli hale getirme
      let result;
      try {
        const text = geminiData.candidates[0].content.parts[0].text;
        const jsonMatch = text.match(/\{.*\}/s); // JSON objesini bul
        if (!jsonMatch) {
          throw new Error('Yanıtta JSON bulunamadı');
        }
        result = JSON.parse(jsonMatch[0]); // JSON'ı ayrıştır
      } catch (jsonError) {
        // JSON ayrıştırma hatası ve ham yanıtı içeren daha detaylı bir hata mesajı
        throw new Error(`JSON ayrıştırma hatası: ${jsonError.message}. Ham Gemini yanıtı: ${JSON.stringify(geminiData)}`);
      }

      // Başarılı yanıt
      return new Response(JSON.stringify(result), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'https://samsun-akilli-sehir.netlify.app', // İzin verilen kaynakları buraya ekleyin!
        }
      });

    } catch (error) {
      console.error('API Hatası:', error);

      // Hata yanıtını daha bilgilendirici hale getirme
      return new Response(JSON.stringify({
        error: error.message,  // Detaylı hata mesajı
        status: error.status || 500, // Hata kodu (varsa)
        has_watermelon: false,
        count: 0,
        watermelons: []
      }), {
        status: error.status || 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'https://samsun-akilli-sehir.netlify.app', // İzin verilen kaynakları buraya ekleyin!
        }
      });
    }
  }

  // Tüm denemeler başarısız olursa
  return new Response(JSON.stringify({
    error: "Gemini API birden çok denemeden sonra kullanılamıyor.",
    status: 503,
    has_watermelon: false,
    count: 0,
    watermelons: []
  }), {
    status: 503,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'https://samsun-akilli-sehir.netlify.app', // İzin verilen kaynakları buraya ekleyin!
    }
  });
}
