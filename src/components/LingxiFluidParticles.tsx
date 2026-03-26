import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';

/**
 * LingxiFluidParticles
 * 
 * A high-end, GPGPU-driven particle system designed to replicate the "Icicle Bubbles" 
 * effect from particle-love.com.
 * 
 * - 262,144 particles simulated on the GPU.
 * - Divergence-free Curl Noise for organic, fluid-like emergent motion.
 * - Damping (velocity *= 0.96) for viscosity.
 * - Additive blending, extremely low opacity, and tiny point sizes to create "soft smoke".
 * - Velocity-based color mapping: Deep Sea Blue (#0F4C5C) -> Cyan (#00FFFF) -> White (#FFFFFF).
 */

// ==========================================
// SHADERS
// ==========================================

const CURL_NOISE_CHUNK = `
  // Simplex 3D Noise
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

  float snoise(vec3 v){ 
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
    i = mod(i, 289.0 ); 
    vec4 p = permute( permute( permute( 
                i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
              + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 1.0/7.0;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  vec3 snoiseVec3( vec3 x ){
    float s  = snoise(vec3( x ));
    float s1 = snoise(vec3( x.y - 19.1 , x.z + 33.4 , x.x + 47.2 ));
    float s2 = snoise(vec3( x.z + 74.2 , x.x - 124.5 , x.y + 99.4 ));
    return vec3( s , s1 , s2 );
  }

  vec3 curlNoise( vec3 p ){
    const float e = .1;
    vec3 dx = vec3( e   , 0.0 , 0.0 );
    vec3 dy = vec3( 0.0 , e   , 0.0 );
    vec3 dz = vec3( 0.0 , 0.0 , e   );

    vec3 p_x0 = snoiseVec3( p - dx );
    vec3 p_x1 = snoiseVec3( p + dx );
    vec3 p_y0 = snoiseVec3( p - dy );
    vec3 p_y1 = snoiseVec3( p + dy );
    vec3 p_z0 = snoiseVec3( p - dz );
    vec3 p_z1 = snoiseVec3( p + dz );

    float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;
    float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;
    float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;

    const float divisor = 1.0 / ( 2.0 * e );
    return normalize( vec3( x , y , z ) * divisor );
  }
`;

const VELOCITY_SHADER = `
  uniform float time;
  uniform vec3 mouse;

  ${CURL_NOISE_CHUNK}

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 pos = texture2D(tPosition, uv).xyz;
    vec3 vel = texture2D(tVelocity, uv).xyz;

    // 1. Curl Noise Force (Fluid Swirls)
    vec3 force = curlNoise(pos * 0.1 + time * 0.05) * 0.004;

    // 2. Weak Centripetal Force (Prevent escaping)
    float dist = length(pos);
    vec3 centripetal = -normalize(pos) * smoothstep(10.0, 20.0, dist) * 0.002;

    // 3. Mouse Repulsion (Optional but good for interaction)
    vec3 dirToMouse = pos - mouse;
    float distToMouse = length(dirToMouse);
    vec3 repulsion = normalize(dirToMouse) * exp(-distToMouse * distToMouse * 0.5) * 0.01;

    vel += force + centripetal + repulsion;
    
    // 4. Damping (Viscosity/Friction)
    vel *= 0.96;

    gl_FragColor = vec4(vel, 1.0);
  }
`;

const POSITION_SHADER = `
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 pos = texture2D(tPosition, uv).xyz;
    vec3 vel = texture2D(tVelocity, uv).xyz;

    // Position Shader: position += velocity * delta (delta is implicitly 1 per frame here)
    pos += vel;

    gl_FragColor = vec4(pos, 1.0);
  }
`;

const RENDER_VERTEX_SHADER = `
  uniform sampler2D tPosition;
  uniform sampler2D tVelocity;
  varying float vSpeed;

  void main() {
    // Read position and velocity from GPGPU textures
    vec3 pos = texture2D(tPosition, position.xy).xyz;
    vec3 vel = texture2D(tVelocity, position.xy).xyz;
    
    // Calculate speed for fragment color mapping
    vSpeed = length(vel);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    
    // Extremely small point size, scaled by distance for perspective
    // This creates the "micro-particle" aesthetic
    gl_PointSize = 25.0 * (1.0 / -mvPosition.z);
    
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const RENDER_FRAGMENT_SHADER = `
  varying float vSpeed;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    
    // Soft circular shape
    if (dist > 0.5) discard;

    // Extremely soft circular gradient, core opacity < 0.1
    // This is the key to the "soft smoke" accumulation effect
    float alpha = exp(-dist * dist * 16.0) * 0.06;

    // Deep Sea Blue/Teal (#0F4C5C) -> Cyan (#00FFFF) -> White (#FFFFFF)
    vec3 cSlow = vec3(0.059, 0.298, 0.361);
    vec3 cMid  = vec3(0.0, 1.0, 1.0);
    vec3 cFast = vec3(1.0, 1.0, 1.0);

    // Map speed to color transition
    float t1 = smoothstep(0.0, 0.015, vSpeed);
    float t2 = smoothstep(0.015, 0.05, vSpeed);

    vec3 color = mix(cSlow, cMid, t1);
    color = mix(color, cFast, t2);

    // Pre-multiplied alpha for additive blending
    gl_FragColor = vec4(color * alpha, 1.0);
  }
