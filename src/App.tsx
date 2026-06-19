/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { 
  Brain, 
  Timer, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Printer, 
  Clipboard, 
  BookOpen, 
  Sparkles, 
  Gamepad2, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Volume2, 
  VolumeX, 
  TrendingUp, 
  Award,
  BookMarked,
  Info
} from "lucide-react";
import { generate50Questions, MathQuestion } from "./utils/mathGenerator";

// Sound synthesizer using browser Web Audio API (totally offline and safe)
function playTone(freqs: number[], type: 'sine' | 'square' | 'triangle' | 'sawtooth', duration: number, isMuted: boolean) {
  if (isMuted) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    let startTime = ctx.currentTime;
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime + idx * 0.08);
      
      gainNode.gain.setValueAtTime(0.15, startTime + idx * 0.08);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + idx * 0.08 + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(startTime + idx * 0.08);
      osc.stop(startTime + idx * 0.08 + duration);
    });
  } catch (error) {
    // Fail silently if browser audio block policies apply
  }
}

// 6 delightfully cute cartoons of mascots kids can choose from
const MASCOTS = [
  { id: 'bunny', name: '🌸 小蜜桃兔兔', avatar: '🐰', bg: 'bg-rose-100 border-rose-300' },
  { id: 'bear', name: '🐻 焦糖栗子熊', avatar: '🐻', bg: 'bg-amber-100 border-amber-300' },
  { id: 'kitty', name: '🐱 奶油芝士猫', avatar: '🐱', bg: 'bg-yellow-100 border-yellow-300' },
  { id: 'frog', name: '🐸 抹茶小青蛙', avatar: '🐸', bg: 'bg-emerald-100 border-emerald-300' },
  { id: 'dino', name: '🦖 奇酷霸王龙', avatar: '🦖', bg: 'bg-teal-100 border-teal-300' },
  { id: 'fox', name: '🦊 枫叶红狐狸', avatar: '🦊', bg: 'bg-orange-100 border-orange-300' }
];

const CUTE_PRAISES = [
  "🌸 哇！你太神气啦！算得又快又准，给你按个超级大赞！",
  "🧁 哔哔！太厉害啦！你真是一个顶呱呱的数数小天才，棒棒哒！",
  "🎉 哇塞！答案完全正确！你现在的眼神里闪烁着智慧的小火花哟！",
  "⭐ 棒极啦！你是数学星空里最闪亮、最聪明的那颗小金星！",
  "🎈 叮咚！全对！你离混合运算小国王/小女王的宝座又近了一步啦！",
  "🦁 简直不可思议！这么神奇的小括号都难不倒你，你太棒了！"
];

