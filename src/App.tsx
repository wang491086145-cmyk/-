/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import PremiumFluidParticlesV3 from './components/PremiumFluidParticlesV3';
import Navbar from './components/Navbar';

// Lazy load below-the-fold sections
const ValueSection = lazy(() => import('./components/ValueSection'));
const ProcessSection = lazy(() => import('./components/ProcessSection'));
const CaseSection = lazy(() => import('./components/CaseSection'));

// Simple loading fallback for lazy components
const SectionLoader = () => (
  <div className="h-96 w-full bg-black flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
  </div>
);

export default function App() {
  return (
    <main className="min-h-screen bg-black overflow-x-hidden relative scroll-smooth">
      <Navbar />
      
      {/* Hero Section (Screen 1) */}
      <section className="h-screen relative overflow-hidden isolate z-0">
        <PremiumFluidParticlesV3 />
        
        {/* Bottom Transition Gradient - Seamless Blend */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-96 pointer-events-none z-40"
          style={{
            background: 'linear-gradient(to top, #000000 0%, rgba(0,0,0,0.8) 20%, rgba(0,0,0,0) 100%)',
          }}
        />

        {/* Brand Glow Bridge */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-32 pointer-events-none z-30">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[200px] bg-brand/20 rounded-full blur-[100px] translate-y-1/2" />
        </div>
        
        {/* Frosted Glass Accent - Maintained for visual depth */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none z-30 backdrop-blur-[2px] opacity-30"
          style={{
            background: 'linear-gradient(to top, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0) 100%)',
            maskImage: 'linear-gradient(to top, black, transparent)',
            WebkitMaskImage: 'linear-gradient(to top, black, transparent)'
          }}
        />

        {/* Footer Content from Prototype */}
        <div className="absolute bottom-24 left-32 right-32 z-50 flex justify-between items-end">
          <div className="max-w-5xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <h1 className="text-[80px] font-black leading-[1.1] tracking-tighter text-white mb-6 font-display">
              灵犀一点，万象自生
            </h1>
            <h2 className="text-[42px] font-light leading-tight tracking-tight text-white/80 font-sans">
              当意图被理解，便自动演变成系统蓝图
            </h2>
          </div>
          
          <button className="group relative px-14 py-7 overflow-hidden bg-[#763BD6] transition-all duration-500 hover:bg-[#8A4FFF] hover:scale-105 active:scale-95 shadow-2xl shadow-purple-900/40 rounded-sm">
            <span className="relative z-10 text-2xl font-bold tracking-widest text-white transition-colors duration-500">
              立即探索
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </button>
        </div>

        {/* Scroll Indicator - Visual Bridge */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4 opacity-40 hover:opacity-100 transition-opacity cursor-pointer animate-in fade-in duration-1000 delay-500">
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/60">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-white/60 to-transparent relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-white animate-scroll-line" />
          </div>
        </div>
      </section>

      {/* Content Sections - High Z-Index to cover particles */}
      <div className="relative z-50 bg-black">
        <Suspense fallback={<SectionLoader />}>
          {/* Screen 2: Product Value */}
          <ValueSection />

          {/* Screen 3: How It Works */}
          <ProcessSection />

          {/* Screen 4: Success Cases */}
          <CaseSection />
        </Suspense>

        {/* Footer / Contact Section */}
        <footer className="py-32 px-12 md:px-24 lg:px-32 bg-black border-t border-white/5">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-brand blur-[8px] opacity-40 group-hover:opacity-60 transition-opacity" />
                <span className="text-2xl font-bold tracking-tight text-white relative z-10 font-display">灵犀</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-12">
              {['关于我们', '隐私政策', '服务条款', '加入我们'].map(item => (
                <a key={item} href="#" className="text-[13px] font-medium text-white/30 hover:text-white transition-colors tracking-wide">{item}</a>
              ))}
            </div>
            <p className="text-[11px] text-white/10 font-bold uppercase tracking-[0.2em]">© 2026 LINGXI AI. ALL RIGHTS RESERVED.</p>
          </div>
        </footer>
      </div>
    </main>
  );
}
