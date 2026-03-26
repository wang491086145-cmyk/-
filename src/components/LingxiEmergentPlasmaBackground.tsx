import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * LingxiEmergentPlasmaBackground Component
 * 
 * A high-end WebGL visual for "Lingxi AI" featuring:
 * Layer 1: Streamlined Neon Plasma Emergence (FBM + Turbulence + Domain Warping).
 * Layer 2: Breathing Dot Matrix (Interactive Grid with mouse-reactive flicker).
 */

const LingxiEmergentPlasmaBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // --- SCENE SETUP ---
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // --- UNIFORMS ---
    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(-1, -1) }, // Start off-screen
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    };

    // --- LAYER 1: STREAMLINED NEON PLASMA EMERGENCE SHADER ---
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

        // --- NOISE FUNCTIONS ---
        float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        #define OCTAVES 6
        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < OCTAVES; i++) {
            value += amplitude * noise(p);
            p *= 2.0;
            amplitude *= 0.5;
          }
          return value;
        }

        float turbulence(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < OCTAVES; i++) {
            value += amplitude * abs(noise(p) * 2.0 - 1.0);
            p *= 2.0;
            amplitude *= 0.5;
          }
          return value;
        }

        void main() {
          // Normalize coordinates and adjust for aspect ratio
          vec2 p = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);
          
          // Stretch coordinates to create a "streamlined" horizontal flow
          vec2 sp = p * vec2(0.6, 1.8); 
          
          float t = uTime * 0.15;
          
          // Domain Warping
          vec2 q = vec2(
            fbm(sp + vec2(t * 0.8, 0.0)),
            fbm(sp + vec2(5.2, 1.3) + t * 0.4)
          );
          
          vec2 r = vec2(
            turbulence(sp + 4.0 * q + vec2(1.7, 9.2) + t * 0.5),
            turbulence(sp + 4.0 * q + vec2(8.3, 2.8) + t * 0.3)
          );
          
          float f = turbulence(sp + 4.0 * r);

          // Modulate with a horizontal mask to keep it centered like an elegant wave
          float mask = smoothstep(1.8, 0.0, abs(p.y + sin(p.x * 0.5 + t) * 0.3));
          f *= mask * 1.6; // Boost intensity inside the mask

          // --- STUNNING COLOR MAPPING (Neon Pink & Cyan) ---
          vec3 black = vec3(0.0, 0.0, 0.0);
          vec3 neonCyan = vec3(0.0, 1.0, 1.0);   // #00FFFF
          vec3 neonPink = vec3(1.0, 0.0, 1.0);   // #FF00FF
          vec3 white = vec3(1.0, 1.0, 1.0);

          vec3 color = black;
          
          // 1. Outer Glow: Neon Cyan
          color = mix(color, neonCyan, smoothstep(0.1, 0.5, f) * 0.8);
          
          // 2. Inner Wrap: Neon Pink (Magenta)
          color = mix(color, neonPink, smoothstep(0.4, 0.8, f));
          
          // 3. Hot Core: Intense White
          color = mix(color, white, smoothstep(0.7, 1.0, f));

          // Over-saturation and contrast boost for that "stunning" look
          color = pow(color, vec3(0.85)); 

          // Subtle vignette
          float vignette = smoothstep(2.0, 0.2, length(p * vec2(0.5, 1.0)));
          color *= vignette;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    scene.add(bgMesh);

    // --- LAYER 2: BREATHING DOT MATRIX TEXTURE ---
    const gridDensity = 160;
    
    // Function to generate grid positions
    const generateGrid = (width: number, height: number) => {
      const aspect = width / height;
      const gridX = Math.round(gridDensity * aspect);
      const gridY = gridDensity;
      const count = gridX * gridY;
      const pos = new Float32Array(count * 3);
      
      for (let i = 0; i < gridY; i++) {
        for (let j = 0; j < gridX; j++) {
          const idx = (i * gridX + j) * 3;
          pos[idx] = (j / (gridX - 1)) * 2 - 1;
          pos[idx + 1] = (i / (gridY - 1)) * 2 - 1;
          pos[idx + 2] = 0;
        }
      }
      return pos;
    };

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      'position', 
      new THREE.BufferAttribute(generateGrid(window.innerWidth, window.innerHeight), 3)
    );

    const particleMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        uniform float uTime;
        uniform vec2 uMouse;
        varying vec2 vUv;
        varying float vDist;

        void main() {
          vUv = position.xy * 0.5 + 0.5;
          vec3 pos = position;
          
          // Calculate distance to mouse in NDC space
          vDist = distance(pos.xy, uMouse);

          gl_PointSize = 1.5; // Extremely fine dots
          gl_Position = vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vDist;

        void main() {
          // Make points circular
          float d = distance(gl_PointCoord, vec2(0.5));
          if (d > 0.5) discard;

          // 1. Global Breathing Wave (Breeze effect)
          float waveX = sin(vUv.x * 15.0 + uTime * 0.6);
          float waveY = cos(vUv.y * 12.0 - uTime * 0.4);
          float wave = waveX * waveY;
          float baseAlpha = smoothstep(-1.0, 1.0, wave) * 0.15;

          // 2. Cursor Breathing Hover Interaction
          float hoverRadius = 0.3;
          float hoverEffect = smoothstep(hoverRadius, 0.0, vDist);
          
          // High-frequency breathing flicker near mouse
          float breathSpeed = 25.0;
          float flicker = sin(uTime * breathSpeed) * 0.5 + 0.5;
          
          // Combine alphas
          float alpha = baseAlpha + hoverEffect * (0.4 + flicker * 0.4);
          
          // Color shift: Dim purple/cyan base -> Bright Cyan on hover
          vec3 baseColor = vec3(0.3, 0.2, 0.5);
          vec3 hoverColor = vec3(0.0, 1.0, 1.0); // Neon Cyan
          vec3 color = mix(baseColor, hoverColor, hoverEffect);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // --- INTERACTION & RESIZE ---
    const handleMouseMove = (event: MouseEvent) => {
      // Convert to NDC (-1 to +1)
      uniforms.uMouse.value.x = (event.clientX / window.innerWidth) * 2 - 1;
      uniforms.uMouse.value.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      renderer.setSize(width, height);
      uniforms.uResolution.value.set(width, height);
      
      // Re-generate grid to maintain uniform dot spacing
      particleGeometry.setAttribute(
        'position', 
        new THREE.BufferAttribute(generateGrid(width, height), 3)
      );
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    // --- ANIMATION LOOP ---
    // STRICT RULE: No object instantiation inside this loop
    const animate = (time: number) => {
      uniforms.uTime.value = time * 0.001;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    const animationId = requestAnimationFrame(animate);

    // --- CLEANUP ---
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      
      renderer.dispose();
      bgGeometry.dispose();
      bgMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full bg-black"
      style={{ display: 'block', zIndex: 0 }}
    />
  );
};

export default LingxiEmergentPlasmaBackground;
