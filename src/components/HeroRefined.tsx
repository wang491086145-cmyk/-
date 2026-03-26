import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion } from 'motion/react';
import { Plus, Command, Search, Activity, Cpu } from 'lucide-react';

/**
 * HeroRefined Component
 * 
 * Layer 1 & 2: WebGL Flowing Energy (Shader-based waves)
 * Layer 3: Fine Dotted Grid (Particle system)
 * Layer 4: Minimalist DOM Overlay (Thin typography & Playground)
 * Footer: Ultra-thin status bar
 */

const HeroRefined: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!canvasRef.current) return;

    // --- THREE.JS SETUP ---
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // --- UNIFORMS ---
    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    };

    // --- LAYER 1 & 2: FLOWING ENERGY BACKGROUND ---
    const bgGeometry = new THREE.PlaneGeometry(2, 2);
    const bgMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec2 uResolution;
        varying vec2 vUv;

        // Simplex 2D noise
        vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
        float snoise(vec2 v){
          const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                   -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy) );
          vec2 x0 = v -   i + dot(i, C.xx);
          vec2 i1;
          i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod(i, 289.0);
          vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
          + i.x + vec3(0.0, i1.x, 1.0 ));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
            dot(x12.zw,x12.zw)), 0.0);
          m = m*m ;
          m = m*m ;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 a0 = x - floor(x + 0.5);
          float g = dot(a0, vec3(x0.x, x12.x, x12.z)) +
                    dot(h, vec3(x0.y, x12.y, x12.w));
          return 130.0 * dot(m, g);
        }

        void main() {
          vec2 uv = vUv;
          float time = uTime * 0.2;
          
          // Create flowing wave noise
          float n = snoise(vec2(uv.x * 1.5 - time, uv.y * 0.8 + time * 0.5));
          float n2 = snoise(vec2(uv.x * 1.0 + time * 0.3, uv.y * 1.2 - time * 0.2));
          
          float wave = smoothstep(0.2, 0.8, n * 0.5 + n2 * 0.5 + 0.5);
          
          vec3 color = vec3(0.0);
          vec3 purple = vec3(0.545, 0.361, 0.965); // #8B5CF6
          vec3 cyan = vec3(0.0, 1.0, 1.0); // #00FFFF
          
          // Mix colors based on noise flow
          vec3 energyColor = mix(purple, cyan, n2 * 0.5 + 0.5);
          color = mix(color, energyColor, wave * 0.15);
          
          // Add core flow highlights
          float core = smoothstep(0.6, 0.9, n * 0.5 + n2 * 0.5 + 0.5);
          color += energyColor * core * 0.1;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      transparent: true,
    });
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    scene.add(bgMesh);

    // --- LAYER 3: FINE DOTTED GRID ---
    const gridRows = 60;
    const gridCols = 100;
    const particleCount = gridRows * gridCols;
    const positions = new Float32Array(particleCount * 3);
    const initialPositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < gridRows; i++) {
      for (let j = 0; j < gridCols; j++) {
        const idx = (i * gridCols + j) * 3;
        const x = (j / (gridCols - 1)) * 2 - 1;
        const y = (i / (gridRows - 1)) * 2 - 1;
        positions[idx] = x;
        positions[idx + 1] = y;
        positions[idx + 2] = 0;
        initialPositions[idx] = x;
        initialPositions[idx + 1] = y;
        initialPositions[idx + 2] = 0;
      }
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('initialPosition', new THREE.BufferAttribute(initialPositions, 3));

    const particleMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        attribute vec3 initialPosition;
        uniform float uTime;
        uniform vec2 uMouse;
        varying float vAlpha;

        void main() {
          vec3 pos = initialPosition;
          
          // Subtle grid wave
          pos.z += sin(pos.x * 5.0 + uTime) * 0.02;
          pos.z += cos(pos.y * 5.0 + uTime) * 0.02;

          // Mouse interaction
          float dist = distance(pos.xy, uMouse);
          float force = smoothstep(0.3, 0.0, dist);
          pos.xy += normalize(pos.xy - uMouse) * force * 0.02;

          vAlpha = 0.15 + force * 0.3;

          gl_PointSize = 1.5;
          gl_Position = vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // --- INTERACTION ---
    const handleMouseMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;
      uniforms.uMouse.value.set(x, y);
      
      // Update state for DOM spotlight
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- ANIMATION LOOP ---
    const animate = (time: number) => {
      uniforms.uTime.value = time * 0.001;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    // --- CLEANUP ---
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      bgGeometry.dispose();
      bgMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-screen bg-black overflow-hidden font-sans"
      style={{ '--x': `${mousePos.x}px`, '--y': `${mousePos.y}px` } as any}
    >
      {/* WebGL Layers (1, 2, 3) */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />

      {/* Layer 4: DOM Overlay */}
      <div className="relative z-10 w-full h-full flex flex-col">
        {/* Top Nav */}
        <nav className="p-10 flex justify-between items-center w-full">
          <div className="text-white/40 text-[10px] tracking-widest-xl font-light uppercase">
            LINGXI AI / PLAYGROUND
          </div>
          <button className="glow-spotlight px-5 py-1.5 bg-white text-black text-[10px] font-medium tracking-widest uppercase rounded-full transition-transform active:scale-95">
            申请试用
          </button>
        </nav>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center -mt-20">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 30, delay: 0.2 }}
            className="text-5xl md:text-7xl lg:text-8xl font-extralight text-white tracking-widest mb-8"
          >
            定义下一代编程体验
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 30, delay: 0.3 }}
            className="text-sm md:text-base text-white/40 max-w-2xl mx-auto mb-16 leading-relaxed tracking-wider font-extralight"
          >
            灵犀：为企业级开发注入无限创意与能效。<br />
            从架构设计到代码实现，重塑开发者与机器的协作边界。
          </motion.p>

          {/* Interactive Playground */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 30, delay: 0.4 }}
            className="w-full max-w-2xl"
          >
            <div className="glow-spotlight relative group">
              <div className="absolute inset-0 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl transition-colors group-hover:bg-white/[0.08]" />
              <div className="relative p-4 flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/20">
                  <Plus size={18} />
                </div>
                <input 
                  type="text" 
                  placeholder="输入提示词（如：帮我设计一个带登录状态的导航栏组件）"
                  className="flex-1 bg-transparent border-none outline-none text-sm text-white/80 placeholder:text-white/20 font-extralight tracking-wide"
                />
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 text-white/20">
                  <Command size={14} />
                  <span className="text-[10px] font-mono">K</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Minimalist Footer */}
        <footer className="p-10 flex justify-between items-center w-full text-white/20 text-[9px] tracking-[0.3em] font-light uppercase">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Activity size={10} />
              <span>SYSTEM STATUS: OPERATIONAL</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu size={10} />
              <span>LATENCY: 14ms</span>
            </div>
          </div>
          <div>
            LINGXI ENGINE v2.5.0-STABLE
          </div>
        </footer>
      </div>

      {/* Vignette Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] opacity-60" />
    </div>
  );
};

export default HeroRefined;
