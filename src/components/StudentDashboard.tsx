import React, { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Coins,
  CreditCard,
  Download,
  Send,
  ShoppingBag,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { downloadCertificatePng } from '../lib/certificateDownload';
import { loadStudentLinkFromCloud, saveStudentLinkToCloud } from '../lib/centerCloudSync';
import type { CenterStateSnapshot, OnlineQuiz } from '../shared/types';

interface StudentDashboardProps {
  centerState: CenterStateSnapshot;
  onStateSync: (nextState: CenterStateSnapshot) => void;
}

type StudentTab = 'study' | 'quizzes' | 'store' | 'certs_payments';

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  centerState,
  onStateSync,
}) => {
  const { user, displayName } = useAuth();
  const [linkedStudentId, setLinkedStudentId] = useState<string>('');
  const [linkSelectorOpen, setLinkSelectorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<StudentTab>('study');

  // Self-enroll state if student isn't in centerState.students yet
  const [enrollPhone, setEnrollPhone] = useState('+998 90 ');
  const [enrollParentPhone, setEnrollParentPhone] = useState('+998 90 ');
  const [enrollGroupId, setEnrollGroupId] = useState(centerState.groups[0]?.id ?? '');
  const [enrollBusy, setEnrollBusy] = useState(false);

  // Homework submission state
  const [hwTaskId, setHwTaskId] = useState<string | null>(null);
  const [hwAnswer, setHwAnswer] = useState('');
  const [hwSubmitting, setHwSubmitting] = useState(false);
  const [hwFeedback, setHwFeedback] = useState<string | null>(null);

  // Quiz taking state
  const [activeQuiz, setActiveQuiz] = useState<OnlineQuiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResultMsg, setQuizResultMsg] = useState<string | null>(null);

  // Store purchase & general error feedback
  const [storeBusyId, setStoreBusyId] = useState<string | null>(null);
  const [storeFeedback, setStoreFeedback] = useState<{
    ok: boolean;
    message: string;
    voucherCode?: string;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function resolveLink() {
      if (!user) return;
      const cloudLink = await loadStudentLinkFromCloud(user.uid);
      if (cancelled) return;
      if (cloudLink && centerState.students.some((s) => s.id === cloudLink.studentId)) {
        setLinkedStudentId(cloudLink.studentId);
        return;
      }
      const normalized = displayName.trim().toLowerCase();
      const nameMatch = centerState.students.find((s) =>
        s.fullName.toLowerCase().includes(normalized)
      );
      if (nameMatch) {
        setLinkedStudentId(nameMatch.id);
      } else if (centerState.students[0]) {
        setLinkedStudentId(centerState.students[0].id);
      }
    }
    void resolveLink();
    return () => {
      cancelled = true;
    };
  }, [user, displayName, centerState.students]);

  const student =
    centerState.students.find((s) => s.id === linkedStudentId) ?? centerState.students[0] ?? null;

  const group = student ? centerState.groups.find((g) => g.id === student.groupId) ?? null : null;
  const groupTasks = student
    ? centerState.homeworkTasks.filter((t) => t.groupId === student.groupId)
    : [];
  const mySubmissions = student
    ? centerState.submissions.filter((s) => s.studentId === student.id)
    : [];
  const groupQuizzes = student
    ? centerState.quizzes.filter((q) => q.groupId === student.groupId)
    : centerState.quizzes;
  const myAttempts = student
    ? centerState.quizAttempts.filter((a) => a.studentId === student.id)
    : [];
  const myCertificates = student
    ? centerState.certificates.filter((c) => c.studentId === student.id)
    : [];
  const myPayments = student
    ? centerState.payments.filter((p) => p.studentId === student.id)
    : [];
  const myOrders = student
    ? centerState.rewardOrders.filter((o) => o.studentId === student.id)
    : [];

  const effectiveEnrollGroupId = centerState.groups.some((g) => g.id === enrollGroupId)
    ? enrollGroupId
    : centerState.groups[0]?.id ?? '';

  const handleSelectStudentProfile = async (studentId: string) => {
    setLinkedStudentId(studentId);
    setLinkSelectorOpen(false);
    const chosen = centerState.students.find((s) => s.id === studentId);
    if (user && chosen) {
      try {
        await saveStudentLinkToCloud(user.uid, chosen.id, chosen.fullName);
      } catch (err) {
        console.warn('Could not save student profile link:', err);
      }
    }
  };

  const handleSelfEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveEnrollGroupId || enrollBusy) return;
    setEnrollBusy(true);
    setActionError(null);
    try {
      const res = await fetch('/api/student/self-enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: displayName || 'O‘quvchi',
          phone: enrollPhone,
          parentPhone: enrollParentPhone,
          groupId: effectiveEnrollGroupId,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        student?: { id: string; fullName: string };
        state?: CenterStateSnapshot;
      };
      if (!res.ok || !data.ok || !data.student || !data.state) {
        setActionError(data.error || 'Kabinetni faollashtirishda xatolik yuz berdi.');
      } else {
        onStateSync(data.state);
        setLinkedStudentId(data.student.id);
        setLinkSelectorOpen(false);
        if (user) {
          try {
            await saveStudentLinkToCloud(user.uid, data.student.id, data.student.fullName);
          } catch (err) {
            console.warn('Could not persist student link:', err);
          }
        }
      }
    } catch {
      setActionError('Server bilan bog‘lanishda xatolik.');
    } finally {
      setEnrollBusy(false);
    }
  };

  const handleHomeworkSubmit = async (taskId: string) => {
    if (!student || !hwAnswer.trim() || hwSubmitting) return;
    setHwSubmitting(true);
    setHwFeedback(null);
    setActionError(null);
    try {
      const res = await fetch('/api/student/homework/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          taskId,
          answerText: hwAnswer.trim(),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        state?: CenterStateSnapshot;
      };
      if (!res.ok || !data.ok || !data.state) {
        setActionError(data.error || 'Uyga vazifani yuborishda xatolik.');
      } else {
        onStateSync(data.state);
        setHwAnswer('');
        setHwTaskId(null);
        setHwFeedback('Uyga vazifa yechimi ustozga muvaffaqiyatli yuborildi.');
      }
    } catch {
      setActionError('Server bilan bog‘lanishda xatolik.');
    } finally {
      setHwSubmitting(false);
    }
  };

  const startQuiz = (quiz: OnlineQuiz) => {
    setActiveQuiz(quiz);
    setQuizAnswers(new Array(quiz.questions.length).fill(-1));
    setQuizResultMsg(null);
    setActionError(null);
  };

  const handleQuizSubmit = async () => {
    if (!student || !activeQuiz || quizSubmitting) return;
    if (quizAnswers.some((a) => a < 0)) {
      setQuizResultMsg('Barcha savollarga javob belgilang.');
      return;
    }
    setQuizSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch('/api/student/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          quizId: activeQuiz.id,
          answers: quizAnswers,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        attempt?: { correctCount: number; totalCount: number; scorePercent: number; coinsEarned: number };
        state?: CenterStateSnapshot;
      };
      if (!res.ok || !data.ok || !data.attempt || !data.state) {
        setActionError(data.error || 'Test natijasini tekshirishda xatolik.');
      } else {
        onStateSync(data.state);
        setQuizResultMsg(
          data.attempt.coinsEarned > 0
            ? `Natija: ${data.attempt.correctCount}/${data.attempt.totalCount} (${data.attempt.scorePercent}%) · +${data.attempt.coinsEarned} Kelajak Coin qo‘shildi.`
            : `Qayta mashq natijasi: ${data.attempt.correctCount}/${data.attempt.totalCount} (${data.attempt.scorePercent}%). Coin faqat birinchi topshirishda beriladi.`
        );
        setActiveQuiz(null);
      }
    } catch {
      setActionError('Server bilan bog‘lanishda xatolik.');
    } finally {
      setQuizSubmitting(false);
    }
  };

  const handleRedeemReward = async (rewardId: string) => {
    if (!student || storeBusyId) return;
    setStoreBusyId(rewardId);
    setStoreFeedback(null);
    setActionError(null);
    try {
      const res = await fetch('/api/center/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: student.id, rewardId }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        message?: string;
        error?: string;
        voucherCode?: string;
        state?: CenterStateSnapshot;
      };
      if (data.state) onStateSync(data.state);
      setStoreFeedback({
        ok: Boolean(data.ok),
        message: data.message || data.error || 'Buyurtma qayta ishlandi.',
        voucherCode: data.voucherCode,
      });
    } catch {
      setStoreFeedback({
        ok: false,
        message: 'Server bilan bog‘lanishda xatolik.',
      });
    } finally {
      setStoreBusyId(null);
    }
  };

  if (!student) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">O‘quvchi Kabinetini Faollashtirish</h1>
          <p className="mt-1 text-sm text-slate-600">
            Siz hozircha birorta guruhga biriktirilmagansiz. Quyida guruhni tanlab kabinetingizni
            oching.
          </p>
        </div>

        <form onSubmit={handleSelfEnroll} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Guruhingiz</label>
            <select
              value={effectiveEnrollGroupId}
              onChange={(e) => setEnrollGroupId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white"
            >
              {centerState.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.teacherName})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Telefon raqamingiz
              </label>
              <input
                type="tel"
                value={enrollPhone}
                onChange={(e) => setEnrollPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Ota-ona telefoni
              </label>
              <input
                type="tel"
                value={enrollParentPhone}
                onChange={(e) => setEnrollParentPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl tabular-nums"
              />
            </div>
          </div>
          {actionError && (
            <div className="p-3 text-xs font-medium text-rose-800 bg-rose-50 border border-rose-200 rounded-xl">
              {actionError}
            </div>
          )}

          <button
            type="submit"
            disabled={enrollBusy || centerState.groups.length === 0}
            className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-[#1205B8] hover:bg-[#09064E] rounded-xl disabled:opacity-50 transition-colors"
          >
            {enrollBusy ? 'Saqlanmoqda...' : 'Kabinetni faollashtirish'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Executive Midnight Navy Student Banner */}
      <div className="bg-[#09064E] text-white border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9CA8FF]">
            Kelajak Markazi · O‘quvchi va Ota-ona Kabineti
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {student.fullName}
          </h1>
          <p className="text-sm text-slate-300 tabular-nums">
            {group ? `${group.name} · Ustoz: ${group.teacherName} · ${group.days} (${group.time}, ${group.room})` : 'Guruh biriktirilmagan'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setLinkSelectorOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#08080D] border border-white/15 hover:bg-[#1205B8] rounded-xl transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Profilni almashtirish</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="flex items-center justify-between gap-3 p-3.5 text-xs font-medium text-rose-800 bg-rose-50 border border-rose-200 rounded-xl">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-rose-700 hover:underline shrink-0"
          >
            Yopish
          </button>
        </div>
      )}

      {/* Optional Profile Switcher / Self Enroll Box */}
      {linkSelectorOpen && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900">Mavjud o‘quvchini tanlash</h2>
            <div className="flex flex-wrap gap-2">
              {centerState.students.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleSelectStudentProfile(st.id)}
                  className={`px-3.5 py-2 text-xs font-medium rounded-xl border transition-colors ${
                    st.id === student.id
                      ? 'bg-[#09064E] text-white border-[#09064E]'
                      : 'bg-[#F5F6FA] text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st.fullName}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSelfEnroll} className="space-y-3 border-t lg:border-t-0 lg:border-l border-slate-200 pt-4 lg:pt-0 lg:pl-6">
            <h2 className="text-sm font-bold text-[#08080D]">
              Yoki o‘zingiz uchun yangi profil ochish ({displayName})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <select
                value={effectiveEnrollGroupId}
                onChange={(e) => setEnrollGroupId(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
              >
                {centerState.groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={enrollBusy}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1205B8] hover:bg-[#09064E] rounded-xl transition-colors"
              >
                {enrollBusy ? 'Saqlanmoqda...' : 'Yangi profil yaratish'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Unified 4-Column KPI Strip */}
      <div className="bg-white border border-slate-200 rounded-2xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-4 sm:px-6">
          <div className="text-xs font-medium text-slate-500">Kelajak Coin balansi</div>
          <div className="mt-1 text-2xl font-extrabold text-[#1205B8] tabular-nums">
            {student.coins} coin
          </div>
          <div className="mt-1 text-xs text-slate-500">Do‘konda sovg‘alarga almashtiring</div>
        </div>
        <div className="p-4 sm:px-6">
          <div className="text-xs font-medium text-slate-500">Davomat va Streak</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
            {student.attendanceRate}%
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            Ketma-ket {student.streakDays} dars faol
          </div>
        </div>
        <div className="p-4 sm:px-6">
          <div className="text-xs font-medium text-slate-500">Bugungi davomat holati</div>
          <div className="mt-1.5 inline-flex items-center gap-1.5 text-base font-bold text-slate-900">
            {student.todayStatus === 'present' ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> Darsda qatnashdi
              </span>
            ) : student.todayStatus === 'late' ? (
              <span className="inline-flex items-center gap-1.5 text-amber-700">
                <Clock className="w-4 h-4" /> Kechikib keldi
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-rose-700">
                <Clock className="w-4 h-4" /> Qatnashmadi
              </span>
            )}
          </div>
        </div>
        <div className="p-4 sm:px-6">
          <div className="text-xs font-medium text-slate-500">Oylik to‘lov holati</div>
          <div className="mt-1.5 text-base font-bold">
            {student.paymentStatus === 'paid' ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> To‘langan
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-amber-700">
                <Clock className="w-4 h-4" /> Muddat yaqin
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            Keyingi sana: {student.nextPaymentDate}
          </div>
        </div>
      </div>

      {/* Sub-Navigation */}
      <div className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl overflow-x-auto max-w-full">
        {(
          [
            { id: 'study', label: `Uyga vazifalar (${groupTasks.length})`, icon: BookOpen },
            { id: 'quizzes', label: `Onlayn testlar (${groupQuizzes.length})`, icon: ClipboardCheck },
            { id: 'store', label: `Coin Do‘koni (${centerState.rewards.length})`, icon: ShoppingBag },
            {
              id: 'certs_payments',
              label: `Sertifikat va To‘lovlar (${myCertificates.length})`,
              icon: Award,
            },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                active ? 'bg-[#09064E] text-white' : 'text-slate-600 hover:text-[#08080D]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: HOMEWORK & SUBMISSIONS */}
      {activeTab === 'study' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Guruh Uyga Vazifalari</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Vazifani bajarib javob yuboring — ustoz tekshirgach Kelajak Coin beriladi
              </p>
            </div>

            {hwFeedback && (
              <div className="mx-6 mt-4 p-3.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl">
                {hwFeedback}
              </div>
            )}

            {groupTasks.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Guruhingizga hozircha faol uyga vazifalar berilmagan.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {groupTasks.map((task) => {
                  const isOpen = hwTaskId === task.id;
                  return (
                    <div key={task.id} className="p-6 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-slate-900">{task.title}</div>
                          <div className="text-xs text-slate-500 tabular-nums mt-0.5">
                            Muddat: {task.deadline} · Mukofot: +{task.rewardCoins} coin
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setHwTaskId(isOpen ? null : task.id)}
                          className="px-3.5 py-2 text-xs font-semibold text-white bg-[#1205B8] hover:bg-[#09064E] rounded-xl shrink-0 self-start transition-colors"
                        >
                          {isOpen ? 'Yopish' : 'Javob yuborish'}
                        </button>
                      </div>
                      <p className="text-sm text-slate-600">{task.description}</p>

                      {isOpen && (
                        <div className="pt-2 space-y-2.5">
                          <textarea
                            rows={3}
                            value={hwAnswer}
                            onChange={(e) => setHwAnswer(e.target.value)}
                            placeholder="Vazifa yechimi yoki izohingizni yozing..."
                            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1205B8]/20 focus:border-[#1205B8]"
                          />
                          <button
                            type="button"
                            onClick={() => handleHomeworkSubmit(task.id)}
                            disabled={!hwAnswer.trim() || hwSubmitting}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#08080D] hover:bg-[#1205B8] rounded-xl disabled:opacity-50 transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{hwSubmitting ? 'Yuborilmoqda...' : 'Ustozga yuborish'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-[#08080D]">Yuborilgan Ishlarim va Baholar</h2>
            </div>
            {mySubmissions.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Hali uyga vazifa topshirmagansiz.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {mySubmissions.map((sub) => (
                  <div key={sub.id} className="p-5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#08080D]">{sub.taskTitle}</span>
                      <span className="text-xs font-semibold tabular-nums text-[#1205B8]">
                        {sub.status === 'graded'
                          ? `${sub.score}/100 · +${sub.coinsAwarded} coin`
                          : 'Tekshirilmoqda'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{sub.answerText}</p>
                    {sub.teacherComment && (
                      <p className="text-xs text-emerald-700 font-medium">
                        Ustoz izohi: {sub.teacherComment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE ONLINE QUIZZES */}
      {activeTab === 'quizzes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-5">
            {quizResultMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm font-semibold text-emerald-800">
                {quizResultMsg}
              </div>
            )}

            {activeQuiz ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <div className="text-xs font-semibold text-[#1205B8]">
                      {activeQuiz.groupName} · +{activeQuiz.rewardCoins} coin
                    </div>
                    <h2 className="text-lg font-bold text-[#08080D] mt-1">{activeQuiz.title}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveQuiz(null)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg"
                  >
                    Bekor qilish
                  </button>
                </div>

                <div className="space-y-6">
                  {activeQuiz.questions.map((q, qIdx) => (
                    <div key={q.id} className="space-y-2.5">
                      <div className="text-sm font-semibold text-[#08080D]">
                        {qIdx + 1}. {q.prompt}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, oIdx) => {
                          const selected = quizAnswers[qIdx] === oIdx;
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => {
                                const next = [...quizAnswers];
                                next[qIdx] = oIdx;
                                setQuizAnswers(next);
                              }}
                              className={`px-3.5 py-2.5 text-xs text-left rounded-xl border transition-colors ${
                                selected
                                  ? 'bg-[#09064E] text-white border-[#09064E] font-semibold'
                                  : 'bg-[#F5F6FA] text-slate-800 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {String.fromCharCode(65 + oIdx)}) {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={quizSubmitting}
                  onClick={handleQuizSubmit}
                  className="w-full px-4 py-3 text-sm font-semibold text-white bg-[#1205B8] hover:bg-[#09064E] rounded-xl disabled:opacity-50 transition-colors"
                >
                  {quizSubmitting ? 'Tekshirilmoqda...' : 'Testni yakunlash va natijani olish'}
                </button>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="text-base font-bold text-[#08080D]">Mavjud Onlayn Testlar</h2>
                </div>
                {groupQuizzes.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    Hozircha onlayn testlar joylanmagan.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {groupQuizzes.map((qz) => {
                      const priorAttempt = myAttempts.find((a) => a.quizId === qz.id);
                      return (
                        <div
                          key={qz.id}
                          className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div>
                            <div className="text-xs font-semibold text-[#1205B8] tabular-nums">
                              {qz.groupName} · {qz.questions.length} ta savol ·{' '}
                              {priorAttempt
                                ? `Topshirilgan (${priorAttempt.scorePercent}%)`
                                : `+${qz.rewardCoins} coin`}
                            </div>
                            <div className="text-base font-bold text-[#08080D] mt-1">{qz.title}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{qz.topic}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => startQuiz(qz)}
                            className="px-4 py-2.5 text-xs font-semibold text-white bg-[#08080D] hover:bg-[#1205B8] rounded-xl whitespace-nowrap shrink-0 transition-colors"
                          >
                            {priorAttempt ? 'Qayta yechish (mashq)' : 'Testni boshlash'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-[#08080D]">Mening Test Natijalarim</h2>
            </div>
            {myAttempts.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Hali birorta test yechmagansiz.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {myAttempts.map((att) => (
                  <div key={att.id} className="px-6 py-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#08080D]">{att.quizTitle}</div>
                      <div className="text-xs text-slate-500 tabular-nums">
                        {att.correctCount}/{att.totalCount} to‘g‘ri · {att.completedAt}
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      <div className="text-sm font-bold text-emerald-700">{att.scorePercent}%</div>
                      <div className="text-xs font-medium text-[#1205B8]">+{att.coinsEarned} coin</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: COIN STORE & REWARD VOUCHERS */}
      {activeTab === 'store' && (
        <div className="space-y-6">
          {storeFeedback && (
            <div
              className={`p-4 rounded-2xl border text-sm font-medium ${
                storeFeedback.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {storeFeedback.message}
              {storeFeedback.voucherCode && (
                <span className="ml-2 font-mono font-bold">
                  Vaucher kodi: {storeFeedback.voucherCode}
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {centerState.rewards.map((rew) => (
              <div
                key={rew.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#1205B8] tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" /> {rew.costCoins} coin
                    </span>
                    <span className="text-slate-500 font-medium">Qoldiq: {rew.stock} ta</span>
                  </div>
                  <h3 className="text-base font-bold text-[#08080D]">{rew.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{rew.description}</p>
                </div>

                <button
                  type="button"
                  disabled={rew.stock <= 0 || student.coins < rew.costCoins || storeBusyId === rew.id}
                  onClick={() => handleRedeemReward(rew.id)}
                  className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-[#08080D] hover:bg-[#1205B8] rounded-xl disabled:opacity-40 transition-colors"
                >
                  {storeBusyId === rew.id
                    ? 'Rasmiylashtirilmoqda...'
                    : rew.stock <= 0
                    ? 'Tugagan'
                    : student.coins < rew.costCoins
                    ? `Yana ${rew.costCoins - student.coins} coin kerak`
                    : 'Coin evaziga olish'}
                </button>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-[#08080D]">Mening Sovg‘a Vaucherlarim</h2>
            </div>
            {myOrders.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Hali sovg‘a xarid qilmagansiz.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {myOrders.map((ord) => (
                  <div key={ord.id} className="px-6 py-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#08080D]">{ord.rewardTitle}</div>
                      <div className="text-xs text-slate-500 tabular-nums">
                        Kod: <span className="font-mono font-bold text-[#08080D]">{ord.voucherCode}</span> ·{' '}
                        {ord.costCoins} coin · {ord.createdAt}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        ord.status === 'issued' ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {ord.status === 'issued' ? 'Topshirilgan' : 'Markazdan olib ketish kutilmoqda'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DIGITAL CERTIFICATES & PAYMENTS */}
      {activeTab === 'certs_payments' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#1205B8]" />
              <h2 className="text-base font-bold text-[#08080D]">Mening Sertifikatlarim</h2>
            </div>
            {myCertificates.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Kursni muvaffaqiyatli yakunlaganingizdan so‘ng bu yerda raqamli sertifikat paydo
                bo‘ladi.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {myCertificates.map((cert) => (
                  <div key={cert.id} className="p-6 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-xs font-semibold text-[#1205B8]">
                          {cert.certCode}
                        </div>
                        <div className="text-base font-bold text-[#08080D] mt-0.5">
                          {cert.courseTitle}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 tabular-nums">
                          {cert.gradeLabel} · Ustoz: {cert.teacherName} · {cert.issueDate}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => downloadCertificatePng(cert)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#08080D] hover:bg-[#1205B8] rounded-xl shrink-0 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Yuklab olish (PNG)</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#1205B8]" />
              <h2 className="text-base font-bold text-[#08080D]">To‘lov Kvitansiyalari Tarixi</h2>
            </div>
            {myPayments.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                To‘lov tarixi hozircha mavjud emas.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {myPayments.map((pay) => (
                  <div key={pay.id} className="px-6 py-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {pay.monthLabel} · {pay.method}
                      </div>
                      <div className="text-xs text-slate-500 tabular-nums">
                        {pay.groupName} · Sana: {pay.paidAt}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-emerald-700 tabular-nums">
                      {pay.amountUzs.toLocaleString('ru-RU')} so‘m
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
