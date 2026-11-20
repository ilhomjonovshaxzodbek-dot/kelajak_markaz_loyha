import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  Bell,
  BookOpen,
  Bot,
  CheckCircle2,
  ClipboardList,
  Clock,
  Coins,
  CreditCard,
  Download,
  Globe,
  GraduationCap,
  MapPin,
  Phone,
  Plus,
  RotateCcw,
  Save,
  Shield,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { useAuth, type UserRole } from '../context/AuthContext';
import { syncTrialLeadStatusInCloud } from '../lib/centerCloudSync';
import { downloadCertificatePng } from '../lib/certificateDownload';
import type { CenterStateSnapshot, CourseCategory, PaymentMethod } from '../shared/types';
import { BotConnectAndCodeView } from './BotConnectAndCodeView';

export type AdminSection =
  | 'courses'
  | 'teachers_groups'
  | 'students'
  | 'finance'
  | 'leads'
  | 'store'
  | 'certificates'
  | 'bot_channels'
  | 'contact'
  | 'roles';

interface AdminPanelProps {
  centerState: CenterStateSnapshot;
  onStateSync: (nextState: CenterStateSnapshot) => void;
  sectionRequest?: { section: AdminSection; nonce: number } | null;
}

const COURSE_CATEGORIES: CourseCategory[] = [
  'Aniq fanlar',
  'Xorijiy tillar',
  'Tabiiy fanlar',
  'Zamonaviy kasblar',
  'Maktabgacha ta’lim',
];

