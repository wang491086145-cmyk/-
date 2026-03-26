import React, { memo } from 'react';
import { Zap, Shield, Cpu, Globe } from 'lucide-react';

const ValueSection: React.FC = () => {
  const values = [
    {
      title: "意图即蓝图",
      description: "超越简单的代码生成，灵犀能够深度理解业务逻辑，将模糊的自然语言直接转化为严谨的系统架构蓝图。",
      icon: <Zap className="w-6 h-6 text-brand" />,
      image: "https://picsum.photos/seed/blueprint/1200/800",
      width: 1200,
      height: 800,
      className: "md:col-span-2 md:row-span-2"
    },
    {
      title: "生产级交付",
      description: "生成的不仅仅是 Demo。从数据库 Schema 到 API 接口，每一行代码都符合工业级标准，开箱即用。",
      icon: <Shield className="w-6 h-6 text-brand" />,
      image: "https://picsum.photos/seed/server/600/400",
      width: 600,
      height: 400,
      className: "md:col-span-1 md:row-span-1"
    },
    {
      title: "自进化引擎",
      description: "基于最新的大模型技术，灵犀会根据您的反馈不断迭代，自动优化系统性能与安全性。",
      icon: <Cpu className="w-6 h-6 text-brand" />,
      image: "https://picsum.photos/seed/ai/600/400",
      width: 600,
      height: 400,
      className: "md:col-span-1 md:row-span-1"
    },
    {
      title: "全球化部署",
      description: "一键分发至全球边缘节点，内置多语言支持与合规性检查，助力业务快速出海。",
      icon: <Globe className="w-6 h-6 text-brand" />,
      image: "https://picsum.photos/seed/global/1200/400",
      width: 1200,
      height: 400,
      className: "md:col-span-2 md:row-span-1"
    }
  ];

  return (
    <section className="relative py-40 px-12 md:px-24 lg:px-32 bg-black overflow-hidden">
      {/* Noise Background - Texture Alignment with Hero */}
      <div className="absolute inset-0 noise-bg pointer-events-none" />

      {/* Top Ambient Light - Seamless Transition from Hero */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[400px] bg-brand/10 rounded-full blur-[120px] -translate-y-1/2" />
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="mb-24">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.6em] text-brand mb-6 opacity-60">Product Value</h2>
          <h3 className="text-[64px] md:text-[80px] font-black text-white tracking-tighter leading-[0.9] max-w-2xl text-balance">
            重塑软件开发的<br /><span className="text-white/20">工业边界</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {values.map((value, index) => (
            <div 
              key={index}
              className={`glass-panel relative overflow-hidden transition-all duration-1000 hover:bg-white/[0.03] hover:border-white/10 group ${value.className}`}
            >
              {/* Image Background with Gradient Overlay */}
              <div className="absolute inset-0 z-0">
                <img 
                  src={value.image} 
                  alt={value.title} 
                  width={value.width}
                  height={value.height}
                  loading="lazy"
                  className="w-full h-full object-cover opacity-[0.15] grayscale group-hover:scale-105 group-hover:opacity-25 group-hover:grayscale-0 transition-all duration-1000 ease-out"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              </div>

              {/* Content */}
              <div className="relative z-10 p-10 h-full flex flex-col justify-end">
                <div className="mb-8 p-4 rounded-2xl bg-white/5 w-fit group-hover:bg-brand/10 group-hover:scale-110 transition-all duration-700">
                  {value.icon}
                </div>
                <h4 className="text-2xl font-bold text-white mb-4 font-display tracking-tight">{value.title}</h4>
                <p className="text-white/30 leading-relaxed font-light text-lg group-hover:text-white/50 transition-colors duration-700">
                  {value.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default memo(ValueSection);
