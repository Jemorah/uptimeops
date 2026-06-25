import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { EffectComposer, RenderPass, ShaderPass, BloomEffect, SMAAEffect } from 'postprocessing';

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vPos;
  varying vec3 vWorldPosition;
  uniform vec3 uOffset;
  void main() {
    vUv = uv;
    vec3 pos = position + uOffset;
    vPos = pos;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision mediump float;
  varying vec2 vUv;
  varying vec3 vPos;
  varying vec3 vWorldPosition;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uGridScale;
  uniform float uLineWidth;
  uniform float uTime;
  uniform float uSpeed;

  float gridLine(float coord, float width) {
    float fw = fwidth(coord);
    float p = abs(fract(coord - 0.5) - 0.5);
    return 1.0 - smoothstep(width * fw, (width + 1.0) * fw, p);
  }

  void main() {
    float scale = uGridScale;
    vec2 coord = vPos.xz * scale;
    coord.y -= uTime * uSpeed * 10.0;
    float line = max(gridLine(coord.x, uLineWidth), gridLine(coord.y, uLineWidth));
    vec3 color = mix(uColor2, uColor1, line);
    float dist = length(vWorldPosition.xz + vec2(0.0, 0.0));
    color *= 1.0 - smoothstep(20.0, 80.0, dist);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const scanlineShader = {
  uniforms: {
    inputBuffer: { value: null },
    resolution: { value: new THREE.Vector2() },
    uTime: { value: 0 },
    uLineSize: { value: 0.5 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision mediump float;
    uniform float uTime;
    uniform float uLineSize;
    uniform sampler2D inputBuffer;
    uniform vec2 resolution;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(inputBuffer, vUv);
      float scanline = sin(vUv.y * 800.0 + uTime * 10.0) * 0.5 + 0.5;
      float grid = pow(scanline, 4.0) * uLineSize;
      color.rgb += grid;
      gl_FragColor = color;
    }
  `,
};

export function VelocityGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x050505, 10, 95);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 10, 0);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x050505);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    // Floor
    const floorGroup = new THREE.Group();
    const floorGeometry = new THREE.PlaneGeometry(400, 400, 80, 80);
    const floorMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      uniforms: {
        uColor1: { value: new THREE.Color('#d1ff00') },
        uColor2: { value: new THREE.Color('#111111') },
        uGridScale: { value: 30.0 },
        uLineWidth: { value: 0.5 },
        uTime: { value: 0 },
        uSpeed: { value: 0.15 },
        uOffset: { value: new THREE.Vector3(0, 0, 0) },
      },
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floorGroup.add(floor);
    scene.add(floorGroup);

    // Store original vertices
    const originalPositions = new Float32Array(floorGeometry.attributes.position.array);

    // Post-processing
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const smaaEffect = new SMAAEffect();
    composer.addPass(new ShaderPass(smaaEffect as any));

    const bloomEffect = new BloomEffect({
      intensity: 0.8,
      luminanceThreshold: 0.1,
    });
    const bloomPass = new ShaderPass(bloomEffect as any);
    composer.addPass(bloomPass);

    const scanlinePass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(scanlineShader.uniforms),
        vertexShader: scanlineShader.vertexShader,
        fragmentShader: scanlineShader.fragmentShader,
      })
    );
    (scanlinePass as any).uniforms['resolution'].value.set(width, height);
    composer.addPass(scanlinePass);

    // Animation state
    let velocity = 0.05;
    const offset = { x: 0, y: 0, z: 0 };
    const mouse = { x: 0, y: 0 };

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouseMove);

    const animate = (time: number) => {
      const now = time * 0.001;

      floorMaterial.uniforms.uTime.value = now;
      (scanlinePass as any).uniforms.uTime.value = now;

      offset.z += velocity * (0.98 + Math.sin(now) * 0.25);
      if (offset.z > 400 / 30.0) offset.z -= 400 / 30.0;
      floorMaterial.uniforms.uOffset.value.set(offset.x, offset.y, offset.z);

      // Update vertices
      const posArray = floorGeometry.attributes.position.array as Float32Array;
      const uOff = floorMaterial.uniforms.uOffset.value as THREE.Vector3;
      for (let i = 0; i < posArray.length; i += 3) {
        posArray[i] = originalPositions[i] + uOff.x;
        posArray[i + 1] = originalPositions[i + 1] + uOff.y;
        posArray[i + 2] = originalPositions[i + 2] + uOff.z;
      }
      floorGeometry.attributes.position.needsUpdate = true;

      camera.position.x += ((mouse.x * 10) - camera.position.x) * 0.05;
      camera.position.y += ((10 + mouse.y * 5) - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);

      composer.render();
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      (scanlinePass as any).uniforms['resolution'].value.set(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      floorGeometry.dispose();
      floorMaterial.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
      }}
    />
  );
}
