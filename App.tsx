
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { AudienceType, IdiomContent, GenerationState } from './types';
import { orchestrateIdiomMAS, generateIdiomVideo } from './services/geminiService';
import { playAudio } from './utils/audioUtils';

// Define the AIStudio interface for type safety when casting
interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

const App: React.FC = () => {
  const [idiomInput, setIdiomInput] = useState('');
  const [mainCategory, setMainCategory] = useState<'child' | 'adult' | 'senior'>('child');
  const [childSubCategory, setChildSubCategory] = useState<AudienceType>(AudienceType.PRIMARY_SCHOOL);
  const [includeVideo, setIncludeVideo] = useState(false);
  
  const [content, setContent] = useState<IdiomContent | null>(null);
  const [status, setStatus] = useState<GenerationState>({
    loading: false,
    step: '',
    progress: 0,
    error: null,
    videoGenerating: false
  });

  const getTargetAudience = (): AudienceType => {
    if (mainCategory === 'adult') return AudienceType.ADULT;
    if (mainCategory === 'senior') return AudienceType.SENIOR;
    return childSubCategory;
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idiomInput.trim()) return;

    const audience = getTargetAudience();
    const isVideoRequested = includeVideo && (audience === AudienceType.KINDERGARTEN || audience === AudienceType.PRIMARY_SCHOOL);

    if (isVideoRequested) {
      // Use type casting to avoid global Window declaration conflicts as window.aistudio is pre-configured
      const aistudio = (window as any).aistudio as AIStudio;
      // Check if API key is selected before generating video with Veo
      const hasKey = await aistudio.hasSelectedApiKey();
      if (!hasKey) await aistudio.openSelectKey();
    }

    setStatus({ loading: true, step: '正在启动多智能体系统...', progress: 5, error: null, videoGenerating: false });
    setContent(null);

    try {
      // 执行 MAS 工作流 (内部带重试)
      const result = await orchestrateIdiomMAS(idiomInput, audience, (step, progress) => {
        setStatus(prev => ({ ...prev, step, progress }));
      });

      let videoUrl = undefined;
      if (isVideoRequested && result.videoPrompt) {
        setStatus(prev => ({ ...prev, videoGenerating: true, step: '正在生成动态演绎视频...' }));
        try {
          // 视频生成 (内部带重试)
          videoUrl = await generateIdiomVideo(result.videoPrompt, (step) => {
            setStatus(prev => ({ ...prev, step }));
          });
        } catch (vErr) {
          console.error("Video error after retries:", vErr);
        }
      }

      setContent({ ...result, videoUrl });
      setStatus({ loading: false, step: '', progress: 100, error: null, videoGenerating: false });
    } catch (err: any) {
      console.error("Generation error after 3 attempts:", err);
      setStatus({ 
        loading: false, 
        step: '', 
        progress: 0, 
        error: `经过3次重试后仍然失败：${err.message || '未知错误'}。请检查您的网络设置或稍后再试。`, 
        videoGenerating: false 
      });
    }
  };

  return (
    <Layout>
      <section className="bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 border border-slate-100 p-10 mb-10 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -z-10 -mr-32 -mt-32"></div>
        <form onSubmit={handleGenerate} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-5">
              <label className="block text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">成语输入</label>
              <input
                type="text"
                value={idiomInput}
                onChange={(e) => setIdiomInput(e.target.value)}
                placeholder="在此输入四字成语..."
                className="w-full px-6 py-5 rounded-3xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 outline-none transition-all text-2xl font-serif-zh placeholder:text-slate-300"
              />
            </div>
            
            <div className="lg:col-span-4">
              <label className="block text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">选择受众</label>
              <div className="flex bg-slate-50 p-1.5 rounded-full border border-slate-100">
                {(['child', 'adult', 'senior'] as const).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setMainCategory(cat)}
                    className={`flex-1 py-3 px-4 rounded-full text-sm font-bold transition-all ${
                      mainCategory === cat ? 'bg-white shadow-lg text-indigo-600' : 'text-slate-400'
                    }`}
                  >
                    {cat === 'child' ? '儿童' : cat === 'adult' ? '成年' : '老年'}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3">
              <button
                disabled={status.loading || !idiomInput}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-black rounded-3xl shadow-xl shadow-indigo-200 transition-all active:scale-95 text-lg"
              >
                {status.loading ? 'AI 创作中 (带自动重试)...' : '生成连环画'}
              </button>
            </div>
          </div>

          {mainCategory === 'child' && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-indigo-50/50 rounded-[2rem] border border-indigo-100/50 animate-in fade-in zoom-in duration-500">
              <div className="space-y-4">
                <span className="text-xs font-black text-indigo-300 uppercase tracking-wider">年龄分层</span>
                <div className="flex gap-4">
                  {[
                    { id: AudienceType.KINDERGARTEN, label: '幼儿园' },
                    { id: AudienceType.PRIMARY_SCHOOL, label: '小学' },
                    { id: AudienceType.MIDDLE_SCHOOL, label: '中学' }
                  ].map(sub => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setChildSubCategory(sub.id)}
                      className={`px-8 py-3 rounded-2xl text-sm font-bold transition-all border-2 ${
                        childSubCategory === sub.id 
                        ? 'bg-white border-indigo-500 text-indigo-600 shadow-lg' 
                        : 'bg-transparent border-transparent text-indigo-300 hover:text-indigo-500'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              </div>

              {(childSubCategory === AudienceType.KINDERGARTEN || childSubCategory === AudienceType.PRIMARY_SCHOOL) && (
                <div className="bg-white/80 backdrop-blur p-5 rounded-2xl border border-indigo-100 flex items-center gap-6 shadow-sm">
                   <div className="text-right">
                      <span className="block font-black text-indigo-900 text-sm">开启动画视频</span>
                      <span className="text-indigo-300 text-[10px] font-bold">需付费密钥支持</span>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={includeVideo} onChange={e => setIncludeVideo(e.target.checked)} />
                      <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                   </label>
                </div>
              )}
            </div>
          )}
        </form>

        {status.loading && (
          <div className="mt-10 space-y-4">
            <div className="flex justify-between items-end">
               <div className="space-y-1">
                  <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">Generation Phase</p>
                  <p className="text-xl font-bold text-slate-700 font-serif-zh animate-pulse">{status.step}</p>
               </div>
               <span className="text-4xl font-black text-indigo-100">{status.progress}%</span>
            </div>
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden p-1 border border-slate-50">
               <div className="h-full bg-indigo-500 rounded-full transition-all duration-500 shadow-sm" style={{ width: `${status.progress}%` }}></div>
            </div>
          </div>
        )}

        {status.error && (
          <div className="mt-8 p-6 bg-red-50 text-red-600 rounded-3xl border border-red-100 text-sm font-bold flex items-center gap-4 animate-bounce">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">!</div>
            {status.error}
          </div>
        )}
      </section>

      {content && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
          
          {/* 左侧主要内容 */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* 视频演绎 */}
            {content.videoUrl && (
              <div className="group relative rounded-[3rem] overflow-hidden shadow-2xl shadow-indigo-500/20 bg-slate-900 aspect-video border-[8px] border-white">
                <video src={content.videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
                <div className="absolute top-6 left-6 px-6 py-2 bg-indigo-600/90 backdrop-blur-md text-white font-black text-xs rounded-full tracking-widest uppercase">
                  AI Animated Vision
                </div>
              </div>
            )}

            {/* 连环画 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {content.panels.map((panel, idx) => (
                <div key={idx} className="bg-white p-5 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-50 group hover:scale-[1.02] transition-transform duration-500">
                  <div className="aspect-square relative rounded-[2rem] overflow-hidden mb-6">
                    <img src={panel.imageUrl} className="w-full h-full object-cover" alt={panel.description} />
                    <div className="absolute top-6 left-6 w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl shadow-lg border border-white/50">
                      {idx + 1}
                    </div>
                  </div>
                  <p className="text-center text-slate-400 font-bold tracking-widest text-xs uppercase mb-2">Scene {idx + 1}</p>
                </div>
              ))}
            </div>

            {/* 故事正文 */}
            <div className="bg-white rounded-[3rem] p-12 shadow-xl shadow-slate-200/50 border border-slate-50 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
               <div className="flex items-center justify-between mb-10">
                  <h3 className="text-4xl font-black text-slate-800 font-serif-zh tracking-tight">故事画卷</h3>
                  {content.audioBase64 && (
                    <button
                      onClick={() => playAudio(content.audioBase64!)}
                      className="group flex items-center gap-4 px-8 py-4 bg-indigo-600 text-white rounded-3xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95"
                    >
                      <svg className="h-6 w-6 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"/></svg>
                      <span className="font-black tracking-widest">聆听故事</span>
                    </button>
                  )}
               </div>
               <div className="prose prose-indigo max-w-none">
                  <p className="text-2xl text-slate-700 leading-[1.8] font-serif-zh whitespace-pre-line first-letter:text-6xl first-letter:font-black first-letter:text-indigo-600 first-letter:mr-4 first-letter:float-left">
                    {content.story}
                  </p>
               </div>
            </div>
          </div>

          {/* 右侧侧边栏 */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-slate-900 rounded-[3rem] p-10 text-white sticky top-10 shadow-2xl">
              <div className="space-y-1 mb-10">
                <span className="text-indigo-400 text-xs font-black uppercase tracking-[0.3em]">The Essence</span>
                <h2 className="text-6xl font-black font-serif-zh leading-none">{content.idiom}</h2>
              </div>
              
              <div className="space-y-10">
                <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10 hover:bg-white/10 transition-colors">
                  <h4 className="text-indigo-300 text-sm font-black mb-4 flex items-center gap-3">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                    核心释义
                  </h4>
                  <p className="text-slate-200 text-lg leading-relaxed font-serif-zh">{content.explanation}</p>
                </div>

                <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10 hover:bg-white/10 transition-colors">
                  <h4 className="text-indigo-300 text-sm font-black mb-4 flex items-center gap-3">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                    典籍追溯
                  </h4>
                  <p className="text-slate-400 text-sm italic font-serif-zh leading-relaxed">{content.origin}</p>
                </div>

                <div className="p-8 bg-indigo-600/20 rounded-[2rem] border border-indigo-500/30">
                  <h4 className="text-indigo-300 text-xs font-black mb-4 uppercase tracking-widest">Visual DNA</h4>
                  <div className="flex flex-wrap gap-2">
                     {content.visualBible.colorPalette.split(',').map((color, idx) => (
                       <span key={idx} className="px-3 py-1 bg-white/5 rounded-full text-[10px] text-white/60 font-mono">{color.trim()}</span>
                     ))}
                  </div>
                </div>
              </div>

              <div className="mt-12 pt-10 border-t border-white/10 flex items-center justify-between opacity-50">
                 <span className="text-[10px] font-black tracking-widest uppercase">Gemini 3 Pro MAS Pipeline</span>
                 <div className="flex gap-1">
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!content && !status.loading && (
        <div className="flex flex-col items-center justify-center py-40 animate-in fade-in duration-1000">
           <div className="relative group">
              <div className="absolute inset-0 bg-indigo-400 rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <div className="w-48 h-48 bg-white rounded-full flex items-center justify-center relative shadow-2xl border border-slate-50">
                <svg className="w-24 h-24 text-indigo-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
           </div>
           <h2 className="text-3xl font-black text-slate-800 font-serif-zh mt-12 tracking-tight">开启成语智能创作之旅</h2>
           <p className="text-slate-400 mt-4 font-bold tracking-widest text-xs uppercase">Enter an Idiom to Generate AI Powered Visual Storytelling</p>
        </div>
      )}
    </Layout>
  );
};

export default App;
