import React from 'react';

const Navbar: React.FC = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] px-32 py-4">
      {/* Glassmorphism Background with Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-transparent backdrop-blur-md border-b border-white/5 pointer-events-none" />
      
      <div className="relative flex items-center justify-between">
        {/* Left: Logo & Brand */}
        <div className="flex items-center gap-3 group cursor-pointer">
          <svg viewBox="0 0 330 330" className="w-10 h-10 drop-shadow-[0_0_8px_rgba(86,81,232,0.4)]">
            <g>
              <path d="M255.53699,60L215.61536,60L172.41541,103.199951L267.35988,103.199951L267.35988,227.03995L172.83194,227.03995L215.82379,270.0318L215.61559,270.24001L255.53676,270.24001L255.32855,270.0318L306.23999,219.12036L306.23999,110.703011L255.53699,60ZM156.99228,227.03995L62.879883,227.03995L62.879883,103.199951L157.40881,103.199951L114.208855,60L74.495247,60L24,110.495247L24,219.32812L74.703678,270.0318L74.495472,270.24001L114.208633,270.24001L114.000427,270.0318L156.99228,227.03995Z" fill-rule="evenodd" fill="#5651E8" />
            </g>
            <path d="M275.3155,142.016784996L275.315487,141.999942779541L285.615753,142.0082675526L294.233318,142.0011415482L294.233307,142.015232342L294.28019,142.015270233L320.534904,168.269276L320.549576,187.232868L301.585827,187.218353L284.774891,170.408255L267.963715,187.218197L249.00012207031,187.232876L249.014633179,168.269117L275.268612,142.016823769L275.3155,142.016784996Z" fill-rule="evenodd" fill="#5651E8" transform="matrix(-1,5.400847769010397e-8,5.400847769010397e-8,1,497.9999923307962,-0.000013448110934177748)" />
            <path d="M179.3155,142.016784996L179.315487,141.999942779541L189.61575299999998,142.0082675526L198.233318,142.0011415482L198.233307,142.015232342L198.28019,142.015270233L224.53490399999998,168.269276L224.549576,187.232868L205.585827,187.218353L188.774891,170.408255L171.963715,187.218197L153.00012207031,187.232876L153.014633179,168.269117L179.268612,142.016823769L179.3155,142.016784996Z" fill-rule="evenodd" fill="#5651E8" transform="matrix(-1,5.400847769010397e-8,5.400847769010397e-8,1,305.9999923307962,-0.000008263297075927767)" />
          </svg>
          <span className="text-2xl font-bold tracking-tight text-white/90 font-sans">
            灵犀
          </span>
        </div>

        {/* Right: Links & CTA */}
        <div className="flex items-center gap-10">
          <div className="hidden md:flex items-center gap-8">
            {['工作台', '技能', '问题反馈', '使用手册'].map((item) => (
              <a
                key={item}
                href="#"
                className="text-sm font-medium text-white/60 hover:text-white transition-colors duration-300 tracking-wide"
              >
                {item}
              </a>
            ))}
          </div>

          <button className="relative group overflow-hidden px-6 py-2.5 rounded-[8px] bg-[#763BD6] hover:bg-[#8A4FFF] transition-colors duration-500 shadow-xl shadow-purple-900/40">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <span className="relative text-sm font-semibold text-white tracking-wider flex items-center">
              立即探索
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