`;

// ==========================================
// REACT COMPONENT
// ==========================================

const LingxiFluidParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // --- 1. CORE SCENE SETUP ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Deep abyss black

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 15;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: false,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // --- 2. GPGPU SETUP ---
    // 512x512 = 262,144 particles
    const WIDTH = 512;
    const PARTICLES = WIDTH * WIDTH;
    
    const gpuCompute = new GPUComputationRenderer(WIDTH, WIDTH, renderer);

    const dtPosition = gpuCompute.createTexture();
    const dtVelocity = gpuCompute.createTexture();

    const posArray = dtPosition.image.data;
    const velArray = dtVelocity.image.data;

    for (let i = 0; i < PARTICLES; i++) {
      // Spawn in a sphere
      const r = Math.cbrt(Math.random()) * 8.0;
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      
      posArray[i * 4 + 0] = r * Math.sin(phi) * Math.cos(theta);
      posArray[i * 4 + 1] = r * Math.sin(phi) * Math.sin(theta);
      posArray[i * 4 + 2] = r * Math.cos(phi);
      posArray[i * 4 + 3] = 1.0;

      velArray[i * 4 + 0] = 0;
      velArray[i * 4 + 1] = 0;
      velArray[i * 4 + 2] = 0;
      velArray[i * 4 + 3] = 1.0;
    }

    const posVar = gpuCompute.addVariable('tPosition', POSITION_SHADER, dtPosition);
    const velVar = gpuCompute.addVariable('tVelocity', VELOCITY_SHADER, dtVelocity);

    gpuCompute.setVariableDependencies(posVar, [posVar, velVar]);
    gpuCompute.setVariableDependencies(velVar, [posVar, velVar]);

    velVar.material.uniforms.time = { value: 0.0 };
    velVar.material.uniforms.mouse = { value: new THREE.Vector3(999, 999, 999) };

    const error = gpuCompute.init();
    if (error !== null) {
      console.error(error);
    }

    // --- 3. RENDER SETUP ---
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLES * 3);
    let p = 0;
    for (let j = 0; j < WIDTH; j++) {
      for (let i = 0; i < WIDTH; i++) {
        // Store UV coordinates in the position attribute for the vertex shader to sample textures
        positions[p++] = i / (WIDTH - 1);
        positions[p++] = j / (WIDTH - 1);
        positions[p++] = 0;
      }
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        tPosition: { value: null },
        tVelocity: { value: null }
      },
      vertexShader: RENDER_VERTEX_SHADER,
      fragmentShader: RENDER_FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // --- 4. INTERACTION & ANIMATION ---
    const mouse = new THREE.Vector2(0, 0);
    const targetMouse = new THREE.Vector2(0, 0);
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const target3D = new THREE.Vector3(999, 999, 999);

    const handleMouseMove = (event: MouseEvent) => {
      targetMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      targetMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();

    const animate = () => {
      const t = clock.getElapsedTime();

      // Smooth mouse interpolation
      mouse.x += (targetMouse.x - mouse.x) * 0.05;
      mouse.y += (targetMouse.y - mouse.y) * 0.05;

      // Unproject mouse to 3D space for repulsion
      raycaster.setFromCamera(mouse, camera);
      raycaster.ray.intersectPlane(plane, target3D);
      velVar.material.uniforms.mouse.value.copy(target3D);

      // Update time
      velVar.material.uniforms.time.value = t;

      // Subtle Camera Parallax
      camera.position.x = mouse.x * 1.5;
      camera.position.y = mouse.y * 1.5;
      camera.lookAt(scene.position);

      // Rotate entire particle system slowly
      particles.rotation.y = t * 0.02;
      particles.rotation.z = t * 0.01;

      // Compute GPGPU
      gpuCompute.compute();

      // Update Render Uniforms
      material.uniforms.tPosition.value = gpuCompute.getCurrentRenderTarget(posVar).texture;
      material.uniforms.tVelocity.value = gpuCompute.getCurrentRenderTarget(velVar).texture;

      // Render
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
      geometry.dispose();
      material.dispose();
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

export default LingxiFluidParticles;
