import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';

// ==========================================
// SHADERS
// ==========================================

const SIMULATION_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

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

const VELOCITY_FRAGMENT_SHADER = `
  uniform sampler2D tPosition;
  uniform sampler2D tVelocity;
  uniform float uTime;
  uniform vec3 uMouse3D;
  varying vec2 vUv;

  ${CURL_NOISE_CHUNK}

  void main() {
    vec4 posData = texture2D(tPosition, vUv);
    vec3 pos = posData.xyz;
    vec3 vel = texture2D(tVelocity, vUv).xyz;

    // 1. Flow Field (Curl Noise)
    vec3 flow = curlNoise(pos * 0.3 + uTime * 0.1);
    
    // 2. Mouse Interaction (Distance-based Repulsion with smooth falloff)
    vec3 dirToMouse = pos - uMouse3D;
    float distToMouse = length(dirToMouse);
    float force = smoothstep(3.0, 0.0, distToMouse); // Smooth falloff radius 3.0
    vec3 repel = normalize(dirToMouse) * force * 0.08;

    // 3. Center Attraction (Keep particles from flying away infinitely)
    vec3 dirToCenter = -pos;
    float distToCenter = length(dirToCenter);
    vec3 attract = normalize(dirToCenter) * (distToCenter * 0.005);

    // Integrate forces
    vel += (flow * 0.008) + repel + attract;
    
    // Friction / Damping for smooth interpolation
    vel *= 0.94;

    gl_FragColor = vec4(vel, 1.0);
  }
`;

const POSITION_FRAGMENT_SHADER = `
  uniform sampler2D tPosition;
  uniform sampler2D tVelocity;
  uniform float uTime;
  varying vec2 vUv;

  float rand(vec2 co){
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec4 posData = texture2D(tPosition, vUv);
    vec3 pos = posData.xyz;
    float life = posData.w;
    
    vec3 vel = texture2D(tVelocity, vUv).xyz;

    // Update position
    pos += vel;
    
    // Update life
    life -= 0.002 + rand(vUv) * 0.004;

    // Respawn logic
    if (life < 0.0 || length(pos) > 15.0) {
      float r = rand(vUv + uTime) * 4.0;
      float theta = rand(vUv + uTime + 1.0) * 6.28318;
      float phi = acos(rand(vUv + uTime + 2.0) * 2.0 - 1.0);
      
      pos = vec3(
        r * sin(phi) * cos(theta),
        r * sin(phi) * sin(theta),
        r * cos(phi)
      );
      life = 1.0;
    }

    gl_FragColor = vec4(pos, life);
  }
`;

const RENDER_VERTEX_SHADER = `
  uniform sampler2D tPosition;
  uniform sampler2D tVelocity;
  varying vec3 vColor;
  varying float vLife;
  
  void main() {
    vec4 posData = texture2D(tPosition, position.xy);
    vec3 pos = posData.xyz;
    vLife = posData.w;
    
    vec3 vel = texture2D(tVelocity, position.xy).xyz;
    float speed = length(vel);
    
    // Cinematic Neon Cyan / Teal Color Palette
    vec3 colorDarkTeal = vec3(0.0, 0.2, 0.25);
    vec3 colorCyan = vec3(0.0, 0.8, 0.9);
    vec3 colorBrightCyan = vec3(0.4, 1.0, 1.0);
    vec3 colorWhite = vec3(1.0, 1.0, 1.0);

    // Map speed to color
    vec3 color = mix(colorDarkTeal, colorCyan, smoothstep(0.0, 0.02, speed));
    color = mix(color, colorBrightCyan, smoothstep(0.015, 0.05, speed));
    color = mix(color, colorWhite, smoothstep(0.04, 0.1, speed));

    // Smooth fade in/out based on life
    float lifeFade = smoothstep(0.0, 0.1, vLife) * smoothstep(1.0, 0.8, vLife);
    vColor = color * lifeFade;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    
    // Size attenuation
    gl_PointSize = 12.0 * (1.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const RENDER_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vLife;
  
  void main() {
    // Soft circular particle with smooth falloff
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    
    // Smooth edge glow
    float alpha = smoothstep(0.5, 0.1, dist);
    
    gl_FragColor = vec4(vColor, alpha * 0.9);
  }
`;

// ==========================================
// REACT COMPONENT
// ==========================================

