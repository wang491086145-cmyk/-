import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Zap, Users, Code2, Cpu, Globe, TestTube, Layers } from 'lucide-react';

interface BentoCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

const BentoCard: React.FC<BentoCardProps> = ({ title, description, icon, className = "", children }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className={`relative group overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-all duration-300 hover:border-white/20 ${className}`}
    >
      {/* Spotlight Effect */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(6, 182, 212, 0.15), transparent 40%)`,
        }}
      />

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div>
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
            {icon}
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
        </div>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </motion.div>
  );
};

export const Features: React.FC = () => {
  return (
    <section className="py-24 px-6 bg-[#09090B]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-4">
            全链路 AI 赋能
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl">
            从第一行架构设计到最后一次自动化部署，灵犀为你提供企业级的端到端支持。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[240px]">
          {/* Big Card: Enterprise Security */}
          <BentoCard
            title="企业级代码安全"
            description="内置金融级加密与合规性检查，确保每一行 AI 生成的代码都符合企业安全标准。支持私有化部署，数据不出内网。"
            icon={<Shield size={24} />}
            className="md:col-span-2 md:row-span-2"
          >
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-white/5 p-4 border border-white/5">
                <div className="text-xs text-zinc-500 mb-1">合规扫描</div>
                <div className="text-cyan-400 font-mono text-lg">Passed</div>
              </div>
              <div className="rounded-xl bg-white/5 p-4 border border-white/5">
                <div className="text-xs text-zinc-500 mb-1">漏洞检测</div>
                <div className="text-green-400 font-mono text-lg">0 Issues</div>
              </div>
            </div>
          </BentoCard>

          {/* Real-time Collab */}
          <BentoCard
            title="实时协作"
            description="多人在线实时 AI 辅助编程，冲突自动解决。"
            icon={<Users size={24} />}
            className="md:col-span-1 md:row-span-1"
          />

          {/* Context Aware */}
          <BentoCard
            title="上下文感知"
            description="深度理解整个项目库，而非单个文件。"
            icon={<Zap size={24} />}
            className="md:col-span-1 md:row-span-1"
          />

          {/* Architecture */}
          <BentoCard
            title="架构设计"
            description="根据业务需求自动生成系统架构图与模块划分。"
            icon={<Layers size={24} />}
            className="md:col-span-1 md:row-span-1"
          />

          {/* Multi-language */}
          <BentoCard
            title="多语言全栈支持"
            description="从 Rust 到 TypeScript，从 SQL 到 YAML，灵犀精通 50+ 种主流编程语言与配置格式。"
            icon={<Globe size={24} />}
            className="md:col-span-2 md:row-span-1"
          >
             <div className="flex gap-2 flex-wrap mt-2">
                {['Rust', 'Go', 'TS', 'Python', 'Java', 'Swift'].map(lang => (
                  <span key={lang} className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-zinc-400 font-mono">
                    {lang}
                  </span>
                ))}
             </div>
          </BentoCard>

          {/* Automated Testing */}
          <BentoCard
            title="自动化测试"
            description="一键生成 100% 覆盖率的单元测试与集成测试。"
            icon={<TestTube size={24} />}
            className="md:col-span-1 md:row-span-1"
          />
        </div>
      </div>
    </section>
  );
};