export default function App() {
  const [questions, setQuestions] = useState<MathQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [checkedAnswers, setCheckedAnswers] = useState<Record<number, boolean>>({}); // whether final answer was scored / locked
  const [activeTab, setActiveTab] = useState<'interactive' | 'grid' | 'print' | 'plainText'>('interactive');
  
  // Custom interactive state
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [activeInput, setActiveInput] = useState<string>("");
  const [selectedMascot, setSelectedMascot] = useState(MASCOTS[0]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  
  // Scoring Statistics
  const [totalQuestionsCount, setTotalQuestionsCount] = useState<number>(50);
  
  // Limit timer settings
  const [timeLimitOption, setTimeLimitOption] = useState<number>(0); // 0 = no limit, 300 = 5min, 600 = 10min, 900 = 15min
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [timerEnded, setTimerEnded] = useState<boolean>(false);
  
  // Batch Grading state
  const [batchScore, setBatchScore] = useState<{
    submitted: boolean;
    correctCount: number;
    incorrectCount: number;
    accuracy: number;
  } | null>(null);

  // Load a batch of 50 equations on component mount
  useEffect(() => {
    handleResetNewQuestions();
  }, []);

  // Sync Timer Countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive && timeLimitOption > 0 && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (interval) clearInterval(interval);
            setTimerActive(false);
            setTimerEnded(true);
            playTone([400, 300, 200], 'sawtooth', 0.6, isMuted);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timeLimitOption, timeLeft, isMuted]);

  // Restart 50 brand-new random questions
  const handleResetNewQuestions = () => {
    const qList = generate50Questions();
    setQuestions(qList);
    setUserAnswers({});
    setCheckedAnswers({});
    setCurrentIdx(0);
    setActiveInput("");
    setBatchScore(null);
    setTimerEnded(false);
    
    if (timeLimitOption > 0) {
      setTimeLeft(timeLimitOption);
      setTimerActive(true);
    } else {
      setTimeLeft(0);
      setTimerActive(false);
    }
    playTone([440, 554, 659, 880], 'sine', 0.4, isMuted);
  };

  // Turn time-limit option on/off
  const handleTimeLimitChange = (seconds: number) => {
    setTimeLimitOption(seconds);
    if (seconds > 0) {
      setTimeLeft(seconds);
      setTimerActive(true);
      setTimerEnded(false);
    } else {
      setTimeLeft(0);
      setTimerActive(false);
      setTimerEnded(false);
    }
  };

  // Convert seconds to clean display string
  const formatTime = (secs: number) => {
    const min = Math.floor(secs / 60);
    const sec = secs % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // Confirm / Grade a single question interactively
  const handleSingleCheck = (qId: number, childAnswer: string) => {
    if (!childAnswer.trim()) return;
    
    const question = questions.find(q => q.id === qId);
    if (!question) return;

    const parsedAns = parseInt(childAnswer.trim(), 10);
    const isCorrect = parsedAns === question.answer;

    // Set interactive check states
    setCheckedAnswers(prev => ({ ...prev, [qId]: true }));
    
    if (isCorrect) {
      playTone([523, 659, 784, 1046], 'triangle', 0.35, isMuted);
      // Trigger temporary confetti effect
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
    } else {
      playTone([220, 180], 'sine', 0.25, isMuted);
    }
  };

  // Update answer map on live input
  const handleInputChange = (qId: number, val: string) => {
    // Only allow whole numbers/digits
    const clean = val.replace(/[^0-9]/g, '');
    setUserAnswers(prev => ({ ...prev, [qId]: clean }));
    
    // Clear lock status if they modify the input
    if (checkedAnswers[qId]) {
      setCheckedAnswers(prev => ({ ...prev, [qId]: false }));
    }
  };

  // Batch grade all 50 answers
  const handleBatchSubmit = () => {
    let corrCount = 0;
    let incorrCount = 0;

    questions.forEach((q) => {
      const uAns = userAnswers[q.id];
      if (uAns !== undefined && uAns.trim() !== "") {
        const parsed = parseInt(uAns.trim(), 10);
        if (parsed === q.answer) {
          corrCount++;
        } else {
          incorrCount++;
        }
      } else {
        // Unanswered treated as incorrect in final batch tally
        incorrCount++;
      }
    });

    // Mark ALL as graded/locked
    const allChecked: Record<number, boolean> = {};
    questions.forEach((q) => {
      allChecked[q.id] = true;
    });
    setCheckedAnswers(allChecked);

    const calculatedAccuracy = Math.round((corrCount / 50) * 100);
    setBatchScore({
      submitted: true,
      correctCount: corrCount,
      incorrectCount: incorrCount,
      accuracy: calculatedAccuracy
    });

    if (calculatedAccuracy >= 90) {
      playTone([523, 659, 784, 1046, 1318], 'triangle', 0.6, isMuted);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    } else {
      playTone([330, 440], 'sine', 0.3, isMuted);
    }
  };

  // Reset the current set of 50 questions answers
  const handleClearCurrentAnswers = () => {
    setUserAnswers({});
    setCheckedAnswers({});
    setBatchScore(null);
    setTimerEnded(false);
    if (timeLimitOption > 0) {
      setTimeLeft(timeLimitOption);
      setTimerActive(true);
    }
    playTone([523, 261], 'sine', 0.35, isMuted);
  };

  // Clipboard copy function for plain text
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const handleCopyToClipboard = () => {
    const header = `/**********************************************************\\\n` +
                   `   🍎 三年级数学加减乘除混合运算大挑战练习卷 (限时/整洁排版 A4)  \n` +
                   `   姓名：___________  班级：___________  成绩：___________  得分：___________ \n` +
                   `\\**********************************************************/\n\n`;
    
    // 50 questions structured nicely
    const listBody = questions.map((q) => {
      const paddedId = q.id < 10 ? `0${q.id}` : `${q.id}`;
      return `${paddedId}.   ${q.expression.padEnd(20)} = ________________`;
    }).join('\n\n');

    const footer = `\n\n温馨提示：小朋友要先算小括号里面的哦！先括号 → 再乘除 → 后加减！祝你取得100分！⭐`;
    const fullText = header + listBody + footer;

    navigator.clipboard.writeText(fullText).then(() => {
      setCopyFeedback(true);
      playTone([523, 784], 'triangle', 0.2, isMuted);
      setTimeout(() => setCopyFeedback(false), 2000);
    }).catch(() => {
      // Fallback
    });
  };

  // Answer keys generator for paper
  const [showAnswerKeys, setShowAnswerKeys] = useState<boolean>(false);

  // Filter types definitions for interactive selection UI
  const currentQuestion = questions[currentIdx];
  const currentInputVal = userAnswers[currentQuestion?.id] || "";
  const currentChecked = checkedAnswers[currentQuestion?.id];
  const isCurrentCorrect = currentChecked && (parseInt(currentInputVal, 10) === currentQuestion?.answer);
  
  // Custom speaker text based on status
  const getSpeakerText = () => {
    if (!currentChecked) {
      return `你好呀！我是你的数学小助手 ${selectedMascot.name}。请问这道题 ${currentQuestion?.expression} 等于多少呢？在右边的圈圈里填入数字，然后点击【核对答案】噢！(✿◡‿◡)`;
    }
    if (isCurrentCorrect) {
      const idx = currentQuestion.id % CUTE_PRAISES.length;
      return CUTE_PRAISES[idx];
    }
    return "错啦，再算一算哦！";
  };

  // Helper stats for headers
  const getSubmissionsCount = () => {
    return Object.keys(userAnswers).filter(k => userAnswers[Number(k)] !== "").length;
  };

  return (
    <div id="school-math-app" className="min-h-screen bg-amber-50/40 text-slate-800 font-sans pb-16 transition-colors duration-200">
      
      {/* 1. Nice Ribbon Notification Timer Top Bar (no-print) */}
      <header className="bg-gradient-to-r from-teal-400 via-sky-400 to-indigo-400 text-white shadow-md py-2.5 px-4 sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-sm font-medium">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> GRADE-3 MATH
            </span>
            <span>加油小朋友！让加减乘除变得超级简单吧！🍰</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Countdown timer indicators */}
            <div className="flex items-center gap-2 bg-black/15 py-1 px-3 rounded-full border border-white/10">
              <Timer className="w-4 h-4 text-yellow-200 animate-spin" style={{ animationDuration: '6s' }} />
              <span>限时挑战：</span>
              <select
                id="timer-select-menu"
                value={timeLimitOption}
                onChange={(e) => handleTimeLimitChange(Number(e.target.value))}
                className="bg-slate-800/80 text-white text-xs rounded border border-white/20 px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-white"
              >
                <option value={0}>⏰ 不限时</option>
                <option value={300}>⏰ 5 分钟限时</option>
                <option value={600}>⏰ 10 分钟限时</option>
                <option value={900}>⏰ 15 分钟限时</option>
                <option value={1200}>⏰ 20 分钟限时</option>
              </select>

              {timeLimitOption > 0 && (
                <span className={`font-mono font-bold px-2 py-0.5 rounded ml-2 ${timeLeft < 60 ? 'bg-rose-500 text-white animate-bounce' : 'bg-teal-500 text-white'}`}>
                  {timeLeft === 0 ? "时间到！" : formatTime(timeLeft)}
                </span>
              )}
            </div>

            {/* Muted audio toggle button */}
            <button
              id="volume-toggle-button"
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 px-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all text-xs flex items-center gap-1.5"
              title={isMuted ? "开启声音反馈" : "关闭声音反馈"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-200" /> : <Volume2 className="w-4 h-4 text-yellow-200" />}
              <span>音效: {isMuted ? '关' : '开'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Confetti Animation Effect (pure CSS logic inside React for 100% reliable execution) */}
      {showConfetti && (
        <div id="confetti-particles" className="fixed inset-0 pointer-events-none z-50 overflow-hidden no-print">
          {[...Array(35)].map((_, index) => {
            const left = Math.random() * 100;
            const delay = Math.random() * 2;
            const color = ['bg-rose-400', 'bg-yellow-400', 'bg-emerald-400', 'bg-sky-400', 'bg-purple-400'][index % 5];
            const size = Math.random() * 10 + 6;
            return (
              <div
                key={index}
                className={`absolute rounded-full opacity-75 ${color} animate-bounce`}
                style={{
                  left: `${left}%`,
                  top: `-20px`,
                  width: `${size}px`,
                  height: `${size}px`,
                  animation: `fall ${Math.random() * 2 + 2}s linear infinite`,
                  animationDelay: `${delay}s`,
                }}
              />
            );
          })}
          <style>{`
            @keyframes fall {
              0% { transform: translateY(-50px) rotate(0deg); opacity: 1; }
              100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
            }
          `}</style>
        </div>
      )}

      {/* 2. Banner Hero Block (no-print) */}
      <section className="bg-gradient-to-b from-teal-50 to-amber-50/10 border-b border-amber-200/60 pt-8 pb-6 px-4 no-print">
        <div className="max-w-5xl mx-auto text-center">
          
          <div className="inline-flex items-center gap-2 bg-amber-100 border border-amber-300 rounded-full px-4 py-1.5 mb-4 text-amber-800 text-xs sm:text-sm font-semibold">
            <span className="text-base">🎒</span> 
            <span>小学三年级数学混合运算专项突破训练卷</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mb-2.5 flex items-center justify-center gap-2.5 font-sans">
            <Brain className="w-9 h-9 text-indigo-500 animate-bounce" />
            <span>快乐数学：三年级混合运算大闯关</span>
          </h1>

          <p className="text-slate-600 max-w-2xl mx-auto text-sm md:text-base leading-relaxed mb-6 font-medium">
            我们特别按照您的教学要求全新升级：加减法在 <span className="text-indigo-600 font-bold">1000以内</span>且单题中不重复出现两个三位数，乘除法严格限制在 <span className="text-indigo-600 font-bold">100以内</span>且绝不与加减法混用，保留清爽小括号。
            一页刚好共 <span className="text-indigo-600 font-bold">50道黄金练习题</span>！
          </p>

          {/* Navigation Control Tabs (no-print) */}
          <div className="flex flex-wrap justify-center gap-3 bg-white/80 p-2 rounded-2xl shadow-sm border border-slate-200/60 max-w-2xl mx-auto">
            <button
              id="tab-interactive-button"
              onClick={() => { setActiveTab('interactive'); playTone([523], 'sine', 0.1, isMuted); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'interactive'
                  ? 'bg-amber-400 text-slate-900 shadow-md shadow-amber-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Gamepad2 className="w-4 h-4 text-indigo-600" />
              <span>🎮 互动闯关模式</span>
            </button>

            <button
              id="tab-grid-button"
              onClick={() => { setActiveTab('grid'); playTone([587], 'sine', 0.1, isMuted); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'grid'
                  ? 'bg-amber-400 text-slate-900 shadow-md shadow-amber-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>📚 批量做题模式</span>
            </button>

            <button
              id="tab-print-button"
              onClick={() => { setActiveTab('print'); playTone([659], 'sine', 0.1, isMuted); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'print'
                  ? 'bg-amber-400 text-slate-900 shadow-md shadow-amber-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Printer className="w-4 h-4 text-sky-600" />
              <span>🖨️ 打印练习卷模式</span>
            </button>

            <button
              id="tab-plaintext-button"
              onClick={() => { setActiveTab('plainText'); playTone([698], 'sine', 0.1, isMuted); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'plainText'
                  ? 'bg-amber-400 text-slate-900 shadow-md shadow-amber-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Clipboard className="w-4 h-4 text-rose-500" />
              <span>📝 纯文本练习文档</span>
            </button>
          </div>

        </div>
      </section>

      {/* Time Limit Out Alert Modal overlay (no-print) */}
      {timerEnded && (
        <div id="timeout-alert-overlay" className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border-4 border-rose-300 animate-bounce">
            <div className="text-6xl mb-3">⏰</div>
            <h3 className="text-2xl font-black text-rose-500 mb-2">滴答滴答！时间到啦！</h3>
            <p className="text-slate-600 font-medium mb-6 leading-relaxed">
              规定的限时已经消耗完毕喽！不过没关系，让我们静下心来把这一套运算练习批量提交批改，看看能获取多少个满分徽章吧！✨
            </p>
            <div className="flex gap-4">
              <button
                id="timeout-batch-grade"
                onClick={() => { setTimerEnded(false); handleBatchSubmit(); }}
                className="flex-1 bg-emerald-400 hover:bg-emerald-500 text-slate-900 font-bold py-3 px-4 rounded-2xl shadow-md cursor-pointer transition-all active:translate-y-0.5"
              >
                📝 立即一键批改
              </button>
              <button
                id="timeout-close"
                onClick={() => setTimerEnded(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-5 rounded-2xl cursor-pointer transition-all"
              >
                继续作做
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Body Grid */}
      <main className="max-w-7xl mx-auto px-4 mt-6">

        {/* 3A. Statistical Dashboard Banner - ALWAYS visible for quick feedback on answered topics (no-print) */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 mb-6 no-print">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            
            <div className="flex items-center gap-4">
              <div className="bg-indigo-50 p-3.5 rounded-2xl border border-indigo-100">
                <TrendingUp className="w-7 h-7 text-indigo-500" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800">实时大卡司：闯关统计</h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  所有模式答案互通，完成进度：<span className="font-bold text-slate-700">{getSubmissionsCount()}</span> / 50 题。快来夺得你的满分小贴纸吧！
                </p>
              </div>
            </div>

            {/* Quick mini stats row */}
            <div className="flex flex-wrap items-center gap-4">
              
              <div className="bg-emerald-50/50 border border-emerald-100 px-4 py-2 rounded-2xl text-center min-w-[80px]">
                <div className="text-slate-500 text-xs font-bold">对题树 ✅</div>
                <div className="text-xl font-extrabold text-emerald-600">
                  {Object.keys(checkedAnswers).filter(k => {
                    const id = Number(k);
                    const q = questions.find(item => item.id === id);
                    return q && userAnswers[id] && parseInt(userAnswers[id].trim(), 10) === q.answer;
                  }).length}
                </div>
              </div>

              <div className="bg-rose-50/50 border border-rose-100 px-4 py-2 rounded-2xl text-center min-w-[80px]">
                <div className="text-slate-500 text-xs font-bold">错题树 ❌</div>
                <div className="text-xl font-extrabold text-rose-500">
                  {Object.keys(checkedAnswers).filter(k => {
                    const id = Number(k);
                    const q = questions.find(item => item.id === id);
                    return q && userAnswers[id] && parseInt(userAnswers[id].trim(), 10) !== q.answer;
                  }).length}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-2xl text-center min-w-[80px]">
                <div className="text-slate-500 text-xs font-bold">剩余未写 ⏳</div>
                <div className="text-xl font-extrabold text-slate-500">
                  {50 - getSubmissionsCount()}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 px-4 py-2 rounded-2xl text-center min-w-[80px]">
                <div className="text-slate-500 text-xs font-bold">当前正确率 🎯</div>
                <div className="text-xl font-extrabold text-indigo-600">
                  {(() => {
                    const attempted = Object.keys(checkedAnswers).filter(k => userAnswers[Number(k)] !== "").length;
                    if (attempted === 0) return '0%';
                    const correct = Object.keys(checkedAnswers).filter(k => {
                      const id = Number(k);
                      const q = questions.find(item => item.id === id);
                      return q && userAnswers[id] && parseInt(userAnswers[id].trim(), 10) === q.answer;
                    }).length;
                    return `${Math.round((correct / attempted) * 100)}%`;
                  })()}
                </div>
              </div>

            </div>

            {/* Quick Actions and score submission block */}
            <div className="flex gap-2.5">
              <button
                id="dashboard-batch-submit"
                onClick={handleBatchSubmit}
                className="bg-emerald-400 hover:bg-emerald-500 text-slate-900 font-extrabold text-xs sm:text-sm py-2.5 px-4 rounded-xl cursor-pointer shadow-sm transition-all focus:ring-2 focus:ring-emerald-300"
              >
                🎓 一键批量批改
              </button>
              <button
                id="reset-questions-button-top"
                onClick={handleResetNewQuestions}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl cursor-pointer transition-all border border-indigo-100 flex items-center gap-1.5"
                title="重新生成一套全新的50道题"
              >
                <RotateCcw className="w-4 h-4" />
                <span>换50道题 🔄</span>
              </button>
            </div>

          </div>

          {/* Batch Score Results Area */}
          {batchScore && (
            <div id="batch-score-card" className="mt-5 p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
              <div className="flex items-center gap-4">
                <div className="text-5xl">🏆</div>
                <div>
                  <h4 className="text-emerald-900 font-black text-lg">批改完成啦！太棒了！🎉</h4>
                  <p className="text-emerald-700 text-sm mt-0.5">
                    总共有 <span className="font-extrabold text-emerald-900">50</span> 道题。
                    你做对了 <span className="font-extrabold text-emerald-900 text-base">{batchScore.correctCount}</span> 道，
                    错误/未填 <span className="font-extrabold text-rose-500 text-base">{batchScore.incorrectCount}</span> 道。
                    最终正确率为：<span className="font-black text-xl text-indigo-600">{batchScore.accuracy}%</span>！
                  </p>
                </div>
              </div>

              {/* Award ribbon */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="block text-xs font-bold text-slate-500 uppercase">获得勋章</span>
                  <span className="text-sm font-extrabold text-slate-700">
                    {batchScore.accuracy === 100 ? "👑 完美加持数学大国王" :
                     batchScore.accuracy >= 90 ? "🌟 三年级金牌数学达人" :
                     batchScore.accuracy >= 70 ? "🎈 继续努力闪光之星" : "🌸 元气满满挑战小勇士"}
                  </span>
                </div>
                <div className="bg-amber-400 p-2.5 rounded-full shadow-md text-amber-950 animate-bounce text-xl">
                  🏅
                </div>
              </div>
            </div>
          )}

        </section>


        {/* =========================================
            TAB 1: INTERACTIVE GAME MODE
            ========================================= */}
        {activeTab === 'interactive' && (
          <div id="interactive-adventure-view" className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
            
            {/* Left Side: Mascot Chat bubble & Main Problem Card */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* Mascot Dialogue Bubble (Cute speech feedback) */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/60 flex items-start gap-4">
                {/* Mascot Selector & Avatar */}
                <div className="flex flex-col items-center gap-1 min-w-[70px]">
                  <div className={`w-14 h-14 rounded-full border-2 ${selectedMascot.bg} flex items-center justify-center text-3xl shadow-sm transition-all animate-bounce`}>
                    {selectedMascot.avatar}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 rounded-full py-0.5 px-2 text-center w-full truncate">
                    {selectedMascot.name.split(' ')[1] || selectedMascot.name}
                  </span>
                </div>

                {/* Speech text bubble */}
                <div className="flex-1 bg-yellow-50 border border-yellow-250 rounded-2xl p-4 relative bubble-arrow">
                  <p className="text-slate-800 text-sm sm:text-base font-medium leading-relaxed">
                    {getSpeakerText()}
                  </p>
                  
                  {/* Select mascot dropdown picker inside dialogue for customization */}
                  <div className="mt-3.5 pt-2.5 border-t border-yellow-200/60 flex flex-wrap items-center justify-between gap-2.5">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      🧁 点我换一个喜欢的数学小助手：
                    </span>
                    <div className="flex gap-1.5 overflow-x-auto py-1 max-w-full">
                      {MASCOTS.map((m) => (
                        <button
                          key={m.id}
                          id={`mascot-pick-${m.id}`}
                          onClick={() => { setSelectedMascot(m); playTone([523], 'sine', 0.1, isMuted); }}
                          className={`text-xs py-1 px-2.5 rounded-full transition-all flex items-center gap-1 cursor-pointer font-bold ${
                            selectedMascot.id === m.id
                              ? 'bg-amber-400 text-slate-900 ring-2 ring-amber-300'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <span>{m.avatar}</span>
                          <span className="hidden sm:inline">{m.name.split(' ')[1]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Question Display Box */}
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/60 text-center relative overflow-hidden">
                {/* Decorative kids sticker grids */}
                <div className="absolute top-3 left-3 bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold py-1 px-3 rounded-full">
                  题号：{currentIdx + 1} / 50 题
                </div>

                <div className="absolute top-3 right-3 flex items-center gap-1 bg-orange-50 text-orange-600 text-xs font-bold py-1 px-2.5 rounded-full">
                  <span>考点: </span>
                  <span className="bg-orange-200/60 px-1.5 py-0.2 rounded font-extrabold">
                    {currentQuestion?.type === 'addSub' ? '纯加减混合' :
                     currentQuestion?.type === 'mulDiv' ? '纯乘除混合' : '小括号混合'}
                  </span>
                </div>

                {/* Equation Expression */}
                <div id="active-equation-text" className="mt-12 mb-8 font-sans font-extrabold text-3xl sm:text-4xl md:text-5xl text-slate-800 tracking-wide select-none drop-shadow-xs">
                  {currentQuestion?.expression} <span className="text-teal-400">=</span> <span className="text-indigo-400">?</span>
                </div>

                {/* User Input & Single Submit button */}
                <div className="max-w-md mx-auto flex items-stretch gap-3 mb-6">
                  <input
                    type="text"
                    id="interactive-answer-input"
                    value={currentInputVal}
                    onChange={(e) => handleInputChange(currentQuestion.id, e.target.value)}
                    placeholder="在这写下你的得数~"
                    className="flex-1 bg-slate-50 border-3 border-teal-200 focus:border-teal-400 focus:outline-none rounded-2xl px-5 text-xl font-extrabold text-center transition-colors placeholder:text-slate-400 py-3.5 placeholder:text-base tracking-wide"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSingleCheck(currentQuestion.id, currentInputVal);
                    }}
                  />
                  
                  <button
                    id="verify-single-answer"
                    onClick={() => handleSingleCheck(currentQuestion.id, currentInputVal)}
                    disabled={!currentInputVal.trim()}
                    className={`px-6 rounded-2xl font-black text-sm flex items-center gap-1.5 shadow-sm select-none cursor-pointer transition-all active:translate-y-0.5 ${
                      currentInputVal.trim()
                        ? 'bg-emerald-400 text-indigo-950 hover:bg-emerald-500'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5 text-indigo-950" />
                    <span>核对答案</span>
                  </button>
                </div>

                {/* Quick numeric touch panel (super useful for kids on tablets!) */}
                <div className="bg-slate-50 rounded-2xl p-4 max-w-sm mx-auto mb-6">
                  <div className="text-xs font-bold text-slate-500 mb-2">🎈 快捷数字小键盘：</div>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
                      <button
                        key={num}
                        id={`keypad-${num}`}
                        onClick={() => {
                          handleInputChange(currentQuestion.id, currentInputVal + num);
                          playTone([350], 'nine' as any, 0.05, isMuted);
                        }}
                        className="bg-white hover:bg-slate-100 text-slate-800 font-extrabold p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-base shadow-xs select-none active:bg-slate-200 cursor-pointer"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      id="keypad-clear"
                      onClick={() => {
                        handleInputChange(currentQuestion.id, "");
                        playTone([200], 'nine' as any, 0.05, isMuted);
                      }}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold p-2.5 rounded-xl border border-rose-200 text-xs shadow-xs col-span-2 select-none active:bg-rose-200 cursor-pointer"
                    >
                      清除输入
                    </button>
                  </div>
                </div>

                {/* Instant Verification Banner */}
                {currentChecked && (
                  <div id="check-feedback-banner" className={`p-4 rounded-2xl border mb-5 text-left flex items-start gap-3 animate-fadeIn ${
                    isCurrentCorrect 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    <div className="text-2xl mt-0.5">{isCurrentCorrect ? '✅' : '❌'}</div>
                    <div className="flex-1">
                      <div className="font-extrabold text-sm sm:text-base">
                        {isCurrentCorrect ? '太棒啦！算得真准确！' : '错啦，再算一算哦！'}
                      </div>
                      
                      {/* Interactive Explanation Box */}
                      <div className="mt-2.5 pt-2.5 border-t border-emerald-250/20 text-xs text-slate-600 font-medium">
                        <span className="font-black text-slate-800 block mb-1">🎁 轻松解题思路：</span>
                        <ul className="list-decimal list-inside space-y-1 bg-white/60 p-2.5 rounded-xl border border-black/5">
                          {currentQuestion.steps.map((step, idx) => (
                            <li key={idx} className="font-mono text-slate-700 font-bold">{step}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress back / forward buttons */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-4">
                  <button
                    id="prev-question-button"
                    onClick={() => {
                      if (currentIdx > 0) {
                        setCurrentIdx(currentIdx - 1);
                        playTone([523], 'sine', 0.08, isMuted);
                      }
                    }}
                    disabled={currentIdx === 0}
                    className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed text-xs sm:text-sm transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>上一题 (Back)</span>
                  </button>

                  <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-slate-400">
                    <span>提示: 试试直接点击右边的题号，可以自由跳跃作答哦！🛸</span>
                  </div>

                  <button
                    id="next-question-button"
                    onClick={() => {
                      if (currentIdx < 49) {
                        setCurrentIdx(currentIdx + 1);
                        playTone([659], 'sine', 0.08, isMuted);
                      }
                    }}
                    disabled={currentIdx === 49}
                    className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed text-xs sm:text-sm transition-all cursor-pointer"
                  >
                    <span>下一题 (Next)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

              </div>

              {/* Standard sequence explanation card */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-5 shadow-xs flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div className="text-slate-600 text-xs leading-relaxed font-semibold">
                  <p className="font-extrabold text-indigo-900 text-sm mb-1">💡 三年级运算口诀：先乘除后加减，有小括号先算括号！</p>
                  <span>1. 看到小括号，一定要最先算它里面的值哦！</span><br />
                  <span>2. 算好括号后，遵循先算算 乘法和除法，最终才计算 加法和减法 哦。大家都要牢记这个安全行驶路线图！</span>
                </div>
              </div>

            </div>

            {/* Right Side: 1-50 Question Progress Map */}
            <div className="lg:col-span-4 bg-white rounded-3xl p-5 shadow-sm border border-slate-200/60">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-150">
                <div className="flex items-center gap-1.5 font-black text-slate-800 text-sm">
                  <BookMarked className="w-4.5 h-4.5 text-indigo-500" />
                  <span>数学王国大地图 (50题)</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400">点击任意格子跳转</span>
              </div>

              {/* Colored cells explanations */}
              <div className="grid grid-cols-3 gap-2 mb-4 text-[10px] font-bold text-slate-500 bg-slate-50 p-2.5 rounded-xl">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-slate-100 border border-slate-300 rounded inline-block"></span>
                  <span>未解答</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-emerald-100 border border-emerald-300 rounded inline-block"></span>
                  <span>对题或解答</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-rose-100 border border-rose-300 rounded inline-block"></span>
                  <span>错题或写过</span>
                </div>
              </div>

              {/* Grid 1 to 50 */}
              <div className="grid grid-cols-5 xs:grid-cols-6 sm:grid-cols-8 lg:grid-cols-5 gap-2 max-h-[420px] overflow-y-auto pr-1">
                {questions.map((q, idx) => {
                  const hasAnswer = userAnswers[q.id] !== undefined && userAnswers[q.id] !== "";
                  const isChecked = checkedAnswers[q.id];
                  const isCorrect = isChecked && hasAnswer && (parseInt(userAnswers[q.id], 10) === q.answer);
                  const isIncorrect = isChecked && (!hasAnswer || (parseInt(userAnswers[q.id], 10) !== q.answer));

                  // Determine styled colors
                  let btnColor = "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100";
                  if (idx === currentIdx) {
                    btnColor = "bg-indigo-500 text-white border-indigo-600 ring-2 ring-indigo-200 scale-105 shadow-xs font-black";
                  } else if (isCorrect) {
                    btnColor = "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200";
                  } else if (isIncorrect) {
                    btnColor = "bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200";
                  } else if (hasAnswer) {
                    btnColor = "bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100";
                  }

                  return (
                    <button
                      key={q.id}
                      id={`map-node-${q.id}`}
                      onClick={() => {
                        setCurrentIdx(idx);
                        playTone([523], 'sine', 0.05, isMuted);
                      }}
                      className={`h-11 rounded-xl border font-bold text-sm text-center flex items-center justify-center transition-all cursor-pointer ${btnColor}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Progress Bar details */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
                  <span>总答题进度</span>
                  <span>{getSubmissionsCount()} / 50 (已写)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full transition-all duration-300"
                    style={{ width: `${(getSubmissionsCount() / 50) * 100}%` }}
                  />
                </div>
              </div>

            </div>

          </div>
        )}


        {/* =========================================
            TAB 2: BATCH SHEET GRID LIST MODE
            ========================================= */}
        {activeTab === 'grid' && (
          <div id="grid-sheet-view" className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 no-print animate-fadeIn">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
              <div>
                <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-500" />
                  <span>50道混合运算速算卷（标准作答表）</span>
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  小朋友可以一口气在这里填入所有的答案！完成之后，点击页面上方或下方的【一键批量批改】按钮即可获取红花成绩单。
                </p>
              </div>

              {/* Clear Answers button */}
              <button
                id="clear-all-current-answers"
                onClick={handleClearCurrentAnswers}
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-1"
              >
                🧹 清空本次回答重新写
              </button>
            </div>

            {/* Custom grids list: 50 items layout beautifully in columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
              {questions.map((q) => {
                const isChecked = checkedAnswers[q.id];
                const cleanAns = userAnswers[q.id] || "";
                const isCorrect = isChecked && (parseInt(cleanAns, 10) === q.answer);
                
                return (
                  <div
                    key={q.id}
                    id={`sheet-item-${q.id}`}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                      isChecked 
                        ? (isCorrect ? 'bg-emerald-50/70 border-emerald-250 animate-pulse' : 'bg-rose-50/70 border-rose-250')
                        : 'bg-slate-50/40 border-slate-150 hover:bg-slate-50'
                    }`}
                  >
                    {/* ID & Equation expression text block */}
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 bg-slate-200/75 rounded-full flex items-center justify-center font-bold text-xs text-slate-600 shrink-0">
                        {q.id}
                      </span>
                      <span className="font-sans font-extrabold text-[#1e293b] text-base select-none">
                        {q.expression}
                      </span>
                      <span className="text-slate-400 font-black">=</span>
                    </div>

                    {/* Input box */}
                    <div className="flex items-center gap-1.5 max-w-[120px]">
                      <input
                        type="text"
                        value={cleanAns}
                        onChange={(e) => handleInputChange(q.id, e.target.value)}
                        placeholder="?"
                        disabled={timerEnded}
                        className={`w-16 bg-white border-2 text-center font-extrabold focus:outline-none rounded-xl py-1 text-sm ${
                          isChecked 
                            ? (isCorrect ? 'border-emerald-500 text-emerald-800 bg-emerald-100/50' : 'border-rose-400 text-rose-800 bg-rose-100/50')
                            : 'border-slate-350 focus:border-indigo-400'
                        }`}
                      />

                      {/* Tick or Cross status indicator icons */}
                      {isChecked && (
                        <span>
                          {isCorrect ? (
                            <Check className="w-4 h-4 text-emerald-600 font-black" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-500" title={`正确答案：${q.answer}`} />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick detailed answers step sheet available under grid toggle */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-[12px] font-bold text-slate-400 flex items-center gap-1 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  <span>💡 小提示: 点红色的 ❌ 图标，可以直接在当前卡片上查看该题的标准解题步骤哦！</span>
                </p>

                <button
                  id="sheet-details-toggle"
                  onClick={() => setShowAnswerKeys(!showAnswerKeys)}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  {showAnswerKeys ? "🙈 隐藏答案折叠" : "👁️ 一键展开50道题标准答案步骤"}
                </button>
              </div>

              {showAnswerKeys && (
                <div id="grid-detailed-solutions" className="mt-5 p-5 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                  {questions.map((q) => (
                    <div key={q.id} className="text-xs border-b border-dashed border-slate-200 pb-2">
                      <span className="font-extrabold text-indigo-900 font-mono mr-2">【第{q.id}题】 {q.expression} = {q.answer}</span>
                      <div className="pl-6 mt-1 text-slate-500 italic font-mono space-y-1">
                        {q.steps.map((st, sidx) => (
                          <div key={sidx}>↳ {st}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sticky Action Grading Box bottom */}
            <div className="mt-8 p-5 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="font-black text-slate-800 text-sm block">都写完啦吗？请点击核对成绩！</span>
                <span className="text-xs text-slate-500">点击按钮后，系统会对所有写过的题和没写的题做出标准评判得出总分数哦。</span>
              </div>
              <button
                id="batch-score-sheet-bottom"
                onClick={handleBatchSubmit}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 px-8 rounded-2xl shadow-md cursor-pointer transition-all active:translate-y-0.5 text-center text-sm"
              >
                🏆 批量一键提交批改
              </button>
            </div>

          </div>
        )}


        {/* =========================================
            TAB 3: PRINT SHEET DESIGN & PRINT EMULATOR
            ========================================= */}
        {activeTab === 'print' && (
          <div id="print-sheet-wrapper" className="space-y-6">
            
            {/* Print Settings Warning box (no-print) */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/60 no-print">
              <h3 className="text-lg font-black text-slate-800 mb-2.5 flex items-center gap-1.5">
                <Printer className="w-5 h-5 text-indigo-500 animate-pulse" />
                <span>打印机专属设置：全整洁排版纸卷</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                针对 A4 打印专门做了优化排版！我们<strong>移除了所有的网页多余解释、侧边栏和颜色</strong>，一页共计 50 道算式题。
                点击下方的打印按钮可以直接启动您的系统打印机（可设置为“保存为 PDF”后发送到微信群中发给学生们打印！）
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  id="trigger-system-print"
                  onClick={() => { window.print(); }}
                  className="bg-sky-400 hover:bg-sky-500 text-slate-900 font-extrabold text-sm py-2.5 px-6 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>立即启动系统打印 (Ctrl + P)</span>
                </button>

                <button
                  id="print-toggle-answers-visible"
                  onClick={() => setShowAnswerKeys(!showAnswerKeys)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  {showAnswerKeys ? "🙈 隐藏打印件里的附录答案" : "👁️ 在下方开启打印答案页"}
                </button>
                
                <span className="text-[11px] font-bold text-slate-400">
                  (注：系统会自动排除左右多余修饰)
                </span>
              </div>
            </div>

            {/* REAL A4 TEST SHEET WRAPPER (This looks clean on screen & is exactly what prints out!) */}
            <div id="real-a4-printed-paper" className="bg-white p-8 sm:p-12 border border-slate-300 shadow-lg max-w-[850px] mx-auto text-black print-card relative">
              
              {/* Score header box */}
              <div className="text-center pb-6 border-b-2 border-black/80 mb-8">
                <h2 className="text-2xl font-black tracking-tight text-black mb-2 font-sans uppercase">
                  三年级数学加减乘除混合运算训练题试学卷
                </h2>
                <p className="text-xs text-slate-600 mb-5 tracking-wide print-only">
                  运算口诀：先括号，后乘除，再加减；除法必须整除，乘除不超1000限制。一卷共计 50 题。
                </p>

                {/* Score & name line */}
                <div className="flex flex-wrap justify-center items-center gap-y-2 gap-x-8 text-sm font-bold text-slate-800 mt-4 font-mono select-none">
                  <span>姓名: ________________</span>
                  <span>班级: ________________</span>
                  <span>日期: ________________</span>
                  <span>得分: ________________</span>
                  <span>用时: ________________</span>
                </div>
              </div>

              {/* 50 math questions beautifully distributed into 2 neat dense columns */}
              <div className="grid grid-cols-2 gap-x-12 gap-y-6 text-sm text-black font-mono">
                {questions.map((q) => {
                  const paddedId = q.id < 10 ? `0${q.id}` : `${q.id}`;
                  return (
                    <div key={q.id} className="flex items-center justify-between border-b border-dotted border-slate-300/40 pb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-slate-500 w-5 text-right">{paddedId}.</span>
                        <span className="text-base font-extrabold text-black tracking-wide">
                          {q.expression}
                        </span>
                      </div>
                      <span className="text-slate-400 font-extrabold font-sans">
                        = ________________
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-12 text-center text-[11px] text-slate-400 border-t border-slate-100 pt-5 font-mono">
                ⭐ 本试卷由快乐三年级数学自适应出题引擎整洁生成。适合打印，不含多余宣传。
              </div>

              {/* COLLAPSIBLE ANSWER KEYS (prints on bottom of same page if toggled on) */}
              {showAnswerKeys && (
                <div id="printed-answer-key-box" className="mt-16 pt-10 border-t-2 border-solid border-slate-900 animate-fadeIn">
                  <h3 className="text-lg font-black text-black mb-4 flex items-center gap-1.5 uppercase font-sans">
                    🔑 试卷附录：标准答案与标准运算过程 (第1-50题)
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono text-slate-800">
                    {questions.map((q) => (
                      <div key={q.id} className="pb-2 border-b border-dashed border-slate-250">
                        <span className="font-black text-black">第 {q.id} 题：{q.expression} = {q.answer}</span>
                        <div className="pl-4 text-slate-500 text-[10px] whitespace-pre-line mt-0.5">
                          计算过程：{q.steps.join('  ➔  ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>
        )}


        {/* =========================================
            TAB 4: PLAIN TEXT OUTPUT FOR QUICK COPY
            ========================================= */}
        {activeTab === 'plainText' && (
          <div id="plain-text-view" className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 no-print animate-fadeIn">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-150 pb-4 mb-6">
              <div>
                <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Clipboard className="w-5 h-5 text-rose-500" />
                  <span>50道混合运算单页纯文本，方便复制</span>
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  一键复制排版整齐的纯练习。复制后可直接贴在 Word、微信群、作业文档或记事本，排版完美对齐。
                </p>
              </div>

              <button
                id="copy-text-action"
                onClick={handleCopyToClipboard}
                className={`py-2.5 px-6 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all text-center ${
                  copyFeedback 
                    ? 'bg-emerald-400 text-slate-900 border border-emerald-300' 
                    : 'bg-rose-400 hover:bg-rose-500 text-white'
                }`}
              >
                <Clipboard className="w-4 h-4" />
                <span>{copyFeedback ? "✅ 复制成功啦！" : "一键复制到剪贴板"}</span>
              </button>
            </div>

            {/* Clean plain-text display box */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 max-h-[500px] overflow-y-auto">
              <pre id="plain-text-container" className="text-xs sm:text-sm font-mono text-slate-800 leading-relaxed whitespace-pre-wrap select-all">
{`/**********************************************************\\
   🍎 三年级数学加减乘除混合运算大挑战练习卷 (限时/整洁排版 A4)  
   姓名：___________  班级：___________  成绩：___________  得分：___________ 
\\**********************************************************/\n\n`}
{questions.map((q) => {
  const paddedId = q.id < 10 ? `0${q.id}` : `${q.id}`;
  return `${paddedId}.   ${q.expression.padEnd(20)} = ________________`;
}).join('\n\n')}
{`\n\n温馨提示：小朋友要先算小括号里面的哦！先括号 ➔ 再乘除 ➔ 后加减！祝你取得100分！⭐`}
              </pre>
            </div>

            {/* Answer guide bottom */}
            <div className="mt-5 p-4 bg-yellow-50 rounded-2xl border border-yellow-100">
              <p className="text-xs text-amber-950 font-medium leading-relaxed">
                🐾 <strong>给老师和家长的小心意：</strong>这里排版的题目去除了所有多余字符、多余解析、没有多余标点，符合打印和测试的最简练版式。希望能够为您的教育出题工作减轻一点点工作量！
              </p>
            </div>

          </div>
        )}

      </main>

      {/* Decorative child friendly signature footer (no-print) */}
      <footer className="mt-16 text-center text-xs text-slate-400 no-print">
        <p className="font-medium">🍎 快乐数学数学乐园 · 小学三年级运算大作战专项出题系统</p>
        <p className="mt-1 text-[10px] text-slate-300">本系统对计算、范围、小括号逻辑具有硬性校验，100%正确且可追溯运算步骤。</p>
      </footer>

    </div>
  );
}
