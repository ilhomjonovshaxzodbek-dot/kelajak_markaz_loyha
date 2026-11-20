import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { liveTelegramBridge } from './src/server/botEngine.ts';
import { centerStore } from './src/server/centerStore.ts';
import { askCourseAdvisor, generateStructuredQuiz, generateTeacherQuiz } from './src/server/geminiService.ts';
import type { AttendanceStatus, CourseCategory, PaymentMethod, QuizQuestion } from './src/shared/types.ts';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_ID);

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '5mb' }));
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (err instanceof SyntaxError && 'body' in err) {
        res.status(400).json({ ok: false, error: 'Noto‘g‘ri JSON formati.' });
        return;
      }
      next(err);
    }
  );

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'kelajak-markazi-platform',
      env: isProduction ? 'production' : 'development',
      telegramConnected: centerStore.telegramStatus.connected,
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });

  app.get('/api/center/state', (_req, res) => {
    res.json(centerStore.getSnapshot());
  });

  app.post('/api/center/hydrate', (req, res) => {
    const body = req.body as Record<string, unknown>;
    if (!body || typeof body !== 'object') {
      res.status(400).json({ error: 'Noto‘g‘ri ma’lumot.' });
      return;
    }
    const needsCloudResync = centerStore.hydrateFromCloud(body);
    res.json({ ok: true, needsCloudResync, state: centerStore.getSnapshot() });
  });

  // Web trial registration
  app.post('/api/center/register', (req, res) => {
    const { fullName, phone, courseTitle, preferredTime } = req.body as {
      fullName?: string;
      phone?: string;
      courseTitle?: string;
      preferredTime?: string;
    };
    if (!fullName?.trim() || !phone?.trim() || !courseTitle?.trim()) {
      res.status(400).json({ error: 'Ism, telefon raqam va kursni kiriting.' });
      return;
    }
    const registration = centerStore.addRegistration(
      fullName.trim(),
      phone.trim(),
      courseTitle.trim(),
      preferredTime || 'Tushdan keyin (14:00)',
      'web'
    );
    res.json({ ok: true, registration, state: centerStore.getSnapshot() });
  });

  // =========================================================================
  // ADMIN PANEL CRUD ENDPOINTS
  // =========================================================================
  app.post('/api/admin/course', (req, res) => {
    const {
      title,
      category,
      durationMonths,
      priceMonthly,
      scheduleSummary,
      teacherName,
      seatsLeft,
      description,
      modules,
    } = req.body as {
      title?: string;
      category?: CourseCategory;
      durationMonths?: number;
      priceMonthly?: string;
      scheduleSummary?: string;
      teacherName?: string;
      seatsLeft?: number;
      description?: string;
      modules?: string[];
    };
    if (!title?.trim() || !priceMonthly?.trim()) {
      res.status(400).json({ error: 'Kurs nomi va oylik narxini kiriting.' });
      return;
    }
    const course = centerStore.addCourse({
      title: title.trim(),
      category: category || 'Aniq fanlar',
      durationMonths: Number(durationMonths) || 6,
      priceMonthly: priceMonthly.trim(),
      scheduleSummary: (scheduleSummary || 'Du / Chor / Ju · 14:00').trim(),
      teacherName: (teacherName || 'Belgilanmagan').trim(),
      seatsLeft: Number(seatsLeft) || 10,
      description: (description || 'Kelajak Markazi o‘quv dasturi asosida tayyorlangan kurs.').trim(),
      modules: modules && modules.length > 0 ? modules : ['Asosiy nazariya', 'Amaliy mashg‘ulotlar', 'Yakuniy test'],
    });
    res.json({ ok: true, course, state: centerStore.getSnapshot() });
  });

  app.delete('/api/admin/course/:id', (req, res) => {
    centerStore.deleteCourse(req.params.id);
    res.json({ ok: true, state: centerStore.getSnapshot() });
  });

  app.post('/api/admin/teacher', (req, res) => {
    const { fullName, subject, phone, experienceYears } = req.body as {
      fullName?: string;
      subject?: string;
      phone?: string;
      experienceYears?: number;
    };
    if (!fullName?.trim() || !subject?.trim()) {
      res.status(400).json({ error: 'Ustoz ismi va fanini kiriting.' });
      return;
    }
    const teacher = centerStore.addTeacher({
      fullName: fullName.trim(),
      subject: subject.trim(),
      phone: (phone || '+998 90 000 00 00').trim(),
      experienceYears: Number(experienceYears) || 3,
    });
    res.json({ ok: true, teacher, state: centerStore.getSnapshot() });
  });

  app.delete('/api/admin/teacher/:id', (req, res) => {
    centerStore.deleteTeacher(req.params.id);
    res.json({ ok: true, state: centerStore.getSnapshot() });
  });

  app.post('/api/admin/group', (req, res) => {
    const { name, courseId, teacherId, days, time, room } = req.body as {
      name?: string;
      courseId?: string;
      teacherId?: string;
      days?: string;
      time?: string;
      room?: string;
    };
    if (!name?.trim() || !courseId || !teacherId) {
      res.status(400).json({ error: 'Guruh nomi, kurs va ustozni tanlang.' });
      return;
    }
    const group = centerStore.addGroup({
      name: name.trim(),
      courseId,
      teacherId,
      days: (days || 'Du · Chor · Ju').trim(),
      time: (time || '14:00 – 16:00').trim(),
      room: (room || '101-xona').trim(),
    });
    res.json({ ok: true, group, state: centerStore.getSnapshot() });
  });

  app.delete('/api/admin/group/:id', (req, res) => {
    centerStore.deleteGroup(req.params.id);
    res.json({ ok: true, state: centerStore.getSnapshot() });
  });

  app.post('/api/admin/student', (req, res) => {
    const { fullName, phone, parentPhone, groupId, paymentStatus, nextPaymentDate } = req.body as {
      fullName?: string;
      phone?: string;
      parentPhone?: string;
      groupId?: string;
      paymentStatus?: 'paid' | 'due_soon';
      nextPaymentDate?: string;
    };
    if (!fullName?.trim() || !groupId) {
      res.status(400).json({ error: 'O‘quvchi ismi va guruhini kiriting.' });
      return;
    }
    const student = centerStore.addStudent({
      fullName: fullName.trim(),
      phone: (phone || '+998 90 000 00 00').trim(),
      parentPhone: (parentPhone || '+998 90 000 00 01').trim(),
      groupId,
      paymentStatus: paymentStatus || 'paid',
      nextPaymentDate: nextPaymentDate || '2026-12-05',
    });
    res.json({ ok: true, student, state: centerStore.getSnapshot() });
  });

  app.post('/api/admin/student/:id/toggle-payment', (req, res) => {
    centerStore.toggleStudentPayment(req.params.id);
    res.json({ ok: true, state: centerStore.getSnapshot() });
  });

  app.delete('/api/admin/student/:id', (req, res) => {
    centerStore.deleteStudent(req.params.id);
    res.json({ ok: true, state: centerStore.getSnapshot() });
  });

  app.post('/api/admin/reward', (req, res) => {
    const { title, costCoins, stock, description } = req.body as {
      title?: string;
      costCoins?: number;
      stock?: number;
      description?: string;
    };
    if (!title?.trim()) {
      res.status(400).json({ error: 'Sovg‘a nomini kiriting.' });
      return;
    }
    const reward = centerStore.addReward({
      title: title.trim(),
      costCoins: Number(costCoins) || 200,
      stock: Number(stock) || 10,
      description: (description || 'Kelajak Markazi sovg‘asi.').trim(),
    });
    res.json({ ok: true, reward, state: centerStore.getSnapshot() });
  });

  app.delete('/api/admin/reward/:id', (req, res) => {
    centerStore.deleteReward(req.params.id);
    res.json({ ok: true, state: centerStore.getSnapshot() });
  });

  app.post('/api/admin/reward-order/:id/issue', (req, res) => {
    const order = centerStore.issueRewardOrder(req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Buyurtma topilmadi.' });
      return;
    }
    res.json({ ok: true, order, state: centerStore.getSnapshot() });
  });

  app.post('/api/admin/payment', (req, res) => {
    const { studentId, amountUzs, method, monthLabel, note } = req.body as {
      studentId?: string;
      amountUzs?: number;
      method?: PaymentMethod;
      monthLabel?: string;
      note?: string;
    };
    if (!studentId || !amountUzs) {
      res.status(400).json({ error: 'O‘quvchi va to‘lov summasini kiriting.' });
      return;
    }
    const payment = centerStore.recordPayment({
      studentId,
      amountUzs: Number(amountUzs),
      method: method || 'Naqd',
      monthLabel: (monthLabel || 'Noyabr 2026').trim(),
      note,
    });
    if (!payment) {
      res.status(404).json({ error: 'O‘quvchi topilmadi.' });
      return;
    }
    res.json({ ok: true, payment, state: centerStore.getSnapshot() });
  });

  app.post('/api/admin/student/:id/remind-payment', async (req, res) => {
    const result = centerStore.sendPaymentReminder(req.params.id);
    if (!result) {
      res.status(404).json({ error: 'O‘quvchi topilmadi.' });
      return;
    }
    await liveTelegramBridge.broadcastToLiveChats(result.notification.message);
    res.json({ ok: true, ...result, state: centerStore.getSnapshot() });
  });

  app.post('/api/admin/certificate', (req, res) => {
    const { studentId, courseTitle, teacherName, gradeLabel } = req.body as {
      studentId?: string;
      courseTitle?: string;
      teacherName?: string;
      gradeLabel?: string;
    };
    if (!studentId || !courseTitle?.trim()) {
      res.status(400).json({ error: 'O‘quvchi va kurs nomini tanlang.' });
      return;
    }
    const cert = centerStore.issueCertificate({
      studentId,
      courseTitle: courseTitle.trim(),
      teacherName: (teacherName || 'Kelajak Markazi').trim(),
      gradeLabel: (gradeLabel || 'Muvaffaqiyatli bitirdi').trim(),
    });
    if (!cert) {
      res.status(404).json({ error: 'O‘quvchi topilmadi.' });
      return;
    }
    res.json({ ok: true, certificate: cert, state: centerStore.getSnapshot() });
  });

  app.delete('/api/admin/certificate/:id', (req, res) => {
    centerStore.deleteCertificate(req.params.id);
    res.json({ ok: true, state: centerStore.getSnapshot() });
  });

  app.post('/api/admin/telegram-community', (req, res) => {
    const { title, type, chatIdOrUsername, inviteLink, linkedGroupId } = req.body as {
      title?: string;
      type?: 'channel' | 'group';
      chatIdOrUsername?: string;
      inviteLink?: string;
      linkedGroupId?: string;
    };
    if (!title?.trim() || !chatIdOrUsername?.trim()) {
      res.status(400).json({ error: 'Kanal/guruh nomi va @username yoki Chat ID ni kiriting.' });
      return;
    }
    const rawTarget = chatIdOrUsername.trim();
    if (
      /^(https?:\/\/)?t\.me\/\+/i.test(rawTarget) ||
      rawTarget.startsWith('@+')
    ) {
      res.status(400).json({
        error:
          't.me/+... bu taklif havolasi (invite link). Uni «Taklif havolasi» maydoniga yozing, «@username yoki Chat ID» maydoniga esa -100... Chat ID (yoki ochiq @username) kiriting.',
      });
      return;
    }

    let normalizedTarget = rawTarget;
    if (/^(https?:\/\/)?t\.me\//i.test(rawTarget)) {
      const slug = rawTarget.replace(/^(https?:\/\/)?t\.me\//i, '').split(/[/?#]/)[0];
      normalizedTarget = slug.startsWith('@') ? slug : `@${slug}`;
    } else if (!/^-?\d+$/.test(rawTarget) && !rawTarget.startsWith('@')) {
      normalizedTarget = `@${rawTarget}`;
    }

    const community = centerStore.addTelegramCommunity({
      title: title.trim(),
      type: type === 'group' ? 'group' : 'channel',
      chatIdOrUsername: normalizedTarget,
      inviteLink: inviteLink?.trim(),
      linkedGroupId: linkedGroupId?.trim(),
    });
    res.json({ ok: true, community, state: centerStore.getSnapshot() });
  });

  app.delete('/api/admin/telegram-community/:id', (req, res) => {
    centerStore.deleteTelegramCommunity(req.params.id);
    res.json({ ok: true, state: centerStore.getSnapshot() });
  });

  app.post('/api/admin/telegram-community/:id/send', async (req, res) => {
    const community = centerStore.telegramCommunities.find((c) => c.id === req.params.id);
    if (!community) {
      res.status(404).json({ ok: false, error: 'Kanal yoki guruh topilmadi.' });
      return;
    }
    const { text } = req.body as { text?: string };
    const messageText =
      text?.trim() ||
      `Assalomu alaykum! Kelajak Markazi rasmiy boti (${community.title}) bilan muvaffaqiyatli bog‘landi.`;

    const result = await liveTelegramBridge.sendMessageToTarget(
      community.chatIdOrUsername,
      messageText
    );
    if (!result.ok) {
      res.status(400).json({ ok: false, error: result.error });
      return;
    }
    centerStore.addBroadcast(community.title, messageText);
    res.json({ ok: true, state: centerStore.getSnapshot() });
  });

  app.post('/api/admin/contact', (req, res) => {
    const { phones, workingHours, address, description } = req.body as {
      phones?: string;
      workingHours?: string;
      address?: string;
      description?: string;
    };
    if (!phones?.trim() || !address?.trim()) {
      res.status(400).json({ error: 'Telefon raqami va manzilni kiriting.' });
      return;
    }
    const contactInfo = centerStore.updateContactInfo({
      phones: phones.trim(),
      workingHours: (workingHours || 'Dushanba – Shanba · 08:30 – 20:30').trim(),
      address: address.trim(),
      description: (
        description ||
        'Ro‘yxatdan o‘tish, daraja aniqlash testi va shartnomalar bo‘yicha har kuni qabul mavjud.'
      ).trim(),
    });
    res.json({ ok: true, contactInfo, state: centerStore.getSnapshot() });
  });

  app.post('/api/admin/clear-all', (_req, res) => {
    centerStore.clearDemoData();
    res.json({ ok: true, state: centerStore.getSnapshot() });
  });

  app.post('/api/admin/restore-defaults', (_req, res) => {
    centerStore.restoreDefaultData();
    res.json({ ok: true, state: centerStore.getSnapshot() });
  });

  app.get('/api/admin/backup', (_req, res) => {
    res.json(centerStore.exportBackup());
  });

  app.post('/api/admin/restore-backup', (req, res) => {
    const result = centerStore.importBackup(req.body);
    if (!result.ok) {
      res.status(400).json({ ok: false, error: result.error });
      return;
    }
    res.json({ ok: true, state: centerStore.getSnapshot() });
  });

  // =========================================================================
  // TEACHER & STUDENT OPERATIONS
  // =========================================================================
  app.post('/api/center/attendance', (req, res) => {
    const { studentId, status } = req.body as { studentId?: string; status?: AttendanceStatus };
    if (!studentId || !status) {
      res.status(400).json({ error: 'studentId va status majburiy.' });
      return;
    }
    const result = centerStore.markAttendance(studentId, status);
    if (!result) {
      res.status(404).json({ error: 'O‘quvchi topilmadi.' });
      return;
    }
    res.json({ ok: true, ...result, state: centerStore.getSnapshot() });
  });

  app.post('/api/center/homework', (req, res) => {
    const { groupId, title, description, deadline, rewardCoins } = req.body as {
      groupId?: string;
      title?: string;
      description?: string;
      deadline?: string;
      rewardCoins?: number;
    };
    if (!groupId || !title) {
      res.status(400).json({ error: 'Guruh va vazifa nomi kiritilishi shart.' });
      return;
    }
    const task = centerStore.createHomework(
      groupId,
      title.trim(),
      (description || 'Amaliy topshiriq').trim(),
      (deadline || '25-noyabr · 14:00').trim(),
      Number(rewardCoins) || 30
    );
    res.json({ ok: true, task, state: centerStore.getSnapshot() });
  });

  app.post('/api/center/grade', (req, res) => {
    const { submissionId, score, comment, bonusCoins } = req.body as {
      submissionId?: string;
      score?: number;
      comment?: string;
      bonusCoins?: number;
    };
    if (!submissionId || typeof score !== 'number') {
      res.status(400).json({ error: 'submissionId va ball kiritilishi shart.' });
      return;
    }
    const sub = centerStore.gradeSubmission(
      submissionId,
      score,
      (comment || 'Yaxshi ishlangan!').trim(),
      Number(bonusCoins) || 30
    );
    if (!sub) {
      res.status(404).json({ error: 'Topshiriq topilmadi.' });
      return;
    }
    res.json({ ok: true, submission: sub, state: centerStore.getSnapshot() });
  });

  app.post('/api/center/broadcast', async (req, res) => {
    const { groupName, text } = req.body as { groupName?: string; text?: string };
    if (!text?.trim()) {
      res.status(400).json({ error: 'E’lon matni bo‘sh bo‘lishi mumkin emas.' });
      return;
    }
    const note = centerStore.addBroadcast(groupName || 'Barcha guruhlar', text.trim());
    const liveSent = await liveTelegramBridge.broadcastToLiveChats(text.trim());
    res.json({ ok: true, note, liveSent, state: centerStore.getSnapshot() });
  });

  app.post('/api/center/registration/confirm', (req, res) => {
    const { regId } = req.body as { regId?: string };
    if (!regId) {
      res.status(400).json({ error: 'regId majburiy.' });
      return;
    }
    const reg = centerStore.confirmRegistration(regId);
    if (!reg) {
      res.status(404).json({ error: 'Ariza topilmadi.' });
      return;
    }
    res.json({ ok: true, registration: reg, state: centerStore.getSnapshot() });
  });

  app.delete('/api/admin/registration/:id', (req, res) => {
    centerStore.deleteRegistration(req.params.id);
    res.json({ ok: true, state: centerStore.getSnapshot() });
  });

  app.post('/api/center/redeem', (req, res) => {
    const { studentId, rewardId } = req.body as { studentId?: string; rewardId?: string };
    if (!studentId || !rewardId) {
      res.status(400).json({ error: 'studentId va rewardId majburiy.' });
      return;
    }
    const result = centerStore.redeemReward(studentId, rewardId);
    res.json({ ...result, state: centerStore.getSnapshot() });
  });

  app.post('/api/teacher/quiz', (req, res) => {
    const { groupId, title, topic, rewardCoins, questions } = req.body as {
      groupId?: string;
      title?: string;
      topic?: string;
      rewardCoins?: number;
      questions?: QuizQuestion[];
    };
    if (!groupId || !title?.trim() || !Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({ error: 'Guruh, test nomi va kamida 1 ta savol kiriting.' });
      return;
    }
    const quiz = centerStore.createOnlineQuiz({
      groupId,
      title: title.trim(),
      topic: (topic || title).trim(),
      rewardCoins: Number(rewardCoins) || 40,
      questions,
    });
    res.json({ ok: true, quiz, state: centerStore.getSnapshot() });
  });

  app.delete('/api/teacher/quiz/:id', (req, res) => {
    centerStore.deleteOnlineQuiz(req.params.id);
    res.json({ ok: true, state: centerStore.getSnapshot() });
  });

  app.post('/api/student/quiz/submit', (req, res) => {
    const { studentId, quizId, answers } = req.body as {
      studentId?: string;
      quizId?: string;
      answers?: number[];
    };
    if (!studentId || !quizId || !Array.isArray(answers)) {
      res.status(400).json({ error: 'studentId, quizId va javoblar kerak.' });
      return;
    }
    const result = centerStore.submitQuizAttempt(studentId, quizId, answers);
    if (!result) {
      res.status(404).json({ error: 'O‘quvchi yoki test topilmadi.' });
      return;
    }
    res.json({ ok: true, ...result, state: centerStore.getSnapshot() });
  });

  app.post('/api/student/homework/submit', (req, res) => {
    const { studentId, taskId, answerText } = req.body as {
      studentId?: string;
      taskId?: string;
      answerText?: string;
    };
    if (!studentId || !taskId || !answerText?.trim()) {
      res.status(400).json({ error: 'Javob matnini kiriting.' });
      return;
    }
    const submission = centerStore.submitHomework(studentId, taskId, answerText.trim());
    if (!submission) {
      res.status(404).json({ error: 'O‘quvchi yoki topshiriq topilmadi.' });
      return;
    }
    res.json({ ok: true, submission, state: centerStore.getSnapshot() });
  });

  app.post('/api/student/self-enroll', (req, res) => {
    const { fullName, phone, parentPhone, groupId } = req.body as {
      fullName?: string;
      phone?: string;
      parentPhone?: string;
      groupId?: string;
    };
    const targetGroupId = groupId || centerStore.groups[0]?.id;
    if (!fullName?.trim() || !targetGroupId) {
      res.status(400).json({ error: 'Ism va guruhni tanlang.' });
      return;
    }
    const student = centerStore.addStudent({
      fullName: fullName.trim(),
      phone: (phone || '+998 90 000 00 00').trim(),
      parentPhone: (parentPhone || '+998 90 000 00 01').trim(),
      groupId: targetGroupId,
      paymentStatus: 'paid',
      nextPaymentDate: '2026-12-05',
    });
    res.json({ ok: true, student, state: centerStore.getSnapshot() });
  });

  // =========================================================================
  // GEMINI AI ASSISTANT
  // =========================================================================
  app.post('/api/ai/structured-quiz', async (req, res) => {
    try {
      const { topic, groupName } = req.body as { topic?: string; groupName?: string };
      if (!topic?.trim()) {
        res.status(400).json({ error: 'Test mavzusini kiriting.' });
        return;
      }
      const questions = await generateStructuredQuiz(topic.trim(), groupName || 'Kelajak Markazi');
      res.json({ ok: true, questions });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI test tuzishda xatolik.';
      res.status(500).json({ ok: false, error: message });
    }
  });

  app.post('/api/ai/assistant', async (req, res) => {
    try {
      const { mode, prompt, groupName } = req.body as {
        mode?: 'advisor' | 'quiz';
        prompt?: string;
        groupName?: string;
      };
      if (!prompt?.trim()) {
        res.status(400).json({ error: 'Savol yoki mavzu kiriting.' });
        return;
      }
      const text =
        mode === 'quiz'
          ? await generateTeacherQuiz(prompt.trim(), groupName || 'Kelajak Markazi')
          : await askCourseAdvisor(prompt.trim(), centerStore.courses, 'student');
      res.json({ ok: true, text });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gemini AI xizmatida xatolik.';
      res.status(500).json({ ok: false, error: message });
    }
  });

  // =========================================================================
  // LIVE TELEGRAM BOT BRIDGE (Configured via TELEGRAM_BOT_TOKEN env var)
  // =========================================================================
  app.get('/api/telegram/discovered-chats', (_req, res) => {
    res.json({ ok: true, chats: liveTelegramBridge.getDiscoveredChats() });
  });

  const distPath = path.resolve(process.cwd(), 'dist');
  if (!isProduction || !fs.existsSync(distPath)) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath, { maxAge: '1h' }));
    app.use('/api', (_req, res) => {
      res.status(404).json({ ok: false, error: 'API endpoint topilmadi.' });
    });
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Kelajak Markazi Platform (${isProduction ? 'production' : 'development'}) running on http://0.0.0.0:${PORT}`
    );

    const envBotToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (envBotToken) {
      liveTelegramBridge
        .connect(envBotToken)
        .then((info) => {
          console.log(`Telegram bot auto-connected via TELEGRAM_BOT_TOKEN: @${info.username}`);
        })
        .catch((err) => {
          console.warn(
            'Telegram bot auto-connect skipped:',
            err instanceof Error ? err.message : err
          );
        });
    }
  });

  const shutdown = (signal: string) => {
    console.log(`Received ${signal}, closing HTTP server and Telegram polling...`);
    liveTelegramBridge.disconnect();
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 5000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
