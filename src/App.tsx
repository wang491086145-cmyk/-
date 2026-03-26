/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import PremiumFluidParticles from './components/PremiumFluidParticles';
import PremiumFluidParticlesV2 from './components/PremiumFluidParticlesV2';
import PremiumFluidParticlesV3 from './components/PremiumFluidParticlesV3';
import Navbar from './components/Navbar';

export default function App() {
  const [version, setVersion] = useState<'v1' | 'v2' | 'v3'>('v3');

  return (
    <main className="min-h-screen bg-black overflow-hidden relative">
      <Navbar />
      
      {version === 'v1' && <PremiumFluidParticles />}
      {version === 'v2' && <PremiumFluidParticlesV2 />}
      {version === 'v3' && <PremiumFluidParticlesV3 />}
      
      {/* Version Toggle UI - Moved to bottom right */}
      <div className="fixed bottom-8 right-8 z-50 flex gap-2 p-2 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10">
        <button 
          onClick={() => setVersion('v1')}
          className={`px-4 py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all duration-300 ${
            version === 'v1' 
              ? 'bg-white text-black' 
              : 'bg-transparent text-white/40 hover:text-white'
          }`}
        >
          V1
        </button>
        <button 
          onClick={() => setVersion('v2')}
          className={`px-4 py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all duration-300 ${
            version === 'v2' 
              ? 'bg-white text-black' 
              : 'bg-transparent text-white/40 hover:text-white'
          }`}
        >
          V2
        </button>
        <button 
          onClick={() => setVersion('v3')}
          className={`px-4 py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all duration-300 ${
            version === 'v3' 
              ? 'bg-white text-black' 
              : 'bg-transparent text-white/40 hover:text-white'
          }`}
        >
          V3
        </button>
      </div>

      {/* Bottom Frosted Glass Gradient (320px) */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-80 pointer-events-none z-40 backdrop-blur-sm"
        style={{
          background: 'linear-gradient(to top, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 100%)',
          maskImage: 'linear-gradient(to top, black, transparent)',
          WebkitMaskImage: 'linear-gradient(to top, black, transparent)'
        }}
      />

      {/* Footer Content from Prototype */}
      <div className="fixed bottom-24 left-32 right-32 z-50 flex justify-between items-end">
        <div className="max-w-5xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-[80px] font-black leading-[1.1] tracking-tighter text-white mb-6 font-display">
            灵犀一点，万象自生
          </h1>
          <p className="text-[42px] font-light leading-tight tracking-tight text-white/80 font-sans">
            当意图被理解，便自动演变成系统蓝图
          </p>
        </div>
        
        <button className="group relative px-14 py-7 overflow-hidden bg-[#763BD6] transition-all duration-500 hover:bg-[#8A4FFF] hover:scale-105 active:scale-95 shadow-2xl shadow-purple-900/40 rounded-sm">
          <span className="relative z-10 text-2xl font-bold tracking-widest text-white transition-colors duration-500">
            立即探索
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </button>
      </div>
    </main>
  );
}