const AdvancedFlowField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // --- 1. CORE SCENE SETUP ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Black background
    scene.fog = new THREE.FogExp2(0x000000, 0.04); // Cinematic depth

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: false, // Disabled for post-processing performance
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // --- 2. POST PROCESSING ---
    const composer = new EffectComposer(renderer);
    
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Motion Blur / Trail Effect
    const afterimagePass = new AfterimagePass();
    afterimagePass.uniforms['damp'].value = 0.75; // Trail length (0.0 to 1.0)
    composer.addPass(afterimagePass);

    // Bloom / Glow Effect
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,  // strength
      0.4,  // radius
      0.2   // threshold
    );
    composer.addPass(bloomPass);

    // --- 3. GPGPU FBO SETUP ---
    const SIZE = 512; // 512x512 = 262,144 particles
    
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

    // Initialize Data
    const initPosData = new Float32Array(SIZE * SIZE * 4);
    const initVelData = new Float32Array(SIZE * SIZE * 4);
    
    for (let i = 0; i < SIZE * SIZE; i++) {
      const r = Math.random() * 4.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      initPosData[i * 4] = r * Math.sin(phi) * Math.cos(theta);
      initPosData[i * 4 + 1] = r * Math.sin(phi) * Math.sin(theta);
      initPosData[i * 4 + 2] = r * Math.cos(phi);
      initPosData[i * 4 + 3] = Math.random(); // life

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

    // Initialize FBOs
    const initMaterial = new THREE.ShaderMaterial({
      uniforms: { tInit: { value: null } },
      vertexShader: SIMULATION_VERTEX_SHADER,
      fragmentShader: `
        uniform sampler2D tInit;
        varying vec2 vUv;
        void main() { gl_FragColor = texture2D(tInit, vUv); }
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

    // --- 4. SIMULATION MATERIALS ---
    const velMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tPosition: { value: null },
        tVelocity: { value: null },
        uTime: { value: 0 },
        uMouse3D: { value: new THREE.Vector3(999, 999, 999) }
      },
      vertexShader: SIMULATION_VERTEX_SHADER,
      fragmentShader: VELOCITY_FRAGMENT_SHADER
    });

    const posMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tPosition: { value: null },
        tVelocity: { value: null },
        uTime: { value: 0 }
      },
      vertexShader: SIMULATION_VERTEX_SHADER,
      fragmentShader: POSITION_FRAGMENT_SHADER
    });

    // --- 5. PARTICLE RENDER SETUP ---
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
      vertexShader: RENDER_VERTEX_SHADER,
      fragmentShader: RENDER_FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, renderMaterial);
    scene.add(particles);

    // --- 6. INTERACTION & CAMERA PARALLAX ---
    const mouse = new THREE.Vector2(0, 0);
    const targetMouse = new THREE.Vector2(0, 0);
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const target3D = new THREE.Vector3();

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
      composer.setSize(width, height);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    // --- 7. ANIMATION LOOP ---
    let isFBO1 = true;
    const clock = new THREE.Clock();

    const animate = () => {
      const t = clock.getElapsedTime();

      // Smooth mouse interpolation for parallax
      mouse.x += (targetMouse.x - mouse.x) * 0.05;
      mouse.y += (targetMouse.y - mouse.y) * 0.05;

      // Unproject mouse to 3D space for repulsion
      raycaster.setFromCamera(mouse, camera);
      raycaster.ray.intersectPlane(plane, target3D);
      velMaterial.uniforms.uMouse3D.value.copy(target3D);

      // Subtle Camera Parallax
      camera.position.x = mouse.x * 1.5;
      camera.position.y = mouse.y * 1.5;
      camera.lookAt(scene.position);

      // Rotate entire particle system slowly
      particles.rotation.y = t * 0.05;
      particles.rotation.z = t * 0.02;

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
      posMaterial.uniforms.tVelocity.value = isFBO1 ? velFBO2.texture : velFBO1.texture;
      computeMesh.material = posMaterial;
      renderer.setRenderTarget(isFBO1 ? posFBO2 : posFBO1);
      renderer.render(computeScene, computeCamera);

      // Step 3: Render via Composer (Bloom + Trail)
      renderMaterial.uniforms.tPosition.value = isFBO1 ? posFBO2.texture : posFBO1.texture;
      renderMaterial.uniforms.tVelocity.value = isFBO1 ? velFBO2.texture : velFBO1.texture;
      renderer.setRenderTarget(null);
      
      composer.render();

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
      composer.dispose();
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

export default AdvancedFlowField;
