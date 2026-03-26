import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles, Terminal } from 'lucide-react';

/**
 * HeroEmergence Component
 * 
 * Layer 1 & 2: WebGL Background (Shader-based dynamic gradients)
 * Layer 3: Particle System (Interactive points with repulsion force)
 * Layer 4: DOM Overlay (Tailwind CSS typography and UI)
 */

const HeroEmergence: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // --- THREE.JS SETUP ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

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

    // --- LAYER 1 & 2: BACKGROUND PLANE (SHADER GRADIENTS) ---
    // Using a full-screen plane with a custom shader for "emerging" purple energy
    const bgGeometry = new THREE.PlaneGeometry(20, 20);
    const bgMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
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
          
          // Create multiple layers of noise for "emerging" effect
          float n1 = snoise(uv * 2.0 + uTime * 0.1);
          float n2 = snoise(uv * 4.0 - uTime * 0.15);
          float n3 = snoise(uv * 8.0 + uTime * 0.2);
          
          float combinedNoise = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
          
          // Base color: Deep Black
          vec3 color = vec3(0.0);
          
          // Luminous Purple/Violet colors
          vec3 purple1 = vec4(0.545, 0.361, 0.965, 1.0).rgb; // #8B5CF6
          vec3 purple2 = vec4(0.659, 0.333, 0.969, 1.0).rgb; // #A855F7
          
          // Map noise to color intensity
          float intensity = smoothstep(0.1, 0.8, combinedNoise);
          color = mix(color, purple1, intensity * 0.4);
          color = mix(color, purple2, pow(intensity, 2.0) * 0.6);
          
          // Add some "energy flow" highlights
          float highlight = smoothstep(0.7, 0.9, n2);
          color += vec3(0.2, 0.1, 0.4) * highlight;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    bgMesh.position.z = -1;
    scene.add(bgMesh);

    // --- LAYER 3: PARTICLE SYSTEM (POINTS) ---
    const particleCount = 80000;
    const positions = new Float32Array(particleCount * 3);
    const randoms = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
      randoms[i] = Math.random();
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

    const particleMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        attribute float aRandom;
        uniform float uTime;
        uniform vec2 uMouse;
        varying float vAlpha;

        void main() {
          vec3 pos = position;
          
          // Subtle floating motion
          pos.y += sin(uTime * 0.5 + aRandom * 10.0) * 0.1;
          pos.x += cos(uTime * 0.3 + aRandom * 10.0) * 0.1;

          // Mouse interaction: Repulsion Force
          vec2 mouse = uMouse * vec2(7.5, 5.0); // Map normalized mouse to scene coords
          float dist = distance(pos.xy, mouse);
          float force = smoothstep(2.0, 0.0, dist);
          
          vec2 dir = normalize(pos.xy - mouse);
          pos.xy += dir * force * 0.8;

          vAlpha = smoothstep(0.0, 0.5, aRandom) * (1.0 - force * 0.5);

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = (1.5 + aRandom * 2.0) * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          if (dist > 0.5) discard;
          
          float strength = 1.0 - (dist * 2.0);
          gl_FragColor = vec4(0.7, 0.8, 1.0, vAlpha * strength * 0.6);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // --- INTERACTION ---
    const handleMouseMove = (event: MouseEvent) => {
      uniforms.uMouse.value.x = (event.clientX / window.innerWidth) * 2 - 1;
      uniforms.uMouse.value.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- ANIMATION LOOP ---
    const clock = new THREE.Clock();
    const animate = () => {
      const elapsedTime = clock.getElapsedTime();
      uniforms.uTime.value = elapsedTime;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

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
    <div ref={containerRef} className="relative w-full h-screen bg-black overflow-hidden">
      {/* WebGL Layers (1, 2, 3) */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />

      {/* Layer 4: DOM Overlay */}
      <div className="relative z-10 w-full h-full flex flex-col pointer-events-none">
        {/* Nav Header */}
        <nav className="p-8 flex justify-between items-center w-full">
          <div className="flex items-center gap-2 text-white/80 font-mono text-sm tracking-widest">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            LINGXI AI / PLAYGROUND
          </div>
          <div className="hidden md:flex gap-8 text-white/40 text-xs font-medium tracking-widest uppercase">
            <span className="hover:text-white transition-colors cursor-pointer pointer-events-auto">Architecture</span>
            <span className="hover:text-white transition-colors cursor-pointer pointer-events-auto">Security</span>
            <span className="hover:text-white transition-colors cursor-pointer pointer-events-auto">Docs</span>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-cyan-400 text-xs font-medium"
          >
            <Sparkles size={14} />
            <span>端到端全链路 AI 赋能</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
            className="text-5xl md:text-8xl font-display font-bold text-white tracking-tighter leading-[0.9] mb-8 max-w-5xl"
          >
            定义下一代<br />
            <span className="bg-gradient-to-r from-cyan-400 via-purple-500 to-blue-600 bg-clip-text text-transparent">
              编程体验
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
            className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            灵犀：为企业级开发注入无限创意与能效。<br className="hidden md:block" />
            从架构设计到代码实现，重塑开发者与机器的协作边界。
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 pointer-events-auto"
          >
            {/* Primary Button with Glow */}
            <button className="glow-border glow-shadow relative px-10 py-4 bg-white text-black font-bold rounded-xl flex items-center gap-2 group transition-all hover:scale-105 active:scale-95">
              开始构建
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Secondary Button */}
            <button className="px-10 py-4 bg-white/5 border border-white/10 backdrop-blur-md text-white font-bold rounded-xl hover:bg-white/10 transition-all active:scale-95">
              申请试用
            </button>
          </motion.div>
        </div>

        {/* Footer Info */}
        <div className="p-8 flex justify-between items-end text-white/20 text-[10px] font-mono tracking-[0.2em] uppercase">
          <div className="flex flex-col gap-1">
            <span>System Status: Operational</span>
            <span>Latency: 14ms</span>
          </div>
          <div className="flex items-center gap-4">
            <Terminal size={14} />
            <span>Lingxi Engine v2.5.0-stable</span>
          </div>
        </div>
      </div>

      {/* Bottom Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,black_90%)]" />
    </div>
  );
};

export default HeroEmergence;
