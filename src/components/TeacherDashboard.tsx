import React, { useState } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Megaphone,
  Plus,
  Trash2,
} from 'lucide-react';
import type { AttendanceStatus, CenterStateSnapshot, QuizQuestion } from '../shared/types';

interface TeacherDashboardProps {
  centerState: CenterStateSnapshot;
  onStateSync: (nextState: CenterStateSnapshot) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  centerState,
  onStateSync,
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    centerState.groups[0]?.id ?? 'grp-fe-12'
  );
  const [hwTitle, setHwTitle] = useState('');
  const [hwDesc, setHwDesc] = useState('');
  const [hwDeadline, setHwDeadline] = useState('25-noyabr · 14:00');
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastStatus, setBroadcastStatus] = useState<string | null>(null);
  const [quizTopic, setQuizTopic] = useState('');
  const [quizResult, setQuizResult] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizPublishing, setQuizPublishing] = useState(false);
  const [quizPublishNotice, setQuizPublishNotice] = useState<string | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeScore, setGradeScore] = useState(95);
  const [gradeComment, setGradeComment] = useState('A’lo darajada bajarilgan!');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeGroup =
    centerState.groups.find((g) => g.id === selectedGroupId) ?? centerState.groups[0] ?? null;
  const groupStudents = activeGroup
    ? centerState.students.filter((s) => s.groupId === activeGroup.id)
    : [];
  const groupSubmissions = activeGroup
    ? centerState.submissions.filter((s) => s.groupId === activeGroup.id)
    : [];
  const groupQuizzes = activeGroup
    ? centerState.quizzes.filter((q) => q.groupId === activeGroup.id)
    : [];
  const groupQuizAttempts = activeGroup
    ? centerState.quizAttempts.filter((a) => a.groupId === activeGroup.id)
    : [];

  const presentCount = centerState.students.filter((s) => s.todayStatus === 'present').length;
  const overallAttendancePct = Math.round(
    (presentCount / Math.max(1, centerState.students.length)) * 100
  );
  const pendingSubsCount = centerState.submissions.filter((s) => s.status === 'pending').length;

  const handleAttendanceChange = async (studentId: string, status: AttendanceStatus) => {
    if (actionBusy) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await fetch('/api/center/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, status }),
      });
      const data = (await res.json()) as { error?: string; state?: CenterStateSnapshot };
      if (!res.ok || !data.state) {
        setActionError(data.error || 'Davomatni saqlashda xatolik yuz berdi.');
      } else {
        onStateSync(data.state);
      }
    } catch {
      setActionError('Server bilan bog‘lanishda xatolik.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwTitle.trim() || !activeGroup || actionBusy) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await fetch('/api/center/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: activeGroup.id,
          title: hwTitle.trim(),
          description: hwDesc.trim() || 'Amaliy vazifa topshirig‘i.',
          deadline: hwDeadline,
          rewardCoins: 35,
        }),
      });
      const data = (await res.json()) as { error?: string; state?: CenterStateSnapshot };
      if (!res.ok || !data.state) {
        setActionError(data.error || 'Uyga vazifa yuborishda xatolik.');
      } else {
        onStateSync(data.state);
        setHwTitle('');
        setHwDesc('');
      }
    } catch {
      setActionError('Server bilan bog‘lanishda xatolik.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleGradeSubmit = async (submissionId: string) => {
    if (actionBusy) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await fetch('/api/center/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          score: gradeScore,
          comment: gradeComment,
          bonusCoins: gradeScore >= 85 ? 35 : 20,
        }),
      });
      const data = (await res.json()) as { error?: string; state?: CenterStateSnapshot };
      if (!res.ok || !data.state) {
        setActionError(data.error || 'Baholashda xatolik.');
      } else {
        onStateSync(data.state);
        setGradingId(null);
      }
    } catch {
      setActionError('Server bilan bog‘lanishda xatolik.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim() || !activeGroup || actionBusy) return;
    setActionBusy(true);
    setActionError(null);
    setBroadcastStatus(null);
    try {
      const res = await fetch('/api/center/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupName: activeGroup.name,
          text: broadcastText.trim(),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        liveSent?: number;
        state?: CenterStateSnapshot;
      };
      if (!res.ok || !data.state) {
        setActionError(data.error || 'E’lon yuborishda xatolik.');
      } else {
        onStateSync(data.state);
        setBroadcastStatus(
          `E’lon ${activeGroup.name} guruhiga yuborildi${
            data.liveSent ? ` (${data.liveSent} ta jonli Telegram foydalanuvchiga ham yetkazildi)` : ''
          }.`
        );
        setBroadcastText('');
      }
    } catch {
      setActionError('Server bilan bog‘lanishda xatolik.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTopic.trim() || !activeGroup) return;
    setQuizLoading(true);
    setQuizError(null);
    setQuizPublishNotice(null);
    try {
      const res = await fetch('/api/ai/structured-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: quizTopic.trim(),
          groupName: activeGroup.name,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        questions?: QuizQuestion[];
        error?: string;
      };
      if (!data.ok || !data.questions || data.questions.length === 0) {
        setQuizError(data.error || 'Test tuzishda xatolik.');
      } else {
        setQuizQuestions(data.questions);
        setQuizResult(
          data.questions
            .map(
              (q, idx) =>
                `${idx + 1}. ${q.prompt}\n` +
                q.options
                  .map((opt, oIdx) => `   ${String.fromCharCode(65 + oIdx)}) ${opt}`)
                  .join('\n') +
                `\n   To‘g‘ri javob: ${String.fromCharCode(65 + q.correctIndex)}`
            )
            .join('\n\n')
        );
      }
    } catch {
      setQuizError('Server bilan bog‘lanishda xatolik.');
    } finally {
      setQuizLoading(false);
    }
  };

  const handlePublishQuiz = async () => {
    if (!activeGroup || quizQuestions.length === 0 || quizPublishing) return;
    setQuizPublishing(true);
    setQuizError(null);
    setQuizPublishNotice(null);
    try {
      const res = await fetch('/api/teacher/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: activeGroup.id,
          title: `${quizTopic.trim()} (${activeGroup.name})`,
          topic: quizTopic.trim(),
          rewardCoins: 40,
          questions: quizQuestions,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        state?: CenterStateSnapshot;
      };
      if (!res.ok || !data.ok || !data.state) {
        setQuizError(data.error || 'Testni guruhga joylashda xatolik.');
      } else {
        onStateSync(data.state);
        setQuizPublishNotice(
          `Onlayn test ${activeGroup.name} o‘quvchilarining kabinetiga joylandi (+40 coin).`
        );
        setQuizQuestions([]);
      }
    } catch {
      setQuizError('Server bilan bog‘lanishda xatolik.');
    } finally {
      setQuizPublishing(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (actionBusy) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/teacher/quiz/${quizId}`, { method: 'DELETE' });
      const data = (await res.json()) as { error?: string; state?: CenterStateSnapshot };
      if (!res.ok || !data.state) {
        setActionError(data.error || 'Testni o‘chirishda xatolik.');
      } else {
        onStateSync(data.state);
      }
    } catch {
      setActionError('Server bilan bog‘lanishda xatolik.');
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Midnight Navy Teacher Header + Group Filter */}
      <div className="bg-[#09064E] text-white border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-[#9CA8FF] tracking-wider uppercase">
            Kelajak Markazi · Ustoz ish maydoni
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Ustozlar Boshqaruv Paneli
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl tracking-wide">
            Guruhlar davomatini belgilang, uyga vazifalarni baholang, AI yordamida test tuzing va
            Telegram orqali tezkor e’lonlar yuboring.
          </p>
        </div>

        {centerState.groups.length > 0 ? (
          <div className="inline-flex items-center gap-1 p-1 bg-[#08080D] rounded-xl border border-white/15 overflow-x-auto max-w-full shrink-0">
            {centerState.groups.map((grp) => (
              <button
                key={grp.id}
                type="button"
                onClick={() => setSelectedGroupId(grp.id)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeGroup?.id === grp.id
                    ? 'bg-[#1205B8] text-white'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {grp.name}
              </button>
            ))}
          </div>
        ) : (
          <div className="px-4 py-2 text-xs font-medium text-amber-300 bg-amber-950/50 border border-amber-500/30 rounded-xl shrink-0">
            Admin panelida guruh yarating
          </div>
        )}
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

      {/* 4-Column Summary KPI Strip */}
      <div className="bg-white border border-slate-200 rounded-2xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-4 sm:px-5">
          <div className="text-xs font-medium text-slate-500">Tanlangan guruh</div>
          <div className="mt-1.5 text-lg font-bold text-slate-900 truncate">
            {activeGroup ? activeGroup.name : 'Guruh mavjud emas'}
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            {activeGroup ? `${activeGroup.days} · ${activeGroup.time}` : 'Avval Admin panelda guruh qo‘shing'}
          </div>
        </div>

        <div className="p-4 sm:px-5">
          <div className="text-xs font-medium text-slate-500">Bugungi davomat</div>
          <div className="mt-1.5 text-2xl font-bold text-emerald-700 tabular-nums">
            {overallAttendancePct}%
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            {presentCount} / {centerState.students.length} o‘quvchi keldi
          </div>
        </div>

        <div className="p-4 sm:px-5">
          <div className="text-xs font-medium text-slate-500">Tekshirilmagan vazifalar</div>
          <div className="mt-1.5 text-2xl font-bold text-amber-700 tabular-nums">
            {pendingSubsCount} ta
          </div>
          <div className="mt-1 text-xs text-slate-500">Telegramdan yuborilgan</div>
        </div>

        <div className="p-4 sm:px-5">
          <div className="text-xs font-medium text-slate-500">Yangi sinov darsi arizalari</div>
          <div className="mt-1.5 text-2xl font-extrabold text-[#1205B8] tabular-nums">
            {centerState.registrations.filter((r) => r.status === 'new').length} ta
          </div>
          <div className="mt-1 text-xs text-slate-500">Qabul kutilmoqda</div>
        </div>
      </div>

      {/* Main Two-Column Teacher Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 cols: Attendance Table + Homework Submissions */}
        <div className="lg:col-span-7 space-y-6">
          {/* Attendance Sheet */}
          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Tezkor Yo‘qlama{activeGroup ? ` — ${activeGroup.name}` : ''}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeGroup
                    ? `${activeGroup.room} · Ustoz: ${activeGroup.teacherName} · Belgilash bilan ota-onaga xabar ketadi`
                    : 'Davomat olish uchun markazda kamida bitta guruh yaratilgan bo‘lishi kerak.'}
                </p>
              </div>
            </div>

            {groupStudents.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Bu guruhda hozircha o‘quvchilar ro‘yxati bo‘sh.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-5 font-medium">O‘quvchi</th>
                      <th className="py-3 px-5 font-medium text-right">Coin</th>
                      <th className="py-3 px-5 font-medium text-right">Bugungi holat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groupStudents.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{st.fullName}</div>
                          <div className="text-xs text-slate-500 tabular-nums">
                            {st.phone} · Ota-ona: {st.parentPhone}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-[#1205B8] tabular-nums">
                          {st.coins}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleAttendanceChange(st.id, 'present')}
                              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                                st.todayStatus === 'present'
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              Keldi
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAttendanceChange(st.id, 'late')}
                              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                                st.todayStatus === 'late'
                                  ? 'bg-amber-600 text-white border-amber-600'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              Kechikdi
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAttendanceChange(st.id, 'absent')}
                              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                                st.todayStatus === 'absent'
                                  ? 'bg-rose-600 text-white border-rose-600'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              Kelmadi
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Homework Submissions Review */}
          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                Topshirilgan Uyga Vazifalar
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                O‘quvchilar Telegram bot orqali yuborgan yechimlarni baholang
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {groupSubmissions.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Bu guruh bo‘yicha hozircha topshirilgan vazifalar yo‘q.
                </div>
              ) : (
                groupSubmissions.map((sub) => (
                  <div key={sub.id} className="p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {sub.studentName}
                        </div>
                        <div className="text-xs text-slate-500 tabular-nums">
                          {sub.taskTitle} · {sub.submittedAt}
                        </div>
                      </div>

                      {sub.status === 'graded' ? (
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 tabular-nums">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {sub.score}/100 ball · +{sub.coinsAwarded} coin
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setGradingId(gradingId === sub.id ? null : sub.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1205B8] hover:bg-[#09064E] rounded-lg transition-colors self-start"
                        >
                          Baholash
                        </button>
                      )}
                    </div>

                    <p className="text-sm text-slate-700 bg-slate-50 px-3.5 py-2.5 rounded-lg font-mono text-xs break-all">
                      {sub.answerText}
                    </p>

                    {sub.teacherComment && (
                      <p className="text-xs text-slate-600">
                        Ustoz izohi: <span className="font-medium text-slate-900">{sub.teacherComment}</span>
                      </p>
                    )}

                    {gradingId === sub.id && (
                      <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        <div className="sm:col-span-3">
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Ball (0-100)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={gradeScore}
                            onChange={(e) => setGradeScore(Number(e.target.value))}
                            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg tabular-nums"
                          />
                        </div>
                        <div className="sm:col-span-6">
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Ustoz izohi
                          </label>
                          <input
                            type="text"
                            value={gradeComment}
                            onChange={(e) => setGradeComment(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <button
                            type="button"
                            onClick={() => handleGradeSubmit(sub.id)}
                            className="w-full px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                          >
                            Tasdiqlash
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Group Online Quizzes & Student Attempts */}
          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-[#1205B8]" />
                <div>
                  <h2 className="text-base font-bold text-[#08080D]">
                    Onlayn Testlar va Natijalar{activeGroup ? ` — ${activeGroup.name}` : ''}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    O‘quvchilar kabinetda yechgan testlar avtomatik baholanadi
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-500 tabular-nums">
                {groupQuizzes.length} ta test
              </span>
            </div>

            {groupQuizzes.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Bu guruhga hali onlayn test biriktirilmagan. O‘ng tarafdagi AI Test Tuzuvchi orqali
                tuzing.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {groupQuizzes.map((qz) => (
                  <div
                    key={qz.id}
                    className="px-6 py-4 flex items-center justify-between gap-3 hover:bg-slate-50/70"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{qz.title}</div>
                      <div className="text-xs text-slate-500 tabular-nums">
                        {qz.questions.length} ta savol · +{qz.rewardCoins} coin · {qz.createdAt}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuiz(qz.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600"
                      aria-label="Testni o‘chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {groupQuizAttempts.length > 0 && (
              <div className="border-t border-slate-200 bg-slate-50/70 px-6 py-4 space-y-2.5">
                <div className="text-xs font-semibold text-slate-600">
                  So‘nggi test natijalari ({groupQuizAttempts.length})
                </div>
                <div className="space-y-1.5">
                  {groupQuizAttempts.slice(0, 5).map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between text-xs text-slate-700"
                    >
                      <span className="font-medium text-slate-900">
                        {att.studentName} · {att.quizTitle}
                      </span>
                      <span className="font-semibold text-emerald-700 tabular-nums">
                        {att.scorePercent}% ({att.correctCount}/{att.totalCount}) · +{att.coinsEarned} coin
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right 5 cols: Assign Homework + Dark AI Quiz Generator + Broadcast */}
        <div className="lg:col-span-5 space-y-6">
          {/* Publish New Homework */}
          <form
            onSubmit={handleCreateHomework}
            className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#1205B8]" />
              <h3 className="text-base font-bold text-[#08080D]">
                Yangi Uyga Vazifa Berish
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Vazifa mavzusi
                </label>
                <input
                  type="text"
                  required
                  value={hwTitle}
                  onChange={(e) => setHwTitle(e.target.value)}
                  placeholder="Masalan: Kvadrat tenglamalar (20 ta masala)"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1205B8]/20 focus:border-[#1205B8]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Topshiriq tavsifi
                </label>
                <textarea
                  rows={2}
                  value={hwDesc}
                  onChange={(e) => setHwDesc(e.target.value)}
                  placeholder="Topshiriq shartlari, sahifa raqami yoki bajarish tartibi..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1205B8]/20 focus:border-[#1205B8]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Topshirish muddati
                </label>
                <input
                  type="text"
                  value={hwDeadline}
                  onChange={(e) => setHwDeadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1205B8]/20 focus:border-[#1205B8]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!activeGroup || actionBusy}
              className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-[#1205B8] hover:bg-[#09064E] rounded-xl transition-colors ease-editorial disabled:opacity-50"
            >
              {activeGroup ? `${activeGroup.name} guruhiga yuborish` : 'Avval guruh yarating'}
            </button>
          </form>

          {/* Midnight Navy High-Contrast AI Quiz Generator */}
          <form
            onSubmit={handleGenerateQuiz}
            className="bg-[#09064E] text-slate-100 border border-white/10 rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#9CA8FF]" />
              <h3 className="text-base font-bold text-white tracking-wide">
                AI Tezkor Test Tuzuvchi
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed tracking-wide">
              Mavzuni kiriting — AI 4 ta savolli interaktiv test tuzadi va siz uni 1 klikda
              guruhingizga onlayn test sifatida joylay olasiz.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={quizTopic}
                onChange={(e) => setQuizTopic(e.target.value)}
                placeholder="Masalan: Matematika — Logarifm"
                className="flex-1 px-3.5 py-2.5 text-sm bg-[#08080D]/80 text-white placeholder:text-indigo-200/60 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1205B8] focus:border-white/40"
              />
              <button
                type="submit"
                disabled={quizLoading || !quizTopic.trim() || !activeGroup}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-[#1205B8] hover:bg-indigo-600 rounded-xl transition-colors whitespace-nowrap disabled:opacity-50"
              >
                {quizLoading ? 'Tuzilmoqda...' : 'Test tuzish'}
              </button>
            </div>

            {quizError && (
              <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-950/60 border border-rose-800 px-3.5 py-2.5 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{quizError}</span>
              </div>
            )}

            {quizPublishNotice && (
              <div className="text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-800 px-3.5 py-2.5 rounded-xl">
                {quizPublishNotice}
              </div>
            )}

            {quizResult && (
              <div className="space-y-3">
                <div className="p-4 bg-[#08080D]/80 border border-white/15 rounded-xl text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto thin-scroll tracking-wide">
                  {quizResult}
                </div>
                {quizQuestions.length > 0 && (
                  <button
                    type="button"
                    disabled={quizPublishing || !activeGroup}
                    onClick={handlePublishQuiz}
                    className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {quizPublishing
                      ? 'Joylanmoqda...'
                      : `${activeGroup?.name ?? 'Guruh'} guruhiga onlayn test sifatida joylash`}
                  </button>
                )}
              </div>
            )}
          </form>

          {/* Broadcast Announcement */}
          <form
            onSubmit={handleSendBroadcast}
            className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3.5"
          >
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#1205B8]" />
              <h3 className="text-base font-bold text-[#08080D]">
                Guruhga Telegram E’lon Yuborish
              </h3>
            </div>

            <textarea
              rows={2}
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              placeholder="Masalan: Ertaga soat 14:00 da qo‘shimcha amaliyot darsi bo‘ladi..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1205B8]/20 focus:border-[#1205B8]"
            />

            <button
              type="submit"
              disabled={!broadcastText.trim() || !activeGroup || actionBusy}
              className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-[#08080D] hover:bg-[#1205B8] rounded-xl transition-colors disabled:opacity-50"
            >
              E’lonni tarqatish
            </button>

            {broadcastStatus && (
              <p className="text-xs text-emerald-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{broadcastStatus}</span>
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
