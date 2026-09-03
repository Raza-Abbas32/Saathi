import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import imageCompression from 'browser-image-compression';
import {
  MessageSquare,
  ScanSearch,
  Sprout,
  Store,
  Send,
  Loader2,
  Languages,
  Bot,
  Camera,
  X,
  Trash2,
  ZoomIn,
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import {
  getChatHistory,
  saveChatMessage,
  clearChatHistory,
  sendChatMessage,
  detectDisease,
  formatDiseaseMarkdown,
  type ChatFeature,
} from '@/services/api';
import type { ChatMessage } from '@/types';

type Lang = 'en' | 'ur';

// ── Thread configuration ──────────────────────────────────────────────────

interface ThreadConfig {
  feature: ChatFeature;
  label: string;
  badge: string;
  icon: React.ElementType;
  placeholder: { en: string; ur: string };
  emptyHeading: string;
  emptyBody: string;
  sampleQuestions: string[];
}

const THREADS: ThreadConfig[] = [
  {
    feature: 'general',
    label: 'General Assistant',
    badge: 'عام زرعی مشیر',
    icon: MessageSquare,
    placeholder: {
      en: 'Ask Saathi AI any farming question…',
      ur: 'اپنا زرعی سوال یہاں لکھیں…',
    },
    emptyHeading: 'Ask Saathi AI anything',
    emptyBody: 'Get expert agronomic guidance in English or Urdu — soil prep, water management, weather tactics, and fertilizer planning.',
    sampleQuestions: [
      'What is the best time to sow wheat in Punjab?',
      'How much water does cotton need per acre?',
      'Which DAP / Urea ratio is best for basmati rice?',
    ],
  },
  {
    feature: 'disease',
    label: 'Crop Disease Diagnosis',
    badge: 'تشخیص امراض و فوٹو',
    icon: ScanSearch,
    placeholder: {
      en: 'Ask a disease question or upload a leaf photo…',
      ur: 'فصل کی بیماری یا پتے کی تصویر کے متعلق پوچھیں…',
    },
    emptyHeading: 'Crop Disease & Visual Leaf Diagnosis',
    emptyBody: 'Upload or take a photo of an affected leaf, or ask questions about symptoms, fungicides, and treatment steps.',
    sampleQuestions: [
      'How do I treat Yellow Rust (Peeli Kungi) on wheat?',
      'What are early signs of Cotton Leaf Curl Virus (CLCuV)?',
      'Recommended organic spray for tomato blight?',
    ],
  },
  {
    feature: 'crop',
    label: 'Crop Advisor',
    badge: 'فصلوں کا مشورہ',
    icon: Sprout,
    placeholder: {
      en: 'Ask about crop selection, seed varieties, or yield…',
      ur: 'فصلوں کے انتخاب اور پیداوار کے بارے میں پوچھیں…',
    },
    emptyHeading: 'Crop Planning & Recommendations',
    emptyBody: 'Get tailored crop recommendations for your soil, province, and season, or ask about profit margins and high-yield varieties.',
    sampleQuestions: [
      'What should I plant in sandy loam in Sindh for Kharif?',
      'High-profit alternative crops to sugarcane in Punjab?',
      'Best drought-tolerant fodder crops in Balochistan?',
    ],
  },
  {
    feature: 'marketplace',
    label: 'Marketplace & Mandi',
    badge: 'منڈی و مارکیٹ',
    icon: Store,
    placeholder: {
      en: 'Ask about mandi prices, sellers, or listings…',
      ur: 'منڈی کے ریٹ اور فہرستوں کے بارے میں پوچھیں…',
    },
    emptyHeading: 'Marketplace & Mandi Assistant',
    emptyBody: 'Inquire about current grain rates, local sellers, buyers, and how to list your harvest for the best return.',
    sampleQuestions: [
      'What is the current wheat price trend in Punjab?',
      'Any basmati rice listings available near Gujranwala?',
      'How should I price maize per 40kg this season?',
    ],
  },
];

// ── Per-thread state ───────────────────────────────────────────────────────

interface ThreadState {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  historyLoaded: boolean;
}

const initialThreadState = (): ThreadState => ({
  messages: [],
  loading: false,
  error: null,
  historyLoaded: false,
});

// ── Handoff keys ──────────────────────────────────────────────────────────

const DISEASE_HANDOFF_KEY = 'saathi-disease-handoff';
const CROP_HANDOFF_KEY = 'saathi-crop-handoff';

// ── Component ─────────────────────────────────────────────────────────────

export default function AssistantPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') as ChatFeature | null;
  const activeFeature: ChatFeature =
    rawTab && ['general', 'disease', 'crop', 'marketplace'].includes(rawTab)
      ? rawTab
      : 'general';

  const [threads, setThreads] = useState<Record<ChatFeature, ThreadState>>({
    general: initialThreadState(),
    disease: initialThreadState(),
    crop: initialThreadState(),
    marketplace: initialThreadState(),
  });

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>('en');

  // In-chat leaf photo upload
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentThread = threads[activeFeature];
  const activeConfig = THREADS.find((t) => t.feature === activeFeature)!;

  // ── Switch tab ────────────────────────────────────────────────────────────

  const switchTab = (feature: ChatFeature) => {
    setSearchParams({ tab: feature }, { replace: true });
    setInput('');
    setSelectedImage(null);
    setShowClearConfirm(false);
  };

  // ── Load history for a thread (isolated) ─────────────────────────────────

  const loadHistory = useCallback(async (feature: ChatFeature) => {
    setThreads((prev) => ({
      ...prev,
      [feature]: { ...prev[feature], loading: true, historyLoaded: true },
    }));
    try {
      const history = await getChatHistory(feature);
      setThreads((prev) => ({
        ...prev,
        [feature]: { ...prev[feature], messages: history, loading: false },
      }));
    } catch {
      setThreads((prev) => ({
        ...prev,
        [feature]: { ...prev[feature], loading: false },
      }));
    }
  }, []);

  // ── Clear history for current thread ────────────────────────────────────

  const handleClearHistory = async () => {
    try {
      await clearChatHistory(activeFeature);
      setThreads((prev) => ({
        ...prev,
        [activeFeature]: {
          ...prev[activeFeature],
          messages: [],
        },
      }));
      setShowClearConfirm(false);
    } catch (e) {
      console.warn('Failed to clear thread history:', e);
    }
  };

  // ── In-chat file selection ───────────────────────────────────────────────

  const handleImageSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setIsCompressing(true);
    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      };
      const compressed = await imageCompression(file, options);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setIsCompressing(false);
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.error('Image processing error:', err);
      setIsCompressing(false);
    }
  };

  // ── Handoff processing ───────────────────────────────────────────────────

  useEffect(() => {
    if (!currentThread.historyLoaded) {
      loadHistory(activeFeature);
    }

    // Disease detection handoff
    if (activeFeature === 'disease') {
      const raw = sessionStorage.getItem(DISEASE_HANDOFF_KEY);
      if (raw) {
        sessionStorage.removeItem(DISEASE_HANDOFF_KEY);
        try {
          const { userText, aiText, imageUrl, autoAnalyze } = JSON.parse(raw) as {
            userText: string;
            aiText?: string;
            imageUrl?: string;
            autoAnalyze?: boolean;
          };

          if (autoAnalyze && imageUrl) {
            // Run live analysis in chat
            void (async () => {
              const now = Date.now();
              const userMsg: ChatMessage = {
                id: `u-${now}`,
                sender: 'user',
                text: userText,
                imageUrl,
                timestamp: now,
                feature: 'disease',
              };

              setThreads((prev) => ({
                ...prev,
                disease: {
                  ...prev.disease,
                  messages: [...prev.disease.messages, userMsg],
                  loading: false,
                },
              }));
              void saveChatMessage('disease', 'user', userText, imageUrl);

              setSending(true);
              setStatusMessage('Analyzing crop leaf image with Saathi AI pathologist…');

              try {
                const match = imageUrl.match(/^data:(.+);base64,(.+)$/);
                if (!match) throw new Error('Invalid image data format.');
                const [, mimeType, base64Data] = match;

                const result = await detectDisease(base64Data, mimeType);
                const formattedMarkdown = formatDiseaseMarkdown(result);

                const aiMsg: ChatMessage = {
                  id: `a-${Date.now()}`,
                  sender: 'ai',
                  text: formattedMarkdown,
                  timestamp: Date.now(),
                  feature: 'disease',
                };

                setThreads((prev) => ({
                  ...prev,
                  disease: {
                    ...prev.disease,
                    messages: [...prev.disease.messages, aiMsg],
                  },
                }));
                void saveChatMessage('disease', 'ai', formattedMarkdown);
              } catch (err) {
                const errorMsg =
                  err instanceof Error ? err.message : 'Could not complete leaf analysis.';
                setThreads((prev) => ({
                  ...prev,
                  disease: {
                    ...prev.disease,
                    error: errorMsg,
                  },
                }));
              } finally {
                setSending(false);
                setStatusMessage(null);
              }
            })();
          } else if (aiText) {
            // Already analyzed, inject both messages into disease history
            const now = Date.now();
            const userMsg: ChatMessage = {
              id: `handoff-u-${now}`,
              sender: 'user',
              text: userText,
              imageUrl,
              timestamp: now,
              feature: 'disease',
            };
            const aiMsg: ChatMessage = {
              id: `handoff-a-${now}`,
              sender: 'ai',
              text: aiText,
              timestamp: now + 1,
              feature: 'disease',
            };

            setThreads((prev) => ({
              ...prev,
              disease: {
                ...prev.disease,
                messages: [...prev.disease.messages, userMsg, aiMsg],
              },
            }));
            void saveChatMessage('disease', 'user', userText, imageUrl);
            void saveChatMessage('disease', 'ai', aiText);
          }
        } catch {
          /* ignore malformed */
        }
      }
    }

    // Crop recommendation handoff
    if (activeFeature === 'crop') {
      const raw = sessionStorage.getItem(CROP_HANDOFF_KEY);
      if (raw) {
        sessionStorage.removeItem(CROP_HANDOFF_KEY);
        try {
          const { userText, aiText } = JSON.parse(raw) as {
            userText: string;
            aiText: string;
          };
          const now = Date.now();
          const userMsg: ChatMessage = {
            id: `handoff-crop-u-${now}`,
            sender: 'user',
            text: userText,
            timestamp: now,
            feature: 'crop',
          };
          const aiMsg: ChatMessage = {
            id: `handoff-crop-a-${now}`,
            sender: 'ai',
            text: aiText,
            timestamp: now + 1,
            feature: 'crop',
          };

          setThreads((prev) => ({
            ...prev,
            crop: {
              ...prev.crop,
              messages: [...prev.crop.messages, userMsg, aiMsg],
            },
          }));
          void saveChatMessage('crop', 'user', userText);
          void saveChatMessage('crop', 'ai', aiText);
        } catch {
          /* ignore malformed */
        }
      }
    }
  }, [activeFeature]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll ───────────────────────────────────────────────────────────

  const activeMessages = threads[activeFeature].messages;
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages, sending]);

  // ── Send message ──────────────────────────────────────────────────────────

  const handleSend = async (text?: string) => {
    const messageText = (text ?? input).trim();
    const imageToSend = selectedImage;

    if ((!messageText && !imageToSend) || sending) return;

    setInput('');
    setSelectedImage(null);
    setSending(true);

    const now = Date.now();
    const userPrompt =
      messageText ||
      (imageToSend
        ? 'Please examine this crop leaf photo for disease symptoms, identification, and practical treatment.'
        : '');

    const userMessage: ChatMessage = {
      id: `u-${now}`,
      sender: 'user',
      text: userPrompt,
      imageUrl: imageToSend || undefined,
      timestamp: now,
      feature: activeFeature,
    };

    const historySnapshot = threads[activeFeature].messages;

    setThreads((prev) => ({
      ...prev,
      [activeFeature]: {
        ...prev[activeFeature],
        messages: [...prev[activeFeature].messages, userMessage],
        error: null,
      },
    }));

    // Persist user message to thread
    void saveChatMessage(activeFeature, 'user', userPrompt, imageToSend || undefined);

    try {
      let reply = '';

      if (imageToSend) {
        setStatusMessage(
          activeFeature === 'disease'
            ? 'Analyzing crop leaf with Saathi AI pathologist…'
            : 'Analyzing crop photo with Saathi AI…'
        );
        reply = await sendChatMessage(
          userPrompt,
          historySnapshot,
          activeFeature,
          imageToSend
        );
      } else {
        setStatusMessage('Saathi AI is preparing advice…');
        reply = await sendChatMessage(userPrompt, historySnapshot, activeFeature);
      }

      const aiMessage: ChatMessage = {
        id: `a-${Date.now()}`,
        sender: 'ai',
        text: reply,
        timestamp: Date.now(),
        feature: activeFeature,
      };

      setThreads((prev) => ({
        ...prev,
        [activeFeature]: {
          ...prev[activeFeature],
          messages: [...prev[activeFeature].messages, aiMessage],
        },
      }));

      // Persist AI reply
      void saveChatMessage(activeFeature, 'ai', reply);
    } catch (err) {
      setThreads((prev) => ({
        ...prev,
        [activeFeature]: {
          ...prev[activeFeature],
          error:
            err instanceof Error
              ? err.message
              : 'Could not get a response. Please check your connection and try again.',
        },
      }));
    } finally {
      setSending(false);
      setStatusMessage(null);
    }
  };

  const messages = currentThread.messages;

  return (
    <div>
      <PageHeader
        title="Saathi AI"
        subtitle="Your unified agricultural hub — crop disease diagnosis, agronomic advisory, farm planning, and mandi assistance."
        icon={<Bot className="w-6 h-6" />}
      />

      <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/40 flex flex-col h-[calc(100vh-220px)] min-h-[580px] overflow-hidden">
        {/* ── Apple-style Segmented Control Bar ── */}
        <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200/80">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-2xl overflow-x-auto no-scrollbar">
            {THREADS.map((thread) => {
              const Icon = thread.icon;
              const isActive = thread.feature === activeFeature;
              return (
                <button
                  key={thread.feature}
                  onClick={() => switchTab(thread.feature)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                  aria-selected={isActive}
                  role="tab"
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>{thread.label}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-800 font-semibold'
                        : 'bg-slate-200/80 text-slate-500'
                    }`}
                  >
                    {thread.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Chat Header & History Management ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-1 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <img src="/Logo/Logo.png" alt="Saathi AI" className="w-full h-full object-cover rounded-xl" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm tracking-tight">{activeConfig.label}</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200/70">
                  Online
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {sending ? (
                  <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                    <Loader2 className="w-3 h-3 animate-spin inline" />
                    {statusMessage || 'Analyzing agronomic query…'}
                  </span>
                ) : (
                  `Active session • ${messages.length} messages in thread`
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Clear History Button for this thread */}
            {messages.length > 0 && !showClearConfirm && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors border border-slate-200 font-medium"
                title="Clear conversation history for this feature"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear Thread</span>
              </button>
            )}

            {showClearConfirm && (
              <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-3 py-1 text-xs">
                <span className="text-red-700 font-medium">Clear this thread?</span>
                <button
                  onClick={handleClearHistory}
                  className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[11px] font-semibold hover:bg-red-700 transition-colors shadow-2xs"
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2 py-1 text-slate-600 hover:text-slate-900 text-[11px] font-medium"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Language toggle — shown on General thread */}
            {activeFeature === 'general' && (
              <div className="inline-flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
                <button
                  onClick={() => setLang('en')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    lang === 'en'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <Languages className="w-3 h-3" />
                  EN
                </button>
                <button
                  onClick={() => setLang('ur')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    lang === 'ur'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  اردو
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Messages Thread ── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4 bg-gradient-to-b from-slate-50/60 via-slate-50/30 to-white">
          {/* Loading history */}
          {currentThread.loading && (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
              <p className="text-slate-600 text-sm font-medium">Loading thread history…</p>
            </div>
          )}

          {/* Empty state */}
          {!currentThread.loading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 max-w-md mx-auto py-8">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200/80 shadow-xs flex items-center justify-center mb-4">
                {(() => {
                  const Icon = activeConfig.icon;
                  return <Icon className="w-8 h-8 text-emerald-600" />;
                })()}
              </div>
              <h4 className="font-bold text-slate-900 text-base mb-1.5 tracking-tight">
                {activeConfig.emptyHeading}
              </h4>
              <p className="text-slate-600 text-xs sm:text-sm mb-6 leading-relaxed">
                {activeConfig.emptyBody}
              </p>

              {/* Photo prompt helper on Disease tab */}
              {activeFeature === 'disease' && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mb-5 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-emerald-300 hover:border-emerald-600 text-emerald-800 font-semibold text-xs sm:text-sm shadow-xs transition-all hover:bg-emerald-50/60 active:scale-95"
                >
                  <Camera className="w-4 h-4 text-emerald-600" />
                  Take or Upload Leaf Photo to Diagnose
                </button>
              )}

              <div className="w-full">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Sample Inquiries
                </p>
                <div className="flex flex-col gap-2">
                  {activeConfig.sampleQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(q)}
                      disabled={sending}
                      className="text-xs sm:text-sm text-left px-4 py-2.5 rounded-2xl bg-white hover:bg-emerald-50/40 border border-slate-200 text-slate-800 hover:border-emerald-300 transition-all shadow-2xs flex items-center justify-between group active:scale-[0.99]"
                    >
                      <span>{q}</span>
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Message list */}
          {!currentThread.loading && messages.length > 0 && (
            <>
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  >
                    <div
                      className={`flex items-start gap-2.5 max-w-[90%] sm:max-w-[84%] ${
                        isUser ? 'flex-row-reverse' : ''
                      }`}
                    >
                      {!isUser && (
                        <div className="w-8 h-8 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center flex-shrink-0 overflow-hidden mt-0.5 p-0.5">
                          <img
                            src="/Logo/Logo.png"
                            alt="Saathi AI"
                            className="w-full h-full object-cover rounded-xl"
                          />
                        </div>
                      )}

                      <div className="flex flex-col">
                        {/* Image Preview (if message contains a photo) */}
                        {msg.imageUrl && (
                          <div
                            onClick={() => setZoomImageUrl(msg.imageUrl || null)}
                            className={`cursor-pointer group relative rounded-2xl overflow-hidden mb-2 border shadow-sm transition-transform hover:scale-[1.01] ${
                              isUser
                                ? 'border-emerald-300 self-end bg-black/5'
                                : 'border-slate-200 self-start bg-white'
                            }`}
                          >
                            <img
                              src={msg.imageUrl}
                              alt="Crop Leaf Scan"
                              className="w-56 sm:w-72 max-h-56 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-medium">
                              <ZoomIn className="w-4 h-4" /> Click to enlarge
                            </div>
                            <div className="absolute bottom-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <ScanSearch className="w-3 h-3 text-emerald-300" />
                              Leaf Photo
                            </div>
                          </div>
                        )}

                        {/* Text message bubble */}
                        <div
                          className={`relative group px-4 sm:px-5 py-3.5 rounded-3xl shadow-xs transition-all ${
                            isUser
                              ? 'bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 text-white rounded-br-sm shadow-sm'
                              : 'bg-white border border-slate-200/90 text-slate-900 rounded-tl-sm shadow-xs'
                          }`}
                        >
                          {!isUser && (
                            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-100 text-[11px] text-slate-400">
                              <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3 text-emerald-500" /> Saathi AI
                              </span>
                              <button
                                onClick={() => handleCopyText(msg.id, msg.text)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 text-[10px] font-medium"
                                title="Copy response to clipboard"
                              >
                                {copiedId === msg.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span className="text-emerald-600 font-semibold">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}

                          <MarkdownRenderer content={msg.text} isUser={isUser} />
                        </div>

                        {/* Timestamp */}
                        <div
                          className={`flex items-center gap-1 text-[10px] text-slate-400 mt-1 px-1.5 ${
                            isUser ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isUser && <Check className="w-3 h-3 text-slate-400" />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing / Analyzing indicator */}
              {sending && (
                <div className="flex justify-start animate-fade-in">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center flex-shrink-0 overflow-hidden p-0.5">
                      <img
                        src="/Logo/Logo.png"
                        alt="Saathi AI"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    </div>
                    <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2.5 shadow-xs">
                      <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                      <span className="text-xs text-slate-700 font-medium">
                        {statusMessage || 'Saathi AI is generating advice…'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {currentThread.error && (
                <div className="flex justify-center animate-fade-in">
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-2xl font-medium shadow-2xs">
                    {currentThread.error}
                  </p>
                </div>
              )}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Image Attachment Preview Bar ── */}
        {selectedImage && (
          <div className="px-4 py-2.5 bg-emerald-50/90 border-t border-emerald-200/80 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl overflow-hidden border border-emerald-300 shadow-xs flex-shrink-0">
                <img
                  src={selectedImage}
                  alt="Selected Leaf"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-950 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Crop Leaf Photo Attached
                </p>
                <p className="text-[11px] text-emerald-700">
                  {activeFeature === 'disease'
                    ? 'Saathi AI will identify crop condition and practical treatment.'
                    : 'Photo attached to your query.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedImage(null)}
              className="p-1.5 rounded-full text-emerald-800 hover:bg-emerald-200/70 transition-colors"
              title="Remove attachment"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Docked Apple-Style Input Bar ── */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-white/95 backdrop-blur-md">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageSelect(file);
              e.target.value = '';
            }}
          />

          <div className="flex items-center gap-2 bg-slate-100/90 focus-within:bg-white border border-slate-200/80 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 rounded-2xl p-1.5 transition-all shadow-2xs">
            {/* Camera / Photo upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || isCompressing}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                selectedImage
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'hover:bg-slate-200/70 text-slate-500 hover:text-slate-800'
              }`}
              title="Upload crop leaf photo for disease diagnosis"
              aria-label="Upload crop photo"
            >
              {isCompressing ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                selectedImage
                  ? 'Add questions about this photo (optional), or click Send…'
                  : activeFeature === 'general' && lang === 'ur'
                  ? activeConfig.placeholder.ur
                  : activeConfig.placeholder.en
              }
              disabled={sending}
              className="flex-1 bg-transparent border-none text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none px-2 py-1"
            />

            <button
              onClick={() => handleSend()}
              disabled={sending || (!input.trim() && !selectedImage)}
              className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center transition-all shadow-xs disabled:opacity-30 disabled:pointer-events-none flex-shrink-0"
              aria-label="Send message"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Image Zoom Modal ── */}
      {zoomImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setZoomImageUrl(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={zoomImageUrl}
              alt="Crop Leaf Close-up"
              className="w-full h-auto max-h-[75vh] object-contain bg-black"
            />
            <div className="p-3 bg-white flex items-center justify-between border-t border-saathi-100">
              <span className="text-xs font-semibold text-saathi-800 flex items-center gap-1.5">
                <ScanSearch className="w-4 h-4 text-harvest-600" />
                Crop Leaf Visual Inspection
              </span>
              <button
                onClick={() => setZoomImageUrl(null)}
                className="px-3 py-1 rounded-lg bg-saathi-100 hover:bg-saathi-200 text-saathi-700 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
