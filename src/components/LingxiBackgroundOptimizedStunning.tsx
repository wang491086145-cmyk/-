import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * LingxiBackgroundOptimizedStunning Component
 * 
 * A high-end WebGL visual for "Lingxi AI" featuring:
 * Layer 1: Streamlined Turbulent Energy Emergence (FBM + Turbulent Noise + Inverse Distance Glow).
 * Layer 2: Breathing Dot Matrix (Interactive Grid with mouse-reactive flicker).
 */

const LingxiBackgroundOptimizedStunning: React.FC = () => {
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

    // --- LAYER 1: STREAMLINED TURBULENT ENERGY EMERGENCE SHADER ---
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

        #define OCTAVES 5
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

        float turbulentNoise(vec2 p) {
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
          // 1. Map UV to center [-1.0, 1.0] and correct aspect ratio
          vec2 uv = vUv * 2.0 - 1.0;
          uv.x *= uResolution.x / uResolution.y;

          float t = uTime * 0.4;

          // 2. Upgraded Curve Construction (FBM perturbed Sine wave)
          // Using FBM to perturb the frequency and amplitude of the sine wave
          float waveOffset = fbm(vec2(uv.y * 2.5, t * 0.2));
          float wave = sin(uv.y * 4.0 + waveOffset * 3.0 - t * 1.5) * 0.6 
                     + cos(uv.y * 2.0 - waveOffset * 1.5 + t) * 0.2;

          // 3. Build Distance Field
          float dist = abs(uv.x - wave);

          // 4. Distance Field Perturbation (Crucial: Softens sharp lines into a flowing surface)
          float turbulence = turbulentNoise(uv * 3.0 + t * 0.5) * 0.15;
          dist += turbulence;

          // 5. Inverse Distance Glow (Stitch/Apple style core)
          // pow(dist, 2.0) makes the falloff steeper and the core deeper
          float glow = 0.015 / (pow(dist, 2.0) + 0.002);

          // 6. Stunning Color Mapping (Neon Pink & Cyan)
          vec3 neonPink = vec3(1.0, 0.0, 1.0); // #FF00FF
          vec3 neonCyan = vec3(0.0, 1.0, 1.0); // #00FFFF
          
          // Smooth transition based on Y axis, time, and FBM offset
          float colorMix = smoothstep(-1.0, 1.0, sin(uv.y * 2.5 + t) + waveOffset);
          vec3 baseColor = mix(neonPink, neonCyan, colorMix);
          
          // Add secondary color shift for depth
          vec3 secondaryColor = mix(neonCyan, neonPink, fbm(uv * 2.0 - t * 0.3));
          vec3 finalColor = mix(baseColor, secondaryColor, 0.4);

          // Extreme over-saturation for the electric neon look
          finalColor = pow(finalColor, vec3(0.7));

          // 7. Final Output
          vec3 renderColor = finalColor * glow;

          // Vignette to darken edges
          float vignette = smoothstep(2.2, 0.2, length(uv * vec2(0.6, 1.0)));
          renderColor *= vignette;

          // Deep abyss black background
          gl_FragColor = vec4(renderColor, 1.0);
        }
      `,
      depthWrite: false,
    });
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    scene.add(bgMesh);

    // --- LAYER 2: BREATHING DOT MATRIX ---
    const gridDensity = 140; // Number of dots vertically
    
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
          // Map position to 0.0 - 1.0 for UV
          vUv = position.xy * 0.5 + 0.5;
          vec3 pos = position;
          
          // Calculate distance to mouse in NDC space
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
          // Circular dot
          float d = distance(gl_PointCoord, vec2(0.5));
          if (d > 0.5) discard;

          // 1. Global Breathing Wave (Water-like ripple)
          float waveX = sin(vUv.x * 25.0 + uTime * 1.5);
          float waveY = cos(vUv.y * 20.0 - uTime * 1.2);
          float breath = waveX * waveY;
          
          float baseAlpha = 0.03 + (breath * 0.5 + 0.5) * 0.08;

          // 2. Cursor Breathing Hover Interaction
          float hoverRadius = 0.35;
          float hoverEffect = smoothstep(hoverRadius, 0.0, vDist);
          
          // High-frequency breathing flicker near mouse
          float breathSpeed = 30.0;
          float flicker = sin(uTime * breathSpeed) * 0.5 + 0.5;
          
          float hoverAlpha = hoverEffect * (0.3 + flicker * 0.5);
          
          float alpha = baseAlpha + hoverAlpha;

          // Color shift: white base -> Bright Cyan on hover
          vec3 color = mix(vec3(0.7, 0.7, 0.8), vec3(0.0, 1.0, 1.0), hoverEffect);

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

export default LingxiBackgroundOptimizedStunning;
