import React, { useState } from 'react';
import {
  ArrowRight,
  Award,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  Cpu,
  Download,
  ExternalLink,
  Globe,
  GraduationCap,
  MapPin,
  Megaphone,
  Pencil,
  Phone,
  Quote,
  Search,
  UserCheck,
  Users,
} from 'lucide-react';
import { savePublicTrialLeadToCloud } from '../lib/centerCloudSync';
import { downloadCertificatePng } from '../lib/certificateDownload';
import type { CenterStateSnapshot, CourseCategory } from '../shared/types';

interface CenterHomeViewProps {
  centerState: CenterStateSnapshot;
  onStateSync: (nextState: CenterStateSnapshot) => void;
  canAccessAdmin: boolean;
  canAccessTeacher: boolean;
  isSignedIn?: boolean;
  onOpenAdmin: () => void;
  onOpenAdminContact?: () => void;
  onOpenTeacher: () => void;
  onOpenStudent?: () => void;
}

const CATEGORIES: Array<'Barchasi' | CourseCategory> = [
  'Barchasi',
  'Aniq fanlar',
  'Xorijiy tillar',
  'Tabiiy fanlar',
  'Zamonaviy kasblar',
  'Maktabgacha ta’lim',
];

const HERO_CAMPUS_IMG = '/src/assets/images/hero_kelajak_campus_1795086601718.jpg';
const ACADEMIC_STUDY_IMG = '/src/assets/images/showcase_academic_study_1795086601920.jpg';
const TECH_LAB_IMG = '/src/assets/images/showcase_tech_lab_1795086602846.jpg';

