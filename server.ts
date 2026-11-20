import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface ExpectedWordPayload {
  wordIndex: number;
  uthmani: string;
  normalized: string;
  tajweedRules: string[];
  surah: number;
  ayah: number;
}

const evaluationResponseSchema = {
  type: Type.OBJECT,
  properties: {
    audioQuality: {
      type: Type.STRING,
      description: "Audio sifati: 'clear', 'weak', 'noisy', yoki 'silent'.",
    },
    heardArabic: {
      type: Type.STRING,
      description: 'Foydalanuvchi audioda haqiqatan talaffuz qilgan arabcha matn transkripsiyasi.',
    },
    wordEvaluations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          wordIndex: { type: Type.INTEGER },
          expectedWord: { type: Type.STRING },
          status: {
            type: Type.STRING,
            description: "Quyidagilardan biri: 'correct', 'incorrect', 'uncertain', 'not_reached'.",
          },
          confidence: {
            type: Type.NUMBER,
            description: '0.0 dan 1.0 gacha akustik tasdiqlash ishonchliligi.',
          },
          heardSegment: { type: Type.STRING },
          mistakeReason: {
            type: Type.STRING,
            description: "O'zbek lotin alifbosida qisqa va tushunarli xato sababi.",
          },
          letterError: {
            type: Type.OBJECT,
            properties: {
              letterConfidence: {
                type: Type.STRING,
                description: "'high', 'medium', yoki 'word_only'. Aniq harf xatosi eshitilmasa 'word_only' qiling.",
              },
              expectedLetter: { type: Type.STRING },
              heardLetter: { type: Type.STRING },
              letterPositionInWord: {
                type: Type.INTEGER,
                description: "Kutilgan so'zdagi asosiy arab harfining 0 dan boshlanuvchi indeksi, yoki word_only bo'lsa -1.",
              },
              makhrajCategory: {
                type: Type.STRING,
                description: "Maxraj yoki tajvid toifasi o'zbek lotin alifbosida (masalan: Halq, Lison, Shafatan, Tafxim/Tarqiq, Harakat, Madd, G'unna, Qalqala).",
              },
              sifatNote: {
                type: Type.STRING,
                description: "Harf sifati haqida o'zbek lotin alifbosida qisqa izoh.",
              },
              coachingTip: {
                type: Type.STRING,
                description: "O'zbek lotin alifbosida samimiy va aniq tuzatish tavsiyasi (1-2 gap).",
              },
            },
            required: ['letterConfidence', 'expectedLetter', 'heardLetter', 'letterPositionInWord', 'makhrajCategory', 'sifatNote', 'coachingTip'],
          },
        },
        required: ['wordIndex', 'expectedWord', 'status', 'confidence', 'heardSegment', 'mistakeReason'],
      },
    },
    overallFeedback: {
      type: Type.STRING,
      description: "Qiroat bo'yicha o'zbek lotin alifbosida umumiy qisqa xulosa.",
    },
  },
  required: ['audioQuality', 'heardArabic', 'wordEvaluations', 'overallFeedback'],
};

