import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'motion/react';
import { MessageSquare, Cpu, Terminal, Copy, Check, Play } from 'lucide-react';

const MOCK_CODE = `import React, { useState } from 'react';

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <nav className="flex justify-between items-center p-4 bg-zinc-900 border-b border-zinc-800">
      <div className="text-xl font-bold text-cyan-400">Lingxi AI</div>
      <div className="flex gap-4 items-center">
        <a href="#" className="text-zinc-400 hover:text-white transition-colors">Docs</a>
        {isLoggedIn ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-500" />
            <button 
              onClick={() => setIsLoggedIn(false)} 
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-all"
            >
              Logout
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsLoggedIn(true)} 
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-medium rounded-lg text-sm transition-all"
          >
            Login
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;`;

const SyntaxHighlighter = ({ code, progress }: { code: string; progress: number }) => {
  const visibleChars = Math.floor(code.length * progress);
  const displayedCode = code.slice(0, visibleChars);

  const highlight = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Very basic regex-based highlighting for the mock effect
      const highlightedLine = line
        .replace(/\b(import|from|const|export|default|return|if|else)\b/g, '<span class="text-purple-400">$1</span>')
        .replace(/\b(useState|React|Navbar)\b/g, '<span class="text-yellow-200">$1</span>')
        .replace(/(['"].*?['"])/g, '<span class="text-green-400">$1</span>')
        .replace(/\b(className|onClick)\b/g, '<span class="text-cyan-300">$1</span>')
        .replace(/(\{|\}|\(|\))/g, '<span class="text-zinc-500">$1</span>');

      return (
        <div key={i} className="flex">
          <span className="w-8 text-zinc-600 text-right pr-4 select-none text-xs leading-6">{i + 1}</span>
          <span className="leading-6" dangerouslySetInnerHTML={{ __html: highlightedLine }} />
        </div>
      );
    });
  };

  return <div className="font-mono text-sm">{highlight(displayedCode)}</div>;
};

export const Playground: React.FC = () => {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isInView) {
      const duration = 2000; // 2 seconds for typing
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const nextProgress = Math.min(elapsed / duration, 1);
        setProgress(nextProgress);

        if (nextProgress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [isInView]);

  const handleCopy = () => {
    navigator.clipboard.writeText(MOCK_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section ref={containerRef} className="py-24 px-6 bg-[#09090B]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16 text-center">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-4">
            像与同事对话一样编程
          </h2>
          <p className="text-zinc-400 text-lg">
            灵犀理解你的意图，而不仅仅是你的指令。
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 items-stretch">
          {/* Left Panel: Prompt Area */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="lg:col-span-2 flex flex-col gap-4"
          >
            <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-800/50">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <Cpu size={20} />
                </div>
                <div>
                  <h3 className="text-white font-semibold">系统指令</h3>
                  <p className="text-xs text-zinc-500">GPT-4o Optimized</p>
                </div>
              </div>

              <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {/* User Message */}
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                    <Terminal size={14} />
                  </div>
                  <div className="bg-zinc-800/50 rounded-2xl rounded-tl-none p-4 text-sm text-zinc-300 border border-zinc-700/50">
                    帮我生成一个带登录状态的导航栏组件，使用 Tailwind CSS，配色要符合灵犀的风格。
                  </div>
                </div>

                {/* AI Response Start */}
                <AnimatePresence>
                  {isInView && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 100, damping: 20 }}
                      className="flex gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0">
                        <MessageSquare size={14} />
                      </div>
                      <div className="space-y-3">
                        <div className="bg-cyan-500/5 rounded-2xl rounded-tl-none p-4 text-sm text-cyan-100/80 border border-cyan-500/20">
                          没问题。我将为你构建一个响应式的导航栏，包含：
                          <ul className="mt-2 space-y-1 list-disc list-inside text-xs opacity-70">
                            <li>状态驱动的登录/登出逻辑</li>
                            <li>灵犀专属的电光蓝渐变头像</li>
                            <li>平滑的 Hover 交互效果</li>
                          </ul>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Input Simulation */}
              <div className="mt-6 relative">
                <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-600 flex items-center justify-between">
                  <span>输入新的指令...</span>
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center">
                      <span className="text-[10px]">⌘</span>
                    </div>
                    <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center">
                      <span className="text-[10px]">K</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Panel: Editor Area */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
            className="lg:col-span-3"
          >
            <div className="bg-[#18181B] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full min-h-[500px]">
              {/* Mac Style Header */}
              <div className="bg-[#09090B] px-4 py-3 flex items-center justify-between border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5 mr-4">
                    <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                    <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                    <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                  </div>
                  <div className="flex bg-zinc-900 rounded-md px-3 py-1 items-center gap-2 border border-zinc-800">
                    <span className="text-xs text-zinc-400 font-mono">Navbar.tsx</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleCopy}
                    className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors"
                  >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-md text-xs font-medium hover:bg-cyan-500/20 transition-colors">
                    <Play size={12} fill="currentColor" />
                    运行
                  </button>
                </div>
              </div>

              {/* Editor Content */}
              <div className="flex-1 p-6 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#18181B] pointer-events-none z-10" />
                <SyntaxHighlighter code={MOCK_CODE} progress={progress} />
                
                {/* Cursor simulation */}
                {progress < 1 && progress > 0 && (
                  <motion.div 
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="w-2 h-5 bg-cyan-500 inline-block ml-1 align-middle"
                  />
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