export const AdminPanel: React.FC<AdminPanelProps> = ({
  centerState,
  onStateSync,
  sectionRequest,
}) => {
  const { role, managedUsers, assignUserRole, user } = useAuth();
  const isSuperAdmin = role === 'admin';
  const [section, setSection] = useState<AdminSection>(sectionRequest?.section ?? 'courses');
  const [roleFeedback, setRoleFeedback] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (sectionRequest?.section) {
      setSection(sectionRequest.section);
    }
  }, [sectionRequest]);

  // Add Course Form
  const [cTitle, setCTitle] = useState('');
  const [cCategory, setCCategory] = useState<CourseCategory>('Aniq fanlar');
  const [cDuration, setCDuration] = useState(6);
  const [cPrice, setCPrice] = useState("650 000 so'm");
  const [cSchedule, setCSchedule] = useState('Du / Chor / Ju · 14:00');
  const [cTeacher, setCTeacher] = useState('');
  const [cSeats, setCSeats] = useState(8);
  const [cDesc, setCDesc] = useState('');

  // Add Teacher Form
  const [tName, setTName] = useState('');
  const [tSubject, setTSubject] = useState('');
  const [tPhone, setTPhone] = useState('');
  const [tExp, setTExp] = useState(4);

  // Add Group Form
  const [gName, setGName] = useState('');
  const [gCourseId, setGCourseId] = useState(centerState.courses[0]?.id ?? '');
  const [gTeacherId, setGTeacherId] = useState(centerState.teachers[0]?.id ?? '');
  const [gDays, setGDays] = useState('Du · Chor · Ju');
  const [gTime, setGTime] = useState('14:00 – 16:00');
  const [gRoom, setGRoom] = useState('101-xona');

  // Add Student Form
  const [sName, setSName] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [sParentPhone, setSParentPhone] = useState('');
  const [sGroupId, setSGroupId] = useState(centerState.groups[0]?.id ?? '');
  const [sPayment, setSPayment] = useState<'paid' | 'due_soon'>('paid');

  // Add Store Reward Form
  const [rTitle, setRTitle] = useState('');
  const [rCost, setRCost] = useState(250);
  const [rStock, setRStock] = useState(10);
  const [rDesc, setRDesc] = useState('');

  // Finance / Payment Form
  const [pStudentId, setPStudentId] = useState(centerState.students[0]?.id ?? '');
  const [pAmount, setPAmount] = useState(650000);
  const [pMethod, setPMethod] = useState<PaymentMethod>('Click');
  const [pMonth, setPMonth] = useState('Noyabr 2026');
  const [pNote, setPNote] = useState('');
  const [financeNotice, setFinanceNotice] = useState<string | null>(null);

  // Certificate Form
  const [certStudentId, setCertStudentId] = useState(centerState.students[0]?.id ?? '');
  const [certCourseTitle, setCertCourseTitle] = useState(
    centerState.courses[0]?.title ?? 'Matematika (DTM va Prezident maktabi)'
  );
  const [certTeacherName, setCertTeacherName] = useState(
    centerState.teachers[0]?.fullName ?? 'Otabek Qosimov'
  );
  const [certGrade, setCertGrade] = useState('A’lo · 95%+ natija');

  // Campus Contact & Address Form
  const [cPhones, setCPhones] = useState(centerState.contactInfo?.phones ?? '');
  const [cHours, setCHours] = useState(centerState.contactInfo?.workingHours ?? '');
  const [cAddress, setCAddress] = useState(centerState.contactInfo?.address ?? '');
  const [cContactDesc, setCContactDesc] = useState(centerState.contactInfo?.description ?? '');
  const [contactNotice, setContactNotice] = useState<string | null>(null);

  useEffect(() => {
    if (centerState.contactInfo) {
      setCPhones(centerState.contactInfo.phones);
      setCHours(centerState.contactInfo.workingHours);
      setCAddress(centerState.contactInfo.address);
      setCContactDesc(centerState.contactInfo.description);
    }
  }, [centerState.contactInfo]);

  const effectiveGCourseId = centerState.courses.some((c) => c.id === gCourseId)
    ? gCourseId
    : centerState.courses[0]?.id ?? '';
  const effectiveGTeacherId = centerState.teachers.some((t) => t.id === gTeacherId)
    ? gTeacherId
    : centerState.teachers[0]?.id ?? '';
  const effectiveSGroupId = centerState.groups.some((g) => g.id === sGroupId)
    ? sGroupId
    : centerState.groups[0]?.id ?? '';
  const effectivePStudentId = centerState.students.some((s) => s.id === pStudentId)
    ? pStudentId
    : centerState.students[0]?.id ?? '';
  const effectiveCertStudentId = centerState.students.some((s) => s.id === certStudentId)
    ? certStudentId
    : centerState.students[0]?.id ?? '';

  const runMutation = async (
    requestFn: () => Promise<Response>,
    fallbackError: string,
    onSuccess?: (data: { ok?: boolean; error?: string; state?: CenterStateSnapshot }) => void
  ) => {
    if (actionBusy) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await requestFn();
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        state?: CenterStateSnapshot;
      };
      if (!res.ok || !data.state) {
        setActionError(data.error || fallbackError);
      } else {
        onStateSync(data.state);
        onSuccess?.(data);
      }
    } catch {
      setActionError('Server bilan bog‘lanishda xatolik.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cTitle.trim()) return;
    await runMutation(
      () =>
        fetch('/api/admin/course', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: cTitle,
            category: cCategory,
            durationMonths: cDuration,
            priceMonthly: cPrice,
            scheduleSummary: cSchedule,
            teacherName: cTeacher || centerState.teachers[0]?.fullName || 'Ustoz',
            seatsLeft: cSeats,
            description: cDesc,
          }),
        }),
      'Kurs qo‘shishda xatolik yuz berdi.',
      () => {
        setCTitle('');
        setCDesc('');
      }
    );
  };

  const handleDeleteCourse = async (id: string) => {
    await runMutation(
      () => fetch(`/api/admin/course/${id}`, { method: 'DELETE' }),
      'Kursni o‘chirishda xatolik yuz berdi.'
    );
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tName.trim() || !tSubject.trim()) return;
    await runMutation(
      () =>
        fetch('/api/admin/teacher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: tName,
            subject: tSubject,
            phone: tPhone || '+998 90 000 00 00',
            experienceYears: tExp,
          }),
        }),
      'Ustoz qo‘shishda xatolik yuz berdi.',
      () => {
        setTName('');
        setTSubject('');
        setTPhone('');
      }
    );
  };

  const handleDeleteTeacher = async (id: string) => {
    await runMutation(
      () => fetch(`/api/admin/teacher/${id}`, { method: 'DELETE' }),
      'Ustozni o‘chirishda xatolik yuz berdi.'
    );
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gName.trim() || !effectiveGCourseId || !effectiveGTeacherId) return;
    await runMutation(
      () =>
        fetch('/api/admin/group', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: gName,
            courseId: effectiveGCourseId,
            teacherId: effectiveGTeacherId,
            days: gDays,
            time: gTime,
            room: gRoom,
          }),
        }),
      'Guruh yaratishda xatolik yuz berdi.',
      () => setGName('')
    );
  };

  const handleDeleteGroup = async (id: string) => {
    await runMutation(
      () => fetch(`/api/admin/group/${id}`, { method: 'DELETE' }),
      'Guruhni o‘chirishda xatolik yuz berdi.'
    );
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName.trim() || !effectiveSGroupId) return;
    await runMutation(
      () =>
        fetch('/api/admin/student', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: sName,
            phone: sPhone || '+998 90 000 00 00',
            parentPhone: sParentPhone || '+998 90 000 00 01',
            groupId: effectiveSGroupId,
            paymentStatus: sPayment,
            nextPaymentDate: '2026-12-05',
          }),
        }),
      'O‘quvchini qo‘shishda xatolik yuz berdi.',
      () => {
        setSName('');
        setSPhone('');
        setSParentPhone('');
      }
    );
  };

  const handleTogglePayment = async (id: string) => {
    await runMutation(
      () => fetch(`/api/admin/student/${id}/toggle-payment`, { method: 'POST' }),
      'To‘lov holatini yangilashda xatolik.'
    );
  };

  const handleDeleteStudent = async (id: string) => {
    await runMutation(
      () => fetch(`/api/admin/student/${id}`, { method: 'DELETE' }),
      'O‘quvchini o‘chirishda xatolik.'
    );
  };

  const handleConfirmLead = async (regId: string) => {
    await runMutation(
      () =>
        fetch('/api/center/registration/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ regId }),
        }),
      'Arizani tasdiqlashda xatolik.',
      () => {
        void syncTrialLeadStatusInCloud(regId, 'confirm');
      }
    );
  };

  const handleDeleteLead = async (regId: string) => {
    await runMutation(
      () => fetch(`/api/admin/registration/${regId}`, { method: 'DELETE' }),
      'Arizani o‘chirishda xatolik.',
      () => {
        void syncTrialLeadStatusInCloud(regId, 'delete');
      }
    );
  };

  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rTitle.trim()) return;
    await runMutation(
      () =>
        fetch('/api/admin/reward', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: rTitle,
            costCoins: rCost,
            stock: rStock,
            description: rDesc || 'Kelajak Markazi sovg‘asi',
          }),
        }),
      'Sovg‘a qo‘shishda xatolik.',
      () => {
        setRTitle('');
        setRDesc('');
      }
    );
  };

  const handleDeleteReward = async (id: string) => {
    await runMutation(
      () => fetch(`/api/admin/reward/${id}`, { method: 'DELETE' }),
      'Sovg‘ani o‘chirishda xatolik.'
    );
  };

  const handleIssueRewardOrder = async (orderId: string) => {
    await runMutation(
      () => fetch(`/api/admin/reward-order/${orderId}/issue`, { method: 'POST' }),
      'Vaucher buyurtmasini tasdiqlashda xatolik.'
    );
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectivePStudentId || !pAmount) return;
    setFinanceNotice(null);
    await runMutation(
      () =>
        fetch('/api/admin/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: effectivePStudentId,
            amountUzs: Number(pAmount),
            method: pMethod,
            monthLabel: pMonth,
            note: pNote,
          }),
        }),
      'To‘lovni qayd etishda xatolik.',
      () => {
        setPNote('');
        setFinanceNotice('To‘lov muvaffaqiyatli qayd etildi va o‘quvchi holati To‘langan ga o‘tdi.');
      }
    );
  };

  const handleSendPaymentReminder = async (studentId: string, fullName: string) => {
    setFinanceNotice(null);
    await runMutation(
      () =>
        fetch(`/api/admin/student/${studentId}/remind-payment`, {
          method: 'POST',
        }),
      'Telegram eslatma yuborishda xatolik.',
      () => {
        setFinanceNotice(`${fullName} ota-onasi uchun to‘lov eslatmasi yuborildi.`);
      }
    );
  };

  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveCertStudentId || !certCourseTitle.trim()) return;
    await runMutation(
      () =>
        fetch('/api/admin/certificate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: effectiveCertStudentId,
            courseTitle: certCourseTitle,
            teacherName: certTeacherName,
            gradeLabel: certGrade,
          }),
        }),
      'Sertifikat chiqarishda xatolik.'
    );
  };

  const handleDeleteCertificate = async (certId: string) => {
    await runMutation(
      () => fetch(`/api/admin/certificate/${certId}`, { method: 'DELETE' }),
      'Sertifikatni o‘chirishda xatolik.'
    );
  };

  const handleClearAll = async () => {
    await runMutation(
      () => fetch('/api/admin/clear-all', { method: 'POST' }),
      'Bazani tozalashda xatolik.',
      () => setConfirmClearAll(false)
    );
  };

  const handleRestoreDefaults = async () => {
    await runMutation(
      () => fetch('/api/admin/restore-defaults', { method: 'POST' }),
      'Namuna bazani tiklashda xatolik.',
      () => setConfirmClearAll(false)
    );
  };

  const handleDownloadBackup = async () => {
    setActionError(null);
    setBackupNotice(null);
    try {
      const res = await fetch('/api/admin/backup');
      if (!res.ok) {
        setActionError('Zaxira faylini yaratishda xatolik.');
        return;
      }
      const backupPayload = await res.json();
      const blob = new Blob([JSON.stringify(backupPayload, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `kelajak-markazi-zaxira-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupNotice(
        `Zaxira fayli yuklab olindi (${centerState.courses.length} kurs, ${centerState.students.length} o‘quvchi, ${centerState.groups.length} guruh).`
      );
    } catch {
      setActionError('Zaxira faylini yuklab olishda tarmoq xatoligi.');
    }
  };

  const handleRestoreBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setActionError(null);
    setBackupNotice(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      await runMutation(
        () =>
          fetch('/api/admin/restore-backup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed),
          }),
        'Zaxira fayldan tiklashda xatolik.',
        (data) => {
          const st = data.state;
          setBackupNotice(
            st
              ? `Zaxira muvaffaqiyatli tiklandi va bulutga saqlandi (${st.courses.length} kurs, ${st.students.length} o‘quvchi).`
              : 'Zaxira muvaffaqiyatli tiklandi.'
          );
        }
      );
    } catch {
      setActionError('Tanlangan fayl yaroqli JSON formatida emas.');
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cPhones.trim() || !cAddress.trim()) {
      setActionError('Telefon raqam va manzil kiritilishi shart.');
      return;
    }
    setContactNotice(null);
    await runMutation(
      () =>
        fetch('/api/admin/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phones: cPhones,
            workingHours: cHours,
            address: cAddress,
            description: cContactDesc,
          }),
        }),
      'Aloqa ma’lumotlarini saqlashda xatolik yuz berdi.',
      () => {
        setContactNotice('Aloqa ma’lumotlari saqlandi va bosh sahifada yangilandi.');
      }
    );
  };

  const totalRevenueUzs = centerState.payments.reduce((acc, p) => acc + p.amountUzs, 0);
  const dueStudents = centerState.students.filter((s) => s.paymentStatus === 'due_soon');

  const navItems: Array<{
    id: AdminSection;
    label: string;
    count?: number;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'courses', label: 'Kurslar', count: centerState.courses.length, icon: BookOpen },
    {
      id: 'teachers_groups',
      label: 'Ustozlar va Guruhlar',
      count: centerState.groups.length,
      icon: Users,
    },
    { id: 'students', label: 'O‘quvchilar', count: centerState.students.length, icon: GraduationCap },
    { id: 'finance', label: 'Moliya va To‘lovlar', count: centerState.payments.length, icon: CreditCard },
    {
      id: 'leads',
      label: 'Sinov arizalari',
      count: centerState.registrations.length,
      icon: ClipboardList,
    },
    { id: 'store', label: 'Coin Do‘koni', count: centerState.rewards.length, icon: Coins },
    {
      id: 'certificates',
      label: 'Sertifikatlar',
      count: centerState.certificates.length,
      icon: Award,
    },
    {
      id: 'bot_channels',
      label: 'Bot va Kanal/Guruh',
      count: centerState.telegramCommunities.length,
      icon: Bot,
    },
    { id: 'contact', label: 'Aloqa va Manzil', icon: MapPin },
    { id: 'roles', label: 'Xodimlar va Rollar', count: managedUsers.length, icon: Shield },
  ];

  const inputCls =
    'w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-[#08080D] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1205B8]/20 focus:border-[#1205B8] transition-colors';

  return (
    <div className="space-y-6">
      {/* Executive Midnight Navy Admin Header */}
      <div className="bg-[#09064E] text-white border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="max-w-2xl">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9CA8FF]">
            Kelajak Markazi · Boshqaruv Markazi
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {isSuperAdmin ? 'Bosh Admin Paneli' : 'Administrator Paneli'}
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            {isSuperAdmin
              ? 'Barcha kurslar, ustozlar, guruhlar, Telegram kanallar, xodim rollari va tizim ma’lumotlarini yagona ishchi muhitdan boshqaring.'
              : 'Kurslar, ustozlar, guruhlar, o‘quvchilar bazasi va sinov darsi arizalarini boshqaring.'}
          </p>
        </div>

        {isSuperAdmin && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {confirmClearAll ? (
              <div className="inline-flex items-center gap-2 bg-rose-950/70 border border-rose-500/40 px-3 py-1.5 rounded-xl">
                <span className="text-xs font-medium text-rose-200">
                  Barcha ma’lumotlar o‘chirilsinmi?
                </span>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={handleClearAll}
                  className="px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg disabled:opacity-50"
                >
                  Ha, tozalash
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  className="px-2.5 py-1 text-xs font-medium text-slate-200 hover:text-white"
                >
                  Bekor
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => setConfirmClearAll(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-rose-300 bg-rose-950/50 border border-rose-500/30 hover:bg-rose-900/60 rounded-xl transition-colors whitespace-nowrap disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Barchasini tozalash</span>
              </button>
            )}
            <button
              type="button"
              disabled={actionBusy}
              onClick={handleDownloadBackup}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#1205B8] hover:bg-[#190AD8] border border-white/15 rounded-xl transition-colors whitespace-nowrap disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Zaxira yuklash (.json)</span>
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => backupInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl transition-colors whitespace-nowrap disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Zaxiradan tiklash</span>
            </button>
            <input
              ref={backupInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleRestoreBackupFile}
              className="hidden"
            />
            <button
              type="button"
              disabled={actionBusy}
              onClick={handleRestoreDefaults}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#08080D] border border-white/15 hover:bg-[#1205B8] rounded-xl transition-colors whitespace-nowrap disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Namuna bazani tiklash</span>
            </button>
          </div>
        )}
      </div>

      {backupNotice && (
        <div className="flex items-center justify-between gap-3 p-3.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{backupNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setBackupNotice(null)}
            className="text-emerald-700 hover:underline shrink-0"
          >
            Yopish
          </button>
        </div>
      )}

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

      {/* Unified Summary KPI Strip */}
      <div className="bg-white border border-slate-200 rounded-2xl grid grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-4 sm:px-6">
          <div className="text-xs font-medium text-slate-500">Kurslar</div>
          <div className="mt-1 text-2xl font-bold text-[#08080D] tabular-nums">
            {centerState.courses.length}
          </div>
        </div>
        <div className="p-4 sm:px-6">
          <div className="text-xs font-medium text-slate-500">Ustozlar</div>
          <div className="mt-1 text-2xl font-bold text-[#08080D] tabular-nums">
            {centerState.teachers.length}
          </div>
        </div>
        <div className="p-4 sm:px-6">
          <div className="text-xs font-medium text-slate-500">Guruhlar</div>
          <div className="mt-1 text-2xl font-bold text-[#08080D] tabular-nums">
            {centerState.groups.length}
          </div>
        </div>
        <div className="p-4 sm:px-6">
          <div className="text-xs font-medium text-slate-500">O‘quvchilar</div>
          <div className="mt-1 text-2xl font-extrabold text-[#1205B8] tabular-nums">
            {centerState.students.length}
          </div>
        </div>
        <div className="p-4 sm:px-6 col-span-2 lg:col-span-1">
          <div className="text-xs font-medium text-slate-500">Yangi arizalar</div>
          <div className="mt-1 text-2xl font-bold text-amber-700 tabular-nums">
            {centerState.registrations.filter((r) => r.status === 'new').length}
          </div>
        </div>
      </div>

      {/* Mobile Horizontal Segmented Bar */}
      <div className="lg:hidden inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl overflow-x-auto max-w-full">
        {navItems.map((tab) => {
          const Icon = tab.icon;
          const active = section === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                active ? 'bg-[#09064E] text-white' : 'text-slate-600 hover:text-[#08080D]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>
                {tab.label}
                {typeof tab.count === 'number' ? ` (${tab.count})` : ''}
              </span>
            </button>
          );
        })}
      </div>

      {/* Modern SaaS 2-Column Workspace (Left Sidebar + Active Workspace) */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <aside className="hidden lg:block w-64 shrink-0 sticky top-24">
          <nav
            aria-label="Admin bo‘limlari"
            className="bg-white border border-slate-200 rounded-2xl p-2 space-y-1"
          >
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Bo‘limlar
            </div>
            {navItems.map((tab) => {
              const Icon = tab.icon;
              const active = section === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSection(tab.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium rounded-xl transition-colors text-left ${
                    active
                      ? 'bg-[#09064E] text-white'
                      : 'text-slate-600 hover:bg-[#F5F6FA] hover:text-[#08080D]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${active ? 'text-[#9CA8FF]' : 'text-slate-400'}`}
                    />
                    <span className="truncate">{tab.label}</span>
                  </span>
                  {typeof tab.count === 'number' && (
                    <span
                      className={`text-xs font-semibold tabular-nums shrink-0 ${
                        active ? 'text-indigo-200' : 'text-slate-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 min-w-0 w-full">
          {/* SECTION 1: COURSES */}
          {section === 'courses' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleAddCourse}
                className="xl:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
              >
                <div className="flex items-center gap-2.5">
                  <Plus className="w-4 h-4 text-[#1205B8]" />
                  <h2 className="text-base font-bold text-[#08080D]">Yangi Kurs Qo‘shish</h2>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Kurs nomi
                  </label>
                  <input
                    type="text"
                    required
                    value={cTitle}
                    onChange={(e) => setCTitle(e.target.value)}
                    placeholder="Masalan: Rus tili (So‘zlashuv)"
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Yo‘nalish
                    </label>
                    <select
                      value={cCategory}
                      onChange={(e) => setCCategory(e.target.value as CourseCategory)}
                      className={inputCls}
                    >
                      {COURSE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Muddati (oy)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={cDuration}
                      onChange={(e) => setCDuration(Number(e.target.value))}
                      className={`${inputCls} tabular-nums`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Oylik narx
                    </label>
                    <input
                      type="text"
                      required
                      value={cPrice}
                      onChange={(e) => setCPrice(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Bo‘sh joylar
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={cSeats}
                      onChange={(e) => setCSeats(Number(e.target.value))}
                      className={`${inputCls} tabular-nums`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Ustoz ismi
                  </label>
                  <input
                    type="text"
                    value={cTeacher}
                    onChange={(e) => setCTeacher(e.target.value)}
                    placeholder="Masalan: Dilshodbek Tursunov"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Dars jadvali
                  </label>
                  <input
                    type="text"
                    value={cSchedule}
                    onChange={(e) => setCSchedule(e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Qisqa tavsif
                  </label>
                  <textarea
                    rows={2}
                    value={cDesc}
                    onChange={(e) => setCDesc(e.target.value)}
                    placeholder="Kurs dasturi haqida qisqacha..."
                    className={inputCls}
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionBusy}
                  className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-[#1205B8] hover:bg-[#09064E] rounded-xl transition-colors disabled:opacity-50"
                >
                  {actionBusy ? 'Saqlanmoqda...' : 'Kursni saqlash'}
                </button>
              </form>

              <div className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="text-base font-bold text-slate-900">Barcha Kurslar Ro‘yxati</h2>
                </div>
                {centerState.courses.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    Hozircha kurslar ro‘yxati bo‘sh. Forma orqali birinchi kursni qo‘shing.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-5 font-medium">Kurs va Yo‘nalish</th>
                          <th className="py-3 px-4 font-medium">Ustoz va Jadval</th>
                          <th className="py-3 px-4 font-medium text-right">Narxi</th>
                          <th className="py-3 px-5 font-medium text-right">Amal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {centerState.courses.map((course) => (
                          <tr key={course.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-5">
                              <div className="font-semibold text-slate-900">{course.title}</div>
                              <div className="text-xs text-slate-500">
                                {course.category} · {course.durationMonths} oy
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-xs text-slate-600">
                              <div className="font-medium text-slate-800">{course.teacherName}</div>
                              <div>{course.scheduleSummary}</div>
                            </td>
                            <td className="py-3.5 px-4 text-right font-semibold text-slate-900 tabular-nums">
                              {course.priceMonthly}
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteCourse(course.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                                aria-label="Kursni o‘chirish"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 2: TEACHERS & GROUPS */}
          {section === 'teachers_groups' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              {/* Teachers Column */}
              <div className="space-y-5">
                <form
                  onSubmit={handleAddTeacher}
                  className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
                >
                  <h2 className="text-base font-bold text-slate-900">Yangi Ustoz Qo‘shish</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={tName}
                      onChange={(e) => setTName(e.target.value)}
                      placeholder="F.I.Sh (Masalan: Nodirbek Hakimov)"
                      className={inputCls}
                    />
                    <input
                      type="text"
                      required
                      value={tSubject}
                      onChange={(e) => setTSubject(e.target.value)}
                      placeholder="Fani (Masalan: Fizika)"
                      className={inputCls}
                    />
                    <input
                      type="tel"
                      value={tPhone}
                      onChange={(e) => setTPhone(e.target.value)}
                      placeholder="Telefon (+998 ...)"
                      className={`${inputCls} tabular-nums`}
                    />
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={tExp}
                      onChange={(e) => setTExp(Number(e.target.value))}
                      placeholder="Tajriba (yil)"
                      className={`${inputCls} tabular-nums`}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={actionBusy}
                    className="px-4 py-2.5 text-xs font-semibold text-white bg-[#1205B8] hover:bg-[#09064E] rounded-xl transition-colors disabled:opacity-50"
                  >
                    {actionBusy ? 'Saqlanmoqda...' : 'Ustozni qo‘shish'}
                  </button>
                </form>

                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 text-sm font-bold text-slate-900">
                    Ustozlar ro‘yxati ({centerState.teachers.length})
                  </div>
                  {centerState.teachers.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-500">
                      Ustozlar qo‘shilmagan.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {centerState.teachers.map((t) => (
                        <div
                          key={t.id}
                          className="px-6 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                        >
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{t.fullName}</div>
                            <div className="text-xs text-slate-500 tabular-nums">
                              {t.subject} · {t.experienceYears} yil tajriba · {t.phone}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteTeacher(t.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                            aria-label="Ustozni o‘chirish"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Groups Column */}
              <div className="space-y-5">
                <form
                  onSubmit={handleAddGroup}
                  className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
                >
                  <h2 className="text-base font-bold text-slate-900">Yangi O‘quv Guruhi Ochish</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={gName}
                      onChange={(e) => setGName(e.target.value)}
                      placeholder="Guruh nomi (Masalan: Fizika-03)"
                      className={inputCls}
                    />
                    <input
                      type="text"
                      value={gRoom}
                      onChange={(e) => setGRoom(e.target.value)}
                      placeholder="Xona (Masalan: 108-xona)"
                      className={inputCls}
                    />
                    <select
                      value={effectiveGCourseId}
                      onChange={(e) => setGCourseId(e.target.value)}
                      className={inputCls}
                    >
                      {centerState.courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                    <select
                      value={effectiveGTeacherId}
                      onChange={(e) => setGTeacherId(e.target.value)}
                      className={inputCls}
                    >
                      {centerState.teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.fullName} ({t.subject})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={gDays}
                      onChange={(e) => setGDays(e.target.value)}
                      placeholder="Kunlar (Du · Chor · Ju)"
                      className={inputCls}
                    />
                    <input
                      type="text"
                      value={gTime}
                      onChange={(e) => setGTime(e.target.value)}
                      placeholder="Vaqt (14:00 – 16:00)"
                      className={`${inputCls} tabular-nums`}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={actionBusy || centerState.courses.length === 0 || centerState.teachers.length === 0}
                    className="px-4 py-2.5 text-xs font-semibold text-white bg-[#08080D] hover:bg-[#1205B8] rounded-xl disabled:opacity-50 transition-colors"
                  >
                    {actionBusy ? 'Yaratilmoqda...' : 'Guruh yaratish'}
                  </button>
                </form>

                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 text-sm font-bold text-slate-900">
                    Faol guruhlar ({centerState.groups.length})
                  </div>
                  {centerState.groups.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-500">
                      Guruhlar ochilmagan.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {centerState.groups.map((g) => (
                        <div
                          key={g.id}
                          className="px-6 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                        >
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {g.name} · {g.room}
                            </div>
                            <div className="text-xs text-slate-500 tabular-nums">
                              {g.teacherName} · {g.days} · {g.time}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteGroup(g.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                            aria-label="Guruhni o‘chirish"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: STUDENTS */}
          {section === 'students' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleAddStudent}
                className="xl:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
              >
                <h2 className="text-base font-bold text-slate-900">Yangi O‘quvchi Qo‘shish</h2>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    O‘quvchi F.I.Sh
                  </label>
                  <input
                    type="text"
                    required
                    value={sName}
                    onChange={(e) => setSName(e.target.value)}
                    placeholder="Masalan: Jasurbek Alimov"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    O‘quvchi telefoni
                  </label>
                  <input
                    type="tel"
                    value={sPhone}
                    onChange={(e) => setSPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                    className={`${inputCls} tabular-nums`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Ota-ona telefoni (xabarnoma uchun)
                  </label>
                  <input
                    type="tel"
                    value={sParentPhone}
                    onChange={(e) => setSParentPhone(e.target.value)}
                    placeholder="+998 90 987 65 43"
                    className={`${inputCls} tabular-nums`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Guruh</label>
                  <select
                    value={effectiveSGroupId}
                    onChange={(e) => setSGroupId(e.target.value)}
                    className={inputCls}
                  >
                    {centerState.groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.teacherName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    To‘lov holati
                  </label>
                  <select
                    value={sPayment}
                    onChange={(e) => setSPayment(e.target.value as 'paid' | 'due_soon')}
                    className={inputCls}
                  >
                    <option value="paid">To‘langan</option>
                    <option value="due_soon">To‘lov kutilmoqda</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={actionBusy || centerState.groups.length === 0}
                  className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-[#1205B8] hover:bg-[#09064E] rounded-xl disabled:opacity-50 transition-colors"
                >
                  {actionBusy ? 'Saqlanmoqda...' : 'O‘quvchini qo‘shish'}
                </button>
              </form>

              <div className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="text-base font-bold text-[#08080D]">O‘quvchilar Bazasi</h2>
                </div>
                {centerState.students.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    O‘quvchilar ro‘yxati bo‘sh. Forma orqali o‘quvchi qo‘shing.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#F5F6FA] text-xs text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-5 font-medium">O‘quvchi</th>
                          <th className="py-3 px-4 font-medium">Guruh</th>
                          <th className="py-3 px-4 font-medium">To‘lov holati</th>
                          <th className="py-3 px-4 font-medium text-right">Coin</th>
                          <th className="py-3 px-5 font-medium text-right">Amal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {centerState.students.map((st) => {
                          const grp = centerState.groups.find((g) => g.id === st.groupId);
                          return (
                            <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3.5 px-5">
                                <div className="font-semibold text-[#08080D]">{st.fullName}</div>
                                <div className="text-xs text-slate-500 tabular-nums">
                                  {st.phone} · Ota-ona: {st.parentPhone}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-xs text-slate-700">
                                {grp ? grp.name : 'Guruhsiz'}
                              </td>
                              <td className="py-3.5 px-4">
                                <button
                                  type="button"
                                  onClick={() => handleTogglePayment(st.id)}
                                  className={`inline-flex items-center gap-1 text-xs font-medium ${
                                    st.paymentStatus === 'paid'
                                      ? 'text-emerald-700'
                                      : 'text-amber-700'
                                  }`}
                                >
                                  {st.paymentStatus === 'paid' ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5" /> To‘langan
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-3.5 h-3.5" /> Kutilmoqda
                                    </>
                                  )}
                                </button>
                              </td>
                              <td className="py-3.5 px-4 text-right font-semibold text-[#1205B8] tabular-nums">
                                {st.coins}
                              </td>
                              <td className="py-3.5 px-5 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStudent(st.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                                  aria-label="O‘quvchini o‘chirish"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 4: TRIAL REGISTRATIONS */}
          {section === 'leads' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-base font-bold text-slate-900">
                  Sinov Darsiga Kelgan Arizalar
                </h2>
              </div>
              {centerState.registrations.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Hozircha yangi sinov darsi arizalari yo‘q.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-5 font-medium">Nomzod</th>
                        <th className="py-3 px-4 font-medium">Tanlangan kurs</th>
                        <th className="py-3 px-4 font-medium">Manba va Vaqt</th>
                        <th className="py-3 px-4 font-medium">Holat</th>
                        <th className="py-3 px-5 font-medium text-right">Amal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {centerState.registrations.map((reg) => (
                        <tr key={reg.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="font-semibold text-slate-900">{reg.fullName}</div>
                            <div className="text-xs text-slate-500 tabular-nums">{reg.phone}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-800">{reg.courseTitle}</td>
                          <td className="py-3.5 px-4 text-xs text-slate-500 tabular-nums">
                            {reg.preferredTime} · {reg.createdAt}
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            {reg.status === 'confirmed' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Tasdiqlangan
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                                <Clock className="w-3.5 h-3.5" /> Yangi
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-right space-x-2 whitespace-nowrap">
                            {reg.status === 'new' && (
                              <button
                                type="button"
                                onClick={() => handleConfirmLead(reg.id)}
                                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1205B8] hover:bg-[#09064E] rounded-xl transition-colors"
                              >
                                Tasdiqlash
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteLead(reg.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 align-middle transition-colors"
                              aria-label="Arizani o‘chirish"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SECTION 5: COIN STORE */}
          {section === 'store' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleAddReward}
                className="xl:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
              >
                <h2 className="text-base font-bold text-slate-900">Yangi Sovg‘a Qo‘shish</h2>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Sovg‘a nomi
                  </label>
                  <input
                    type="text"
                    required
                    value={rTitle}
                    onChange={(e) => setRTitle(e.target.value)}
                    placeholder="Masalan: Brend daftar va ruchka"
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Narxi (coin)
                    </label>
                    <input
                      type="number"
                      min={10}
                      value={rCost}
                      onChange={(e) => setRCost(Number(e.target.value))}
                      className={`${inputCls} tabular-nums`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Soni
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={rStock}
                      onChange={(e) => setRStock(Number(e.target.value))}
                      className={`${inputCls} tabular-nums`}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Qisqa izoh
                  </label>
                  <input
                    type="text"
                    value={rDesc}
                    onChange={(e) => setRDesc(e.target.value)}
                    placeholder="Sovg‘a tavsifi..."
                    className={inputCls}
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-[#1205B8] hover:bg-[#09064E] rounded-xl transition-colors disabled:opacity-50"
                >
                  {actionBusy ? 'Saqlanmoqda...' : 'Sovg‘ani qo‘shish'}
                </button>
              </form>

              <div className="xl:col-span-7 space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200">
                    <h2 className="text-base font-bold text-slate-900">Coin Do‘koni Mahsulotlari</h2>
                  </div>
                  {centerState.rewards.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                      Hozircha sovg‘alar yo‘q.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {centerState.rewards.map((rew) => (
                        <div
                          key={rew.id}
                          className="px-6 py-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                        >
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{rew.title}</div>
                            <div className="text-xs text-slate-500 tabular-nums">
                              {rew.costCoins} coin · Qoldiq: {rew.stock} ta · {rew.description}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteReward(rew.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                            aria-label="Sovg‘ani o‘chirish"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reward Voucher Orders from Students */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200">
                    <h2 className="text-base font-bold text-slate-900">
                      O‘quvchilar Sovg‘a Buyurtmalari ({centerState.rewardOrders.length})
                    </h2>
                  </div>
                  {centerState.rewardOrders.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-500">
                      Hali sovg‘a buyurtmalari tushmagan.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {centerState.rewardOrders.map((ord) => (
                        <div
                          key={ord.id}
                          className="px-6 py-4 flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {ord.studentName} · {ord.rewardTitle}
                            </div>
                            <div className="text-xs text-slate-500 tabular-nums">
                              Vaucher:{' '}
                              <span className="font-mono font-bold text-slate-800">
                                {ord.voucherCode}
                              </span>{' '}
                              · {ord.costCoins} coin · {ord.createdAt}
                            </div>
                          </div>
                          {ord.status === 'issued' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Topshirildi
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleIssueRewardOrder(ord.id)}
                              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1205B8] hover:bg-[#09064E] rounded-xl transition-colors"
                            >
                              Topshirish
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3.5: FINANCE & PAYMENTS ANALYTICS */}
          {section === 'finance' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 sm:divide-x divide-slate-200">
                <div className="p-4 sm:px-6">
                  <div className="text-xs font-medium text-slate-500">Umumiy tushum</div>
                  <div className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
                    {totalRevenueUzs.toLocaleString('ru-RU')} so‘m
                  </div>
                </div>
                <div className="p-4 sm:px-6">
                  <div className="text-xs font-medium text-slate-500">To‘lovlar soni</div>
                  <div className="mt-1 text-xl font-bold text-emerald-700 tabular-nums">
                    {centerState.payments.length} ta kvitansiya
                  </div>
                </div>
                <div className="p-4 sm:px-6">
                  <div className="text-xs font-medium text-slate-500">Muddati yaqin / Qarzdor</div>
                  <div className="mt-1 text-xl font-bold text-amber-700 tabular-nums">
                    {dueStudents.length} nafar
                  </div>
                </div>
                <div className="p-4 sm:px-6">
                  <div className="text-xs font-medium text-slate-500">Ustozlar KPI fondi (40%)</div>
                  <div className="mt-1 text-xl font-extrabold text-[#1205B8] tabular-nums">
                    {Math.round(totalRevenueUzs * 0.4).toLocaleString('ru-RU')} so‘m
                  </div>
                </div>
              </div>

              {financeNotice && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800">
                  {financeNotice}
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                <form
                  onSubmit={handleRecordPayment}
                  className="xl:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
                >
                  <h2 className="text-base font-bold text-slate-900">Yangi To‘lov Qabul Qilish</h2>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      O‘quvchi
                    </label>
                    <select
                      value={effectivePStudentId}
                      onChange={(e) => setPStudentId(e.target.value)}
                      className={inputCls}
                    >
                      {centerState.students.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.fullName} ({st.paymentStatus === 'paid' ? 'To‘langan' : 'Kutilmoqda'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Summa (so‘m)
                      </label>
                      <input
                        type="number"
                        min={50000}
                        step={10000}
                        value={pAmount}
                        onChange={(e) => setPAmount(Number(e.target.value))}
                        className={`${inputCls} tabular-nums`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        To‘lov usuli
                      </label>
                      <select
                        value={pMethod}
                        onChange={(e) => setPMethod(e.target.value as PaymentMethod)}
                        className={inputCls}
                      >
                        <option value="Click">Click</option>
                        <option value="Payme">Payme</option>
                        <option value="Naqd">Naqd</option>
                        <option value="Karta">Karta</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      O‘quv oyi
                    </label>
                    <input
                      type="text"
                      value={pMonth}
                      onChange={(e) => setPMonth(e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Izoh (ixtiyoriy)
                    </label>
                    <input
                      type="text"
                      value={pNote}
                      onChange={(e) => setPNote(e.target.value)}
                      placeholder="Masalan: Chegirma bilan to‘landi"
                      className={inputCls}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={actionBusy || centerState.students.length === 0}
                    className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-[#1205B8] hover:bg-[#09064E] rounded-xl disabled:opacity-50 transition-colors"
                  >
                    {actionBusy ? 'Saqlanmoqda...' : 'To‘lovni tasdiqlash'}
                  </button>
                </form>

                <div className="xl:col-span-7 space-y-6">
                  {/* Debtors / Due Soon List */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                      <h2 className="text-base font-bold text-[#08080D]">
                        To‘lov Muddati Yaqinlashgan O‘quvchilar
                      </h2>
                      <span className="text-xs font-semibold text-amber-700 tabular-nums">
                        {dueStudents.length} nafar
                      </span>
                    </div>
                    {dueStudents.length === 0 ? (
                      <div className="p-6 text-center text-sm text-emerald-700">
                        Barcha o‘quvchilarning oylik to‘lovlari o‘z vaqtida to‘langan.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {dueStudents.map((st) => (
                          <div
                            key={st.id}
                            className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div>
                              <div className="text-sm font-semibold text-[#08080D]">
                                {st.fullName}
                              </div>
                              <div className="text-xs text-slate-500 tabular-nums">
                                Ota-ona: {st.parentPhone} · Muddat: {st.nextPaymentDate}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSendPaymentReminder(st.id, st.fullName)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#08080D] hover:bg-[#1205B8] rounded-xl shrink-0 transition-colors"
                            >
                              <Bell className="w-3.5 h-3.5" />
                              <span>Telegram eslatma yuborish</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Payments Ledger */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200">
                      <h2 className="text-base font-bold text-slate-900">To‘lovlar Tarixi</h2>
                    </div>
                    {centerState.payments.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500">
                        Hozircha to‘lovlar tarixi bo‘sh.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                            <tr>
                              <th className="py-3 px-5 font-medium">O‘quvchi va Guruh</th>
                              <th className="py-3 px-4 font-medium">Oy va Usul</th>
                              <th className="py-3 px-5 font-medium text-right">Summa</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {centerState.payments.map((pay) => (
                              <tr key={pay.id} className="hover:bg-slate-50/70">
                                <td className="py-3.5 px-5">
                                  <div className="font-semibold text-slate-900">
                                    {pay.studentName}
                                  </div>
                                  <div className="text-xs text-slate-500 tabular-nums">
                                    {pay.groupName} · {pay.paidAt}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-xs text-slate-700">
                                  {pay.monthLabel} · {pay.method}
                                </td>
                                <td className="py-3.5 px-5 text-right font-bold text-emerald-700 tabular-nums">
                                  {pay.amountUzs.toLocaleString('ru-RU')} so‘m
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5.2: DIGITAL CERTIFICATES GENERATOR */}
          {section === 'certificates' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleIssueCertificate}
                className="xl:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#1205B8]" />
                  <h2 className="text-base font-bold text-[#08080D]">
                    Raqamli Sertifikat Chiqarish
                  </h2>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Bitiruvchi o‘quvchi
                  </label>
                  <select
                    value={effectiveCertStudentId}
                    onChange={(e) => setCertStudentId(e.target.value)}
                    className={inputCls}
                  >
                    {centerState.students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Tamomlangan kurs
                  </label>
                  <input
                    type="text"
                    required
                    value={certCourseTitle}
                    onChange={(e) => setCertCourseTitle(e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Mas’ul ustoz
                  </label>
                  <input
                    type="text"
                    required
                    value={certTeacherName}
                    onChange={(e) => setCertTeacherName(e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Natija / Daraja
                  </label>
                  <input
                    type="text"
                    required
                    value={certGrade}
                    onChange={(e) => setCertGrade(e.target.value)}
                    placeholder="Masalan: IELTS 7.5+ · Imtiyozli"
                    className={inputCls}
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionBusy || centerState.students.length === 0}
                  className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-[#1205B8] hover:bg-[#09064E] rounded-xl disabled:opacity-50 transition-colors"
                >
                  {actionBusy ? 'Rasmiylashtirilmoqda...' : 'Sertifikatni rasmiylashtirish'}
                </button>
              </form>

              <div className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="text-base font-bold text-[#08080D]">
                    Berilgan Sertifikatlar Reestri ({centerState.certificates.length})
                  </h2>
                </div>
                {centerState.certificates.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    Hozircha sertifikatlar berilmagan.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {centerState.certificates.map((cert) => (
                      <div
                        key={cert.id}
                        className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70"
                      >
                        <div>
                          <div className="font-mono text-xs font-bold text-[#1205B8]">
                            {cert.certCode}
                          </div>
                          <div className="text-sm font-bold text-slate-900 mt-0.5">
                            {cert.studentName} · {cert.courseTitle}
                          </div>
                          <div className="text-xs text-slate-500 tabular-nums">
                            {cert.gradeLabel} · Ustoz: {cert.teacherName} · {cert.issueDate}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => downloadCertificatePng(cert)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PNG</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCertificate(cert.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600"
                            aria-label="Sertifikatni o‘chirish"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 5.5: TELEGRAM BOT & GROUPS/CHANNELS */}
          {section === 'bot_channels' && (
            <BotConnectAndCodeView centerState={centerState} onStateSync={onStateSync} />
          )}

          {/* SECTION 5.8: ALOQA VA MANZIL */}
          {section === 'contact' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleSaveContact}
                className="xl:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-[#1205B8]" />
                  <div>
                    <h2 className="text-base font-bold text-[#08080D]">
                      Bosh sahifadagi “Biz bilan bog‘laning” bo‘limini tahrirlash
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Bu yerga yozilgan telefon raqam, ish vaqti va manzil saytning eng pastki aloqa
                      qismida barcha mehmonlarga darhol ko‘rinadi.
                    </p>
                  </div>
                </div>

                {contactNotice && (
                  <div className="flex items-center gap-2 p-3 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{contactNotice}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Telefon raqamlar *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={160}
                    value={cPhones}
                    onChange={(e) => setCPhones(e.target.value)}
                    placeholder="Masalan: +998 90 123 45 67 · +998 91 765 43 21"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Ish vaqti
                  </label>
                  <input
                    type="text"
                    maxLength={160}
                    value={cHours}
                    onChange={(e) => setCHours(e.target.value)}
                    placeholder="Masalan: Dushanba – Shanba · 08:30 – 20:30"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Markaz manzili *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={240}
                    value={cAddress}
                    onChange={(e) => setCAddress(e.target.value)}
                    placeholder="Andijon viloyati, Bo‘ston tumani, Kelajak Markazi"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Qabul bo‘limi haqida qisqa matn
                  </label>
                  <textarea
                    rows={3}
                    maxLength={400}
                    value={cContactDesc}
                    onChange={(e) => setCContactDesc(e.target.value)}
                    placeholder="Ro‘yxatdan o‘tish, daraja aniqlash testi va shartnomalar bo‘yicha..."
                    className={inputCls}
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionBusy}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-[#1205B8] hover:bg-[#09064E] rounded-xl transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>Saqlash va saytda yangilash</span>
                </button>
              </form>

              <div className="xl:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-[#1205B8] uppercase tracking-wider">
                    Jonli ko‘rinish (Bosh sahifa pastki qismi)
                  </div>
                  <h3 className="text-xl font-extrabold text-[#08080D]">
                    BIZ BILAN BOG‘LANING · KELAJAK MARKAZI
                  </h3>
                  <p className="text-sm text-slate-600">
                    {cContactDesc.trim() ||
                      'Ro‘yxatdan o‘tish, daraja aniqlash testi va shartnomalar bo‘yicha har kuni qabul mavjud.'}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3.5 bg-[#09064E] text-white rounded-2xl p-2.5 pr-5">
                    <div className="w-10 h-9 hex-clip bg-[#1205B8] flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold tabular-nums">
                      {cPhones.trim() || 'Telefon raqam kiritilmagan'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5 bg-[#09064E] text-white rounded-2xl p-2.5 pr-5">
                    <div className="w-10 h-9 hex-clip bg-[#1205B8] flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold">
                      {cHours.trim() || 'Dushanba – Shanba · 08:30 – 20:30'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5 bg-[#09064E] text-white rounded-2xl p-2.5 pr-5">
                    <div className="w-10 h-9 hex-clip bg-[#1205B8] flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold">
                      {cAddress.trim() || 'Andijon viloyati, Bo‘ston tumani, Kelajak Markazi'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: RBAC ROLES MANAGEMENT */}
          {section === 'roles' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#1205B8]" />
                    <h2 className="text-base font-bold text-[#08080D]">
                      Tizim Foydalanuvchilari va Rollar Boshqaruvi
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {isSuperAdmin
                      ? 'Saytga Kirish orqali kirgan har bir foydalanuvchiga Bosh Admin, Administrator, Ustoz yoki O‘quvchi rolini darhol belgilashingiz mumkin.'
                      : 'Faqat Bosh Admin rollarni o‘zgartirishi mumkin. Siz hozir Administrator ko‘rinishidasiz.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {roleFeedback && (
                    <span className="text-xs font-medium text-emerald-700">{roleFeedback}</span>
                  )}
                  <input
                    type="search"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Ism yoki Gmail bo‘yicha qidirish..."
                    className="w-full sm:w-64 px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1205B8]/20 focus:border-[#1205B8]"
                  />
                </div>
              </div>

              {managedUsers.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Hozircha tizimga kirgan foydalanuvchilar topilmadi.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#F5F6FA] text-xs text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-5 font-medium">Foydalanuvchi (Ism va Gmail)</th>
                        <th className="py-3 px-4 font-medium">Joriy rol</th>
                        <th className="py-3 px-5 font-medium text-right">Rolni tayinlash</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {managedUsers
                        .filter((u) => {
                          const q = userSearch.trim().toLowerCase();
                          if (!q) return true;
                          return (
                            u.displayName.toLowerCase().includes(q) ||
                            (u.email ?? '').toLowerCase().includes(q)
                          );
                        })
                        .map((u) => {
                          const roleLabel =
                            u.role === 'admin'
                              ? 'Bosh Admin'
                              : u.role === 'administrator'
                              ? 'Administrator'
                              : u.role === 'teacher'
                              ? 'Ustoz'
                              : 'O‘quvchi';
                          return (
                            <tr key={u.uid} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3.5 px-5">
                                <div className="font-semibold text-[#08080D]">
                                  {u.displayName} {u.uid === user?.uid ? '(Siz)' : ''}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {u.email ? (
                                    <span className="font-medium text-slate-700">{u.email}</span>
                                  ) : (
                                    <span className="font-mono text-slate-400">{u.uid}</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-xs font-semibold text-slate-700">
                                {roleLabel}
                              </td>
                              <td className="py-3.5 px-5 text-right">
                                {isSuperAdmin ? (
                                  <select
                                    value={u.role}
                                    disabled={u.uid === user?.uid || actionBusy}
                                    onChange={async (e) => {
                                      const nextRole = e.target.value as UserRole;
                                      setRoleFeedback(null);
                                      setActionError(null);
                                      try {
                                        await assignUserRole(u.uid, nextRole);
                                        setRoleFeedback(
                                          `${u.displayName} (${u.email || u.uid}) roli yangilandi.`
                                        );
                                      } catch {
                                        setActionError('Foydalanuvchi rolini yangilashda xatolik.');
                                      }
                                    }}
                                    className="px-3.5 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#1205B8]/20 focus:border-[#1205B8]"
                                  >
                                    <option value="student">O‘quvchi</option>
                                    <option value="teacher">Ustoz</option>
                                    <option value="administrator">Administrator</option>
                                    <option value="admin">Bosh Admin</option>
                                  </select>
                                ) : (
                                  <span className="text-xs text-slate-400">Faqat ko‘rish</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
