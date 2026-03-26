import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

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
    vec3 pos = texture2D(tPosition, vUv).xyz;
    vec3 vel = texture2D(tVelocity, vUv).xyz;

    // 1. Organic Flow Field (Curl Noise)
    vec3 flow = curlNoise(pos * 0.15 + uTime * 0.005);
    
    // 2. Premium Mouse Interaction (Enhanced)
    vec3 dirToMouse = pos - uMouse3D;
    float distToMouse = length(dirToMouse);
    
    // Gaussian falloff for more organic feel
    float interactionFactor = exp(-distToMouse * distToMouse * 0.4); 
    
    // Repulsion
    vec3 repel = normalize(dirToMouse) * interactionFactor * 0.012;
    
    // Swirl (Vortex effect)
    vec3 swirlDir = cross(normalize(dirToMouse), vec3(0.0, 0.0, 1.0));
    vec3 swirl = swirlDir * interactionFactor * 0.008;
    
    // 3. Optimized Group Surging Logic (Staggered)
    float groupID = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
    float groupPhase = groupID * 6.28318;
    float groupFreq = 0.1 + groupID * 0.2;
    
    float groupNoise = snoise(vec3(vUv * 2.5, uTime * groupFreq + groupPhase));
    float surgeIntensity = smoothstep(0.2, 0.8, groupNoise);
    float microSurge = smoothstep(0.7, 0.9, snoise(vec3(vUv * 8.0, uTime * 0.8 + groupPhase)));
    
    vec3 surge = vec3(0.0, 0.0, 1.0) * (surgeIntensity * 0.003 + microSurge * 0.0015);

    // 4. Differentiated Local Jitter
    // Some groups are more "energetic" (higher jitter) than others
    float jitterIntensity = mix(0.0003, 0.0012, groupID);
    vec3 jitter = snoiseVec3(pos * 25.0 + uTime * 2.5) * jitterIntensity;

    // 5. Soft Bounding Gravity
    float distToCenter = length(pos.xy);
    float pullStrength = smoothstep(6.0, 14.0, distToCenter) * 0.002;
    vec3 attract = vec3(-normalize(pos.xy) * pullStrength, 0.0);

    // Integrate forces
    vel.xy += flow.xy * 0.0001;
    vel.z += flow.z * 0.0006;
    vel += repel + swirl + attract + surge + jitter;
    
    // Velocity damping
    vel *= 0.95; // Slightly more damping for more controlled interaction

    gl_FragColor = vec4(vel, 1.0);
  }
`;

const POSITION_FRAGMENT_SHADER = `
  uniform sampler2D tPosition;
  uniform sampler2D tVelocity;
  uniform float uTime;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec3 pos = texture2D(tPosition, vUv).xyz;
    vec3 vel = texture2D(tVelocity, vUv).xyz;

    // Update position
    pos += vel;

    // Optimized Staggered Forward Flow
    float groupID = hash(vUv);
    float baseSpeed = 0.035;
    
    // Multiple sine waves with different frequencies and phases for deep staggered feel
    float stagger = sin(groupID * 15.0 + uTime * 0.4) * 0.012;
    stagger += cos(groupID * 7.0 - uTime * 0.7) * 0.006;
    stagger += sin(groupID * 23.0 + uTime * 1.2) * 0.003;
    
    pos.z += baseSpeed + stagger; 

    // Wrap around
    if (pos.z > 15.0) {
      pos.z -= 30.0;
      // Add a small random offset on wrap to further break up patterns
      pos.xy += (vec2(hash(vUv + uTime), hash(vUv.yx - uTime)) - 0.5) * 0.5;
    }

    gl_FragColor = vec4(pos, 1.0);
  }
