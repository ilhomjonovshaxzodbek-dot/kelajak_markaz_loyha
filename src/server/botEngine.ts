import type { BotReplyPayload, BotRole, InlineButton } from '../shared/types.ts';
import { centerStore } from './centerStore.ts';
import { askCourseAdvisor, generateTeacherQuiz } from './geminiService.ts';

interface SessionFlow {
  role: BotRole;
  step:
    | 'idle'
    | 'reg_course'
    | 'reg_name'
    | 'reg_phone'
    | 'reg_time'
    | 'submit_hw_text'
    | 'ai_student_chat'
    | 'ai_teacher_quiz'
    | 'teacher_broadcast_text'
    | 'teacher_hw_title';
  tempCourse?: string;
  tempName?: string;
  tempPhone?: string;
  tempTaskId?: string;
}

const sessions = new Map<string, SessionFlow>();

function getSession(sessionId: string, preferredRole?: BotRole): SessionFlow {
  let sess = sessions.get(sessionId);
  if (!sess) {
    sess = { role: preferredRole ?? 'student', step: 'idle' };
    sessions.set(sessionId, sess);
  } else if (preferredRole && sess.role !== preferredRole) {
    sess.role = preferredRole;
    sess.step = 'idle';
  }
  return sess;
}

export const STUDENT_REPLY_KEYBOARD: string[][] = [
  ['Kurslar katalogi', 'Sinov darsiga yozilish'],
  ['Dars jadvali', 'Uyga vazifalar'],
  ['Kelajak Coin do‘koni', 'AI Maslahatchi'],
];

export const TEACHER_REPLY_KEYBOARD: string[][] = [
  ['Tezkor yo‘qlama', 'Vazifalarni tekshirish'],
  ['Yangi vazifa berish', 'Guruhga e’lon'],
  ['Bugungi jadval', 'AI Test tuzish'],
];

function mainMenuReply(role: BotRole): BotReplyPayload {
  if (role === 'teacher') {
    return {
      text:
        'Assalomu alaykum, ustoz! Kelajak Markazi Ustozlar Botiga xush kelibsiz.\n\n' +
        'Bugungi darslar, tezkor yo‘qlama, uyga vazifalarni baholash va guruhlarga e’lon yuborishni shu yerdan boshqarishingiz mumkin.',
      inlineKeyboard: [
        [
          { text: 'Tezkor yo‘qlama', callbackData: 't:attendance_groups' },
          { text: 'Vazifalar (tekshirish)', callbackData: 't:submissions' },
        ],
        [
          { text: 'Guruhga e’lon yuborish', callbackData: 't:broadcast_start' },
          { text: 'AI Test tuzish', callbackData: 't:ai_quiz_start' },
        ],
        [{ text: 'O‘quvchi rejimiga o‘tish', callbackData: 'sys:role_student' }],
      ],
      replyKeyboard: TEACHER_REPLY_KEYBOARD,
    };
  }

  const studentKeyboard: InlineButton[][] = [
    [
      { text: 'Kurslar katalogi', callbackData: 's:courses' },
      { text: 'Sinov darsiga yozilish', callbackData: 's:register_start' },
    ],
    [
      { text: 'Dars jadvali', callbackData: 's:schedule' },
      { text: 'AI Maslahatchi', callbackData: 's:ai_start' },
    ],
    [
      { text: 'Kelajak Coin do‘koni', callbackData: 's:store' },
      { text: 'Ustozlar kabineti', callbackData: 'sys:role_teacher' },
    ],
  ];

  if (centerStore.telegramCommunities.length > 0) {
    studentKeyboard.push([
      { text: 'Telegram kanal va guruhlarimiz', callbackData: 's:communities' },
    ]);
  }

  return {
    text:
      'Assalomu alaykum! Kelajak Markazi rasmiy Telegram botiga xush kelibsiz.\n\n' +
      'Matematika, Ingliz tili (IELTS), Kimyo-Biologiya, Koreys tili, Dasturlash va Mental Arifmetika kurslarimiz haqida ma’lumot oling yoki bepul sinov darsiga yoziling.',
    inlineKeyboard: studentKeyboard,
    replyKeyboard: STUDENT_REPLY_KEYBOARD,
  };
}

