import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * LingxiGPGPUParticles Component
 * 
 * A world-class WebGL visual featuring:
 * - 262,144 particles (512x512) simulated entirely on the GPU via FBO Ping-Pong.
 * - Curl Noise driven fluid dynamics.
 * - Interactive mouse repulsion and vortex forces.
 * - Velocity-based color mapping (Black -> Neon Purple -> Neon Cyan -> White).
 */

const LingxiGPGPUParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // --- 1. CORE SCENE SETUP ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // --- 2. GPGPU FBO SETUP (Ping-Pong Architecture) ---
    const SIZE = 512; // 512 * 512 = 262,144 particles
    
    const rtOptions: THREE.RenderTargetOptions = {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      depthBuffer: false,
    };

    let posFBO1 = new THREE.WebGLRenderTarget(SIZE, SIZE, rtOptions);
    let posFBO2 = new THREE.WebGLRenderTarget(SIZE, SIZE, rtOptions);
    let velFBO1 = new THREE.WebGLRenderTarget(SIZE, SIZE, rtOptions);
    let velFBO2 = new THREE.WebGLRenderTarget(SIZE, SIZE, rtOptions);

    // Initial Data
    const initPosData = new Float32Array(SIZE * SIZE * 4);
    const initVelData = new Float32Array(SIZE * SIZE * 4);
    
    for (let i = 0; i < SIZE * SIZE; i++) {
      // Random spherical distribution
      const r = Math.random() * 3.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      initPosData[i * 4] = r * Math.sin(phi) * Math.cos(theta); // x
      initPosData[i * 4 + 1] = r * Math.sin(phi) * Math.sin(theta); // y
      initPosData[i * 4 + 2] = r * Math.cos(phi); // z
      initPosData[i * 4 + 3] = Math.random(); // w = life

      initVelData[i * 4] = 0;
      initVelData[i * 4 + 1] = 0;
      initVelData[i * 4 + 2] = 0;
      initVelData[i * 4 + 3] = 0;
    }

    const initPosTex = new THREE.DataTexture(initPosData, SIZE, SIZE, THREE.RGBAFormat, THREE.FloatType);
    initPosTex.needsUpdate = true;
    const initVelTex = new THREE.DataTexture(initVelData, SIZE, SIZE, THREE.RGBAFormat, THREE.FloatType);
    initVelTex.needsUpdate = true;

    // Computation Scene
    const computeScene = new THREE.Scene();
    const computeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const computeMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.Material());
    computeScene.add(computeMesh);

    // Initialize FBOs with DataTextures
    const initMaterial = new THREE.ShaderMaterial({
      uniforms: { tInit: { value: null } },
      vertexShader: `void main() { gl_Position = vec4(position, 1.0); }`,
      fragmentShader: `
        uniform sampler2D tInit;
        void main() { gl_FragColor = texture2D(tInit, gl_FragCoord.xy / vec2(${SIZE}.0)); }
      `
    });

    computeMesh.material = initMaterial;
    initMaterial.uniforms.tInit.value = initPosTex;
    renderer.setRenderTarget(posFBO1);
    renderer.render(computeScene, computeCamera);
    
    initMaterial.uniforms.tInit.value = initVelTex;
    renderer.setRenderTarget(velFBO1);
    renderer.render(computeScene, computeCamera);
    renderer.setRenderTarget(null);

    // --- 3. SIMULATION SHADERS ---

    // Common Curl Noise GLSL Chunk
    const curlNoiseChunk = `
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

    const velMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tPosition: { value: null },
        tVelocity: { value: null },
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(-999, -999) },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      },
      vertexShader: `void main() { gl_Position = vec4(position, 1.0); }`,
      fragmentShader: `
        uniform sampler2D tPosition;
        uniform sampler2D tVelocity;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform vec2 uResolution;

        ${curlNoiseChunk}

        void main() {
          vec2 uv = gl_FragCoord.xy / vec2(${SIZE}.0);
          vec4 posData = texture2D(tPosition, uv);
          vec3 pos = posData.xyz;
          vec3 vel = texture2D(tVelocity, uv).xyz;

          // 1. Curl Noise Force (Fluid turbulence)
          vec3 curl = curlNoise(pos * 0.4 + uTime * 0.05);
          
          // 2. Gravity / Center Attraction
          vec3 dirToCenter = -pos;
          float distToCenter = length(dirToCenter);
          vec3 gravity = normalize(dirToCenter) * (distToCenter * 0.015);

          // 3. Mouse Repulsion & Vortex
          float aspect = uResolution.x / uResolution.y;
          // Map NDC mouse to approximate world space at z=0
          vec3 mousePos = vec3(uMouse.x * 6.0 * aspect, uMouse.y * 6.0, 0.0);
          vec3 dirToMouse = pos - mousePos;
          float distToMouse = length(dirToMouse);
          
          vec3 repulsion = vec3(0.0);
          if (distToMouse < 3.5) {
            // Push away
            repulsion = normalize(dirToMouse) * (3.5 - distToMouse) * 0.4;
            // Add vortex (cross product with Z axis)
            vec3 vortex = cross(normalize(dirToMouse), vec3(0.0, 0.0, 1.0)) * (3.5 - distToMouse) * 0.6;
            repulsion += vortex;
          }

          // 4. Integrate Forces
          vel += (curl * 0.004) + (gravity * 0.002) + (repulsion * 0.015);
          
          // 5. Friction / Damping
          vel *= 0.96;

          gl_FragColor = vec4(vel, 1.0);
        }
      `
    });

    const posMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tPosition: { value: null },
        tVelocity: { value: null },
        uTime: { value: 0 }
      },
      vertexShader: `void main() { gl_Position = vec4(position, 1.0); }`,
      fragmentShader: `
        uniform sampler2D tPosition;
        uniform sampler2D tVelocity;
        uniform float uTime;

        float rand(vec2 co){
          return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
          vec2 uv = gl_FragCoord.xy / vec2(${SIZE}.0);
          vec4 posData = texture2D(tPosition, uv);
          vec3 pos = posData.xyz;
          float life = posData.w;
          
          vec3 vel = texture2D(tVelocity, uv).xyz;

          // Update position
          pos += vel;
          
          // Update life
          life -= 0.001 + rand(uv) * 0.002;

          // Respawn if life ends or flies too far
          if (life < 0.0 || length(pos) > 12.0) {
            float r = rand(uv + uTime) * 2.0;
            float theta = rand(uv + uTime + 1.0) * 6.28318;
            float phi = acos(rand(uv + uTime + 2.0) * 2.0 - 1.0);
            
            pos = vec3(
              r * sin(phi) * cos(theta),
              r * sin(phi) * sin(theta),
              r * cos(phi)
            );
            life = 1.0;
          }

          gl_FragColor = vec4(pos, life);
        }
      `
    });

    // --- 4. PARTICLE RENDER SETUP ---
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(SIZE * SIZE * 3);
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE; j++) {
        const index = (i * SIZE + j) * 3;
        positions[index] = j / SIZE;     // u
        positions[index + 1] = i / SIZE; // v
        positions[index + 2] = 0;
      }
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const renderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tPosition: { value: null },
        tVelocity: { value: null }
      },
      vertexShader: `
        uniform sampler2D tPosition;
        uniform sampler2D tVelocity;
        varying vec3 vColor;
        varying float vLife;
        
        void main() {
          // Read position and velocity from FBO textures using UV stored in position.xy
          vec4 posData = texture2D(tPosition, position.xy);
          vec3 pos = posData.xyz;
          vLife = posData.w;
          
          vec3 vel = texture2D(tVelocity, position.xy).xyz;

          // Velocity-based Color Gradient: Black -> Neon Purple -> Neon Cyan -> White
          float speed = length(vel);
          
          vec3 colorBlack = vec3(0.02, 0.02, 0.05);
          vec3 colorPurple = vec3(0.545, 0.361, 0.965); // #8B5CF6
          vec3 colorCyan = vec3(0.0, 1.0, 1.0);         // #00FFFF
          vec3 colorWhite = vec3(1.0, 1.0, 1.0);

          vec3 color = mix(colorBlack, colorPurple, smoothstep(0.0, 0.01, speed));
          color = mix(color, colorCyan, smoothstep(0.005, 0.025, speed));
          color = mix(color, colorWhite, smoothstep(0.02, 0.05, speed));

          // Fade in/out based on life
          float lifeFade = smoothstep(0.0, 0.1, vLife) * smoothstep(1.0, 0.8, vLife);
          vColor = color * lifeFade;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          
          // Perspective size attenuation
          gl_PointSize = 15.0 * (1.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vLife;
        
        void main() {
          // Soft circular particle
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;
          
          // Soft edge glow
          float alpha = smoothstep(0.5, 0.1, dist);
          
          gl_FragColor = vec4(vColor, alpha * 0.8);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, renderMaterial);
    scene.add(particles);

    // --- 5. INTERACTION & RESIZE ---
    const handleMouseMove = (event: MouseEvent) => {
      velMaterial.uniforms.uMouse.value.x = (event.clientX / window.innerWidth) * 2 - 1;
      velMaterial.uniforms.uMouse.value.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      velMaterial.uniforms.uResolution.value.set(width, height);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    // --- 6. ANIMATION LOOP (Ping-Pong) ---
    let isFBO1 = true;

    const animate = (time: number) => {
      const t = time * 0.001;

      // Step 1: Compute Velocity
      velMaterial.uniforms.uTime.value = t;
      velMaterial.uniforms.tPosition.value = isFBO1 ? posFBO1.texture : posFBO2.texture;
      velMaterial.uniforms.tVelocity.value = isFBO1 ? velFBO1.texture : velFBO2.texture;
      computeMesh.material = velMaterial;
      renderer.setRenderTarget(isFBO1 ? velFBO2 : velFBO1);
      renderer.render(computeScene, computeCamera);

      // Step 2: Compute Position
      posMaterial.uniforms.uTime.value = t;
      posMaterial.uniforms.tPosition.value = isFBO1 ? posFBO1.texture : posFBO2.texture;
      posMaterial.uniforms.tVelocity.value = isFBO1 ? velFBO2.texture : velFBO1.texture; // Use newly computed velocity
      computeMesh.material = posMaterial;
      renderer.setRenderTarget(isFBO1 ? posFBO2 : posFBO1);
      renderer.render(computeScene, computeCamera);

      // Step 3: Render Particles to Screen
      renderMaterial.uniforms.tPosition.value = isFBO1 ? posFBO2.texture : posFBO1.texture;
      renderMaterial.uniforms.tVelocity.value = isFBO1 ? velFBO2.texture : velFBO1.texture;
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);

      // Swap FBOs
      isFBO1 = !isFBO1;

      requestAnimationFrame(animate);
    };
    const animationId = requestAnimationFrame(animate);

    // --- CLEANUP ---
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      
      renderer.dispose();
      posFBO1.dispose();
      posFBO2.dispose();
      velFBO1.dispose();
      velFBO2.dispose();
      geometry.dispose();
      renderMaterial.dispose();
      velMaterial.dispose();
      posMaterial.dispose();
      initMaterial.dispose();
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

export default LingxiGPGPUParticles;
