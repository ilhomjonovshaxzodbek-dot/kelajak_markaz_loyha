import React, { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  notice?: string | null;
}

function mapFirebaseAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('auth/operation-not-allowed')) {
    return "Email/Parol bilan kirish Firebase Console'da yoqilmagan. Firebase Console → Authentication → Sign-in method bo‘limidan 'Email/Password' ni yoqing yoki pastdagi Google tugmasidan foydalaning.";
  }
  if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
    return 'Email yoki parol noto‘g‘ri kiritildi.';
  }
  if (msg.includes('auth/user-not-found')) {
    return 'Bunday email bilan foydalanuvchi topilmadi. Avval ro‘yxatdan o‘ting.';
  }
  if (msg.includes('auth/email-already-in-use')) {
    return 'Bu email allaqachon ro‘yxatdan o‘tgan.';
  }
  if (msg.includes('auth/weak-password')) {
    return 'Parol kamida 6 ta belgidan iborat bo‘lishi kerak.';
  }
  if (msg.includes('auth/popup-closed-by-user')) {
    return 'Google kirish oynasi yopildi. Qayta urinib ko‘ring.';
  }
  if (msg.includes('auth/unauthorized-domain')) {
    return "Ushbu domen Firebase Authentication ruxsat etilgan domenlar ro‘yxatida emas. Firebase Console → Authentication → Settings → Authorized domains bo‘limiga joriy sayt domenini qo‘shing.";
  }
  return msg;
}

export const AuthModal: React.FC<AuthModalProps> = ({ open, onClose, notice }) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, fullName);
      }
      onClose();
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#08080D]/65 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
        {/* Executive Navy Modal Header */}
        <div className="bg-[#09064E] text-white px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold text-[#9CA8FF] tracking-wider uppercase">
              Kelajak Markazi · Tizimga kirish
            </div>
            <h2 id="auth-modal-title" className="text-lg font-extrabold text-white mt-0.5">
              Shaxsiy kabinetga kiring
            </h2>
            <p className="text-xs text-slate-300 mt-0.5 tracking-wide">
              Google (Gmail) yoki Email va parol orqali davom eting
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="p-1.5 text-slate-300 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {notice && (
            <div className="text-xs text-[#09064E] bg-[#F5F6FA] border border-[#1205B8]/25 px-3.5 py-2.5 rounded-xl">
              {notice}
            </div>
          )}

          {/* Google Sign-In Button */}
          <button
            type="button"
            disabled={submitting}
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 text-sm font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors ease-editorial disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>Google (Gmail) orqali kirish</span>
          </button>

          <div className="relative flex items-center py-0.5">
            <div className="flex-grow border-t border-slate-200" />
            <span className="shrink mx-3 text-xs text-slate-400">yoki email va parol bilan</span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#F5F6FA] border border-slate-200 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                mode === 'login' ? 'bg-white text-[#08080D] shadow-sm' : 'text-slate-600'
              }`}
            >
              Kirish
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                mode === 'signup' ? 'bg-white text-[#08080D] shadow-sm' : 'text-slate-600'
              }`}
            >
              Ro‘yxatdan o‘tish
            </button>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Ism va familiya
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Masalan: Dilshod Karimov"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1205B8]/20 focus:border-[#1205B8]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email (Gmail)</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@gmail.com"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1205B8]/20 focus:border-[#1205B8]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Parol</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kamida 6 ta belgi"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1205B8]/20 focus:border-[#1205B8]"
              />
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-3 text-xs font-semibold text-white bg-[#1205B8] hover:bg-[#09064E] rounded-xl transition-colors ease-editorial disabled:opacity-50"
            >
              {submitting
                ? 'Kutilmoqda...'
                : mode === 'login'
                ? 'Email bilan kirish'
                : 'Hisob yaratish'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
