import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { RecordingState } from '../types';
import { VoiceSculptureFallback } from './VoiceSculptureFallback';

interface VoiceSculpture3DProps {
  recordingState: RecordingState;
  micLevel: number;
  commandPulseKey: number;
  compact?: boolean;
}

export default function VoiceSculpture3D({
  recordingState,
  micLevel,
  commandPulseKey,
  compact = false,
}: VoiceSculpture3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const stateRef = useRef({ recordingState, micLevel, pulse: 0 });

  useEffect(() => {
    stateRef.current.recordingState = recordingState;
    stateRef.current.micLevel = micLevel;
  }, [recordingState, micLevel]);

  useEffect(() => {
    if (commandPulseKey > 0) {
      stateRef.current.pulse = 1;
    }
  }, [commandPulseKey]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setWebglFailed(true);
      return;
    }

    const width = container.clientWidth || (compact ? 96 : 240);
    const height = container.clientHeight || (compact ? 96 : 220);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.domElement.style.maxWidth = '100%';
    renderer.domElement.style.display = 'block';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.4, 4.4);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(3, 5, 4);
    scene.add(dirLight);

    const group = new THREE.Group();
    scene.add(group);

    // Core icosahedron with flat shading and thick black edges
    const coreGeo = new THREE.IcosahedronGeometry(0.95, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xc5f36b,
      flatShading: true,
      roughness: 0.7,
      metalness: 0.05,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    const coreEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(coreGeo),
      new THREE.LineBasicMaterial({ color: 0x151515, linewidth: 2 })
    );
    coreMesh.add(coreEdges);
    group.add(coreMesh);

    // Orbiting lavender cube
    const boxGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
    const boxMesh = new THREE.Mesh(
      boxGeo,
      new THREE.MeshStandardMaterial({ color: 0xc5b8ff, flatShading: true, roughness: 0.75 })
    );
    boxMesh.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(boxGeo),
        new THREE.LineBasicMaterial({ color: 0x151515 })
      )
    );
    boxMesh.position.set(-1.35, 0.55, 0.25);
    group.add(boxMesh);

    // Orbiting soft pink octahedron
    const octGeo = new THREE.OctahedronGeometry(0.45, 0);
    const octMesh = new THREE.Mesh(
      octGeo,
      new THREE.MeshStandardMaterial({ color: 0xf8bae0, flatShading: true, roughness: 0.75 })
    );
    octMesh.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(octGeo),
        new THREE.LineBasicMaterial({ color: 0x151515 })
      )
    );
    octMesh.position.set(1.35, -0.45, 0.2);
    group.add(octMesh);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || width;
      const h = container.clientHeight || height;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let animId = 0;
    let t = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const { recordingState: rs, micLevel: ml, pulse } = stateRef.current;

      if (rs === 'error') {
        coreMat.color.setHex(0xff7a7a);
      } else if (rs === 'reconnecting') {
        coreMat.color.setHex(0xffd166);
      } else if (rs === 'generating_notes') {
        coreMat.color.setHex(0xc5b8ff);
      } else {
        coreMat.color.setHex(0xc5f36b);
      }

      const isPaused = rs === 'completed' || rs === 'paused_for_tts';
      if (!isPaused) {
        const speed = rs === 'generating_notes' ? 0.032 : rs === 'listening' ? 0.015 + ml * 0.03 : 0.007;
        t += speed;
        group.rotation.y = t;
        group.rotation.x = Math.sin(t * 0.7) * 0.16;
        boxMesh.rotation.x += speed * 1.4;
        octMesh.rotation.z += speed * 1.2;
      }

      if (rs === 'reconnecting' || rs === 'error') {
        group.position.x = Math.sin(Date.now() * 0.03) * 0.06;
      } else {
        group.position.x = 0;
      }

      const targetScale =
        (rs === 'listening' ? 1 + Math.min(0.42, ml * 0.5) : 1) + pulse * 0.28;
      coreMesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.22);
      if (stateRef.current.pulse > 0.01) {
        stateRef.current.pulse *= 0.88;
      } else {
        stateRef.current.pulse = 0;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      coreGeo.dispose();
      boxGeo.dispose();
      octGeo.dispose();
      coreMat.dispose();
      renderer.dispose();
    };
  }, [compact]);

  if (webglFailed) {
    return (
      <VoiceSculptureFallback
        recordingState={recordingState}
        micLevel={micLevel}
        compact={compact}
      />
    );
  }

  return (
    <div
      ref={mountRef}
      className={`overflow-hidden rounded-2xl border-[2.5px] border-[var(--mv-border)] bg-[var(--mv-surface)] shadow-[4px_4px_0px_var(--mv-border)] ${
        compact ? 'h-24 w-24 shrink-0' : 'h-48 w-full sm:h-56'
      }`}
      aria-label={`Interactive 3D voice sculpture: ${recordingState}`}
    />
  );
}
