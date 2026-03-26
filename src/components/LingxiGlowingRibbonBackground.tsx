import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * LingxiGlowingRibbonBackground Component
 * 
 * A high-end WebGL visual featuring:
 * Layer 1: Glowing Ribbon (Pure mathematical inverse-distance plasma curve, no noise/FBM).
 * Layer 2: Breathing Dot Matrix (Interactive Grid with sine-wave breathing).
 */

const LingxiGlowingRibbonBackground: React.FC = () => {
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
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    };

    // --- LAYER 1: GLOWING RIBBON (INVERSE DISTANCE CURVE) ---
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

        void main() {
          // 1. Map UV to center [-1.0, 1.0] and correct aspect ratio
          vec2 uv = vUv * 2.0 - 1.0;
          uv.x *= uResolution.x / uResolution.y;

          // 2. Build dynamic curves using pure math (sine/cosine)
          // We use 3 overlapping waves to create a rich, complex ribbon (like Apple Intelligence)
          float t = uTime * 0.8;
          
          float wave1 = sin(uv.y * 2.5 - t * 1.5) * 0.5 + cos(uv.y * 1.5 + t * 0.8) * 0.2;
          float wave2 = sin(uv.y * 3.0 - t * 1.2) * 0.4 + cos(uv.y * 2.0 - t * 0.5) * 0.3;
          float wave3 = sin(uv.y * 2.0 - t * 1.0) * 0.6 + cos(uv.y * 2.5 + t * 1.2) * 0.1;

          // 3. Calculate distance fields
          float dist1 = abs(uv.x - wave1);
          float dist2 = abs(uv.x - wave2);
          float dist3 = abs(uv.x - wave3);

          // 4. Inverse Distance Glow (The Core Magic)
          // This creates the overexposed white core and smooth neon falloff
          float glow = (0.025 / (dist1 + 0.01)) + 
                       (0.020 / (dist2 + 0.01)) + 
                       (0.015 / (dist3 + 0.01));

          // 5. Stunning Color Mixing (Neon Pink & Neon Cyan)
          vec3 neonPink = vec3(1.0, 0.0, 1.0); // #FF00FF
          vec3 neonCyan = vec3(0.0, 1.0, 1.0); // #00FFFF
          
          // Smooth transition based on Y axis and time
          float mixFactor = sin(uv.y * 2.0 + t) * 0.5 + 0.5;
          vec3 baseColor = mix(neonPink, neonCyan, mixFactor);
          
          // Add a secondary color shift for depth
          vec3 secondaryColor = mix(neonCyan, neonPink, sin(uv.y * 3.0 - t * 1.5) * 0.5 + 0.5);
          vec3 finalColor = mix(baseColor, secondaryColor, 0.5);

          // 6. Final Output
          // Multiply color by glow. The center will exceed 1.0 and naturally clip to pure white.
          vec3 renderColor = finalColor * glow;

          // Pure black background
          gl_FragColor = vec4(renderColor, 1.0);
        }
      `,
      depthWrite: false,
    });
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    scene.add(bgMesh);

    // --- LAYER 2: BREATHING DOT MATRIX ---
    const gridDensity = 120; // Number of dots vertically
    
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
        varying vec2 vUv;
        void main() {
          // Map position to 0.0 - 1.0 for UV
          vUv = position.xy * 0.5 + 0.5;
          gl_PointSize = 1.5;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;

        void main() {
          // Circular dot
          float d = distance(gl_PointCoord, vec2(0.5));
          if (d > 0.5) discard;

          // Breathing effect (Water-like ripple)
          float waveX = sin(vUv.x * 20.0 + uTime * 2.0);
          float waveY = cos(vUv.y * 15.0 - uTime * 1.5);
          float breath = waveX * waveY;
          
          // Faint grayish-white with breathing alpha
          float alpha = 0.02 + (breath * 0.5 + 0.5) * 0.08;

          gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // --- RESIZE HANDLER ---
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

    window.addEventListener('resize', handleResize);

    // --- ANIMATION LOOP ---
    const animate = (time: number) => {
      uniforms.uTime.value = time * 0.001;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    const animationId = requestAnimationFrame(animate);

    // --- CLEANUP ---
    return () => {
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

export default LingxiGlowingRibbonBackground;
