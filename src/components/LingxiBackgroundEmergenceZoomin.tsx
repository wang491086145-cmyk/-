import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * LingxiBackgroundEmergenceZoomin
 * 
 * A completely refactored WebGL background for "Lingxi AI".
 * - Layer 1 & 2: Neon Energy Surface Emergence (FBM + Turbulent Noise + Inverse Distance Glow).
 * - Layer 3: Continuous Zoom-in Camera Control.
 * - Layer 4: Breathing Dot Matrix Layer with mouse interaction.
 * - Pure WebGL, no third-party shader libraries.
 */

// ==========================================
// SHADERS
// ==========================================

const NOISE_GLSL = `
  // Simplex 2D noise
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yyy) );
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
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * snoise(st);
      st *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  float turbulentNoise(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * abs(snoise(st));
      st *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }
`;

const SURFACE_VERTEX_SHADER = `
  varying vec2 vUv;
  uniform float uTime;
  
  void main() {
    vUv = uv;
    vec3 pos = position;
    
    // Manual scaling of positions to reinforce the deep zoom-in feel
    // Smoothly breathes scale to avoid popping
    float scale = 1.0 + sin(uTime * 0.05) * 0.15; 
    pos.xy *= scale;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const SURFACE_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform vec2 uResolution;
  varying vec2 vUv;

  ${NOISE_GLSL}

  void main() {
    // Map UV to center [-1, 1] and correct aspect ratio
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= uResolution.x / uResolution.y;

    // Extremely slow time coefficient for "slow flow"
    float t = uTime * 0.02; 

    // 1. Upgrade Curve Construction: FBM perturbed Sine wave
    float waveOffset = fbm(vec2(uv.x * 2.0, t * 0.5));
    float wave = sin(uv.x * 3.0 + waveOffset * 2.0 + t) * 0.4;

    // 2. Distance Field
    float dist = abs(uv.y - wave);

    // 3. Distance Field Perturbation (Turbulent Noise)
    // This turns the hard line into a soft, irregular "surface emergence"
    float turbulence = turbulentNoise(uv * 2.5 - t) * 0.2;
    dist += turbulence;

    // 4. Inverse Distance Glow (Stitch/Apple style)
    float glow = 0.015 / (dist + 0.005);

    // 5. Gorgeous Color Mixing (Neon Magenta & Neon Cyan)
    vec3 colorCyan = vec3(0.0, 1.0, 1.0);
    vec3 colorMagenta = vec3(1.0, 0.0, 1.0);
    
    // Mix colors based on position and noise
    float colorMix = fbm(vec2(uv.x * 1.5 + t, uv.y * 1.5));
    vec3 baseColor = mix(colorCyan, colorMagenta, colorMix);

    // Apply glow to base color
    vec3 finalColor = baseColor * glow;
    
    // Add pure white core where distance is extremely small
    float core = 0.002 / (dist + 0.001);
    finalColor += vec3(core);

    // Over-saturate and boost brightness
    finalColor = pow(finalColor, vec3(0.8)) * 1.5;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const DOTS_VERTEX_SHADER = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec3 pos = position;
    
    // Manual scale for zoom-in feel, matching the surface layer
    float scale = 1.0 + sin(uTime * 0.05) * 0.15;
    pos.xy *= scale;

    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPosition.xyz;

    vec4 mvPosition = viewMatrix * worldPosition;
    
    // Perspective point size
    gl_PointSize = 3.0 * (15.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const DOTS_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uResolution;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    // Soft circular dot
    vec2 coord = gl_PointCoord - vec2(0.5);
    if (length(coord) > 0.5) discard;

    // Breathing effect using sin(uTime * 1.5) and pixel coordinates
    float breath = (sin(uTime * 1.5 + vWorldPos.x * 0.5 + vWorldPos.y * 0.5) + 1.0) * 0.5;
    
    // Cursor Interaction
    // Convert NDC mouse to approximate world space for distance check
    vec2 mouseWorld = uMouse * vec2(uResolution.x / uResolution.y, 1.0) * 15.0;
    float distToMouse = length(vWorldPos.xy - mouseWorld);
    float hover = exp(-distToMouse * distToMouse * 0.2);

    // Combine opacities
    float alpha = 0.05 + breath * 0.15 + hover * 0.8;

    // Cyan/Blue dots, brightening on hover
    vec3 dotColor = mix(vec3(0.0, 0.5, 1.0), vec3(0.0, 1.0, 1.0), hover);

    gl_FragColor = vec4(dotColor * alpha, 1.0);
  }
`;

// ==========================================
// REACT COMPONENT
// ==========================================

const LingxiBackgroundEmergenceZoomin: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // --- Scene & Camera Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Deep abyss black

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 15; // Initial camera distance

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Shared Uniforms
    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uMouse: { value: new THREE.Vector2(0, 0) }
    };

    // --- Layer 1 & 2: Neon Energy Surface ---
    const surfaceGeo = new THREE.PlaneGeometry(40, 40, 128, 128);
    const surfaceMat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: SURFACE_VERTEX_SHADER,
      fragmentShader: SURFACE_FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const surfaceMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
    scene.add(surfaceMesh);

    // --- Layer 4: Breathing Dot Matrix ---
    const dotCount = 150; // 150x150 grid
    const dotGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(dotCount * dotCount * 3);
    const uvs = new Float32Array(dotCount * dotCount * 2);
    
    let idx = 0;
    let uvIdx = 0;
    for(let i = 0; i < dotCount; i++) {
      for(let j = 0; j < dotCount; j++) {
        // Spread points across a 40x40 area
        positions[idx++] = (i / dotCount) * 40 - 20;
        positions[idx++] = (j / dotCount) * 40 - 20;
        positions[idx++] = 0.5; // Slightly in front of the surface
        
        uvs[uvIdx++] = i / dotCount;
        uvs[uvIdx++] = j / dotCount;
      }
    }
    dotGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    dotGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    const dotMat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: DOTS_VERTEX_SHADER,
      fragmentShader: DOTS_FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const dotMesh = new THREE.Points(dotGeo, dotMat);
    scene.add(dotMesh);

    // --- Interaction & Resize ---
    const targetMouse = new THREE.Vector2(0, 0);
    
    const handleMouseMove = (e: MouseEvent) => {
      targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- Animation Loop ---
    const clock = new THREE.Clock();
    let animationId: number;

    const animate = () => {
      const t = clock.getElapsedTime();
      uniforms.uTime.value = t;

      // Smooth mouse interpolation
      uniforms.uMouse.value.x += (targetMouse.x - uniforms.uMouse.value.x) * 0.05;
      uniforms.uMouse.value.y += (targetMouse.y - uniforms.uMouse.value.y) * 0.05;

      // Layer 3: Continuous Zoom-in Effect
      // Extremely small, constant velocity per frame
      camera.position.z -= 0.001;
      
      // Reset camera if it gets too close to prevent clipping
      if (camera.position.z < 2.0) {
        camera.position.z = 15.0;
      }

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };
    animate();

    // --- Cleanup ---
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      
      renderer.dispose();
      surfaceGeo.dispose();
      surfaceMat.dispose();
      dotGeo.dispose();
      dotMat.dispose();
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full bg-black"
      style={{ zIndex: 0 }} 
    />
  );
};

export default LingxiBackgroundEmergenceZoomin;
