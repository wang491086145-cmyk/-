import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * LingxiBackground Component
 * 
 * A high-performance WebGL background featuring:
 * Layer 1: Fluid Emergence Shader using Fractal Brownian Motion (FBM).
 * Layer 2: Breathing Dot Matrix with interactive mouse repulsion and flicker.
 */

const LingxiBackground: React.FC = () => {
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
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // --- UNIFORMS ---
    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    };

    // --- LAYER 1: FLUID EMERGENCE (FBM SHADER) ---
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

        // --- GLSL NOISE & FBM FUNCTIONS ---
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
          float frequency = 0.0;
          for (int i = 0; i < OCTAVES; i++) {
            value += amplitude * noise(p);
            p *= 2.0;
            amplitude *= 0.5;
          }
          return value;
        }

        void main() {
          vec2 uv = vUv;
          vec2 p = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);
          
          // Domain Warping for fluid feel
          vec2 q = vec2(
            fbm(p + vec2(0.0, 0.0) + uTime * 0.1),
            fbm(p + vec2(5.2, 1.3) + uTime * 0.15)
          );
          vec2 r = vec2(
            fbm(p + 4.0 * q + vec2(1.7, 9.2) + uTime * 0.05),
            fbm(p + 4.0 * q + vec2(8.3, 2.8) + uTime * 0.08)
          );
          float f = fbm(p + 4.0 * r);

          // Color Mapping
          vec3 color = vec3(0.0); // Abyss Black
          vec3 deepPurple = vec3(0.117, 0.062, 0.227); // #1E103A
          vec3 electricPurple = vec3(0.545, 0.361, 0.965); // #8B5CF6
          vec3 cyan = vec3(0.0, 1.0, 1.0); // #00FFFF

          color = mix(color, deepPurple, clamp(f * 2.0, 0.0, 1.0));
          color = mix(color, electricPurple, clamp(pow(f, 3.0) * 3.5, 0.0, 1.0));
          color = mix(color, cyan, clamp(pow(f, 5.0) * 2.0, 0.0, 1.0));

          // Darken edges
          color *= smoothstep(1.5, 0.2, length(p));

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      transparent: true,
    });
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    scene.add(bgMesh);

    // --- LAYER 2: BREATHING DOT MATRIX ---
    const gridDensity = 120;
    const aspectRatio = window.innerWidth / window.innerHeight;
    const gridX = Math.round(gridDensity * aspectRatio);
    const gridY = gridDensity;
    const particleCount = gridX * gridY;

    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < gridY; i++) {
      for (let j = 0; j < gridX; j++) {
        const idx = (i * gridX + j) * 3;
        positions[idx] = (j / (gridX - 1)) * 2 - 1;
        positions[idx + 1] = (i / (gridY - 1)) * 2 - 1;
        positions[idx + 2] = 0;
      }
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

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
          vDist = distance(pos.xy, uMouse);

          gl_PointSize = 1.5;
          gl_Position = vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vDist;

        void main() {
          // Circular point shape
          float d = distance(gl_PointCoord, vec2(0.5));
          if (d > 0.5) discard;

          // Breathing wave transparency
          float wave = sin(vUv.x * 10.0 + uTime) * cos(vUv.y * 8.0 - uTime * 0.5);
          float alpha = smoothstep(-1.0, 1.0, wave) * 0.15;

          // Mouse Hover Interaction
          float hoverRadius = 0.3;
          float hoverEffect = smoothstep(hoverRadius, 0.0, vDist);
          
          // High-frequency breathing flicker near mouse
          float flicker = sin(uTime * 20.0) * 0.5 + 0.5;
          
          alpha += hoverEffect * (0.4 + flicker * 0.3);
          
          vec3 color = mix(vec3(0.5, 0.4, 0.8), vec3(0.7, 0.9, 1.0), hoverEffect);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // --- INTERACTION & RESIZE ---
    const handleMouseMove = (event: MouseEvent) => {
      uniforms.uMouse.value.x = (event.clientX / window.innerWidth) * 2 - 1;
      uniforms.uMouse.value.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
      
      // Re-calculate grid positions for new aspect ratio
      const newAspectRatio = window.innerWidth / window.innerHeight;
      const newGridX = Math.round(gridDensity * newAspectRatio);
      const newParticleCount = newGridX * gridY;
      const newPositions = new Float32Array(newParticleCount * 3);
      for (let i = 0; i < gridY; i++) {
        for (let j = 0; j < newGridX; j++) {
          const idx = (i * newGridX + j) * 3;
          newPositions[idx] = (j / (newGridX - 1)) * 2 - 1;
          newPositions[idx + 1] = (i / (gridY - 1)) * 2 - 1;
          newPositions[idx + 2] = 0;
        }
      }
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
    };

    window.addEventListener('mousemove', handleMouseMove);
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
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full bg-black"
      style={{ display: 'block' }}
    />
  );
};

export default LingxiBackground;
