import fs from 'fs';
import path from 'path';
import type {
  AttendanceStatus,
  CenterContactInfo,
  CenterStateSnapshot,
  CertificateRecord,
  Course,
  CourseCategory,
  HomeworkSubmission,
  HomeworkTask,
  OnlineQuiz,
  ParentNotification,
  PaymentMethod,
  PaymentRecord,
  QuizAttempt,
  QuizQuestion,
  RewardOrder,
  StoreReward,
  StudentRecord,
  StudyGroup,
  TeacherRecord,
  TelegramChatType,
  TelegramCommunity,
  TrialRegistration,
} from '../shared/types.ts';

function nowTimeStr(): string {
  return new Date().toLocaleTimeString('uz-UZ', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'kelajak-center.json');

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

interface PersistedData {
  courses: Course[];
  teachers: TeacherRecord[];
  groups: StudyGroup[];
  students: StudentRecord[];
  homeworkTasks: HomeworkTask[];
  submissions: HomeworkSubmission[];
  registrations: TrialRegistration[];
  notifications: ParentNotification[];
  rewards: StoreReward[];
  rewardOrders: RewardOrder[];
  payments: PaymentRecord[];
  quizzes: OnlineQuiz[];
  quizAttempts: QuizAttempt[];
  certificates: CertificateRecord[];
  telegramCommunities: TelegramCommunity[];
  contactInfo: CenterContactInfo;
}

function defaultContactInfo(): CenterContactInfo {
  return {
    phones: 'Telefon raqam Admin panelidan kiritiladi',
    workingHours: 'Dushanba – Shanba · 08:30 – 20:30',
    address: 'Andijon viloyati, Bo‘ston tumani, Kelajak Markazi',
    description:
      'Ro‘yxatdan o‘tish, daraja aniqlash testi va shartnomalar bo‘yicha har kuni qabul mavjud.',
  };
}

function createInitialData(): PersistedData {
  return {
    courses: [
      {
        id: 'math-dtm',
        title: 'Matematika (DTM va Prezident maktabi)',
        category: 'Aniq fanlar',
        durationMonths: 8,
        priceMonthly: "650 000 so'm",
        scheduleSummary: 'Du / Chor / Ju · 14:00',
        teacherName: 'Otabek Qosimov',
        seatsLeft: 5,
        description:
          'Maktab dasturi, mantiqiy masalalar, DTM test texnikasi va olimpiada tayyorgarligi.',
        modules: ['Algebra asoslari', 'Geometriya', 'Logarifm va Hosila', 'Haftalik DTM Mock'],
      },
      {
        id: 'ielts-pro',
        title: 'Ingliz tili & IELTS 7.5+',
        category: 'Xorijiy tillar',
        durationMonths: 6,
        priceMonthly: "720 000 so'm",
        scheduleSummary: 'Du / Chor / Ju · 10:00',
        teacherName: 'Madina Rustamova',
        seatsLeft: 4,
        description:
          'Beginner dan Advanced gacha, Speaking Club, akademik yozuv va to‘liq Mock IELTS.',
        modules: ['Grammar & Vocabulary', 'Speaking Fluency', 'Listening & Reading', 'IELTS Mock'],
      },
      {
        id: 'bio-chem',
        title: 'Biologiya va Kimyo (Tibbiyotga tayyorlov)',
        category: 'Tabiiy fanlar',
        durationMonths: 9,
        priceMonthly: "680 000 so'm",
        scheduleSummary: 'Se / Pay / Sha · 15:00',
        teacherName: 'Dilnoza Abdullayeva',
        seatsLeft: 6,
        description:
          'Tibbiyot oliygohlariga kirish uchun nazariy biologiya, kimyoviy masalalar va laboratoriya.',
        modules: ['Anorganik kimyo', 'Organik kimyo', 'Genetika va Anatomiya', 'Blok testlar'],
      },
      {
        id: 'korean-topik',
        title: 'Koreys tili & TOPIK II',
        category: 'Xorijiy tillar',
        durationMonths: 6,
        priceMonthly: "650 000 so'm",
        scheduleSummary: 'Se / Pay / Sha · 10:00',
        teacherName: 'Sevara Mahmudova',
        seatsLeft: 7,
        description:
          'Koreya universitetlariga grant yutish va TOPIK I–II sertifikati uchun intensiv kurs.',
        modules: ['Hangul va Talaffuz', 'Kundalik muloqot', 'TOPIK I tayyorlov', 'TOPIK II Essay'],
      },
      {
        id: 'frontend-pro',
        title: 'Dasturlash va Sun’iy Intellekt',
        category: 'Zamonaviy kasblar',
        durationMonths: 6,
        priceMonthly: "900 000 so'm",
        scheduleSummary: 'Se / Pay / Sha · 16:30',
        teacherName: 'Jasurbek Karimov',
        seatsLeft: 4,
        description:
          'Web dasturlash, Python, Telegram botlar yaratish va zamonaviy AI vositalari bilan ishlash.',
        modules: ['Web asoslari', 'TypeScript & React', 'Python & Botlar', 'Real loyiha portfeli'],
      },
      {
        id: 'mental-kids',
        title: 'Mental Arifmetika va Pochemuchka',
        category: 'Maktabgacha ta’lim',
        durationMonths: 5,
        priceMonthly: "520 000 so'm",
        scheduleSummary: 'Du / Chor / Ju · 16:00',
        teacherName: 'Gulnoza Toshmatova',
        seatsLeft: 8,
        description:
          '5–11 yoshli bolalar uchun tezkor hisoblash, xotirani rivojlantirish va maktabga tayyorlov.',
        modules: ['Abakus asoslari', 'Tezkor mental hisob', 'Mantiqiy o‘yinlar', 'Diqqat mashqlari'],
      },
    ],
    teachers: [
      {
        id: 't-1',
        fullName: 'Otabek Qosimov',
        subject: 'Matematika',
        phone: '+998 90 412 33 10',
        experienceYears: 7,
      },
      {
        id: 't-2',
        fullName: 'Madina Rustamova',
        subject: 'Ingliz tili & IELTS',
        phone: '+998 93 521 19 04',
        experienceYears: 6,
      },
      {
        id: 't-3',
        fullName: 'Dilnoza Abdullayeva',
        subject: 'Kimyo va Biologiya',
        phone: '+998 99 304 88 21',
        experienceYears: 8,
      },
      {
        id: 't-4',
        fullName: 'Jasurbek Karimov',
        subject: 'Dasturlash & AI',
        phone: '+998 97 710 45 12',
        experienceYears: 5,
      },
    ],
    groups: [
      {
        id: 'grp-math-01',
        name: 'Matematika DTM-01',
        courseId: 'math-dtm',
        teacherId: 't-1',
        teacherName: 'Otabek Qosimov',
        days: 'Du · Chor · Ju',
        time: '14:00 – 16:00',
        room: '102-xona',
      },
      {
        id: 'grp-ielts-04',
        name: 'IELTS Pro-04',
        courseId: 'ielts-pro',
        teacherId: 't-2',
        teacherName: 'Madina Rustamova',
        days: 'Du · Chor · Ju',
        time: '10:00 – 12:00',
        room: '105-xona',
      },
      {
        id: 'grp-med-02',
        name: 'Tibbiyot Kimyo-02',
        courseId: 'bio-chem',
        teacherId: 't-3',
        teacherName: 'Dilnoza Abdullayeva',
        days: 'Se · Pay · Sha',
        time: '15:00 – 17:00',
        room: '201-xona',
      },
      {
        id: 'grp-it-12',
        name: 'Dasturlash N12',
        courseId: 'frontend-pro',
        teacherId: 't-4',
        teacherName: 'Jasurbek Karimov',
        days: 'Se · Pay · Sha',
        time: '16:30 – 18:30',
        room: '204-xona',
      },
    ],
    students: [
      {
        id: 'st-1',
        fullName: 'Azizbek Rahimov',
        phone: '+998 90 214 11 08',
        parentPhone: '+998 90 214 00 01',
        groupId: 'grp-math-01',
        coins: 340,
        streakDays: 12,
        attendanceRate: 95,
        todayStatus: 'present',
        paymentStatus: 'paid',
        nextPaymentDate: '2026-12-05',
      },
      {
        id: 'st-2',
        fullName: 'Mohinur Islomova',
        phone: '+998 93 441 22 10',
        parentPhone: '+998 93 441 00 02',
        groupId: 'grp-math-01',
        coins: 410,
        streakDays: 16,
        attendanceRate: 98,
        todayStatus: 'present',
        paymentStatus: 'paid',
        nextPaymentDate: '2026-12-08',
      },
      {
        id: 'st-3',
        fullName: 'Bekzod Sobirov',
        phone: '+998 99 778 19 20',
        parentPhone: '+998 99 778 00 11',
        groupId: 'grp-ielts-04',
        coins: 290,
        streakDays: 8,
        attendanceRate: 89,
        todayStatus: 'late',
        paymentStatus: 'due_soon',
        nextPaymentDate: '2026-11-23',
      },
      {
        id: 'st-4',
        fullName: 'Malika Ergasheva',
        phone: '+998 91 552 83 41',
        parentPhone: '+998 91 552 00 41',
        groupId: 'grp-med-02',
        coins: 460,
        streakDays: 19,
        attendanceRate: 100,
        todayStatus: 'present',
        paymentStatus: 'paid',
        nextPaymentDate: '2026-12-10',
      },
      {
        id: 'st-5',
        fullName: 'Dostonbek Aliyev',
        phone: '+998 97 312 64 09',
        parentPhone: '+998 97 312 00 09',
        groupId: 'grp-it-12',
        coins: 315,
        streakDays: 10,
        attendanceRate: 92,
        todayStatus: 'present',
        paymentStatus: 'paid',
        nextPaymentDate: '2026-12-01',
      },
    ],
    homeworkTasks: [
      {
        id: 'hw-1',
        groupId: 'grp-math-01',
        title: 'Trigonometrik tenglamalar (30 ta masala)',
        description: 'DTM 2025 to‘plamidan 14-mavzu masalalarini daftarga yechib rasm yuklang.',
        deadline: '22-noyabr · 14:00',
        rewardCoins: 30,
        createdAt: 'Bugun 09:00',
      },
      {
        id: 'hw-2',
        groupId: 'grp-ielts-04',
        title: 'Writing Task 2: Education & Society',
        description: '250+ so‘zlik opinion essay yozing va kirish qismida thesis aniq bo‘lsin.',
        deadline: '23-noyabr · 10:00',
        rewardCoins: 35,
        createdAt: 'Kecha 16:40',
      },
      {
        id: 'hw-3',
        groupId: 'grp-med-02',
        title: 'Organik birikmalar izomeriyasi',
        description: 'Alkanlar va alkenlar bo‘yicha 20 ta reaksiya tenglamasini tuzing.',
        deadline: '24-noyabr · 15:00',
        rewardCoins: 30,
        createdAt: 'Kecha 14:15',
      },
    ],
    submissions: [
      {
        id: 'sub-1',
        taskId: 'hw-1',
        taskTitle: 'Trigonometrik tenglamalar (30 ta masala)',
        studentId: 'st-1',
        studentName: 'Azizbek Rahimov',
        groupId: 'grp-math-01',
        answerText: '1–30 misollarning barchasi yechildi, 24-masalada ikkinchi ildiz ham tekshirildi.',
        submittedAt: '11:15',
        status: 'pending',
      },
      {
        id: 'sub-2',
        taskId: 'hw-2',
        taskTitle: 'Writing Task 2: Education & Society',
        studentId: 'st-3',
        studentName: 'Bekzod Sobirov',
        groupId: 'grp-ielts-04',
        answerText: '278 words essay submitted with clear topic sentences and C1 collocations.',
        submittedAt: '10:30',
        status: 'pending',
      },
    ],
    registrations: [
      {
        id: 'reg-1',
        fullName: 'Kamola Tursunova',
        phone: '+998 90 612 48 11',
        courseTitle: 'Ingliz tili & IELTS 7.5+',
        preferredTime: 'Ertalabki (10:00)',
        source: 'web',
        createdAt: 'Bugun 10:15',
        status: 'new',
      },
      {
        id: 'reg-2',
        fullName: 'Sardorbek Olimov',
        phone: '+998 94 309 71 22',
        courseTitle: 'Matematika (DTM va Prezident maktabi)',
        preferredTime: 'Tushdan keyin (14:00)',
        source: 'web',
        createdAt: 'Bugun 11:30',
        status: 'confirmed',
      },
    ],
    notifications: [
      {
        id: 'not-1',
        studentName: 'Bekzod Sobirov',
        parentPhone: '+998 99 778 00 11',
        message: 'Farzandingiz Bekzod IELTS Pro-04 darsiga 10 daqiqa kechikib keldi.',
        type: 'attendance',
        createdAt: '10:10',
      },
    ],
    rewards: [
      {
        id: 'rew-1',
        title: 'Kelajak Markazi brendlangan termokrujka',
        costCoins: 350,
        stock: 10,
        description: 'Zanglamaydigan po‘latdan zamonaviy termokrujka.',
      },
      {
        id: 'rew-2',
        title: 'Keyingi oy to‘loviga 15% chegirma kuponi',
        costCoins: 500,
        stock: 15,
        description: 'Markazdagi istalgan fan kursi uchun amal qiladi.',
      },
      {
        id: 'rew-3',
        title: 'Ustoz bilan 45 daqiqa individual dars',
        costCoins: 250,
        stock: 12,
        description: 'Murakkab mavzular yoki Mock imtihon tahlili.',
      },
    ],
    rewardOrders: [
      {
        id: 'ord-1',
        rewardId: 'rew-3',
        rewardTitle: 'Ustoz bilan 45 daqiqa individual dars',
        studentId: 'st-2',
        studentName: 'Mohinur Islomova',
        costCoins: 250,
        voucherCode: 'KM-4821',
        status: 'issued',
        createdAt: 'Kecha 15:20',
      },
    ],
    payments: [
      {
        id: 'pay-1',
        studentId: 'st-1',
        studentName: 'Azizbek Rahimov',
        groupName: 'Matematika DTM-01',
        amountUzs: 650000,
        method: 'Payme',
        monthLabel: 'Noyabr 2026',
        paidAt: '2026-11-05',
        note: 'Oylik to‘lov o‘z vaqtida qabul qilindi',
      },
      {
        id: 'pay-2',
        studentId: 'st-2',
        studentName: 'Mohinur Islomova',
        groupName: 'Matematika DTM-01',
        amountUzs: 650000,
        method: 'Click',
        monthLabel: 'Noyabr 2026',
        paidAt: '2026-11-07',
      },
      {
        id: 'pay-3',
        studentId: 'st-4',
        studentName: 'Malika Ergasheva',
        groupName: 'Tibbiyot Kimyo-02',
        amountUzs: 680000,
        method: 'Naqd',
        monthLabel: 'Noyabr 2026',
        paidAt: '2026-11-09',
      },
      {
        id: 'pay-4',
        studentId: 'st-5',
        studentName: 'Dostonbek Aliyev',
        groupName: 'Dasturlash N12',
        amountUzs: 900000,
        method: 'Karta',
        monthLabel: 'Noyabr 2026',
        paidAt: '2026-11-10',
      },
    ],
    quizzes: [
      {
        id: 'quiz-1',
        groupId: 'grp-math-01',
        groupName: 'Matematika DTM-01',
        title: 'Logarifm va Kvadrat Tenglamalar (Haftalik Mock)',
        topic: 'Algebra va Logarifm',
        rewardCoins: 40,
        createdAt: 'Bugun 09:30',
        questions: [
          {
            id: 'qq-1',
            prompt: 'log₂(32) ning qiymati nechaga teng?',
            options: ['3', '4', '5', '6'],
            correctIndex: 2,
          },
          {
            id: 'qq-2',
            prompt: 'x² - 7x + 12 = 0 tenglamaning ildizlari yig‘indisini toping.',
            options: ['5', '7', '-7', '12'],
            correctIndex: 1,
          },
          {
            id: 'qq-3',
            prompt: 'Agar a + b = 10 va a·b = 21 bo‘lsa, a² + b² nimaga teng?',
            options: ['58', '79', '100', '42'],
            correctIndex: 0,
          },
        ],
      },
      {
        id: 'quiz-2',
        groupId: 'grp-ielts-04',
        groupName: 'IELTS Pro-04',
        title: 'IELTS Academic Vocabulary & Grammar Check',
        topic: 'C1 Collocations & Conditionals',
        rewardCoins: 40,
        createdAt: 'Kecha 18:00',
        questions: [
          {
            id: 'qq-4',
            prompt: 'Choose the best Academic synonym for "ubiquitous":',
            options: ['Rare', 'Omnipresent', 'Temporary', 'Uncertain'],
            correctIndex: 1,
          },
          {
            id: 'qq-5',
            prompt: 'Had I known about the deadline, I ___ the essay earlier.',
            options: ['will submit', 'submitted', 'would have submitted', 'submit'],
            correctIndex: 2,
          },
        ],
      },
    ],
    quizAttempts: [
      {
        id: 'qa-1',
        quizId: 'quiz-1',
        quizTitle: 'Logarifm va Kvadrat Tenglamalar (Haftalik Mock)',
        studentId: 'st-2',
        studentName: 'Mohinur Islomova',
        groupId: 'grp-math-01',
        correctCount: 3,
        totalCount: 3,
        scorePercent: 100,
        coinsEarned: 40,
        completedAt: 'Bugun 10:45',
      },
    ],
    certificates: [
      {
        id: 'cert-1',
        certCode: 'KM-2026-1042',
        studentId: 'st-2',
        studentName: 'Mohinur Islomova',
        courseTitle: 'Matematika (DTM va Prezident maktabi)',
        teacherName: 'Otabek Qosimov',
        gradeLabel: 'A’lo · 98% natija',
        issueDate: '2026-11-12',
      },
      {
        id: 'cert-2',
        certCode: 'KM-2026-1043',
        studentId: 'st-4',
        studentName: 'Malika Ergasheva',
        courseTitle: 'Biologiya va Kimyo (Tibbiyotga tayyorlov)',
        teacherName: 'Dilnoza Abdullayeva',
        gradeLabel: 'Imtiyozli · 100%',
        issueDate: '2026-11-15',
      },
    ],
    telegramCommunities: [],
    contactInfo: defaultContactInfo(),
  };
}

class CenterStore {
  courses: Course[] = [];
  teachers: TeacherRecord[] = [];
  groups: StudyGroup[] = [];
  students: StudentRecord[] = [];
  homeworkTasks: HomeworkTask[] = [];
  submissions: HomeworkSubmission[] = [];
  registrations: TrialRegistration[] = [];
  notifications: ParentNotification[] = [];
  rewards: StoreReward[] = [];
  rewardOrders: RewardOrder[] = [];
  payments: PaymentRecord[] = [];
  quizzes: OnlineQuiz[] = [];
  quizAttempts: QuizAttempt[] = [];
  certificates: CertificateRecord[] = [];
  telegramCommunities: TelegramCommunity[] = [];
  contactInfo: CenterContactInfo = defaultContactInfo();

  telegramStatus = {
    connected: false,
    botUsername: null as string | null,
    botName: null as string | null,
    activeChatsCount: 0,
    lastError: null as string | null,
  };

  private localSessionIds = new Set<string>();

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<PersistedData>;
        const defaults = createInitialData();
        this.courses = parsed.courses ?? defaults.courses;
        this.teachers = parsed.teachers ?? defaults.teachers;
        this.groups = parsed.groups ?? defaults.groups;
        this.students = parsed.students ?? defaults.students;
        this.homeworkTasks = parsed.homeworkTasks ?? defaults.homeworkTasks;
        this.submissions = parsed.submissions ?? defaults.submissions;
        this.registrations = parsed.registrations ?? defaults.registrations;
        this.notifications = parsed.notifications ?? defaults.notifications;
        this.rewards = parsed.rewards ?? defaults.rewards;
        this.rewardOrders = parsed.rewardOrders ?? defaults.rewardOrders;
        this.payments = parsed.payments ?? defaults.payments;
        this.quizzes = parsed.quizzes ?? defaults.quizzes;
        this.quizAttempts = parsed.quizAttempts ?? defaults.quizAttempts;
        this.certificates = parsed.certificates ?? defaults.certificates;
        this.telegramCommunities = parsed.telegramCommunities ?? defaults.telegramCommunities;
        this.contactInfo = parsed.contactInfo
          ? { ...defaults.contactInfo, ...parsed.contactInfo }
          : defaults.contactInfo;
        return;
      }
    } catch {
      // Fallback to initial data if disk read fails
    }
    const defaults = createInitialData();
    Object.assign(this, defaults);
    this.saveToDisk();
  }

  private saveToDisk(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const payload: PersistedData = {
        courses: this.courses,
        teachers: this.teachers,
        groups: this.groups,
        students: this.students,
        homeworkTasks: this.homeworkTasks,
        submissions: this.submissions,
        registrations: this.registrations,
        notifications: this.notifications,
        rewards: this.rewards,
        rewardOrders: this.rewardOrders,
        payments: this.payments,
        quizzes: this.quizzes,
        quizAttempts: this.quizAttempts,
        certificates: this.certificates,
        telegramCommunities: this.telegramCommunities,
        contactInfo: this.contactInfo,
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch {
      // Ignore disk write errors in read-only environments
    }
  }

  getSnapshot(): CenterStateSnapshot {
    return {
      courses: this.courses,
      teachers: this.teachers,
      groups: this.groups,
      students: this.students,
      homeworkTasks: this.homeworkTasks,
      submissions: this.submissions,
      registrations: this.registrations,
      notifications: this.notifications,
      rewards: this.rewards,
      rewardOrders: this.rewardOrders,
      payments: this.payments,
      quizzes: this.quizzes,
      quizAttempts: this.quizAttempts,
      certificates: this.certificates,
      telegramCommunities: this.telegramCommunities,
      contactInfo: { ...this.contactInfo },
      telegramStatus: { ...this.telegramStatus },
    };
  }

  private mergeWithLocal<T extends { id: string }>(
    current: T[],
    incoming: T[]
  ): { merged: T[]; keptLocal: boolean } {
    const incomingIds = new Set(incoming.map((item) => item.id));
    const localUnsynced = current.filter(
      (item) => this.localSessionIds.has(item.id) && !incomingIds.has(item.id)
    );
    return {
      merged: [...localUnsynced, ...incoming],
      keptLocal: localUnsynced.length > 0,
    };
  }

  hydrateFromCloud(partial: Partial<PersistedData>): boolean {
    let needsResync = false;
    if (Array.isArray(partial.courses)) this.courses = partial.courses;
    if (Array.isArray(partial.groups)) this.groups = partial.groups;
    if (Array.isArray(partial.rewards)) this.rewards = partial.rewards;
    if (Array.isArray(partial.telegramCommunities)) {
      this.telegramCommunities = partial.telegramCommunities;
    }
    if (partial.contactInfo && typeof partial.contactInfo === 'object') {
      this.contactInfo = {
        phones: String(partial.contactInfo.phones ?? this.contactInfo.phones).slice(0, 160),
        workingHours: String(partial.contactInfo.workingHours ?? this.contactInfo.workingHours).slice(0, 160),
        address: String(partial.contactInfo.address ?? this.contactInfo.address).slice(0, 240),
        description: String(partial.contactInfo.description ?? this.contactInfo.description).slice(0, 400),
      };
    }
    if (Array.isArray(partial.quizzes)) this.quizzes = partial.quizzes;
    if (Array.isArray(partial.certificates)) this.certificates = partial.certificates;
    if (Array.isArray(partial.teachers)) this.teachers = partial.teachers;

    if (Array.isArray(partial.students)) {
      const res = this.mergeWithLocal(this.students, partial.students);
      this.students = res.merged;
      if (res.keptLocal) needsResync = true;
    }
    if (Array.isArray(partial.homeworkTasks)) this.homeworkTasks = partial.homeworkTasks;
    if (Array.isArray(partial.submissions)) {
      const res = this.mergeWithLocal(this.submissions, partial.submissions);
      this.submissions = res.merged;
      if (res.keptLocal) needsResync = true;
    }
    if (Array.isArray(partial.registrations)) {
      const res = this.mergeWithLocal(this.registrations, partial.registrations);
      this.registrations = res.merged;
      if (res.keptLocal) needsResync = true;
    }
    if (Array.isArray(partial.notifications)) {
      const res = this.mergeWithLocal(this.notifications, partial.notifications);
      this.notifications = res.merged;
      if (res.keptLocal) needsResync = true;
    }
    if (Array.isArray(partial.payments)) this.payments = partial.payments;
    if (Array.isArray(partial.quizAttempts)) {
      const res = this.mergeWithLocal(this.quizAttempts, partial.quizAttempts);
      this.quizAttempts = res.merged;
      if (res.keptLocal) needsResync = true;
    }
    if (Array.isArray(partial.rewardOrders)) {
      const res = this.mergeWithLocal(this.rewardOrders, partial.rewardOrders);
      this.rewardOrders = res.merged;
      if (res.keptLocal) needsResync = true;
    }

    this.saveToDisk();
    return needsResync;
  }

  // =========================================================================
  // ADMIN CRUD OPERATIONS
  // =========================================================================
  addCourse(input: {
    title: string;
    category: CourseCategory;
    durationMonths: number;
    priceMonthly: string;
    scheduleSummary: string;
    teacherName: string;
    seatsLeft: number;
    description: string;
    modules: string[];
  }): Course {
    const course: Course = {
      id: `course-${Date.now()}`,
      ...input,
    };
    this.courses.unshift(course);
    this.saveToDisk();
    return course;
  }

  deleteCourse(courseId: string): boolean {
    const before = this.courses.length;
    this.courses = this.courses.filter((c) => c.id !== courseId);
    this.saveToDisk();
    return this.courses.length < before;
  }

  addTeacher(input: {
    fullName: string;
    subject: string;
    phone: string;
    experienceYears: number;
  }): TeacherRecord {
    const teacher: TeacherRecord = {
      id: `t-${Date.now()}`,
      ...input,
    };
    this.teachers.unshift(teacher);
    this.saveToDisk();
    return teacher;
  }

  deleteTeacher(teacherId: string): boolean {
    const before = this.teachers.length;
    this.teachers = this.teachers.filter((t) => t.id !== teacherId);
    this.saveToDisk();
    return this.teachers.length < before;
  }

  addGroup(input: {
    name: string;
    courseId: string;
    teacherId: string;
    days: string;
    time: string;
    room: string;
  }): StudyGroup {
    const teacher = this.teachers.find((t) => t.id === input.teacherId);
    const group: StudyGroup = {
      id: `grp-${Date.now()}`,
      name: input.name,
      courseId: input.courseId,
      teacherId: input.teacherId,
      teacherName: teacher ? teacher.fullName : 'Ustoz biriktirilmagan',
      days: input.days,
      time: input.time,
      room: input.room,
    };
    this.groups.unshift(group);
    this.saveToDisk();
    return group;
  }

  deleteGroup(groupId: string): boolean {
    const before = this.groups.length;
    this.groups = this.groups.filter((g) => g.id !== groupId);
    this.saveToDisk();
    return this.groups.length < before;
  }

  addStudent(input: {
    fullName: string;
    phone: string;
    parentPhone: string;
    groupId: string;
    paymentStatus: 'paid' | 'due_soon';
    nextPaymentDate: string;
  }): StudentRecord {
    const student: StudentRecord = {
      id: nextId('st'),
      fullName: input.fullName,
      phone: input.phone,
      parentPhone: input.parentPhone,
      groupId: input.groupId,
      coins: 50,
      streakDays: 1,
      attendanceRate: 100,
      todayStatus: 'present',
      paymentStatus: input.paymentStatus,
      nextPaymentDate: input.nextPaymentDate,
    };
    this.localSessionIds.add(student.id);
    this.students.unshift(student);
    this.saveToDisk();
    return student;
  }

  toggleStudentPayment(studentId: string): StudentRecord | null {
    const st = this.students.find((s) => s.id === studentId);
    if (!st) return null;
    st.paymentStatus = st.paymentStatus === 'paid' ? 'due_soon' : 'paid';
    this.saveToDisk();
    return st;
  }

  deleteStudent(studentId: string): boolean {
    const before = this.students.length;
    this.students = this.students.filter((s) => s.id !== studentId);
    this.saveToDisk();
    return this.students.length < before;
  }

  addReward(input: {
    title: string;
    costCoins: number;
    stock: number;
    description: string;
  }): StoreReward {
    const reward: StoreReward = {
      id: `rew-${Date.now()}`,
      ...input,
    };
    this.rewards.unshift(reward);
    this.saveToDisk();
    return reward;
  }

  deleteReward(rewardId: string): boolean {
    const before = this.rewards.length;
    this.rewards = this.rewards.filter((r) => r.id !== rewardId);
    this.saveToDisk();
    return this.rewards.length < before;
  }

  issueRewardOrder(orderId: string): RewardOrder | null {
    const order = this.rewardOrders.find((o) => o.id === orderId);
    if (!order) return null;
    order.status = 'issued';
    this.saveToDisk();
    return order;
  }

  // =========================================================================
  // FINANCE / PAYMENTS OPERATIONS
  // =========================================================================
  recordPayment(input: {
    studentId: string;
    amountUzs: number;
    method: PaymentMethod;
    monthLabel: string;
    note?: string;
  }): PaymentRecord | null {
    const student = this.students.find((s) => s.id === input.studentId);
    if (!student) return null;
    const group = this.groups.find((g) => g.id === student.groupId);
    const payment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      studentId: student.id,
      studentName: student.fullName,
      groupName: group ? group.name : 'Guruhsiz',
      amountUzs: Math.max(0, Number(input.amountUzs) || 0),
      method: input.method,
      monthLabel: input.monthLabel,
      paidAt: todayDateStr(),
      note: input.note?.trim() || undefined,
    };
    this.payments.unshift(payment);
    student.paymentStatus = 'paid';
    this.notifications.unshift({
      id: `not-${Date.now()}`,
      studentName: student.fullName,
      parentPhone: student.parentPhone,
      message: `${student.fullName} uchun ${input.monthLabel} to‘lovi (${payment.amountUzs.toLocaleString('ru-RU')} so‘m · ${input.method}) qabul qilindi.`,
      type: 'payment',
      createdAt: nowTimeStr(),
    });
    this.saveToDisk();
    return payment;
  }

  sendPaymentReminder(studentId: string): { student: StudentRecord; notification: ParentNotification } | null {
    const student = this.students.find((s) => s.id === studentId);
    if (!student) return null;
    const group = this.groups.find((g) => g.id === student.groupId);
    const notification: ParentNotification = {
      id: `not-${Date.now()}`,
      studentName: student.fullName,
      parentPhone: student.parentPhone,
      message: `Hurmatli ota-ona, ${student.fullName} (${group?.name ?? 'Kelajak Markazi'}) uchun oylik to‘lov muddati (${student.nextPaymentDate}) yaqinlashdi.`,
      type: 'payment',
      createdAt: nowTimeStr(),
    };
    this.notifications.unshift(notification);
    this.saveToDisk();
    return { student, notification };
  }

  // =========================================================================
  // ONLINE QUIZZES & CERTIFICATES
  // =========================================================================
  createOnlineQuiz(input: {
    groupId: string;
    title: string;
    topic: string;
    rewardCoins: number;
    questions: QuizQuestion[];
  }): OnlineQuiz {
    const group = this.groups.find((g) => g.id === input.groupId);
    const quiz: OnlineQuiz = {
      id: `quiz-${Date.now()}`,
      groupId: input.groupId,
      groupName: group ? group.name : 'Guruh',
      title: input.title,
      topic: input.topic,
      rewardCoins: input.rewardCoins,
      createdAt: `Bugun ${nowTimeStr()}`,
      questions: input.questions,
    };
    this.quizzes.unshift(quiz);
    this.notifications.unshift({
      id: `not-${Date.now() + 2}`,
      studentName: quiz.groupName,
      parentPhone: 'Guruh e’loni',
      message: `Yangi onlayn test joylandi: "${quiz.title}" (+${quiz.rewardCoins} Kelajak Coin).`,
      type: 'announcement',
      createdAt: nowTimeStr(),
    });
    this.saveToDisk();
    return quiz;
  }

  deleteOnlineQuiz(quizId: string): boolean {
    const before = this.quizzes.length;
    this.quizzes = this.quizzes.filter((q) => q.id !== quizId);
    this.saveToDisk();
    return this.quizzes.length < before;
  }

  submitQuizAttempt(
    studentId: string,
    quizId: string,
    answers: number[]
  ): { attempt: QuizAttempt; student: StudentRecord } | null {
    const student = this.students.find((s) => s.id === studentId);
    const quiz = this.quizzes.find((q) => q.id === quizId);
    if (!student || !quiz || quiz.questions.length === 0) return null;

    const alreadyTaken = this.quizAttempts.some(
      (a) => a.studentId === studentId && a.quizId === quizId
    );
    let correctCount = 0;
    quiz.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctIndex) correctCount += 1;
    });
    const totalCount = quiz.questions.length;
    const scorePercent = Math.round((correctCount / totalCount) * 100);
    const coinsEarned = alreadyTaken
      ? 0
      : scorePercent >= 80
      ? quiz.rewardCoins
      : scorePercent >= 50
      ? Math.round(quiz.rewardCoins * 0.6)
      : 10;

    student.coins += coinsEarned;

    const attempt: QuizAttempt = {
      id: nextId('qa'),
      quizId: quiz.id,
      quizTitle: quiz.title,
      studentId: student.id,
      studentName: student.fullName,
      groupId: quiz.groupId,
      correctCount,
      totalCount,
      scorePercent,
      coinsEarned,
      completedAt: `Bugun ${nowTimeStr()}`,
    };
    this.localSessionIds.add(attempt.id);
    this.quizAttempts.unshift(attempt);
    const notId = nextId('not');
    this.localSessionIds.add(notId);
    this.notifications.unshift({
      id: notId,
      studentName: student.fullName,
      parentPhone: student.parentPhone,
      message: `${student.fullName} "${quiz.title}" onlayn testidan ${scorePercent}% (${correctCount}/${totalCount}) natija${coinsEarned > 0 ? ` bilan +${coinsEarned} coin` : ''} oldi.`,
      type: 'grade',
      createdAt: nowTimeStr(),
    });
    this.saveToDisk();
    return { attempt, student };
  }

  issueCertificate(input: {
    studentId: string;
    courseTitle: string;
    teacherName: string;
    gradeLabel: string;
  }): CertificateRecord | null {
    const student = this.students.find((s) => s.id === input.studentId);
    if (!student) return null;
    const cert: CertificateRecord = {
      id: `cert-${Date.now()}`,
      certCode: `KM-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      studentId: student.id,
      studentName: student.fullName,
      courseTitle: input.courseTitle,
      teacherName: input.teacherName,
      gradeLabel: input.gradeLabel,
      issueDate: todayDateStr(),
    };
    this.certificates.unshift(cert);
    this.saveToDisk();
    return cert;
  }

  deleteCertificate(certId: string): boolean {
    const before = this.certificates.length;
    this.certificates = this.certificates.filter((c) => c.id !== certId);
    this.saveToDisk();
    return this.certificates.length < before;
  }

  addTelegramCommunity(input: {
    title: string;
    type: TelegramChatType;
    chatIdOrUsername: string;
    inviteLink?: string;
    linkedGroupId?: string;
  }): TelegramCommunity {
    const community: TelegramCommunity = {
      id: `tg-${Date.now()}`,
      title: input.title,
      type: input.type,
      chatIdOrUsername: input.chatIdOrUsername,
      inviteLink: input.inviteLink?.trim() || undefined,
      linkedGroupId: input.linkedGroupId?.trim() || undefined,
      createdAt: `Bugun ${nowTimeStr()}`,
    };
    this.telegramCommunities.unshift(community);
    this.saveToDisk();
    return community;
  }

  deleteTelegramCommunity(communityId: string): boolean {
    const before = this.telegramCommunities.length;
    this.telegramCommunities = this.telegramCommunities.filter((c) => c.id !== communityId);
    this.saveToDisk();
    return this.telegramCommunities.length < before;
  }

  updateContactInfo(input: Partial<CenterContactInfo>): CenterContactInfo {
    this.contactInfo = {
      phones: (input.phones ?? this.contactInfo.phones).trim().slice(0, 160),
      workingHours: (input.workingHours ?? this.contactInfo.workingHours).trim().slice(0, 160),
      address: (input.address ?? this.contactInfo.address).trim().slice(0, 240),
      description: (input.description ?? this.contactInfo.description).trim().slice(0, 400),
    };
    this.saveToDisk();
    return { ...this.contactInfo };
  }

  clearDemoData(): void {
    this.localSessionIds.clear();
    this.courses = [];
    this.teachers = [];
    this.groups = [];
    this.students = [];
    this.homeworkTasks = [];
    this.submissions = [];
    this.registrations = [];
    this.notifications = [];
    this.rewards = [];
    this.rewardOrders = [];
    this.payments = [];
    this.quizzes = [];
    this.quizAttempts = [];
    this.certificates = [];
    this.telegramCommunities = [];
    this.saveToDisk();
  }

  restoreDefaultData(): void {
    this.localSessionIds.clear();
    const defaults = createInitialData();
    Object.assign(this, defaults);
    this.saveToDisk();
  }

  exportBackup(): {
    format: 'kelajak-markazi-backup-v1';
    exportedAt: string;
    data: PersistedData;
  } {
    return {
      format: 'kelajak-markazi-backup-v1',
      exportedAt: new Date().toISOString(),
      data: {
        courses: this.courses,
        teachers: this.teachers,
        groups: this.groups,
        students: this.students,
        homeworkTasks: this.homeworkTasks,
        submissions: this.submissions,
        registrations: this.registrations,
        notifications: this.notifications,
        rewards: this.rewards,
        rewardOrders: this.rewardOrders,
        payments: this.payments,
        quizzes: this.quizzes,
        quizAttempts: this.quizAttempts,
        certificates: this.certificates,
        telegramCommunities: this.telegramCommunities,
        contactInfo: { ...this.contactInfo },
      },
    };
  }

  importBackup(payload: unknown): { ok: boolean; error?: string } {
    if (!payload || typeof payload !== 'object') {
      return { ok: false, error: 'Noto‘g‘ri zaxira fayl formati.' };
    }
    const raw = payload as Record<string, unknown>;
    const source =
      raw.data && typeof raw.data === 'object' ? (raw.data as Record<string, unknown>) : raw;

    const recognizedArrayKeys = [
      'courses',
      'teachers',
      'groups',
      'students',
      'homeworkTasks',
      'submissions',
      'registrations',
      'notifications',
      'rewards',
      'rewardOrders',
      'payments',
      'quizzes',
      'quizAttempts',
      'certificates',
      'telegramCommunities',
    ] as const;

    const hasRecognized =
      recognizedArrayKeys.some((k) => Array.isArray(source[k])) ||
      (source.contactInfo && typeof source.contactInfo === 'object');

    if (!hasRecognized) {
      return {
        ok: false,
        error: 'Bu JSON faylda Kelajak Markazi ma’lumotlari topilmadi.',
      };
    }

    this.localSessionIds.clear();

    if (Array.isArray(source.courses)) this.courses = (source.courses as Course[]).slice(0, 100);
    if (Array.isArray(source.teachers)) this.teachers = (source.teachers as TeacherRecord[]).slice(0, 100);
    if (Array.isArray(source.groups)) this.groups = (source.groups as StudyGroup[]).slice(0, 150);
    if (Array.isArray(source.students)) this.students = (source.students as StudentRecord[]).slice(0, 400);
    if (Array.isArray(source.homeworkTasks))
      this.homeworkTasks = (source.homeworkTasks as HomeworkTask[]).slice(0, 200);
    if (Array.isArray(source.submissions))
      this.submissions = (source.submissions as HomeworkSubmission[]).slice(0, 300);
    if (Array.isArray(source.registrations))
      this.registrations = (source.registrations as TrialRegistration[]).slice(0, 300);
    if (Array.isArray(source.notifications))
      this.notifications = (source.notifications as ParentNotification[]).slice(0, 100);
    if (Array.isArray(source.rewards)) this.rewards = (source.rewards as StoreReward[]).slice(0, 100);
    if (Array.isArray(source.rewardOrders))
      this.rewardOrders = (source.rewardOrders as RewardOrder[]).slice(0, 300);
    if (Array.isArray(source.payments)) this.payments = (source.payments as PaymentRecord[]).slice(0, 400);
    if (Array.isArray(source.quizzes)) this.quizzes = (source.quizzes as OnlineQuiz[]).slice(0, 100);
    if (Array.isArray(source.quizAttempts))
      this.quizAttempts = (source.quizAttempts as QuizAttempt[]).slice(0, 400);
    if (Array.isArray(source.certificates))
      this.certificates = (source.certificates as CertificateRecord[]).slice(0, 300);
    if (Array.isArray(source.telegramCommunities))
      this.telegramCommunities = (source.telegramCommunities as TelegramCommunity[]).slice(0, 60);

    if (source.contactInfo && typeof source.contactInfo === 'object') {
      const ci = source.contactInfo as Record<string, unknown>;
      const defaults = defaultContactInfo();
      this.contactInfo = {
        phones: String(ci.phones ?? defaults.phones).trim().slice(0, 160),
        workingHours: String(ci.workingHours ?? defaults.workingHours).trim().slice(0, 160),
        address: String(ci.address ?? defaults.address).trim().slice(0, 240),
        description: String(ci.description ?? defaults.description).trim().slice(0, 400),
      };
    }

    this.saveToDisk();
    return { ok: true };
  }

  // =========================================================================
  // TEACHER & STUDENT OPERATIONS
  // =========================================================================
  markAttendance(
    studentId: string,
    status: AttendanceStatus
  ): { student: StudentRecord; notification: ParentNotification } | null {
    const student = this.students.find((s) => s.id === studentId);
    if (!student) return null;

    const prevStatus = student.todayStatus;
    student.todayStatus = status;

    if (status === 'present' && prevStatus !== 'present') {
      student.coins += 10;
      student.attendanceRate = Math.min(100, student.attendanceRate + 1);
    } else if (status === 'absent') {
      student.attendanceRate = Math.max(50, student.attendanceRate - 2);
    }

    const group = this.groups.find((g) => g.id === student.groupId);
    const groupLabel = group ? group.name : 'guruh';

    const statusText =
      status === 'present'
        ? `darsga o‘z vaqtida keldi (+10 Kelajak Coin).`
        : status === 'late'
        ? `darsga biroz kechikib keldi.`
        : `bugungi ${groupLabel} darsiga qatnashmadi.`;

    const notification: ParentNotification = {
      id: `not-${Date.now()}`,
      studentName: student.fullName,
      parentPhone: student.parentPhone,
      message: `Hurmatli ota-ona, ${student.fullName} bugun (${groupLabel}) ${statusText}`,
      type: 'attendance',
      createdAt: nowTimeStr(),
    };

    this.notifications.unshift(notification);
    if (this.notifications.length > 30) this.notifications.pop();
    this.saveToDisk();

    return { student, notification };
  }

  createHomework(
    groupId: string,
    title: string,
    description: string,
    deadline: string,
    rewardCoins = 30
  ): HomeworkTask {
    const task: HomeworkTask = {
      id: `hw-${Date.now()}`,
      groupId,
      title,
      description,
      deadline,
      rewardCoins,
      createdAt: `Bugun ${nowTimeStr()}`,
    };
    this.homeworkTasks.unshift(task);

    const group = this.groups.find((g) => g.id === groupId);
    this.notifications.unshift({
      id: `not-${Date.now() + 1}`,
      studentName: group ? `${group.name} guruhi` : 'Guruh',
      parentPhone: 'Barcha guruh a’zolari',
      message: `Yangi uyga vazifa: "${title}" (Muddat: ${deadline}, Mukofot: +${rewardCoins} coin).`,
      type: 'announcement',
      createdAt: nowTimeStr(),
    });

    this.saveToDisk();
    return task;
  }

  submitHomework(studentId: string, taskId: string, answerText: string): HomeworkSubmission | null {
    const student = this.students.find((s) => s.id === studentId);
    const task = this.homeworkTasks.find((t) => t.id === taskId);
    if (!student || !task) return null;

    const submission: HomeworkSubmission = {
      id: nextId('sub'),
      taskId: task.id,
      taskTitle: task.title,
      studentId: student.id,
      studentName: student.fullName,
      groupId: student.groupId,
      answerText,
      submittedAt: nowTimeStr(),
      status: 'pending',
    };
    this.localSessionIds.add(submission.id);
    this.submissions.unshift(submission);
    this.saveToDisk();
    return submission;
  }

  gradeSubmission(
    submissionId: string,
    score: number,
    comment: string,
    bonusCoins = 30
  ): HomeworkSubmission | null {
    const sub = this.submissions.find((s) => s.id === submissionId);
    if (!sub) return null;

    sub.status = 'graded';
    sub.score = Math.max(0, Math.min(100, score));
    sub.teacherComment = comment;
    sub.coinsAwarded = bonusCoins;

    const student = this.students.find((s) => s.id === sub.studentId);
    if (student) {
      student.coins += bonusCoins;
      this.notifications.unshift({
        id: `not-${Date.now()}`,
        studentName: student.fullName,
        parentPhone: student.parentPhone,
        message: `${student.fullName} "${sub.taskTitle}" vazifasidan ${sub.score}/100 ball va +${bonusCoins} Kelajak Coin oldi. Ustoz izohi: "${comment}"`,
        type: 'grade',
        createdAt: nowTimeStr(),
      });
    }

    this.saveToDisk();
    return sub;
  }

  addRegistration(
    fullName: string,
    phone: string,
    courseTitle: string,
    preferredTime: string,
    source: 'web' | 'telegram_live' = 'web'
  ): TrialRegistration {
    const reg: TrialRegistration = {
      id: nextId('reg'),
      fullName,
      phone,
      courseTitle,
      preferredTime,
      source,
      createdAt: `Bugun ${nowTimeStr()}`,
      status: 'new',
    };
    this.localSessionIds.add(reg.id);
    this.registrations.unshift(reg);
    this.saveToDisk();
    return reg;
  }

  confirmRegistration(regId: string): TrialRegistration | null {
    const reg = this.registrations.find((r) => r.id === regId);
    if (!reg) return null;
    reg.status = 'confirmed';
    this.saveToDisk();
    return reg;
  }

  deleteRegistration(regId: string): boolean {
    const before = this.registrations.length;
    this.registrations = this.registrations.filter((r) => r.id !== regId);
    this.saveToDisk();
    return this.registrations.length < before;
  }

  redeemReward(
    studentId: string,
    rewardId: string
  ): { ok: boolean; message: string; voucherCode?: string } {
    const student = this.students.find((s) => s.id === studentId);
    const reward = this.rewards.find((r) => r.id === rewardId);
    if (!student || !reward) {
      return { ok: false, message: "Ma'lumot topilmadi." };
    }
    if (reward.stock <= 0) {
      return { ok: false, message: 'Bu sovg‘a hozircha tugagan.' };
    }
    if (student.coins < reward.costCoins) {
      return {
        ok: false,
        message: `Coin yetarli emas. Sizda ${student.coins} coin bor, kerak: ${reward.costCoins} coin.`,
      };
    }

    student.coins -= reward.costCoins;
    reward.stock -= 1;
    const voucherCode = `KM-${Math.floor(1000 + Math.random() * 9000)}`;

    const orderId = nextId('ord');
    this.localSessionIds.add(orderId);
    this.rewardOrders.unshift({
      id: orderId,
      rewardId: reward.id,
      rewardTitle: reward.title,
      studentId: student.id,
      studentName: student.fullName,
      costCoins: reward.costCoins,
      voucherCode,
      status: 'pending',
      createdAt: `Bugun ${nowTimeStr()}`,
    });

    const notId = nextId('not');
    this.localSessionIds.add(notId);
    this.notifications.unshift({
      id: notId,
      studentName: student.fullName,
      parentPhone: student.phone,
      message: `${student.fullName} "${reward.title}" sovg‘asini ${reward.costCoins} coin evaziga oldi (Kod: ${voucherCode}).`,
      type: 'payment',
      createdAt: nowTimeStr(),
    });

    this.saveToDisk();
    return {
      ok: true,
      message: `Tabriklaymiz! "${reward.title}" muvaffaqiyatli xarid qilindi.`,
      voucherCode,
    };
  }

  addBroadcast(groupName: string, text: string): ParentNotification {
    const note: ParentNotification = {
      id: `not-${Date.now()}`,
      studentName: groupName,
      parentPhone: 'Guruh e’loni',
      message: text,
      type: 'announcement',
      createdAt: nowTimeStr(),
    };
    this.notifications.unshift(note);
    this.saveToDisk();
    return note;
  }
}

export const centerStore = new CenterStore();
