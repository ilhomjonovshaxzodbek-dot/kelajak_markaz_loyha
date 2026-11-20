import React, { useState } from 'react';
import {
  Bot,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Megaphone,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Users,
} from 'lucide-react';
import type { CenterStateSnapshot, TelegramChatType } from '../shared/types';

interface DiscoveredChat {
  chatId: string;
  title: string;
  type: 'channel' | 'group';
  username?: string;
  discoveredAt: string;
}

interface BotConnectAndCodeViewProps {
  centerState: CenterStateSnapshot;
  onStateSync: (nextState: CenterStateSnapshot) => void;
}

const STANDALONE_BOT_CODE = `// kelajak-markazi-bot.ts (Node.js + Grammy / Telegraf yoki fetch orqali mustaqil bot)
import 'dotenv/config';
import express from 'express';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TG_API = \`https://api.telegram.org/bot\${BOT_TOKEN}\`;

const COURSES = [
  { id: 'math', title: 'Matematika (DTM)', price: "650 000 so'm", time: 'Du/Chor/Ju 14:00' },
  { id: 'ielts', title: 'Ingliz tili & IELTS 7.5+', price: "720 000 so'm", time: 'Du/Chor/Ju 10:00' },
  { id: 'bio-chem', title: 'Biologiya va Kimyo', price: "680 000 so'm", time: 'Se/Pay/Sha 15:00' },
  { id: 'it', title: 'Dasturlash va AI', price: "900 000 so'm", time: 'Se/Pay/Sha 16:30' },
];

async function sendMessage(chatId: number | string, text: string, replyMarkup?: unknown) {
  await fetch(\`\${TG_API}/sendMessage\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, reply_markup: replyMarkup }),
  });
}

// /start va /ustoz buyruqlarini qayta ishlash
export async function handleUpdate(update: any) {
  const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
  const text = update.message?.text;
  const data = update.callback_query?.data;
  if (!chatId) return;

  if (text === '/start') {
    await sendMessage(chatId, 'Assalomu alaykum! Kelajak Markazi botiga xush kelibsiz.', {
      inline_keyboard: [
        [{ text: 'Kurslar katalogi', callback_data: 'courses' }],
        [{ text: 'Sinov darsiga yozilish', callback_data: 'register' }],
        [{ text: 'Ustozlar kabineti', callback_data: 'teacher_menu' }],
      ],
    });
  } else if (data === 'courses') {
    const list = COURSES.map(c => \`• \${c.title} — \${c.price} (\${c.time})\`).join('\\n');
    await sendMessage(chatId, \`Kelajak Markazi kurslari:\\n\\n\${list}\`);
  } else if (data === 'teacher_menu' || text === '/ustoz') {
    await sendMessage(chatId, 'Ustoz paneli: Tezkor yo‘qlama va vazifa tekshirish.', {
      inline_keyboard: [
        [{ text: 'Tezkor yo‘qlama', callback_data: 't_attendance' }],
        [{ text: 'Guruhga e’lon', callback_data: 't_broadcast' }],
      ],
    });
  }
}
`;

