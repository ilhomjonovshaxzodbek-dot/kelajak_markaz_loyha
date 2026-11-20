import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type { Course, QuizQuestion } from '../shared/types.ts';

function isExternalHostRuntime(): boolean {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_SERVICE_ID ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_PUBLIC_DOMAIN ||
      process.env.RENDER ||
      process.env.FLY_APP_NAME
  );
}

function getGeminiModel(): string {
  const explicit = process.env.GEMINI_MODEL?.trim();
  if (explicit) return explicit;
  return isExternalHostRuntime() ? 'gemini-2.5-flash' : 'gemini-4-hydrogen';
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY muhit o‘zgaruvchisi topilmadi. Environment Variables bo‘limidan tekshiring.');
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

async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: Omit<Parameters<GoogleGenAI['models']['generateContent']>[0], 'model'>
) {
  const primaryModel = getGeminiModel();
  try {
    return await ai.models.generateContent({
      model: primaryModel,
      ...params,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    const shouldFallback =
      !process.env.GEMINI_MODEL?.trim() &&
      primaryModel !== 'gemini-2.5-flash' &&
      (msg.includes('not found') ||
        msg.includes('404') ||
        msg.includes('not supported') ||
        msg.includes('invalid argument'));
    if (!shouldFallback) {
      throw err;
    }
    return await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      ...params,
    });
  }
}

export async function askCourseAdvisor(
  question: string,
  courses: Course[],
  role: 'student' | 'teacher'
): Promise<string> {
  const ai = getGeminiClient();

  const courseCatalogSummary = courses
    .map(
      (c) =>
        `- ${c.title} (${c.category}): ${c.durationMonths} oy, ${c.priceMonthly}/oy, Jadval: ${c.scheduleSummary}, Ustoz: ${c.teacherName}, Bo'sh joy: ${c.seatsLeft}. Mavzular: ${c.modules.join(', ')}`
    )
    .join('\n');

  const systemInstruction =
    role === 'teacher'
      ? `Siz "Kelajak Markazi" o'quv markazining Telegram botidagi AI Ustoz Yordamchisisiz.
Javoblarni faqat o'zbek tilida (lotin alifbosida), aniq, amaliy va qisqa Telegram xabari shaklida bering (maksimum 180 so'z).
Ustozlarga dars rejasi, 3 ta tezkor test savoli, uyga vazifa g'oyasi yoki o'quvchiga motivatsion izoh yozishda yordam bering.
Markaz kurslari:\n${courseCatalogSummary}`
      : `Siz "Kelajak Markazi" o'quv markazining Telegram botidagi zamonaviy AI Kasb va Kurs Maslahatchisisiz.
Javoblarni faqat o'zbek tilida (lotin alifbosida), samimiy, tushunarli va qisqa Telegram xabari formatida bering (maksimum 170 so'z).
Foydalanuvchining qiziqishi, yoshi yoki maqsadiga qarab quyidagi real kurslardan mosini tavsiya qiling va bepul sinov darsiga yozilishni taklif eting:
${courseCatalogSummary}`;

  const response = await generateContentWithFallback(ai, {
    contents: question,
    config: {
      systemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });

  const answer = response.text?.trim();
  if (!answer) {
    throw new Error('AI javob qaytara olmadi.');
  }
  return answer;
}

export async function generateTeacherQuiz(topic: string, groupName: string): Promise<string> {
  const ai = getGeminiClient();

  const response = await generateContentWithFallback(ai, {
    contents: `"${groupName}" guruhi uchun "${topic}" mavzusida 3 ta qisqa test savoli va oxirida to'g'ri javoblar kalitini o'zbek tilida tuzib bering. Telegramda o'qishga qulay formatda yozing.`,
    config: {
      systemInstruction:
        "Siz Kelajak Markazi ustozlari uchun tezkor test tuzuvchi AI yordamchisiz. Faqat o'zbek tilida (lotin alifbosida), aniq va ixcham javob bering.",
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error('Test tuzishda xatolik yuz berdi.');
  }
  return text;
}

export async function generateStructuredQuiz(
  topic: string,
  groupName: string
): Promise<QuizQuestion[]> {
  const ai = getGeminiClient();

  const response = await generateContentWithFallback(ai, {
    contents: `"${groupName}" guruhi uchun "${topic}" mavzusida 4 ta sifatli ko'p tanlovli (4 variantli) test savolini o'zbek tilida tuzing.`,
    config: {
      systemInstruction:
        "Siz Kelajak Markazi ustozlari uchun aniq test tuzuvchi yordamchisiz. Har bir savolning 4 ta varianti va bitta to'g'ri javob indeksi (0..3) bo'lishi shart. Faqat o'zbek tilida (lotin alifbosida) javob bering.",
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            prompt: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            correctIndex: { type: Type.INTEGER },
          },
          required: ['prompt', 'options', 'correctIndex'],
        },
      },
    },
  });

  const raw = response.text?.trim();
  if (!raw) {
    throw new Error('AI strukturaviy test qaytara olmadi.');
  }
  const parsed = JSON.parse(raw) as Array<{
    prompt: string;
    options: string[];
    correctIndex: number;
  }>;

  return parsed.slice(0, 6).map((q, idx) => ({
    id: `qq-${Date.now()}-${idx}`,
    prompt: q.prompt,
    options: (q.options || []).slice(0, 4),
    correctIndex: Math.min(3, Math.max(0, Number(q.correctIndex) || 0)),
  }));
}