export async function handleBotInput(params: {
  sessionId: string;
  role?: BotRole;
  text?: string;
  callbackData?: string;
}): Promise<BotReplyPayload> {
  const { sessionId, role, text, callbackData } = params;
  const sess = getSession(sessionId, role);

  if (callbackData) {
    if (callbackData === 'sys:role_teacher') {
      sess.role = 'teacher';
      sess.step = 'idle';
      return mainMenuReply('teacher');
    }
    if (callbackData === 'sys:role_student') {
      sess.role = 'student';
      sess.step = 'idle';
      return mainMenuReply('student');
    }
    if (callbackData === 'sys:home') {
      sess.step = 'idle';
      return mainMenuReply(sess.role);
    }

    if (callbackData === 's:courses') {
      sess.step = 'idle';
      if (centerStore.courses.length === 0) {
        return {
          text: 'Hozircha kurslar ro‘yxati shakllantirilmoqda. Tez orada Admin panel orqali qo‘shiladi.',
          replyKeyboard: STUDENT_REPLY_KEYBOARD,
        };
      }
      const buttons: InlineButton[][] = centerStore.courses.map((c) => [
        { text: `${c.title} (${c.priceMonthly})`, callbackData: `s:course:${c.id}` },
      ]);
      buttons.push([{ text: 'AI dan maslahat olish', callbackData: 's:ai_start' }]);
      return {
        text: 'Kelajak Markazi kurslari ro‘yxati. Batafsil ma’lumot uchun yo‘nalishni tanlang:',
        inlineKeyboard: buttons,
        replyKeyboard: STUDENT_REPLY_KEYBOARD,
      };
    }

    if (callbackData.startsWith('s:course:')) {
      const courseId = callbackData.replace('s:course:', '');
      const course = centerStore.courses.find((c) => c.id === courseId);
      if (!course) {
        return { text: 'Kurs topilmadi.', replyKeyboard: STUDENT_REPLY_KEYBOARD };
      }
      return {
        text:
          `${course.title}\n` +
          `Yo‘nalish: ${course.category} · Davomiyligi: ${course.durationMonths} oy\n` +
          `Narxi: ${course.priceMonthly}/oy\n` +
          `Jadval: ${course.scheduleSummary}\n` +
          `Ustoz: ${course.teacherName}\n` +
          `Qolgan bo‘sh o‘rinlar: ${course.seatsLeft} ta\n\n` +
          `${course.description}\n` +
          `O‘quv dasturi: ${course.modules.join(' → ')}`,
        inlineKeyboard: [
          [{ text: 'Bepul sinov darsiga yozilish', callbackData: `s:reg_course:${course.id}` }],
          [{ text: 'Barcha kurslar', callbackData: 's:courses' }],
        ],
        replyKeyboard: STUDENT_REPLY_KEYBOARD,
      };
    }

    if (callbackData === 's:register_start') {
      sess.step = 'reg_course';
      const buttons: InlineButton[][] = centerStore.courses.map((c) => [
        { text: c.title, callbackData: `s:reg_course:${c.id}` },
      ]);
      return {
        text: 'Bepul sinov darsiga yozilish uchun kursingizni tanlang:',
        inlineKeyboard: buttons,
        replyKeyboard: STUDENT_REPLY_KEYBOARD,
      };
    }

    if (callbackData.startsWith('s:reg_course:')) {
      const courseId = callbackData.replace('s:reg_course:', '');
      const course = centerStore.courses.find((c) => c.id === courseId);
      sess.tempCourse = course ? course.title : centerStore.courses[0]?.title || 'Umumiy kurs';
      sess.step = 'reg_name';
      return {
        text: `Tanlangan kurs: ${sess.tempCourse}.\n\nIsm va familiyangizni yozib yuboring:`,
        replyKeyboard: STUDENT_REPLY_KEYBOARD,
      };
    }

    if (callbackData.startsWith('s:reg_time:')) {
      const preferredTime = callbackData.replace('s:reg_time:', '');
      const fullName = sess.tempName || 'Yangi nomzod';
      const phone = sess.tempPhone || '+998 90 000 00 00';
      const courseTitle = sess.tempCourse || 'Umumiy kurs';

      centerStore.addRegistration(fullName, phone, courseTitle, preferredTime, 'telegram_live');
      sess.step = 'idle';

      return {
        text:
          `Arizangiz qabul qilindi!\n\n` +
          `Ism: ${fullName}\n` +
          `Telefon: ${phone}\n` +
          `Kurs: ${courseTitle}\n` +
          `Vaqt: ${preferredTime}\n\n` +
          `Markaz administratori tez orada siz bilan bog‘lanadi.`,
        inlineKeyboard: [[{ text: 'Bosh menyu', callbackData: 'sys:home' }]],
        replyKeyboard: STUDENT_REPLY_KEYBOARD,
        stateUpdated: true,
      };
    }

    if (callbackData === 's:schedule') {
      if (centerStore.groups.length === 0) {
        return { text: 'Hozircha faol guruhlar jadvali kiritilmagan.', replyKeyboard: STUDENT_REPLY_KEYBOARD };
      }
      const list = centerStore.groups
        .map((g) => `• ${g.name} — ${g.days} · ${g.time}\n  Xona: ${g.room} · Ustoz: ${g.teacherName}`)
        .join('\n\n');
      return {
        text: `Kelajak Markazi dars jadvali:\n\n${list}`,
        replyKeyboard: STUDENT_REPLY_KEYBOARD,
      };
    }

    if (callbackData === 's:homework') {
      if (centerStore.homeworkTasks.length === 0) {
        return { text: 'Hozircha faol uyga vazifalar yo‘q.', replyKeyboard: STUDENT_REPLY_KEYBOARD };
      }
      const listText = centerStore.homeworkTasks
        .slice(0, 5)
        .map((t, idx) => `${idx + 1}. ${t.title}\n   Muddat: ${t.deadline} · Mukofot: +${t.rewardCoins} coin`)
        .join('\n\n');
      return {
        text: `Markazdagi faol uyga vazifalar:\n\n${listText}`,
        replyKeyboard: STUDENT_REPLY_KEYBOARD,
      };
    }

    if (callbackData === 's:store') {
      if (centerStore.rewards.length === 0) {
        return { text: 'Coin do‘koni hozircha bo‘sh.', replyKeyboard: STUDENT_REPLY_KEYBOARD };
      }
      const list = centerStore.rewards
        .map((r) => `• ${r.title} — ${r.costCoins} coin (Qoldiq: ${r.stock} ta)`)
        .join('\n');
      return {
        text: `Kelajak Coin Do‘koni sovg‘alari:\n\n${list}`,
        replyKeyboard: STUDENT_REPLY_KEYBOARD,
      };
    }

    if (callbackData === 's:ai_start') {
      sess.step = 'ai_student_chat';
      return {
        text: 'AI Kasb va Kurs Maslahatchisi faol. Savolingizni yozing — Kelajak Markazi kurslari asosida tavsiya beraman!',
        replyKeyboard: STUDENT_REPLY_KEYBOARD,
      };
    }

    if (callbackData === 's:communities') {
      if (centerStore.telegramCommunities.length === 0) {
        return {
          text: 'Hozircha Telegram kanal yoki guruhlar biriktirilmagan.',
          replyKeyboard: STUDENT_REPLY_KEYBOARD,
        };
      }
      const list = centerStore.telegramCommunities
        .map((c) => {
          const kind = c.type === 'channel' ? 'Kanal' : 'Guruh';
          const ref = c.inviteLink || c.chatIdOrUsername;
          return `• [${kind}] ${c.title}\n  Havola: ${ref}`;
        })
        .join('\n\n');
      return {
        text: `Kelajak Markazining rasmiy Telegram kanal va guruhlari:\n\n${list}`,
        replyKeyboard: STUDENT_REPLY_KEYBOARD,
      };
    }

    if (callbackData === 't:attendance_groups') {
      const buttons: InlineButton[][] = centerStore.groups.map((g) => [
        { text: `${g.name} (${g.time})`, callbackData: `t:att_grp:${g.id}` },
      ]);
      return {
        text: 'Yo‘qlama qilish uchun guruhni tanlang:',
        inlineKeyboard: buttons,
        replyKeyboard: TEACHER_REPLY_KEYBOARD,
      };
    }

    if (callbackData.startsWith('t:att_grp:')) {
      const groupId = callbackData.replace('t:att_grp:', '');
      const group = centerStore.groups.find((g) => g.id === groupId);
      const students = centerStore.students.filter((s) => s.groupId === groupId);
      const buttons: InlineButton[][] = students.map((s) => {
        const label =
          s.todayStatus === 'present' ? 'Keldi' : s.todayStatus === 'late' ? 'Kechikdi' : 'Kelmadi';
        return [
          {
            text: `${s.fullName} — [${label}]`,
            callbackData: `t:toggle_att:${s.id}:${groupId}`,
          },
        ];
      });
      buttons.push([{ text: 'Ustoz menyusi', callbackData: 'sys:home' }]);
      return {
        text: `${group?.name ?? 'Guruh'} · Bugungi yo‘qlama:`,
        inlineKeyboard: buttons,
        replyKeyboard: TEACHER_REPLY_KEYBOARD,
      };
    }

    if (callbackData.startsWith('t:toggle_att:')) {
      const parts = callbackData.split(':');
      const studentId = parts[2];
      const groupId = parts[3];
      const student = centerStore.students.find((s) => s.id === studentId);
      if (student) {
        const nextStatus =
          student.todayStatus === 'present'
            ? 'absent'
            : student.todayStatus === 'absent'
            ? 'late'
            : 'present';
        centerStore.markAttendance(studentId, nextStatus);
      }
      const students = centerStore.students.filter((s) => s.groupId === groupId);
      const buttons: InlineButton[][] = students.map((s) => {
        const label =
          s.todayStatus === 'present' ? 'Keldi' : s.todayStatus === 'late' ? 'Kechikdi' : 'Kelmadi';
        return [
          {
            text: `${s.fullName} — [${label}]`,
            callbackData: `t:toggle_att:${s.id}:${groupId}`,
          },
        ];
      });
      buttons.push([{ text: 'Ustoz menyusi', callbackData: 'sys:home' }]);
      return {
        text: 'Yo‘qlama yangilandi va ota-onalarga bildirishnoma yuborildi:',
        inlineKeyboard: buttons,
        replyKeyboard: TEACHER_REPLY_KEYBOARD,
        stateUpdated: true,
      };
    }

    if (callbackData === 't:submissions') {
      const pending = centerStore.submissions.filter((s) => s.status === 'pending');
      if (pending.length === 0) {
        return {
          text: 'Barcha yuborilgan uyga vazifalar tekshirib bo‘lindi!',
          replyKeyboard: TEACHER_REPLY_KEYBOARD,
        };
      }
      const summary = pending
        .map((s, i) => `${i + 1}. ${s.studentName} (${s.taskTitle})\n   Javob: ${s.answerText}`)
        .join('\n\n');
      const buttons: InlineButton[][] = pending.map((s) => [
        { text: `Baholash (95 ball): ${s.studentName}`, callbackData: `t:grade_fast:${s.id}` },
      ]);
      return {
        text: `Tekshirilmagan vazifalar:\n\n${summary}`,
        inlineKeyboard: buttons,
        replyKeyboard: TEACHER_REPLY_KEYBOARD,
      };
    }

    if (callbackData.startsWith('t:grade_fast:')) {
      const subId = callbackData.replace('t:grade_fast:', '');
      const graded = centerStore.gradeSubmission(subId, 95, 'Barakalla! A’lo bajarilgan.', 30);
      return {
        text: graded
          ? `${graded.studentName} ning vazifasi 95/100 ball bilan baholandi (+30 coin).`
          : 'Vazifa topilmadi.',
        replyKeyboard: TEACHER_REPLY_KEYBOARD,
        stateUpdated: Boolean(graded),
      };
    }

    if (callbackData === 't:broadcast_start') {
      sess.step = 'teacher_broadcast_text';
      return {
        text: 'Guruhga yubormoqchi bo‘lgan e’lon matnini yozing:',
        replyKeyboard: TEACHER_REPLY_KEYBOARD,
      };
    }

    if (callbackData === 't:ai_quiz_start') {
      sess.step = 'ai_teacher_quiz';
      return {
        text: 'Qaysi fan va mavzu bo‘yicha 3 ta test savoli tuzib beray? (Masalan: Matematika - Kvadrat tenglamalar)',
        replyKeyboard: TEACHER_REPLY_KEYBOARD,
      };
    }
  }

  const cleanText = (text ?? '').trim();
  if (!cleanText || cleanText === '/start' || cleanText === 'Bosh menyu') {
    sess.step = 'idle';
    return mainMenuReply(sess.role);
  }
  if (cleanText === '/ustoz') {
    sess.role = 'teacher';
    sess.step = 'idle';
    return mainMenuReply('teacher');
  }
  if (cleanText === '/talaba') {
    sess.role = 'student';
    sess.step = 'idle';
    return mainMenuReply('student');
  }

  if (cleanText === 'Kurslar katalogi') {
    return handleBotInput({ sessionId, role: 'student', callbackData: 's:courses' });
  }
  if (cleanText === 'Sinov darsiga yozilish') {
    return handleBotInput({ sessionId, role: 'student', callbackData: 's:register_start' });
  }
  if (cleanText === 'Dars jadvali') {
    return handleBotInput({ sessionId, role: 'student', callbackData: 's:schedule' });
  }
  if (cleanText === 'Uyga vazifalar') {
    return handleBotInput({ sessionId, role: 'student', callbackData: 's:homework' });
  }
  if (cleanText === 'Kelajak Coin do‘koni') {
    return handleBotInput({ sessionId, role: 'student', callbackData: 's:store' });
  }
  if (cleanText === 'AI Maslahatchi') {
    return handleBotInput({ sessionId, role: 'student', callbackData: 's:ai_start' });
  }

  if (cleanText === 'Tezkor yo‘qlama') {
    return handleBotInput({ sessionId, role: 'teacher', callbackData: 't:attendance_groups' });
  }
  if (cleanText === 'Vazifalarni tekshirish') {
    return handleBotInput({ sessionId, role: 'teacher', callbackData: 't:submissions' });
  }
  if (cleanText === 'Guruhga e’lon') {
    return handleBotInput({ sessionId, role: 'teacher', callbackData: 't:broadcast_start' });
  }
  if (cleanText === 'AI Test tuzish') {
    return handleBotInput({ sessionId, role: 'teacher', callbackData: 't:ai_quiz_start' });
  }
  if (cleanText === 'Bugungi jadval') {
    return handleBotInput({ sessionId, role: 'teacher', callbackData: 's:schedule' });
  }

  if (sess.step === 'reg_name') {
    sess.tempName = cleanText;
    sess.step = 'reg_phone';
    return {
      text: `Rahmat, ${cleanText}! Telefon raqamingizni yuboring (+998 ...):`,
      replyKeyboard: STUDENT_REPLY_KEYBOARD,
    };
  }

  if (sess.step === 'reg_phone') {
    sess.tempPhone = cleanText;
    sess.step = 'reg_time';
    return {
      text: 'Qaysi vaqt sizga qulayroq?',
      inlineKeyboard: [
        [
          { text: 'Ertalab (10:00)', callbackData: 's:reg_time:Ertalabki (10:00)' },
          { text: 'Tushdan keyin (14:00)', callbackData: 's:reg_time:Tushdan keyin (14:00)' },
        ],
        [{ text: 'Kechki (16:30)', callbackData: 's:reg_time:Kechki (16:30)' }],
      ],
      replyKeyboard: STUDENT_REPLY_KEYBOARD,
    };
  }

  if (sess.step === 'teacher_broadcast_text') {
    centerStore.addBroadcast(centerStore.groups[0]?.name || 'Barcha guruhlar', cleanText);
    sess.step = 'idle';
    return {
      text: `E’lon saqlandi va tarqatildi: "${cleanText}"`,
      replyKeyboard: TEACHER_REPLY_KEYBOARD,
      stateUpdated: true,
    };
  }

  if (sess.step === 'ai_teacher_quiz') {
    try {
      const quiz = await generateTeacherQuiz(cleanText, 'Kelajak Markazi');
      sess.step = 'idle';
      return { text: quiz, replyKeyboard: TEACHER_REPLY_KEYBOARD };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI xatolik';
      return { text: `AI xatosi: ${msg}`, replyKeyboard: TEACHER_REPLY_KEYBOARD };
    }
  }

  try {
    const aiText = await askCourseAdvisor(cleanText, centerStore.courses, sess.role);
    return {
      text: aiText,
      replyKeyboard: sess.role === 'teacher' ? TEACHER_REPLY_KEYBOARD : STUDENT_REPLY_KEYBOARD,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI javob bera olmadi.';
    return {
      text: `Xatolik: ${msg}`,
      replyKeyboard: sess.role === 'teacher' ? TEACHER_REPLY_KEYBOARD : STUDENT_REPLY_KEYBOARD,
    };
  }
}

export interface DiscoveredTelegramChat {
  chatId: string;
  title: string;
  type: 'channel' | 'group';
  username?: string;
  discoveredAt: string;
}

interface TelegramChatInfo {
  id: number;
  type?: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
}

class LiveTelegramBridge {
  private token: string | null = null;
  private polling = false;
  private offset = 0;
  private knownChatIds = new Set<number>();
  private discoveredChats = new Map<string, DiscoveredTelegramChat>();
  private pollAbortController: AbortController | null = null;

  getDiscoveredChats(): DiscoveredTelegramChat[] {
    return Array.from(this.discoveredChats.values());
  }

  private recordDiscoveredChat(chat?: TelegramChatInfo): void {
    if (!chat || !chat.id) return;
    if (chat.type !== 'group' && chat.type !== 'supergroup' && chat.type !== 'channel') return;
    const chatId = String(chat.id);
    this.knownChatIds.add(chat.id);
    centerStore.telegramStatus.activeChatsCount = this.knownChatIds.size;
    this.discoveredChats.set(chatId, {
      chatId,
      title: chat.title || (chat.username ? `@${chat.username}` : `Chat ${chatId}`),
      type: chat.type === 'channel' ? 'channel' : 'group',
      username: chat.username ? `@${chat.username}` : undefined,
      discoveredAt: new Date().toLocaleTimeString('uz-UZ', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    });
  }

  async connect(token: string): Promise<{ username: string; name: string }> {
    const trimmed = token.trim();
    if (!trimmed.includes(':')) {
      throw new Error('Noto‘g‘ri Bot Token formati. @BotFather bergan tokenni kiriting.');
    }

    const res = await fetch(`https://api.telegram.org/bot${trimmed}/getMe`);
    const data = (await res.json()) as {
      ok: boolean;
      description?: string;
      result?: { username: string; first_name: string };
    };

    if (!data.ok || !data.result) {
      throw new Error(data.description || 'Telegram Bot API bilan bog‘lanib bo‘lmadi.');
    }

    await fetch(`https://api.telegram.org/bot${trimmed}/deleteWebhook`);

    this.disconnect();
    this.token = trimmed;
    this.polling = true;
    centerStore.telegramStatus = {
      connected: true,
      botUsername: data.result.username,
      botName: data.result.first_name,
      activeChatsCount: this.knownChatIds.size,
      lastError: null,
    };

    void this.pollLoop();
    return { username: data.result.username, name: data.result.first_name };
  }

  disconnect(): void {
    this.polling = false;
    this.token = null;
    if (this.pollAbortController) {
      this.pollAbortController.abort();
      this.pollAbortController = null;
    }
    centerStore.telegramStatus = {
      connected: false,
      botUsername: null,
      botName: null,
      activeChatsCount: this.knownChatIds.size,
      lastError: null,
    };
  }

  async sendMessageToTarget(
    chatIdOrUsername: string,
    text: string
  ): Promise<{ ok: boolean; error?: string }> {
    if (!this.token) {
      return {
        ok: false,
        error: 'Avval Admin panelda @BotFather tokeni orqali Telegram botni ulang.',
      };
    }

    let target = chatIdOrUsername.trim();
    if (!target) {
      return { ok: false, error: 'Kanal yoki guruh @username / Chat ID ko‘rsatilmagan.' };
    }

    if (
      target.startsWith('https://t.me/+') ||
      target.startsWith('http://t.me/+') ||
      target.startsWith('t.me/+') ||
      target.startsWith('@+')
    ) {
      return {
        ok: false,
        error:
          'Maxfiy taklif havolasi (t.me/+...) orqali bot xabar yubora olmaydi. Botni guruhga Admin qilib qo‘shing va guruhda /id buyrug‘ini yozib -100... Chat ID dan foydalaning.',
      };
    }

    if (/^(https?:\/\/)?t\.me\//i.test(target)) {
      const slug = target.replace(/^(https?:\/\/)?t\.me\//i, '').split(/[/?#]/)[0];
      target = slug.startsWith('@') ? slug : `@${slug}`;
    } else if (!/^-?\d+$/.test(target) && !target.startsWith('@')) {
      target = `@${target}`;
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: target,
          text,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; description?: string };
      if (!data.ok) {
        const desc = data.description || '';
        const lower = desc.toLowerCase();
        if (lower.includes('chat not found')) {
          return {
            ok: false,
            error:
              `Telegram chat topilmadi (${target}). Tekshiring: 1) Bot ushbu guruh/kanalga Admin qilib qo‘shilganmi? 2) Maxfiy guruh/kanal bo‘lsa @username emas, -100... Chat ID kiritilganmi? (Botni guruhga qo‘shib /id yozsangiz, Chat ID avtomatik aniqlanadi).`,
          };
        }
        if (lower.includes('not enough rights') || lower.includes('have no rights') || lower.includes('forbidden')) {
          return {
            ok: false,
            error:
              'Botda ushbu kanal/guruhga xabar yuborish ruxsati yo‘q. Telegramda botni Administrator qilib «Post messages / Xabar yuborish» huquqini yoqing.',
          };
        }
        return {
          ok: false,
          error:
            desc ||
            'Xabar yuborib bo‘lmadi. Bot ushbu kanal yoki guruhga Admin qilib qo‘shilganini tekshiring.',
        };
      }
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Telegram API bilan bog‘lanishda xatolik.',
      };
    }
  }

  async broadcastToLiveChats(message: string): Promise<number> {
    if (!this.token) return 0;
    let sent = 0;
    const sentTargets = new Set<string>();

    for (const community of centerStore.telegramCommunities) {
      const targetKey = community.chatIdOrUsername.trim().toLowerCase();
      if (sentTargets.has(targetKey)) continue;
      const result = await this.sendMessageToTarget(
        community.chatIdOrUsername,
        `Kelajak Markazi E’loni:\n\n${message}`
      );
      if (result.ok) {
        sentTargets.add(targetKey);
        sent += 1;
      }
    }

    for (const chatId of this.knownChatIds) {
      const key = String(chatId);
      if (sentTargets.has(key)) continue;
      const discovered = this.discoveredChats.get(key);
      if (discovered?.username && sentTargets.has(discovered.username.toLowerCase())) {
        continue;
      }
      try {
        await this.callTelegram('sendMessage', {
          chat_id: chatId,
          text: `Kelajak Markazi E’loni:\n\n${message}`,
        });
        sentTargets.add(key);
        sent += 1;
      } catch {
        // Ignore blocked user chats
      }
    }

    return sent;
  }

  private async callTelegram(method: string, body: Record<string, unknown>): Promise<unknown> {
    if (!this.token) return null;
    const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  private toTelegramMarkup(payload: BotReplyPayload) {
    if (payload.inlineKeyboard && payload.inlineKeyboard.length > 0) {
      return {
        inline_keyboard: payload.inlineKeyboard.map((row) =>
          row.map((btn) => ({ text: btn.text, callback_data: btn.callbackData }))
        ),
      };
    }
    if (payload.replyKeyboard && payload.replyKeyboard.length > 0) {
      return {
        keyboard: payload.replyKeyboard.map((row) => row.map((label) => ({ text: label }))),
        resize_keyboard: true,
      };
    }
    return undefined;
  }

  private async pollLoop(): Promise<void> {
    const allowedUpdates = encodeURIComponent(
      JSON.stringify(['message', 'callback_query', 'channel_post', 'my_chat_member'])
    );
    while (this.polling && this.token) {
      try {
        this.pollAbortController = new AbortController();
        const res = await fetch(
          `https://api.telegram.org/bot${this.token}/getUpdates?offset=${this.offset}&timeout=20&allowed_updates=${allowedUpdates}`,
          { signal: this.pollAbortController.signal }
        );
        const data = (await res.json()) as {
          ok: boolean;
          description?: string;
          result?: Array<{
            update_id: number;
            message?: { chat: TelegramChatInfo; text?: string };
            channel_post?: { chat: TelegramChatInfo; text?: string };
            my_chat_member?: { chat: TelegramChatInfo };
            callback_query?: { id: string; message?: { chat: TelegramChatInfo }; data?: string };
          }>;
        };

        if (!data.ok) {
          centerStore.telegramStatus.lastError = data.description || 'Polling xatoligi';
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }

        for (const upd of data.result ?? []) {
          this.offset = upd.update_id + 1;

          if (upd.my_chat_member?.chat) {
            this.recordDiscoveredChat(upd.my_chat_member.chat);
          }

          if (upd.channel_post?.chat) {
            this.recordDiscoveredChat(upd.channel_post.chat);
          }

          if (upd.message?.chat?.id) {
            const chat = upd.message.chat;
            this.recordDiscoveredChat(chat);

            if (chat.type === 'group' || chat.type === 'supergroup') {
              const rawText = (upd.message.text || '').trim();
              if (/^\/(id|chatid|start)(@\S+)?$/i.test(rawText)) {
                await this.callTelegram('sendMessage', {
                  chat_id: chat.id,
                  text:
                    `Guruh muvaffaqiyatli aniqlandi!\n` +
                    `Nomi: ${chat.title || 'Guruh'}\n` +
                    `Chat ID: ${chat.id}\n\n` +
                    `Admin paneldagi "@username yoki Chat ID" maydoniga aynan shu ${chat.id} raqamini kiriting.`,
                });
              }
              continue;
            }

            const chatId = chat.id;
            this.knownChatIds.add(chatId);
            centerStore.telegramStatus.activeChatsCount = this.knownChatIds.size;

            const reply = await handleBotInput({
              sessionId: `tg-${chatId}`,
              text: upd.message.text ?? '/start',
            });

            await this.callTelegram('sendMessage', {
              chat_id: chatId,
              text: reply.text,
              reply_markup: this.toTelegramMarkup(reply),
            });
          } else if (upd.callback_query?.id) {
            const chat = upd.callback_query.message?.chat;
            const chatId = chat?.id;
            await this.callTelegram('answerCallbackQuery', {
              callback_query_id: upd.callback_query.id,
            });
            if (chatId) {
              this.recordDiscoveredChat(chat);
              this.knownChatIds.add(chatId);
              centerStore.telegramStatus.activeChatsCount = this.knownChatIds.size;

              const reply = await handleBotInput({
                sessionId: `tg-${chatId}`,
                callbackData: upd.callback_query.data,
              });

              await this.callTelegram('sendMessage', {
                chat_id: chatId,
                text: reply.text,
                reply_markup: this.toTelegramMarkup(reply),
              });
            }
          }
        }
      } catch (err) {
        if (!this.polling) break;
        centerStore.telegramStatus.lastError = err instanceof Error ? err.message : 'Tarmoq xatoligi';
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }
}

export const liveTelegramBridge = new LiveTelegramBridge();