export const BotConnectAndCodeView: React.FC<BotConnectAndCodeViewProps> = ({
  centerState,
  onStateSync,
}) => {
  const [copied, setCopied] = useState(false);

  // Telegram Group / Channel form state
  const [commTitle, setCommTitle] = useState('');
  const [commType, setCommType] = useState<TelegramChatType>('channel');
  const [commTarget, setCommTarget] = useState('');
  const [commInviteLink, setCommInviteLink] = useState('');
  const [commLinkedGroupId, setCommLinkedGroupId] = useState('');
  const [commSaving, setCommSaving] = useState(false);
  const [commError, setCommError] = useState<string | null>(null);

  // Direct message sender per community
  const [activeSendId, setActiveSendId] = useState<string | null>(null);
  const [sendMessageText, setSendMessageText] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendFeedback, setSendFeedback] = useState<{
    communityId: string;
    ok: boolean;
    text: string;
  } | null>(null);

  // Auto-discovered Telegram groups & channels
  const [discoveredChats, setDiscoveredChats] = useState<DiscoveredChat[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [discoverNote, setDiscoverNote] = useState<string | null>(null);

  const handleDiscoverChats = async () => {
    setDiscovering(true);
    setDiscoverNote(null);
    try {
      const res = await fetch('/api/telegram/discovered-chats');
      const data = (await res.json()) as { ok?: boolean; chats?: DiscoveredChat[] };
      if (res.ok && data.ok && Array.isArray(data.chats)) {
        setDiscoveredChats(data.chats);
        if (data.chats.length === 0) {
          setDiscoverNote(
            'Hozircha yangi guruh yoki kanal aniqlanmadi. Avval botni guruhga Admin qilib qo‘shing va guruhda /id yozing.'
          );
        }
      } else {
        setDiscoverNote('Guruhlarni aniqlashda xatolik yuz berdi.');
      }
    } catch {
      setDiscoverNote('Server bilan bog‘lanishda xatolik.');
    } finally {
      setDiscovering(false);
    }
  };

  const handleAddCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commTitle.trim() || !commTarget.trim()) return;
    setCommSaving(true);
    setCommError(null);
    try {
      const res = await fetch('/api/admin/telegram-community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: commTitle.trim(),
          type: commType,
          chatIdOrUsername: commTarget.trim(),
          inviteLink: commInviteLink.trim() || undefined,
          linkedGroupId: commLinkedGroupId || undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        state?: CenterStateSnapshot;
      };
      if (!res.ok || !data.state) {
        setCommError(data.error || 'Saqlashda xatolik yuz berdi.');
      } else {
        onStateSync(data.state);
        setCommTitle('');
        setCommTarget('');
        setCommInviteLink('');
        setCommLinkedGroupId('');
      }
    } catch {
      setCommError('Server bilan bog‘lanishda xatolik.');
    } finally {
      setCommSaving(false);
    }
  };

  const handleDeleteCommunity = async (id: string) => {
    setCommError(null);
    try {
      const res = await fetch(`/api/admin/telegram-community/${id}`, { method: 'DELETE' });
      const data = (await res.json()) as { state?: CenterStateSnapshot };
      if (data.state) onStateSync(data.state);
    } catch {
      setCommError('Kanal/guruhni o‘chirishda xatolik.');
    }
  };

  const handleSendToCommunity = async (id: string, customText?: string) => {
    setSendingId(id);
    setSendFeedback(null);
    try {
      const res = await fetch(`/api/admin/telegram-community/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: customText }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        state?: CenterStateSnapshot;
      };
      if (!res.ok || !data.ok) {
        setSendFeedback({
          communityId: id,
          ok: false,
          text: data.error || 'Xabar yuborib bo‘lmadi.',
        });
      } else {
        if (data.state) onStateSync(data.state);
        setSendFeedback({
          communityId: id,
          ok: true,
          text: 'Xabar Telegram kanal/guruhga muvaffaqiyatli yuborildi!',
        });
        setSendMessageText('');
        setActiveSendId(null);
      }
    } catch {
      setSendFeedback({
        communityId: id,
        ok: false,
        text: 'Server bilan bog‘lanishda xatolik.',
      });
    } finally {
      setSendingId(null);
    }
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(STANDALONE_BOT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCode = () => {
    const blob = new Blob([STANDALONE_BOT_CODE], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kelajak-markazi-bot.ts';
    a.click();
    URL.revokeObjectURL(url);
  };

  const { telegramStatus, telegramCommunities } = centerState;

  return (
    <div className="space-y-6">
      {/* Top Row: Live Bot Connection + Telegram Groups & Channels Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Server-Managed Telegram Bot Status */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div>
            <div className="text-xs font-bold text-[#1205B8] uppercase tracking-wider">
              Telegram Bot Holati
            </div>
            <h2 className="text-base font-bold text-[#08080D] mt-0.5">
              Serverga Ulangan Telegram Bot
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Bot tokeni sayt interfeysidan kiritilmaydi — u to‘g‘ridan-to‘g‘ri server muhitida
              (Railway <span className="font-mono text-[#08080D]">Variables</span>) saqlanadi va
              server yoqilganda avtomatik ishga tushadi.
            </p>
          </div>

          {telegramStatus.connected ? (
            <div className="p-5 bg-[#09064E] text-white border border-white/10 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Bot Telegramda jonli ishlamoqda</span>
              </div>
              <div className="text-xs text-slate-200 space-y-1.5 tabular-nums tracking-wide">
                <div>
                  Bot nomi: <span className="font-semibold text-white">{telegramStatus.botName}</span>
                </div>
                <div>
                  Username:{' '}
                  <span className="font-mono font-semibold text-[#9CA8FF]">
                    @{telegramStatus.botUsername}
                  </span>
                </div>
                <div>Faol chatlar soni: {telegramStatus.activeChatsCount} ta</div>
              </div>
            </div>
          ) : (
            <div className="p-5 bg-[#F5F6FA] border border-slate-200 rounded-2xl space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#08080D]">
                <Bot className="w-4 h-4 text-[#1205B8]" />
                <span>Server tokeni kutilmoqda</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Botni yoqish uchun Railway → <span className="font-semibold text-[#08080D]">Variables</span>{' '}
                bo‘limiga <span className="font-mono text-[#08080D]">TELEGRAM_BOT_TOKEN</span>{' '}
                o‘zgaruvchisini qo‘shing. Server qayta ishga tushgach bot avtomatik faollashadi.
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-600 leading-relaxed">
            <h3 className="font-semibold text-slate-900">Kanal yoki guruhda ishlashi uchun:</h3>
            <p>1. Botingizni Telegram kanalingiz yoki guruhingizga Admin qilib qo‘shing.</p>
            <p>2. O‘ng tarafdagi forma orqali kanal/guruh @username yoki Chat ID sini kiriting.</p>
            <p>3. Shundan so‘ng Admin va Ustoz e’lonlari to‘g‘ridan-to‘g‘ri Telegramga ketadi.</p>
          </div>
        </section>

        {/* Right: Telegram Groups & Channels Add + List */}
        <section className="lg:col-span-7 space-y-5">
          {/* Add Form */}
          <form
            onSubmit={handleAddCommunity}
            className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#1205B8]" />
                <h2 className="text-base font-bold text-[#08080D]">
                  Telegram Guruh yoki Kanal Qo‘shish
                </h2>
              </div>
              {telegramStatus.connected && (
                <button
                  type="button"
                  onClick={handleDiscoverChats}
                  disabled={discovering}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1205B8] bg-[#F5F6FA] border border-[#1205B8]/20 hover:bg-[#1205B8] hover:text-white rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${discovering ? 'animate-spin' : ''}`} />
                  <span>{discovering ? 'Qidirilmoqda...' : 'Guruh ID ni aniqlash'}</span>
                </button>
              )}
            </div>

            {telegramStatus.connected && (
              <div className="p-3.5 bg-[#F5F6FA] border border-slate-200 rounded-xl space-y-2.5 text-xs text-slate-600">
                <p>
                  <span className="font-semibold text-[#08080D]">Maxfiy guruh yoki kanal uchun:</span>{' '}
                  <span className="font-mono text-[#08080D]">@{telegramStatus.botUsername}</span>{' '}
                  botini guruh/kanalga Admin qilib qo‘shing, guruhga{' '}
                  <span className="font-mono font-semibold text-[#08080D]">/id</span> yozing (yoki
                  kanalga 1 ta post tashlang) va «Guruh ID ni aniqlash» tugmasini bosing.
                </p>
                {discoveredChats.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {discoveredChats.map((dc) => (
                      <button
                        key={dc.chatId}
                        type="button"
                        onClick={() => {
                          setCommType(dc.type);
                          setCommTitle(dc.title);
                          setCommTarget(dc.chatId);
                          if (dc.username && !commInviteLink) {
                            setCommInviteLink(`https://t.me/${dc.username.replace(/^@/, '')}`);
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 hover:border-[#1205B8] text-[#08080D] rounded-lg transition-colors"
                      >
                        + {dc.title} ({dc.chatId})
                      </button>
                    ))}
                  </div>
                )}
                {discoverNote && (
                  <p className="text-xs font-medium text-amber-700">{discoverNote}</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Turi</label>
                <select
                  value={commType}
                  onChange={(e) => setCommType(e.target.value as TelegramChatType)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1205B8]/20 focus:border-[#1205B8]"
                >
                  <option value="channel">Telegram Kanal</option>
                  <option value="group">Telegram Guruh</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Nomi (markaz ichida ko‘rinishi)
                </label>
                <input
                  type="text"
                  required
                  value={commTitle}
                  onChange={(e) => setCommTitle(e.target.value)}
                  placeholder="Masalan: Kelajak Markazi Rasmiy Kanali"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1205B8]/20 focus:border-[#1205B8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  @username yoki Chat ID
                </label>
                <input
                  type="text"
                  required
                  value={commTarget}
                  onChange={(e) => setCommTarget(e.target.value)}
                  placeholder="@kelajak_markazi yoki -1001234567890"
                  className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1205B8]/20 focus:border-[#1205B8]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Taklif havolasi (ixtiyoriy)
                </label>
                <input
                  type="url"
                  value={commInviteLink}
                  onChange={(e) => setCommInviteLink(e.target.value)}
                  placeholder="https://t.me/kelajak_markazi"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1205B8]/20 focus:border-[#1205B8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
              <div className="sm:col-span-7">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  O‘quv guruhiga bog‘lash (ixtiyoriy)
                </label>
                <select
                  value={commLinkedGroupId}
                  onChange={(e) => setCommLinkedGroupId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1205B8]/20 focus:border-[#1205B8]"
                >
                  <option value="">Umumiy markaz kanali / guruhi</option>
                  {centerState.groups.map((grp) => (
                    <option key={grp.id} value={grp.id}>
                      {grp.name} ({grp.teacherName})
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-5">
                <button
                  type="submit"
                  disabled={commSaving}
                  className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-[#08080D] hover:bg-[#1205B8] rounded-xl transition-colors ease-editorial disabled:opacity-50"
                >
                  {commSaving ? 'Saqlanmoqda...' : 'Kanal / Guruhni qo‘shish'}
                </button>
              </div>
            </div>

            {commError && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-xl">
                {commError}
              </p>
            )}
          </form>

          {/* List of Connected Channels & Groups */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Ulangan Telegram Kanal va Guruhlar ({telegramCommunities.length})
              </h2>
            </div>

            {telegramCommunities.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Hozircha Telegram kanal yoki guruh qo‘shilmagan. Yuqoridagi forma orqali markaz
                kanali yoki o‘quv guruhlarini qo‘shing.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {telegramCommunities.map((comm) => {
                  const linkedGroup = centerState.groups.find((g) => g.id === comm.linkedGroupId);
                  const isComposing = activeSendId === comm.id;
                  const itemFeedback =
                    sendFeedback && sendFeedback.communityId === comm.id ? sendFeedback : null;
                  return (
                    <div key={comm.id} className="p-5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {comm.type === 'channel' ? (
                              <Megaphone className="w-4 h-4 text-[#1205B8] shrink-0" />
                            ) : (
                              <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                            <span className="text-sm font-semibold text-[#08080D]">
                              {comm.title}
                            </span>
                            <span className="text-xs text-slate-500">
                              · {comm.type === 'channel' ? 'Kanal' : 'Guruh'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span className="font-mono text-slate-700">
                              {comm.chatIdOrUsername}
                            </span>
                            {linkedGroup && <span>Guruh: {linkedGroup.name}</span>}
                            {comm.inviteLink && (
                              <a
                                href={comm.inviteLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[#1205B8] hover:underline"
                              >
                                <span>Havola</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSendFeedback(null);
                              setActiveSendId(isComposing ? null : comm.id);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#1205B8] bg-[#F5F6FA] border border-[#1205B8]/20 hover:bg-[#1205B8] hover:text-white rounded-xl transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Xabar yuborish</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCommunity(comm.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                            aria-label="O‘chirish"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {isComposing && (
                        <div className="pt-2 flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={sendMessageText}
                            onChange={(e) => setSendMessageText(e.target.value)}
                            placeholder="Kanal/guruhga yuboriladigan xabar matni (bo‘sh qoldirsangiz test xabari ketadi)..."
                            className="flex-1 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1205B8]/20 focus:border-[#1205B8]"
                          />
                          <button
                            type="button"
                            disabled={sendingId === comm.id}
                            onClick={() => handleSendToCommunity(comm.id, sendMessageText)}
                            className="px-4 py-2 text-xs font-semibold text-white bg-[#1205B8] hover:bg-[#09064E] rounded-xl disabled:opacity-50 whitespace-nowrap transition-colors"
                          >
                            {sendingId === comm.id ? 'Yuborilmoqda...' : 'Telegramga yuborish'}
                          </button>
                        </div>
                      )}

                      {itemFeedback && (
                        <p
                          className={`text-xs font-medium px-3.5 py-2.5 rounded-xl border ${
                            itemFeedback.ok
                              ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                              : 'text-rose-800 bg-rose-50 border-rose-200'
                          }`}
                        >
                          {itemFeedback.text}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Bottom Row: Exportable Production Code */}
      <section className="bg-[#08080D] border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">
              Mustaqil Server Uchun Tayyor Bot Kodi (TypeScript)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Alohida VPS yoki Cloud Run serverga joylash uchun tayyor shablon
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-[#09064E] border border-white/15 hover:bg-[#1205B8] rounded-xl transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copied ? 'Nusxalandi' : 'Nusxalash'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadCode}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1205B8] hover:bg-indigo-600 rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Yuklab olish</span>
            </button>
          </div>
        </div>

        <pre className="p-6 text-slate-100 text-xs leading-relaxed overflow-x-auto thin-scroll max-h-[360px]">
          <code>{STANDALONE_BOT_CODE}</code>
        </pre>
      </section>
    </div>
  );
};