`;

const RENDER_VERTEX_SHADER = `
  uniform sampler2D tPosition;
  uniform sampler2D tVelocity;
  varying vec3 vVel;
  varying vec3 vPos;
  varying float vDepth;
  varying float vNearBlur;
  varying float vGroupID;
  
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec3 pos = texture2D(tPosition, position.xy).xyz;
    vec3 vel = texture2D(tVelocity, position.xy).xyz;
    vVel = vel;
    vPos = pos;
    vGroupID = hash(position.xy);
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vDepth = -mvPosition.z; 
    
    float speed = length(vel);
    
    float focusNearStart = 9.0;
    float focusNearEnd = 4.0;
    vNearBlur = 1.0 - smoothstep(focusNearEnd, focusNearStart, vDepth); 
    
    // Differentiated base size per group
    // Some groups are tiny dust, others are larger glowing embers
    float groupSizeMult = mix(0.5, 1.8, vGroupID);
    float baseSize = 8.0 * groupSizeMult;
    float velocityBonus = speed * 2000.0;
    
    float size = baseSize + velocityBonus + (vNearBlur * 30.0);
    
    gl_PointSize = size * (1.0 / max(vDepth, 0.1));
    gl_PointSize *= mix(1.0, 1.4, vNearBlur);
    
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const RENDER_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform vec3 uMouse3D;
  varying vec3 vVel;
  varying vec3 vPos;
  varying float vDepth;
  varying float vNearBlur;
  varying float vGroupID;
  
  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    
    // Differentiated sharpness per group
    // Larger particles tend to be softer/blurrier
    float sharpnessBase = mix(20.0, 8.0, vGroupID);
    float sharpness = mix(sharpnessBase, 2.5, vNearBlur); 
    float alpha = exp(-dist * dist * sharpness);
    
    float farFade = 1.0 - smoothstep(16.0, 26.0, vDepth);
    alpha *= farFade;
    
    float nearFade = smoothstep(4.0, 9.0, vDepth);
    alpha *= nearFade;

    // Differentiated transparency per group
    float groupAlpha = mix(0.6, 1.0, vGroupID);
    alpha *= groupAlpha;

    float speed = length(vVel);
    
    // --- GORGEOUS COLOR PALETTE (POSITION & DEPTH BASED) ---
    // Far: 763BD6 -> vec3(0.463, 0.231, 0.839)
    // Left: FE37AF -> vec3(0.996, 0.216, 0.686)
    // Right: FAE252 -> vec3(0.980, 0.886, 0.322)
    
    vec3 cFar = vec3(0.463, 0.231, 0.839);
    vec3 cLeft = vec3(0.996, 0.216, 0.686);
    vec3 cRight = vec3(0.980, 0.886, 0.322);

    // Horizontal mix based on X position (range roughly -10 to 10)
    float horizontalFactor = smoothstep(-8.0, 8.0, vPos.x);
    vec3 cNear = mix(cLeft, cRight, horizontalFactor);

    // Depth mix: Near (Left/Right) to Far (Purple)
    float depthFactor = smoothstep(6.0, 22.0, vDepth);
    vec3 baseColor = mix(cNear, cFar, depthFactor);

    // Differentiated Color Bias per group
    // Some groups shift slightly in hue
    vec3 colorShift = vec3(
      sin(vGroupID * 10.0) * 0.05,
      cos(vGroupID * 15.0) * 0.03,
      sin(vGroupID * 20.0) * 0.08
    );
    baseColor += colorShift;

    float mixNoise = sin(vPos.x * 0.2 + uTime * 0.3) * cos(vPos.y * 0.2 - uTime * 0.2) * 0.1;
    baseColor += mixNoise * vec3(0.1, 0.05, 0.1);
    baseColor = clamp(baseColor, 0.0, 1.0);

    float speedFactor = smoothstep(0.02, 0.06, speed);
    vec3 cContrast = vec3(1.0, 1.0, 0.9); 
    vec3 finalColor = mix(baseColor, cContrast, speedFactor * 0.4);

    // Mouse Highlight
    float distToMouse = length(vPos - uMouse3D);
    float mouseHighlight = exp(-distToMouse * distToMouse * 0.5);
    finalColor += mouseHighlight * vec3(0.2, 0.5, 1.0) * 1.2;

    finalColor = pow(finalColor, vec3(0.85)) * 1.4;

    gl_FragColor = vec4(finalColor * alpha * 0.9, 1.0);
  }