async function callEvaluateWithRetry(
  ai: GoogleGenAI,
  audioBase64: string,
  mimeType: string,
  expectedWords: ExpectedWordPayload[],
  strictness: 'standard' | 'strict'
) {
  const expectedListText = expectedWords
    .map(
      (w, idx) =>
        `${idx + 1}. wordIndex=${w.wordIndex} | Sura ${w.surah}:${w.ayah} | Usmoniy="${w.uthmani}" | Oddiy="${w.normalized}" | Tajvid=[${w.tajweedRules.join(', ') || 'oddiy'}]`
    )
    .join('\n');

  const systemInstruction = `Siz Qur'on qiroati (Tilovat), Maxorijul-huruf, Sifotul-huruf va Tajvid ilmi bo'yicha mutaxassis baholovchisiz.
BARCHA MATNLI IZOHLAR (mistakeReason, makhrajCategory, sifatNote, coachingTip, overallFeedback) FAQAT O'ZBEK LOTIN ALIFBOSIDA YOZILISHI SHART! Hech qanday inglizcha so'z ishlatmang.
ANIQLIK QOIDALARI:
1. Foydalanuvchining HAQIQIY audio yozuvini birinchi kutilgan so'zdan (${expectedWords[0]?.uthmani}) boshlab ketma-ket so'zma-so'z baholang.
2. Shunchaki o'xshash eshitilgani uchun so'zni hech qachon 'correct' deb belgilamang. Aniqlik tezlikdan muhimroq.
3. Agar audio jim, juda past, uzilgan yoki shovqinli bo'lsa, audioQuality: 'silent' | 'weak' | 'noisy' qaytaring va birinchi so'zni 'uncertain' deb belgilang.
4. Arab harflari va maxrajlarini sinchiklab tekshiring, ayniqsa o'xshash juftliklarni:
   - س (ingichka) va ص (yo'g'on/itboq)
   - ت (ingichka) va ط (yo'g'on/qalqala)
   - د (ingichka) va ض (yon til/itboq)
   - ذ (til uchi tish orasida) va ز (hushtakli)
   - ح (o'rta halqum) va ه (tub halqum)
   - ع (halqum siqilishi) va أ/ء (hamza)
   - ق (chuqur til tubi) va ك (yumshoq tanglay)
   - ث (til uchi tish chetida) va س (sirg'aluvchi)
5. Harakatlar (Fatha, Kasra, Damma, Sukun, Tashdid, Tanvin) va tajvid qoidalarini (G'unna, Madd cho'zish, Qalqala, Idg'om, Ixfo, Iqlob) strictness="${strictness}" darajasiga mos tekshiring.
6. QAT'IY O'QISH QULFI: Birinchi 'incorrect' yoki 'uncertain' so'zga duch kelishingiz bilanoq to'xtang! Keyingi barcha so'zlarni 'not_reached' deb belgilang. Xatodan sakrab keyingi so'zlarni tasdiqlamang.
7. HALOL HARF TASHXISI: Faqat aniq bir harf xatosi (masalan, ص o'rniga س aytilgani) audioda yaqqol eshitilsagina letterConfidence='high' yoki 'medium' bering. Agar aniq harfni ajratish ishonchli bo'lmasa, letterConfidence='word_only' va letterPositionInWord=-1 qo'ying.
8. coachingTip samimiy, hurmatli va amaliy bo'lsin (1-2 qisqa o'zbekcha gap).`;

  const promptText = `Ilova qilingan arabcha Qur'on qiroati audiosini tinglang va quyidagi kutilgan so'zlar bilan ketma-ket solishtirib baholang:\n${expectedListText}\n\nBarcha izohlarni o'zbek lotin alifbosida JSON formatida qaytaring.`;

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            { text: promptText },
          ],
        },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: evaluationResponseSchema,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      const raw = (response.text ?? '').trim();
      return JSON.parse(raw);
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('403') || msg.includes('400') || msg.includes('API_KEY_INVALID')) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 350 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'zulxumor-quran' });
  });

  app.get('/api/recitation/status', (_req, res) => {
    const ai = createGeminiClient();
    res.json({
      aiAvailable: Boolean(ai),
      model: 'gemini-4-hydrogen',
      mode: ai ? 'multimodal-acoustic' : 'offline-only',
    });
  });

  app.post('/api/recitation/evaluate', async (req, res) => {
    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: "Serverda sun'iy intellekt kaliti sozlanmagan. Iltimos, oflayn rejimga o'ting yoki maxfiy sozlamalarda kalitni tekshiring.",
        code: 'AI_UNAVAILABLE',
      });
      return;
    }

    const { audioBase64, mimeType, expectedWords, strictness } = req.body as {
      audioBase64?: string;
      mimeType?: string;
      expectedWords?: ExpectedWordPayload[];
      strictness?: 'standard' | 'strict';
    };

    if (!audioBase64 || !mimeType || !Array.isArray(expectedWords) || expectedWords.length === 0) {
      res.status(400).json({ error: "Audio ma'lumotlari yoki kutilgan so'zlar yuborilmadi." });
      return;
    }

    try {
      const evaluation = await callEvaluateWithRetry(
        ai,
        audioBase64,
        mimeType,
        expectedWords.slice(0, 12),
        strictness === 'strict' ? 'strict' : 'standard'
      );
      res.json(evaluation);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Qiroatni baholashda xatolik yuz berdi.';
      const status = message.includes('429')
        ? 429
        : message.includes('403') || message.includes('400')
          ? 502
          : 500;
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ZULXUMOR QURAN server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Serverni ishga tushirishda xatolik:', err);
  process.exit(1);
});