export const CenterHomeView: React.FC<CenterHomeViewProps> = ({
  centerState,
  onStateSync,
  canAccessAdmin,
  canAccessTeacher,
  isSignedIn = false,
  onOpenAdmin,
  onOpenAdminContact,
  onOpenTeacher,
  onOpenStudent,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'Barchasi' | CourseCategory>('Barchasi');
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [academicImgFailed, setAcademicImgFailed] = useState(false);
  const [techImgFailed, setTechImgFailed] = useState(false);

  // Registration form
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCourse, setRegCourse] = useState(centerState.courses[0]?.title ?? 'Umumiy maslahat');
  const [regTime, setRegTime] = useState('Tushdan keyin (14:00)');
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);

  // AI Advisor
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // FAQ & Public Certificate Verification
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [certQuery, setCertQuery] = useState('');
  const [certSearched, setCertSearched] = useState(false);

  const normalizedCertQuery = certQuery.trim().toUpperCase();
  const matchedCertificate = normalizedCertQuery
    ? centerState.certificates.find((c) => c.certCode.toUpperCase() === normalizedCertQuery) ?? null
    : null;

  const effectiveRegCourse = centerState.courses.some((c) => c.title === regCourse)
    ? regCourse
    : centerState.courses[0]?.title ?? 'Umumiy maslahat';

  const filteredCourses =
    selectedCategory === 'Barchasi'
      ? centerState.courses
      : centerState.courses.filter((c) => c.category === selectedCategory);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regPhone.trim()) return;
    setRegSubmitting(true);
    setRegError(null);
    setRegSuccess(null);
    try {
      const res = await fetch('/api/center/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: regName.trim(),
          phone: regPhone.trim(),
          courseTitle: effectiveRegCourse,
          preferredTime: regTime,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        registration?: { id: string };
        state?: CenterStateSnapshot;
      };
      if (!res.ok || !data.state) {
        setRegError(data.error || 'Ariza yuborishda xatolik yuz berdi.');
      } else {
        onStateSync(data.state);
        void savePublicTrialLeadToCloud({
          id: data.registration?.id || `lead-${Date.now()}`,
          fullName: regName.trim(),
          phone: regPhone.trim(),
          courseTitle: effectiveRegCourse,
          preferredTime: regTime,
        });
        setRegSuccess(
          'Arizangiz qabul qilindi! Markaz administratori tez orada siz bilan bog‘lanadi.'
        );
        setRegName('');
        setRegPhone('');
      }
    } catch {
      setRegError('Server bilan bog‘lanishda xatolik.');
    } finally {
      setRegSubmitting(false);
    }
  };

  const handleAiAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setAiAnswer(null);
    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'advisor', prompt: aiQuestion.trim() }),
      });
      const data = (await res.json()) as { ok: boolean; text?: string; error?: string };
      if (!data.ok || !data.text) {
        setAiError(data.error || 'AI javob qaytara olmadi.');
      } else {
        setAiAnswer(data.text);
      }
    } catch {
      setAiError('Server bilan bog‘lanishda xatolik.');
    } finally {
      setAiLoading(false);
    }
  };

  const jumpToCategory = (category: 'Barchasi' | CourseCategory) => {
    setSelectedCategory(category);
    const el = document.getElementById('kurslar');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-12">
      {/* 1. BLUE, BLACK & WHITE HERO (Hexagonal Architectural Split) */}
      <section className="space-y-5">
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* Left Typography & Signature Navy Bar */}
          <div className="lg:col-span-6 p-7 sm:p-11 flex flex-col justify-between gap-8">
            <div className="space-y-5">
              <div className="flex items-center gap-2.5 text-xs font-bold tracking-wider text-[#1205B8]">
                <span className="inline-block w-3.5 h-3.5 bg-[#1205B8] hex-clip" aria-hidden="true" />
                <span>KELAJAK MARKAZI · ZAMONAVIY TA’LIM AKADEMIYASI</span>
              </div>

              <h1 className="text-[clamp(2.1rem,3.9vw,3.35rem)] font-extrabold tracking-tight text-[#08080D] leading-[1.06] [text-wrap:balance]">
                TA’LIM KELAJAGI VA ANIQ NATIJALAR MAKTABI
              </h1>

              <p className="text-sm sm:text-base font-semibold text-[#09064E]">
                Innovatsion dasturlar, jonli ustozlar nazorati va amaliy natijalar
              </p>

              <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed max-w-xl">
                Matematika (DTM), Ingliz tili (IELTS), Kimyo-Biologiya, Koreys tili, Dasturlash va
                Mental Arifmetika yo‘nalishlarida tizimli ta’lim. Har bir o‘quvchi natijasi shaxsiy
                kabinet va Telegram bot orqali jonli kuzatiladi.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="#sinov-darsi"
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#1205B8] hover:bg-[#09064E] rounded-xl transition-colors ease-editorial whitespace-nowrap"
                >
                  <span>Bepul sinov darsiga yozilish</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="#kurslar"
                  className="px-6 py-3.5 text-sm font-semibold text-[#08080D] bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors ease-editorial whitespace-nowrap"
                >
                  Kurslarni ko‘rish
                </a>
              </div>

              {/* Signature Midnight Navy Identity Bar */}
              <div className="px-5 py-3.5 bg-[#09064E] text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-slate-300">
                  Andijon viloyati, Bo‘ston tumani, Kelajak Markazi
                </span>
                <div className="flex items-center gap-3 font-semibold tracking-wide tabular-nums">
                  <span>KELAJAK MARKAZI</span>
                  <span className="text-slate-400">|</span>
                  <span className="text-[#8E9BFF]">2026</span>
                </div>
              </div>

              {(isSignedIn || canAccessTeacher || canAccessAdmin) && (
                <div className="pt-2 flex flex-wrap items-center gap-2.5">
                  {isSignedIn && onOpenStudent && (
                    <button
                      type="button"
                      onClick={onOpenStudent}
                      className="px-3.5 py-2 text-xs font-semibold text-[#1205B8] bg-[#1205B8]/8 border border-[#1205B8]/25 hover:bg-[#1205B8]/15 rounded-lg transition-colors whitespace-nowrap"
                    >
                      O‘quvchi kabinetini ochish
                    </button>
                  )}
                  {canAccessTeacher && (
                    <button
                      type="button"
                      onClick={onOpenTeacher}
                      className="px-3.5 py-2 text-xs font-semibold text-[#08080D] bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Ustozlar paneliga o‘tish
                    </button>
                  )}
                  {canAccessAdmin && (
                    <button
                      type="button"
                      onClick={onOpenAdmin}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-[#08080D] hover:bg-[#09064E] rounded-lg transition-colors whitespace-nowrap"
                    >
                      Admin panelini ochish
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Layered Hexagonal Campus Composition */}
          <div className="lg:col-span-6 relative min-h-[340px] lg:min-h-[470px] bg-white overflow-hidden flex items-center justify-center p-6 sm:p-10">
            {/* Geometric Black, Navy & Royal Cobalt Backdrops */}
            <div
              className="absolute -top-10 -right-12 w-72 h-72 sm:w-96 sm:h-96 bg-[#08080D] hex-clip pointer-events-none"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-14 -right-6 w-64 h-64 sm:w-80 sm:h-80 bg-[#09064E] hex-clip pointer-events-none"
              aria-hidden="true"
            />
            <div
              className="absolute bottom-6 left-1/3 w-48 h-48 bg-[#1205B8] hex-clip pointer-events-none"
              aria-hidden="true"
            />
            <div
              className="hidden sm:block absolute top-1/2 left-6 w-12 h-12 bg-[#1205B8] hex-clip pointer-events-none"
              aria-hidden="true"
            />
            <div
              className="hidden sm:block absolute bottom-12 right-8 w-16 h-16 bg-[#1205B8] hex-clip pointer-events-none"
              aria-hidden="true"
            />

            {/* Primary Hexagon Photo */}
            <div className="relative z-10 w-64 h-60 sm:w-[340px] sm:h-[310px] hex-clip bg-[#09064E] overflow-hidden shadow-xl">
              {!heroImgFailed ? (
                <img
                  src={HERO_CAMPUS_IMG}
                  alt="Kelajak Markazi zamonaviy o‘quv xonalari"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-white bg-gradient-to-br from-[#08080D] via-[#09064E] to-[#1205B8]">
                  <GraduationCap className="w-12 h-12 text-white mb-2" />
                  <span className="text-sm font-bold text-center">Kelajak Markazi Kampusi</span>
                </div>
              )}
            </div>

            {/* Overlapping Secondary Hexagon Photo */}
            <div className="hidden sm:block absolute bottom-6 left-6 z-20 w-40 h-36 hex-clip bg-[#08080D] p-1">
              <div className="w-full h-full hex-clip overflow-hidden bg-[#09064E]">
                {!academicImgFailed ? (
                  <img
                    src={ACADEMIC_STUDY_IMG}
                    alt="O‘quvchilar guruh mashg‘ulotlari"
                    referrerPolicy="no-referrer"
                    onError={() => setAcademicImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white bg-[#1205B8]">
                    <Users className="w-7 h-7" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Architectural KPI Proof Strip */}
        <div className="bg-white border border-slate-200 rounded-2xl grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="p-5 sm:px-6">
            <div className="text-xs font-medium text-slate-500">Faol kurs yo‘nalishlari</div>
            <div className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-[#08080D] tabular-nums">
              {centerState.courses.length} ta
            </div>
            <div className="mt-1 text-xs text-slate-500">Barcha yosh va darajalar uchun</div>
          </div>

          <div className="p-5 sm:px-6">
            <div className="text-xs font-medium text-slate-500">Malakali ustozlar</div>
            <div className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-[#08080D] tabular-nums">
              {centerState.teachers.length} nafar
            </div>
            <div className="mt-1 text-xs text-slate-500">Sertifikatlangan fan mentorlari</div>
          </div>

          <div className="p-5 sm:px-6">
            <div className="text-xs font-medium text-slate-500">O‘quv guruhlari</div>
            <div className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-[#09064E] tabular-nums">
              {centerState.groups.length} ta
            </div>
            <div className="mt-1 text-xs text-slate-500">Ertalabki, tushki va kechki smena</div>
          </div>

          <div className="p-5 sm:px-6">
            <div className="text-xs font-medium text-slate-500">Markaz o‘quvchilari</div>
            <div className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-[#1205B8] tabular-nums">
              {centerState.students.length} nafar
            </div>
            <div className="mt-1 text-xs text-slate-500">Jonli davomat va Kelajak Coin tizimi</div>
          </div>
        </div>
      </section>

      {/* 2. KEY PILLARS OF MODERN PEDAGOGY (PDF Slide 3 Style: Dark Backdrop + Navy / Cobalt / White Asymmetric Cards) */}
      <section className="relative bg-[#08080D] text-white rounded-3xl overflow-hidden border border-slate-800">
        {!academicImgFailed && (
          <img
            src={ACADEMIC_STUDY_IMG}
            alt="Kelajak Markazi zamonaviy sinf xonasi"
            referrerPolicy="no-referrer"
            onError={() => setAcademicImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
          />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#08080D]/95 via-[#08080D]/85 to-[#09064E]/80 pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10 p-7 sm:p-11 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-4">
            <div className="text-xs font-bold tracking-wider text-[#9CA8FF]">
              ZAMONAVIY TA’LIM METODIKASI
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-[1.1] [text-wrap:balance]">
              ZAMONAVIY TA’LIMNING ASOSIY USTUNLARI
            </h2>
            <p className="text-sm sm:text-base font-medium text-slate-300 leading-relaxed tracking-wide">
              Kelajak kasblari va xalqaro imtihonlarga tayyorlovchi uch bosqichli yagona tizim.
            </p>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {/* Top Full-Width Midnight Navy Card */}
            <div className="bg-[#09064E] border border-white/10 rounded-2xl p-6 space-y-2">
              <div className="text-base font-bold text-white tracking-wide">
                01. Shaxsiy ta’lim yo‘nalishi va jonli davomat nazorati
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">
                Har bir o‘quvchining boshlang‘ich bilimi diagnostika qilinadi, mos guruh tanlanadi
                va ota-onalar har bir dars davomatini Telegram bot hamda shaxsiy kabinetda ko‘rib
                boradi.
              </p>
            </div>

            {/* Bottom 2-Column Split: Royal Cobalt + Pure White */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
              <div className="bg-[#1205B8] rounded-2xl p-6 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="text-base font-bold text-white">
                    02. Raqamli savodxonlik va AI yordamchi
                  </div>
                  <p className="text-sm text-indigo-100 leading-relaxed">
                    Sun’iy intellekt asosidagi yo‘nalish maslahatchisi, onlayn interaktiv testlar va
                    tezkor natijalar tahlili barcha fanlarga tatbiq etilgan.
                  </p>
                </div>
                <a
                  href="#ai-maslahatchi"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white hover:underline"
                >
                  <span>AI Maslahatchini sinash</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="bg-white text-[#08080D] rounded-2xl p-6 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="text-base font-bold text-[#08080D]">
                    03. Amaliy loyihalar va Kelajak Coin tizimi
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Faol qatnashish, uyga vazifa va yuqori test ballari uchun coin jamg‘ariladi —
                    ularni Coin Do‘konida qimmatbaho sovg‘alarga almashtirish mumkin.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => jumpToCategory('Zamonaviy kasblar')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1205B8] hover:text-[#09064E] text-left"
                >
                  <span>Zamonaviy kasblarni ko‘rish</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Asymmetric Hexagonal Learning Environments Showcase (PDF Page 4 & 9 Style) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <article className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-44 h-40 shrink-0 hex-clip bg-[#09064E] overflow-hidden">
            {!academicImgFailed ? (
              <img
                src={ACADEMIC_STUDY_IMG}
                alt="IELTS va Matematika kichik guruh mashg‘ulotlari"
                referrerPolicy="no-referrer"
                onError={() => setAcademicImgFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#09064E] text-white">
                <GraduationCap className="w-10 h-10" />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3">
            <div className="text-xs font-bold text-[#1205B8]">
              01. AKADEMIK FANLAR VA XALQARO SERTIFIKATLAR
            </div>
            <h2 className="text-lg font-extrabold text-[#08080D]">
              DTM, Prezident maktabi va IELTS / TOPIK tayyorlov dasturlari
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Matematika, Ingliz tili, Kimyo-Biologiya hamda Koreys tili guruhlarida har hafta real
              imtihon formatidagi sinov testlari va individual xatolar tahlili o‘tkaziladi.
            </p>
            <button
              type="button"
              onClick={() => jumpToCategory('Aniq fanlar')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1205B8] hover:text-[#09064E]"
            >
              <span>Aniq va tabiiy fanlarni ko‘rish</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </article>

        <article className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 flex flex-col justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-28 h-24 shrink-0 hex-clip bg-[#1205B8] overflow-hidden">
              {!techImgFailed ? (
                <img
                  src={TECH_LAB_IMG}
                  alt="Dasturlash va Sun’iy intellekt laboratoriyasi"
                  referrerPolicy="no-referrer"
                  onError={() => setTechImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#1205B8] text-white">
                  <Cpu className="w-8 h-8" />
                </div>
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-[#1205B8]">02. IT VA SUN’IY INTELLEKT</div>
              <h2 className="text-base font-extrabold text-[#08080D] mt-0.5">
                Amaliy Dasturlash va Mental Arifmetika
              </h2>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            O‘quvchilar nazariya bilan cheklanmay, real veb-loyihalar, Telegram botlar va mantiqiy
            fikrlash mashqlari ustida mentorlar bilan ishlashadi.
          </p>

          <button
            type="button"
            onClick={() => jumpToCategory('Zamonaviy kasblar')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1205B8] hover:text-[#09064E] self-start"
          >
            <span>Zamonaviy kasblarni ko‘rish</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </article>
      </section>

      {/* 4. Courses Catalog */}
      <section id="kurslar" className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="text-xs font-bold text-[#1205B8] tracking-wider">O‘QUV DASTURLARI</div>
            <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#08080D]">
              Kelajak Markazi Kurslari Katalogi
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Yo‘nalishni tanlang, o‘quv dasturi va oylik to‘lovlar bilan tanishing
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl overflow-x-auto max-w-full">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ease-editorial whitespace-nowrap shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-[#09064E] text-white'
                    : 'text-slate-600 hover:text-[#08080D]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filteredCourses.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
            <p className="text-sm text-slate-600">
              Bu yo‘nalishda hozircha kurslar mavjud emas.
            </p>
            {canAccessAdmin && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1205B8] hover:bg-[#09064E] rounded-lg"
              >
                Admin panelda kurs qo‘shish
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCourses.map((course) => (
              <article
                key={course.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-5 hover:border-[#1205B8]/40 transition-colors ease-editorial"
              >
                <div className="space-y-3">
                  <div className="text-xs text-slate-500 tabular-nums">
                    <span className="font-bold text-[#1205B8]">{course.category}</span>
                    <span className="mx-1.5">·</span>
                    <span>{course.durationMonths} oy</span>
                    <span className="mx-1.5">·</span>
                    <span>{course.seatsLeft} ta bo‘sh joy</span>
                  </div>

                  <h3 className="text-lg font-extrabold text-[#08080D] leading-snug">
                    {course.title}
                  </h3>

                  <p className="text-sm text-slate-600 leading-relaxed">{course.description}</p>

                  {course.modules.length > 0 && (
                    <div className="pt-2 text-xs text-slate-500 leading-relaxed">
                      <span className="font-semibold text-[#08080D]">Dastur: </span>
                      {course.modules.join(' · ')}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                    <div>
                      Ustoz:{' '}
                      <span className="font-semibold text-[#08080D]">{course.teacherName}</span>
                    </div>
                    <div className="tabular-nums">
                      Jadval:{' '}
                      <span className="font-medium text-[#08080D]">{course.scheduleSummary}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="text-lg font-extrabold text-[#08080D] tabular-nums">
                    {course.priceMonthly}
                    <span className="text-xs font-normal text-slate-500"> / oy</span>
                  </div>
                  <a
                    href="#sinov-darsi"
                    onClick={() => setRegCourse(course.title)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#08080D] hover:bg-[#1205B8] rounded-lg transition-colors ease-editorial whitespace-nowrap"
                  >
                    Yozilish
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* 5. Schedule + Midnight Navy AI Advisor + Coin Store + Trial Registration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 cols */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Groups Schedule */}
          <section
            id="dars-jadvali"
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1205B8]" />
                <h2 className="text-base font-extrabold text-[#08080D]">
                  Faol Guruhlar Dars Jadvali
                </h2>
              </div>
              <span className="text-xs font-semibold text-slate-500 tabular-nums">
                {centerState.groups.length} ta guruh
              </span>
            </div>

            {centerState.groups.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Hozircha faol guruhlar jadvali e’lon qilinmagan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F5F6FA] text-xs text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-5 font-semibold">Guruh</th>
                      <th className="py-3 px-5 font-semibold">Ustoz</th>
                      <th className="py-3 px-5 font-semibold">Kun va Vaqt</th>
                      <th className="py-3 px-5 font-semibold text-right">Xona</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {centerState.groups.map((grp) => (
                      <tr key={grp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-[#08080D]">{grp.name}</td>
                        <td className="py-3.5 px-5 text-slate-700">{grp.teacherName}</td>
                        <td className="py-3.5 px-5 text-slate-600 tabular-nums">
                          {grp.days} · {grp.time}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono text-xs text-[#09064E] font-semibold tabular-nums">
                          {grp.room}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Midnight Navy AI Course Advisor */}
          <section
            id="ai-maslahatchi"
            className="bg-[#09064E] text-white border border-[#1205B8]/40 rounded-2xl p-6 sm:p-7 space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Bot className="w-5 h-5 text-[#9CA8FF]" />
                <h2 className="text-base font-extrabold text-white tracking-wide">
                  AI Kurs va Yo‘nalish Maslahatchisi
                </h2>
              </div>
              <span className="text-xs text-indigo-200">Tezkor yo‘naltirish</span>
            </div>

            <p className="text-sm text-indigo-100/90 leading-relaxed tracking-wide">
              Qaysi fanni tanlashni bilmayapsizmi? Maqsadingizni yozing (masalan: «Tibbiyot
              institutiga kirmoqchiman» yoki «IELTS 7.0 kerak») — markaz dasturlari asosida aniq
              tavsiya olasiz.
            </p>

            <form onSubmit={handleAiAsk} className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="Maqsadingiz yoki qiziqishingizni yozing..."
                className="flex-1 px-4 py-2.5 text-sm bg-[#08080D]/80 text-white placeholder:text-indigo-200/60 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1205B8] focus:border-white/40"
              />
              <button
                type="submit"
                disabled={aiLoading || !aiQuestion.trim()}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#1205B8] hover:bg-indigo-600 rounded-xl transition-colors whitespace-nowrap disabled:opacity-50"
              >
                {aiLoading ? 'Javob tayyorlanmoqda...' : 'Tavsiya olish'}
              </button>
            </form>

            {aiError && (
              <p className="text-xs text-rose-200 bg-rose-950/70 border border-rose-500/40 px-3.5 py-2.5 rounded-xl">
                {aiError}
              </p>
            )}

            {aiAnswer && (
              <div className="p-4 bg-[#08080D]/75 border border-white/15 rounded-xl text-sm text-slate-100 whitespace-pre-wrap leading-relaxed tracking-wide">
                {aiAnswer}
              </div>
            )}
          </section>

          {/* Coin Store Preview */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-[#1205B8]" />
                <h2 className="text-base font-extrabold text-[#08080D]">
                  Kelajak Coin Sovg‘alar Do‘koni
                </h2>
              </div>
              <span className="text-xs text-slate-500">Faol o‘quvchilar uchun</span>
            </div>

            {centerState.rewards.length === 0 ? (
              <p className="text-sm text-slate-500">Hozircha sovg‘alar qo‘shilmagan.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {centerState.rewards.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-[#F5F6FA] border border-slate-200 rounded-xl space-y-1.5"
                  >
                    <div className="text-xs font-bold text-[#1205B8] tabular-nums">
                      {item.costCoins} coin · Qoldiq: {item.stock} ta
                    </div>
                    <div className="text-sm font-bold text-[#08080D] leading-snug">
                      {item.title}
                    </div>
                    <div className="text-xs text-slate-600 leading-relaxed">{item.description}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right 5 cols: Free Trial Registration Form */}
        <section
          id="sinov-darsi"
          className="lg:col-span-5 lg:sticky lg:top-24 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 space-y-5"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#1205B8]" />
              <h2 className="text-lg font-extrabold text-[#08080D]">
                Bepul Sinov Darsiga Yozilish
              </h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Ma’lumotlaringizni qoldiring — arizangiz to‘g‘ridan-to‘g‘ri markaz Admin paneliga
              tushadi va administrator sizga qo‘ng‘iroq qiladi.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#08080D] mb-1.5">
                O‘quvchi ism va familiyasi
              </label>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Masalan: Jasurbek Alimov"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1205B8]/20 focus:border-[#1205B8]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#08080D] mb-1.5">
                Telefon raqamingiz
              </label>
              <input
                type="tel"
                required
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1205B8]/20 focus:border-[#1205B8] tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#08080D] mb-1.5">
                Kurs yo‘nalishi
              </label>
              <select
                value={effectiveRegCourse}
                onChange={(e) => setRegCourse(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1205B8]/20 focus:border-[#1205B8]"
              >
                {centerState.courses.length === 0 ? (
                  <option value="Umumiy maslahat">Umumiy maslahat</option>
                ) : (
                  centerState.courses.map((c) => (
                    <option key={c.id} value={c.title}>
                      {c.title}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#08080D] mb-1.5">
                Qulay vaqt
              </label>
              <select
                value={regTime}
                onChange={(e) => setRegTime(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1205B8]/20 focus:border-[#1205B8]"
              >
                <option value="Ertalabki (10:00)">Ertalabki (10:00)</option>
                <option value="Tushdan keyin (14:00)">Tushdan keyin (14:00)</option>
                <option value="Kechki (16:30)">Kechki (16:30)</option>
              </select>
            </div>

            {regError && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-xl">
                {regError}
              </p>
            )}
            {regSuccess && (
              <div className="flex items-start gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{regSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={regSubmitting}
              className="w-full px-4 py-3 text-sm font-semibold text-white bg-[#1205B8] hover:bg-[#09064E] rounded-xl transition-colors ease-editorial disabled:opacity-50"
            >
              {regSubmitting ? 'Yuborilmoqda...' : 'Sinov darsiga ariza yuborish'}
            </button>
          </form>
        </section>
      </div>

      {/* 6. Official Telegram Channels & Groups (visible when added in Admin Panel) */}
      {centerState.telegramCommunities.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold text-[#08080D]">
                Rasmiy Telegram Kanal va Guruhlarimiz
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Yangiliklar, bepul darslar va markaz e’lonlarini kuzatib boring
              </p>
            </div>
            <span className="text-xs font-semibold text-[#1205B8] tabular-nums">
              {centerState.telegramCommunities.length} ta hamjamiyat
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {centerState.telegramCommunities.map((comm) => {
              const targetUrl =
                comm.inviteLink ||
                (comm.chatIdOrUsername.startsWith('@')
                  ? `https://t.me/${comm.chatIdOrUsername.slice(1)}`
                  : null);
              return (
                <div
                  key={comm.id}
                  className="p-4 border border-slate-200 rounded-xl flex items-center justify-between gap-3 bg-[#F5F6FA] hover:border-[#1205B8]/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-9 hex-clip bg-[#1205B8] text-white flex items-center justify-center shrink-0">
                      {comm.type === 'channel' ? (
                        <Megaphone className="w-4 h-4" />
                      ) : (
                        <Users className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#08080D] truncate">{comm.title}</div>
                      <div className="text-xs text-slate-500 truncate">
                        {comm.type === 'channel' ? 'Telegram Kanal' : 'Telegram Guruh'} ·{' '}
                        {comm.chatIdOrUsername}
                      </div>
                    </div>
                  </div>

                  {targetUrl && (
                    <a
                      href={targetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#09064E] hover:bg-[#1205B8] rounded-lg shrink-0 transition-colors"
                    >
                      <span>Kirish</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 7. Alumni & Outcomes High-Contrast Section (PDF Slide 5 & 7 Style) */}
      <section className="bg-[#08080D] text-white rounded-3xl p-7 sm:p-10 space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-xs font-bold tracking-wider text-[#9CA8FF]">
            TASDIQLANGAN NATIJALAR · 2025–2026
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white [text-wrap:balance]">
            O‘QUVCHILARIMIZ NATIJALARI VA AFZALLIKLAR
          </h2>
          <p className="text-sm text-slate-300">
            Uzluksiz rivojlanish, aniq o‘lchovli bilim va ota-ona uchun to‘liq shaffoflik
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <article className="bg-[#1205B8] rounded-2xl p-6 space-y-2">
            <div className="text-xs font-bold text-indigo-200 tracking-wider">IELTS 7.5 – 8.0</div>
            <div className="text-2xl font-extrabold text-white tabular-nums">86% bitiruvchi</div>
            <p className="text-xs text-indigo-100 leading-relaxed">
              Academic IELTS guruhlari tinglovchilari 6 oy ichida maqsadli 7.0+ ballga erishdi.
            </p>
          </article>

          <article className="bg-[#09064E] border border-white/10 rounded-2xl p-6 space-y-2">
            <div className="text-xs font-bold text-[#9CA8FF] tracking-wider">
              DTM &amp; PREZIDENT MAKTABI
            </div>
            <div className="text-2xl font-extrabold text-white tabular-nums">178+ ball</div>
            <p className="text-xs text-slate-200 leading-relaxed">
              Matematika va tabiiy fanlar yo‘nalishida davlat granti asosida o‘qishga kirish natijasi.
            </p>
          </article>

          <article className="bg-[#1205B8] rounded-2xl p-6 space-y-2">
            <div className="text-xs font-bold text-indigo-200 tracking-wider">
              IT VA DASTURLASH
            </div>
            <div className="text-2xl font-extrabold text-white tabular-nums">12+ real loyiha</div>
            <p className="text-xs text-indigo-100 leading-relaxed">
              Bitiruvchilar kurs yakunida shaxsiy veb-sayt, Telegram bot va amaliy portfolio bilan
              chiqadi.
            </p>
          </article>

          <article className="bg-[#09064E] border border-white/10 rounded-2xl p-6 space-y-2">
            <div className="text-xs font-bold text-[#9CA8FF] tracking-wider">OTA-ONA NAZORATI</div>
            <div className="text-2xl font-extrabold text-white tabular-nums">100% shaffoflik</div>
            <p className="text-xs text-slate-200 leading-relaxed">
              Davomat, onlayn test natijalari va to‘lov kvitansiyalari shaxsiy kabinet hamda Telegram
              bot orqali jonli ko‘rinadi.
            </p>
          </article>
        </div>
      </section>

      {/* 8. Parent & Student Testimonials */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <blockquote className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <Quote className="w-5 h-5 text-[#1205B8]" />
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
              «O‘g‘lim matematika va ingliz tili guruhlariga qatnaydi. Har kuni Telegram bot va shaxsiy
              kabinet orqali darsga kirgani, test natijasi va uyga vazifa bahosini ko‘rib turaman.
              Kelajak Coin tizimi bolalarni juda ruhlantiradi.»
            </p>
          </div>
          <footer className="pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span className="font-bold text-[#08080D]">Dilnoza Karimova</span> · O‘quvchi onasi,
            Matematika Pro guruhi
          </footer>
        </blockquote>

        <blockquote className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <Quote className="w-5 h-5 text-[#1205B8]" />
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
              «IELTS Intensive kursida haftalik sinov imtihonlari va ustozning har bir inshoni alohida
              tahlil qilib berishi tufayli 7.5 ball oldim. Kurs oxirida QR-kodli raqamli sertifikat
              ham kabinetimga yuklandi.»
            </p>
          </div>
          <footer className="pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span className="font-bold text-[#08080D]">Madina Tursunova</span> · IELTS 7.5
            bitiruvchisi
          </footer>
        </blockquote>
      </section>

      {/* 9. Interactive FAQ Accordion */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="text-xs font-bold text-[#1205B8] tracking-wider">
            KO‘P SO‘RALADIGAN SAVOLLAR
          </div>
          <h2 className="mt-1 text-lg font-extrabold text-[#08080D]">
            Qabul, dars jadvali va to‘lovlar bo‘yicha savollar
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {[
            {
              q: 'Birinchi sinov darsi bepulmi va qanday yozilish mumkin?',
              a: 'Ha, barcha yo‘nalishlarda ilk sinov darsi mutlaqo bepul. Yuqoridagi «Bepul sinov darsiga yozilish» formasini to‘ldirsangiz, administrator sizga qo‘ng‘iroq qilib qulay vaqtni tasdiqlaydi.',
            },
            {
              q: 'O‘quvchi va ota-ona kabinetiga qanday kiriladi?',
              a: 'Yuqori o‘ng burchakdagi «Kirish» tugmasi orqali Google akkauntingiz bilan tizimga kirasiz. Shundan so‘ng «Mening kabinetim» bo‘limida davomat, uyga vazifa, onlayn testlar, Coin do‘koni va sertifikatlaringiz ochiladi.',
            },
            {
              q: 'Kelajak Coin nima va uni qanday sarflash mumkin?',
              a: 'Darsga muntazam qatnashish, uyga vazifalarni o‘z vaqtida bajarish va onlayn testlarda yuqori ball olish evaziga o‘quvchiga Kelajak Coin beriladi. Coinlarni kabinetdagi do‘konda kitob, hoodie yoki oylik chegirmaga almashtirish mumkin.',
            },
            {
              q: 'To‘lovlarni qaysi usullarda amalga oshirish mumkin?',
              a: 'Markazda naqd pul, plastik karta, Click va Payme orqali to‘lov qabul qilinadi. Har bir to‘lov administrator tomonidan tasdiqlangach kvitansiya kabinetda aks etadi.',
            },
          ].map((item, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-slate-50/70 transition-colors"
                >
                  <span className="text-sm font-bold text-[#08080D]">{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#1205B8] shrink-0 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed">{item.a}</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 10. Campus Contact (PDF Slide 10 Navy Bars + Cobalt Hex Icons) & Public Certificate Verification */}
      <section id="aloqa" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-bold text-[#1205B8] tracking-wider">ALOQA VA MANZIL</div>
              {canAccessAdmin && onOpenAdminContact && (
                <button
                  type="button"
                  onClick={onOpenAdminContact}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1205B8] bg-[#F5F6FA] hover:bg-[#1205B8] hover:text-white border border-slate-200 rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Tahrirlash</span>
                </button>
              )}
            </div>
            <h2 className="text-2xl font-extrabold text-[#08080D]">
              BIZ BILAN BOG‘LANING · KELAJAK MARKAZI
            </h2>
            <p className="text-sm text-slate-600">
              {centerState.contactInfo?.description ||
                'Ro‘yxatdan o‘tish, daraja aniqlash testi va shartnomalar bo‘yicha har kuni qabul mavjud.'}
            </p>
          </div>

          {/* Signature Navy Bars with Cobalt Hex Icon Anchors */}
          <div className="space-y-3">
            <div className="flex items-center gap-3.5 bg-[#09064E] text-white rounded-2xl p-2.5 pr-5">
              <div className="w-10 h-9 hex-clip bg-[#1205B8] flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-semibold tabular-nums">
                {centerState.contactInfo?.phones || 'Telefon raqam Admin panelidan kiritiladi'}
              </span>
            </div>

            <div className="flex items-center gap-3.5 bg-[#09064E] text-white rounded-2xl p-2.5 pr-5">
              <div className="w-10 h-9 hex-clip bg-[#1205B8] flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-semibold">
                {centerState.contactInfo?.workingHours || 'Dushanba – Shanba · 08:30 – 20:30'}
              </span>
            </div>

            <div className="flex items-center gap-3.5 bg-[#09064E] text-white rounded-2xl p-2.5 pr-5">
              <div className="w-10 h-9 hex-clip bg-[#1205B8] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-semibold">
                {centerState.contactInfo?.address ||
                  'Andijon viloyati, Bo‘ston tumani, Kelajak Markazi'}
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1205B8] tracking-wider">
              <Award className="w-4 h-4" />
              <span>RASMIY REYESTR</span>
            </div>
            <h2 className="text-2xl font-extrabold text-[#08080D]">
              Sertifikat Haqiqiyligini Tekshirish
            </h2>
            <p className="text-sm text-slate-600">
              Sertifikatdagi seriya raqamini kiriting (masalan:{' '}
              <span className="font-mono font-bold text-[#09064E]">
                {centerState.certificates[0]?.certCode || 'KM-2026-0101'}
              </span>
              )
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setCertSearched(true);
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <input
              type="text"
              value={certQuery}
              onChange={(e) => {
                setCertQuery(e.target.value);
                setCertSearched(false);
              }}
              placeholder="KM-2026-0101"
              className="flex-1 px-3.5 py-2.5 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1205B8]/20 focus:border-[#1205B8] uppercase"
            />
            <button
              type="submit"
              disabled={!certQuery.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-[#08080D] hover:bg-[#1205B8] rounded-xl transition-colors whitespace-nowrap disabled:opacity-50"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Tekshirish</span>
            </button>
          </form>

          {certSearched && normalizedCertQuery ? (
            matchedCertificate ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-emerald-800">
                    Sertifikat haqiqiy · {matchedCertificate.certCode}
                  </div>
                  <div className="text-sm font-bold text-[#08080D]">
                    {matchedCertificate.studentName}
                  </div>
                  <div className="text-xs text-slate-600 tabular-nums">
                    {matchedCertificate.courseTitle} · {matchedCertificate.gradeLabel} ·{' '}
                    {matchedCertificate.issueDate}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => downloadCertificatePng(matchedCertificate)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shrink-0 self-start sm:self-center"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PNG yuklab olish</span>
                </button>
              </div>
            ) : (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800">
                Ushbu raqamli sertifikat reyestrda topilmadi. Raqamni tekshirib qayta urinib ko‘ring.
              </div>
            )
          ) : (
            <div className="p-4 bg-[#F5F6FA] border border-slate-200 rounded-xl flex items-center gap-3 text-xs text-slate-600">
              <Clock className="w-4 h-4 text-[#1205B8] shrink-0" />
              <span>
                Barcha bitiruvchi sertifikatlari yagona raqamli reyestrda saqlanadi va PNG formatda
                yuklab olinadi.
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
