export type BotRole = 'student' | 'teacher';

export type AttendanceStatus = 'present' | 'late' | 'absent';

export type CourseCategory =
  | 'Aniq fanlar'
  | 'Xorijiy tillar'
  | 'Tabiiy fanlar'
  | 'Zamonaviy kasblar'
  | 'Maktabgacha ta’lim';

export interface Course {
  id: string;
  title: string;
  category: CourseCategory;
  durationMonths: number;
  priceMonthly: string;
  scheduleSummary: string;
  teacherName: string;
  seatsLeft: number;
  description: string;
  modules: string[];
}

export interface TeacherRecord {
  id: string;
  fullName: string;
  subject: string;
  phone: string;
  experienceYears: number;
}

export interface StudyGroup {
  id: string;
  name: string;
  courseId: string;
  teacherId: string;
  teacherName: string;
  days: string;
  time: string;
  room: string;
}

export interface StudentRecord {
  id: string;
  fullName: string;
  phone: string;
  parentPhone: string;
  groupId: string;
  coins: number;
  streakDays: number;
  attendanceRate: number;
  todayStatus: AttendanceStatus;
  paymentStatus: 'paid' | 'due_soon';
  nextPaymentDate: string;
}

export interface HomeworkTask {
  id: string;
  groupId: string;
  title: string;
  description: string;
  deadline: string;
  rewardCoins: number;
  createdAt: string;
}

export interface HomeworkSubmission {
  id: string;
  taskId: string;
  taskTitle: string;
  studentId: string;
  studentName: string;
  groupId: string;
  answerText: string;
  submittedAt: string;
  status: 'pending' | 'graded';
  score?: number;
  teacherComment?: string;
  coinsAwarded?: number;
}

export interface TrialRegistration {
  id: string;
  fullName: string;
  phone: string;
  courseTitle: string;
  preferredTime: string;
  source: 'web' | 'telegram_live';
  createdAt: string;
  status: 'new' | 'confirmed';
}

export interface ParentNotification {
  id: string;
  studentName: string;
  parentPhone: string;
  message: string;
  type: 'attendance' | 'grade' | 'announcement' | 'payment';
  createdAt: string;
}

export interface StoreReward {
  id: string;
  title: string;
  costCoins: number;
  stock: number;
  description: string;
}

export interface RewardOrder {
  id: string;
  rewardId: string;
  rewardTitle: string;
  studentId: string;
  studentName: string;
  costCoins: number;
  voucherCode: string;
  status: 'pending' | 'issued';
  createdAt: string;
}

export type PaymentMethod = 'Naqd' | 'Click' | 'Payme' | 'Karta';

export interface PaymentRecord {
  id: string;
  studentId: string;
  studentName: string;
  groupName: string;
  amountUzs: number;
  method: PaymentMethod;
  monthLabel: string;
  paidAt: string;
  note?: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface OnlineQuiz {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  topic: string;
  rewardCoins: number;
  createdAt: string;
  questions: QuizQuestion[];
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  studentId: string;
  studentName: string;
  groupId: string;
  correctCount: number;
  totalCount: number;
  scorePercent: number;
  coinsEarned: number;
  completedAt: string;
}

export interface CertificateRecord {
  id: string;
  certCode: string;
  studentId: string;
  studentName: string;
  courseTitle: string;
  teacherName: string;
  gradeLabel: string;
  issueDate: string;
}

export type TelegramChatType = 'channel' | 'group';

export interface TelegramCommunity {
  id: string;
  title: string;
  type: TelegramChatType;
  chatIdOrUsername: string;
  inviteLink?: string;
  linkedGroupId?: string;
  createdAt: string;
}

export interface CenterContactInfo {
  phones: string;
  workingHours: string;
  address: string;
  description: string;
}

export interface CenterStateSnapshot {
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
  telegramStatus: {
    connected: boolean;
    botUsername: string | null;
    botName: string | null;
    activeChatsCount: number;
    lastError: string | null;
  };
}

export interface InlineButton {
  text: string;
  callbackData: string;
}

export interface BotReplyPayload {
  text: string;
  inlineKeyboard?: InlineButton[][];
  replyKeyboard?: string[][];
  stateUpdated?: boolean;
}
