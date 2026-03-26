import React, { memo } from 'react';
import { MessageSquare, Settings, Rocket } from 'lucide-react';

const ProcessSection: React.FC = () => {
  const steps = [
    {
      id: "01",
      title: "描述意图",
      description: "在对话框中输入您的业务构想。无论是‘一个支持多级分销的电商平台’还是‘一个自动化的财务对账系统’，灵犀都能精准捕捉。",
      icon: <MessageSquare className="w-8 h-8 text-brand" />
    },
    {
      id: "02",
      title: "交互微调",
      description: "灵犀会生成初步的系统架构与 UI 原型。您可以通过对话进行实时调整，AI 会根据您的反馈自动重构底层逻辑。",
      icon: <Settings className="w-8 h-8 text-brand" />
    },
    {
      id: "03",
      title: "一键上线",
      description: "确认蓝图后，灵犀会自动完成数据库迁移、API 部署与前端构建。您的系统将在数秒内全球上线。",
      icon: <Rocket className="w-8 h-8 text-brand" />
    }
  ];

  return (
    <section className="relative py-40 px-12 md:px-24 lg:px-32 bg-black overflow-hidden">
      {/* Noise Background - Texture Alignment with Hero */}
      <div className="absolute inset-0 noise-bg pointer-events-none" />

      {/* Background Decorative Elements - Spatial UI */}
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.07] pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-brand rounded-full blur-[200px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="mb-32 text-center">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.6em] text-brand mb-6 opacity-60">How It Works</h2>
          <h3 className="text-[64px] md:text-[80px] font-black text-white tracking-tighter leading-[0.9]">从灵感到现实<br /><span className="text-white/20">仅需三步</span></h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          {/* Connecting Line (Desktop) - Refined Linear Style */}
          <div className="hidden md:block absolute top-[48px] left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-30" />

          {steps.map((step, index) => (
            <div key={index} className="relative group">
              <div className="mb-12 flex items-center justify-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-white/[0.02] border border-white/10 flex items-center justify-center backdrop-blur-3xl group-hover:border-brand/40 group-hover:bg-brand/[0.03] transition-all duration-1000">
                    {step.icon}
                  </div>
                  <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-black border border-white/10 flex items-center justify-center text-[10px] font-bold text-white/30 group-hover:text-white group-hover:border-brand/50 transition-all duration-500">
                    {step.id}
                  </div>
                </div>
              </div>
              <div className="text-center">
                <h4 className="text-2xl font-bold text-white mb-6 group-hover:text-brand transition-colors duration-700 font-display tracking-tight">{step.title}</h4>
                <p className="text-white/30 leading-relaxed font-light text-base max-w-[280px] mx-auto text-balance group-hover:text-white/50 transition-colors duration-700">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default memo(ProcessSection);
