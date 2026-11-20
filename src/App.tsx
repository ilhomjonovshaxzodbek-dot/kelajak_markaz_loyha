import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminPanel, type AdminSection } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';
import { CenterHomeView } from './components/CenterHomeView';
import { StudentDashboard } from './components/StudentDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { useAuth } from './context/AuthContext';
import { loadCloudStateForSession, persistCenterStateToCloud } from './lib/centerCloudSync';
import type { CenterStateSnapshot } from './shared/types';

type ActiveTab = 'home' | 'student' | 'teacher' | 'admin';

export default function App() {
  const { user, role, displayName, authReady, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [adminSectionRequest, setAdminSectionRequest] = useState<{
    section: AdminSection;
    nonce: number;
  } | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [centerState, setCenterState] = useState<CenterStateSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const awaitingRoleRouteRef = useRef(false);
  const lastHydratedKeyRef = useRef<string | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/center/state');
      if (!res.ok) {
        throw new Error('Markaz ma’lumotlarini yuklashda xatolik.');
      }
      const data = (await res.json()) as CenterStateSnapshot;
      setCenterState(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Tarmoq xatoligi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchState();
  }, [fetchState]);

  const canAccessStudent = Boolean(user);
  const canAccessTeacher = Boolean(
    user && (role === 'teacher' || role === 'administrator' || role === 'admin')
  );
  const canAccessAdmin = Boolean(user && (role === 'administrator' || role === 'admin'));

  const handleStateSync = useCallback(
    (nextState: CenterStateSnapshot) => {
      setCenterState(nextState);
      if (user && (canAccessTeacher || canAccessAdmin) && user.emailVerified) {
        void persistCenterStateToCloud(nextState).catch((err) => {
          console.warn('Cloud state sync warning:', err);
        });
      }
    },
    [user, canAccessTeacher, canAccessAdmin]
  );

  // Hydrate Express & UI state from Firestore once auth state and initial fetch finish
  useEffect(() => {
    if (!authReady || loading || loadError) return;
    const hydrationKey = `${user?.uid ?? 'anon'}:${role}:${Boolean(user?.emailVerified)}`;
    if (lastHydratedKeyRef.current === hydrationKey) return;
    lastHydratedKeyRef.current = hydrationKey;

    let cancelled = false;
    async function hydrateFromFirestore() {
      const cloudPatch = await loadCloudStateForSession({
        isStaff: canAccessTeacher || canAccessAdmin,
        isAdministrator: canAccessAdmin,
        emailVerified: Boolean(user?.emailVerified),
      });
      if (cancelled || !cloudPatch) return;

      try {
        const res = await fetch('/api/center/hydrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cloudPatch),
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          ok?: boolean;
          needsCloudResync?: boolean;
          state?: CenterStateSnapshot;
        };
        if (!cancelled && data.ok && data.state) {
          setCenterState(data.state);
          if (data.needsCloudResync && user && (canAccessTeacher || canAccessAdmin) && user.emailVerified) {
            void persistCenterStateToCloud(data.state).catch((err) => {
              console.warn('Cloud resync after merge warning:', err);
            });
          }
        }
      } catch (err) {
        console.warn('Cloud hydration request skipped:', err);
      }
    }

    void hydrateFromFirestore();
    return () => {
      cancelled = true;
    };
  }, [authReady, loading, loadError, user, role, canAccessTeacher, canAccessAdmin]);

  // Automatically route signed-in users straight to their role-appropriate panel after login
  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      awaitingRoleRouteRef.current = true;
      return;
    }
    if (awaitingRoleRouteRef.current) {
      if (canAccessAdmin) {
        setActiveTab('admin');
      } else if (canAccessTeacher) {
        setActiveTab('teacher');
      } else {
        setActiveTab('student');
      }
      awaitingRoleRouteRef.current = false;
    }
  }, [authReady, user, canAccessAdmin, canAccessTeacher]);

  // Automatically return to home if user logs out or loses permission for current tab
  useEffect(() => {
    if (activeTab === 'admin' && !canAccessAdmin) {
      setActiveTab('home');
    } else if (activeTab === 'teacher' && !canAccessTeacher) {
      setActiveTab('home');
    } else if (activeTab === 'student' && !canAccessStudent) {
      setActiveTab('home');
    }
  }, [activeTab, canAccessAdmin, canAccessTeacher, canAccessStudent]);

  const signedInNavItems: Array<{ id: ActiveTab; label: string }> = [
    { id: 'home', label: 'Bosh sahifa' },
    ...(canAccessStudent ? [{ id: 'student' as const, label: 'Mening kabinetim' }] : []),
    ...(canAccessTeacher ? [{ id: 'teacher' as const, label: 'Ustozlar paneli' }] : []),
    ...(canAccessAdmin ? [{ id: 'admin' as const, label: 'Admin paneli' }] : []),
  ];

  const publicSectionLinks = [
    { href: '#kurslar', label: 'Kurslar' },
    { href: '#dars-jadvali', label: 'Dars jadvali' },
    { href: '#ai-maslahatchi', label: 'AI Maslahatchi' },
    { href: '#sinov-darsi', label: 'Sinov darsi' },
    { href: '#aloqa', label: 'Aloqa' },
  ];

  const roleUz =
    role === 'admin'
      ? 'Bosh Admin'
      : role === 'administrator'
      ? 'Administrator'
      : role === 'teacher'
      ? 'Ustoz'
      : 'O‘quvchi';

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6FA] text-[#08080D]">
      {/* Top Bar Contract: Exactly 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 md:gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="text-lg font-extrabold tracking-tight text-[#08080D] whitespace-nowrap shrink-0 text-left font-display"
          >
            Kelajak Markazi
          </button>

          {/* Zone 2: Strictly role-filtered navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {user ? (
              signedInNavItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                      isActive
                        ? 'text-[#09064E] border-[#1205B8] font-bold'
                        : 'text-slate-600 border-transparent hover:text-[#08080D]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })
            ) : (
              publicSectionLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="py-1 text-slate-600 hover:text-[#1205B8] transition-colors whitespace-nowrap shrink-0"
                >
                  {link.label}
                </a>
              ))
            )}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="shrink-0">
            {!authReady ? (
              <span className="text-xs text-slate-400">Tekshirilmoqda...</span>
            ) : user ? (
              <button
                type="button"
                onClick={() => logout()}
                title={`${displayName} (${roleUz}) — Chiqish`}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-[#09064E] hover:bg-[#1205B8] rounded-lg transition-colors whitespace-nowrap shrink-0 max-w-[165px] sm:max-w-[230px] truncate"
              >
                {displayName.split(' ')[0]} · {roleUz} · Chiqish
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#1205B8] hover:bg-[#09064E] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Kirish
              </button>
            )}
          </div>
        </div>

        {/* Mobile Secondary Nav (strictly role-filtered) */}
        <div className="md:hidden px-4 pb-2.5 flex items-center gap-3 overflow-x-auto border-t border-slate-100 pt-2">
          {user
            ? signedInNavItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 ${
                    activeTab === item.id
                      ? 'bg-[#09064E] text-white'
                      : 'text-slate-600 hover:text-[#08080D]'
                  }`}
                >
                  {item.label}
                </button>
              ))
            : publicSectionLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-[#1205B8] whitespace-nowrap shrink-0"
                >
                  {link.label}
                </a>
              ))}
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-7">
        {loading ? (
          <div className="space-y-4">
            <div className="h-8 w-72 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-[460px] bg-white border border-slate-200 rounded-2xl animate-pulse" />
          </div>
        ) : loadError || !centerState ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
            <p className="text-sm font-medium text-rose-700">
              {loadError || 'Ma’lumotlarni yuklab bo‘lmadi.'}
            </p>
            <button
              type="button"
              onClick={() => fetchState()}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1205B8] hover:bg-[#09064E] rounded-lg"
            >
              Qayta urinish
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'home' && (
              <CenterHomeView
                centerState={centerState}
                onStateSync={handleStateSync}
                canAccessAdmin={canAccessAdmin}
                canAccessTeacher={canAccessTeacher}
                isSignedIn={Boolean(user)}
                onOpenAdmin={() => setActiveTab('admin')}
                onOpenAdminContact={() => {
                  setAdminSectionRequest({ section: 'contact', nonce: Date.now() });
                  setActiveTab('admin');
                }}
                onOpenTeacher={() => setActiveTab('teacher')}
                onOpenStudent={() => setActiveTab('student')}
              />
            )}

            {activeTab === 'student' && canAccessStudent && (
              <StudentDashboard centerState={centerState} onStateSync={handleStateSync} />
            )}

            {activeTab === 'teacher' && canAccessTeacher && (
              <TeacherDashboard centerState={centerState} onStateSync={handleStateSync} />
            )}

            {activeTab === 'admin' && canAccessAdmin && (
              <AdminPanel
                centerState={centerState}
                onStateSync={handleStateSync}
                sectionRequest={adminSectionRequest}
              />
            )}
          </>
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-[#08080D] text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-white">
            Kelajak Markazi · Ta’lim kelajagi va zamonaviy kasblar akademiyasi
          </span>
          <span className="text-slate-400">
            {centerState?.contactInfo?.address || 'Andijon viloyati, Bo‘ston tumani'} · Barcha
            fanlar, IELTS, DTM va IT Dasturlash
          </span>
        </div>
      </footer>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