`;

const PremiumFluidParticlesV3: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 12;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: false,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,
      0.5,
      0.15
    );
    composer.addPass(bloomPass);

    const SIZE = 300;
    
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

    const initPosData = new Float32Array(SIZE * SIZE * 4);
    const initVelData = new Float32Array(SIZE * SIZE * 4);
    
    for (let i = 0; i < SIZE * SIZE; i++) {
      const radius = Math.cbrt(Math.random()) * 10.0;
      const theta = Math.random() * Math.PI * 2.0;
      const z = (Math.random() - 0.5) * 30.0;
      
      initPosData[i * 4] = radius * Math.cos(theta);
      initPosData[i * 4 + 1] = radius * Math.sin(theta);
      initPosData[i * 4 + 2] = z;
      initPosData[i * 4 + 3] = 1.0;

      initVelData[i * 4] = 0;
      initVelData[i * 4 + 1] = 0;
      initVelData[i * 4 + 2] = 0;
      initVelData[i * 4 + 3] = 1.0;
    }

    const initPosTex = new THREE.DataTexture(initPosData, SIZE, SIZE, THREE.RGBAFormat, THREE.FloatType);
    initPosTex.needsUpdate = true;
    const initVelTex = new THREE.DataTexture(initVelData, SIZE, SIZE, THREE.RGBAFormat, THREE.FloatType);
    initVelTex.needsUpdate = true;

    const computeScene = new THREE.Scene();
    const computeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const computeMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.Material());
    computeScene.add(computeMesh);

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

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(SIZE * SIZE * 3);
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE; j++) {
        const index = (i * SIZE + j) * 3;
        positions[index] = j / SIZE;
        positions[index + 1] = i / SIZE;
        positions[index + 2] = 0;
      }
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const renderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tPosition: { value: null },
        tVelocity: { value: null },
        uTime: { value: 0 },
        uMouse3D: { value: new THREE.Vector3(999, 999, 999) }
      },
      vertexShader: RENDER_VERTEX_SHADER,
      fragmentShader: RENDER_FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, renderMaterial);
    scene.add(particles);

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
      composer.setSize(width, height);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    let isFBO1 = true;
    const clock = new THREE.Clock();

    const animate = () => {
      const t = clock.getElapsedTime();

      mouse.x += (targetMouse.x - mouse.x) * 0.05;
      mouse.y += (targetMouse.y - mouse.y) * 0.05;

      raycaster.setFromCamera(mouse, camera);
      raycaster.ray.intersectPlane(plane, target3D);
      velMaterial.uniforms.uMouse3D.value.copy(target3D);

      camera.position.x = mouse.x * 0.4;
      camera.position.y = mouse.y * 0.4;
      camera.lookAt(scene.position);

      particles.rotation.y = t * 0.002;
      particles.rotation.z = t * 0.001;

      velMaterial.uniforms.uTime.value = t;
      velMaterial.uniforms.tPosition.value = isFBO1 ? posFBO1.texture : posFBO2.texture;
      velMaterial.uniforms.tVelocity.value = isFBO1 ? velFBO1.texture : velFBO2.texture;
      computeMesh.material = velMaterial;
      renderer.setRenderTarget(isFBO1 ? velFBO2 : velFBO1);
      renderer.render(computeScene, computeCamera);

      posMaterial.uniforms.uTime.value = t;
      posMaterial.uniforms.tPosition.value = isFBO1 ? posFBO1.texture : posFBO2.texture;
      posMaterial.uniforms.tVelocity.value = isFBO1 ? velFBO2.texture : velFBO1.texture;
      computeMesh.material = posMaterial;
      renderer.setRenderTarget(isFBO1 ? posFBO2 : posFBO1);
      renderer.render(computeScene, computeCamera);

      renderMaterial.uniforms.uTime.value = t;
      renderMaterial.uniforms.uMouse3D.value.copy(target3D);
      renderMaterial.uniforms.tPosition.value = isFBO1 ? posFBO2.texture : posFBO1.texture;
      renderMaterial.uniforms.tVelocity.value = isFBO1 ? velFBO2.texture : velFBO1.texture;
      renderer.setRenderTarget(null);
      
      composer.render();

      isFBO1 = !isFBO1;

      requestAnimationFrame(animate);
    };
    const animationId = requestAnimationFrame(animate);

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

export default PremiumFluidParticlesV3;
