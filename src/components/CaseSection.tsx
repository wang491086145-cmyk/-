import React, { memo } from 'react';
import { ArrowRight } from 'lucide-react';

const CaseSection: React.FC = () => {
  const cases = [
    {
      company: "FinTech Global",
      title: "全自动化交易风控系统",
      description: "灵犀在 48 小时内构建了完整的风控蓝图，将原本需要 3 个月的开发周期缩短至一周。",
      image: "https://picsum.photos/seed/fintech/800/600",
      width: 800,
      height: 600,
      tag: "金融科技"
    },
    {
      company: "EcoLogistics",
      title: "智能物流调度中枢",
      description: "通过灵犀的意图识别，实现了复杂的路径优化算法与实时车辆监控系统的无缝集成。",
      image: "https://picsum.photos/seed/logistics/800/600",
      width: 800,
      height: 600,
      tag: "智能物流"
    },
    {
      company: "MetaRetail",
      title: "全渠道个性化营销引擎",
      description: "灵犀帮助 MetaRetail 快速迭代其推荐逻辑，实现了 30% 的转化率提升。",
      image: "https://picsum.photos/seed/retail/800/600",
      width: 800,
      height: 600,
      tag: "新零售"
    }
  ];

  return (
    <section className="relative py-40 px-12 md:px-24 lg:px-32 bg-black overflow-hidden">
      {/* Noise Background - Texture Alignment with Hero */}
      <div className="absolute inset-0 noise-bg pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="mb-24 flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.6em] text-brand mb-6 opacity-60">Success Stories</h2>
            <h3 className="text-[64px] md:text-[80px] font-black text-white tracking-tighter leading-[0.9]">见证灵犀的<br /><span className="text-white/20">实战力量</span></h3>
          </div>
          <button className="flex items-center gap-4 text-white/30 hover:text-white transition-all duration-500 group">
            <span className="text-[10px] font-bold uppercase tracking-[0.4em]">View All Cases</span>
            <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-brand/50 group-hover:bg-brand/10 transition-all duration-500">
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {cases.map((item, index) => (
            <div key={index} className="group cursor-pointer">
              <div className="relative aspect-[4/5] rounded-[32px] overflow-hidden mb-10 border border-white/5">
                <img 
                  src={item.image} 
                  alt={item.title} 
                  width={item.width}
                  height={item.height}
                  loading="lazy"
                  className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000 ease-out"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
                <div className="absolute top-8 left-8">
                  <span className="px-4 py-2 rounded-full bg-black/40 backdrop-blur-xl text-[10px] font-bold text-white/60 uppercase tracking-widest border border-white/10 group-hover:text-white group-hover:border-brand/50 transition-all duration-500">
                    {item.tag}
                  </span>
                </div>
              </div>
              <h4 className="text-[11px] font-bold text-brand/60 mb-3 uppercase tracking-[0.2em] group-hover:text-brand transition-colors duration-500">{item.company}</h4>
              <h5 className="text-2xl font-bold text-white mb-4 group-hover:text-white transition-colors duration-500 font-display tracking-tight">{item.title}</h5>
              <p className="text-white/30 leading-relaxed font-light text-base group-hover:text-white/50 transition-colors duration-700">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default memo(CaseSection);
