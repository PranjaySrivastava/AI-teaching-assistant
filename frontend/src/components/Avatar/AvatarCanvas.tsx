'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { AvatarModel } from './AvatarModel';
import { ExpressionController, Sentiment } from './expressionController';
import { LipSyncController, TimedPhoneme } from './lipSyncController';

interface AvatarCanvasProps {
  sentiment?: Sentiment;
  isSpeaking?: boolean;
  audioReactiveLevel?: number;
  phonemeTimeline?: TimedPhoneme[] | null;
  showGlasses?: boolean;
  onLoaded?: () => void;
  onError?: (err: unknown) => void;
  /** Called with each TTS word boundary so lip-sync can be driven in real time */
  onWordBoundaryRef?: React.MutableRefObject<((word: string) => void) | null>;
  /** Spoken statement text for zero-lag phoneme pre-computation */
  spokenText?: string;
}

// Procedural studio lighting environment map for realistic PBR reflections
function createStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);

  const envScene = new THREE.Scene();
  const keyLight = new THREE.DirectionalLight(0xffecd2, 2.5);
  keyLight.position.set(2, 3, 2);
  envScene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xd5e6f8, 1.6);
  fillLight.position.set(-2, 1.5, 1);
  envScene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x06b6d4, 3.0);
  rimLight.position.set(0, 2, -2.5);
  envScene.add(rimLight);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x0f172a, 1.2);
  envScene.add(hemi);

  const renderTarget = pmremGenerator.fromScene(envScene, 0.04);
  pmremGenerator.dispose();
  return renderTarget;
}

export const AvatarCanvas: React.FC<AvatarCanvasProps> = ({
  sentiment = 'idle',
  isSpeaking = false,
  audioReactiveLevel = 0,
  phonemeTimeline = null,
  showGlasses = false,
  onLoaded,
  onError,
  onWordBoundaryRef,
  spokenText,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Controller refs
  const expressionCtrlRef = useRef<ExpressionController | null>(null);
  const lipSyncCtrlRef = useRef<LipSyncController | null>(null);
  const avatarModelRef = useRef<AvatarModel | null>(null);

  if (!expressionCtrlRef.current) {
    expressionCtrlRef.current = new ExpressionController();
  }
  if (!lipSyncCtrlRef.current) {
    lipSyncCtrlRef.current = new LipSyncController();
  }

  // Pre-calculate all phonemes for the spoken text upfront (Zero-Lag Solution 1)
  useEffect(() => {
    if (spokenText) {
      lipSyncCtrlRef.current?.precomputePhonemes(spokenText);
    }
  }, [spokenText]);

  // Update sentiment when prop changes
  useEffect(() => {
    expressionCtrlRef.current?.setSentiment(sentiment);
  }, [sentiment]);

  // Update audio reactive level
  useEffect(() => {
    lipSyncCtrlRef.current?.setAudioLevel(audioReactiveLevel);
  }, [audioReactiveLevel]);

  // Keep latest isSpeaking in ref for 60fps render loop
  const isSpeakingRef = useRef(isSpeaking);
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  // Toggle glasses on model
  const showGlassesRef = useRef(showGlasses);
  useEffect(() => {
    showGlassesRef.current = showGlasses;
    avatarModelRef.current?.setGlassesVisible(showGlasses);
  }, [showGlasses]);

  // Wire onWordBoundaryRef so the parent page can call it on utterance.boundary events.
  // The ref gets a function that calls setActiveVisemeFromWord on the lip-sync controller.
  useEffect(() => {
    if (onWordBoundaryRef) {
      onWordBoundaryRef.current = (word: string) => {
        lipSyncCtrlRef.current?.setActiveVisemeFromWord(word, performance.now() / 1000);
      };
      return () => {
        onWordBoundaryRef.current = null;
      };
    }
  }, [onWordBoundaryRef]);

  // Synchronise phoneme timeline and boundary-event mode with TTS audio onset.
  // Called when isSpeaking flips or a new phoneme timeline arrives.
  useEffect(() => {
    if (isSpeaking) {
      if (phonemeTimeline && phonemeTimeline.length > 0) {
        // Start the pre-generated fallback timeline immediately at audio onset.
        // Word boundary events will override this on a per-word basis (Priority 1 in LipSyncController).
        lipSyncCtrlRef.current?.playTimeline(phonemeTimeline, performance.now() / 1000);
      }
      // If no timeline is provided, boundary events alone will drive the mouth —
      // the LipSyncController's currentWordPhonemes will be populated by onboundary callbacks.
    } else {
      // Audio finished — clear everything
      lipSyncCtrlRef.current?.stop();
    }
  }, [isSpeaking, phonemeTimeline]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isDisposed = false;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // 2. Camera setup - framed close-up portrait on head, hair, and face
    const camera = new THREE.PerspectiveCamera(
      30,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      20
    );
    camera.position.set(0, 0.1, 0.5);
    camera.lookAt(0, 0.095, 0);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 4. Studio Environment & Lighting
    const envRenderTarget = createStudioEnvironment(renderer);
    scene.environment = envRenderTarget.texture;

    // Soft ambient
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    // Key Light (Glamour Golden Warm Key)
    const keyLight = new THREE.DirectionalLight(0xfff0e2, 2.5);
    keyLight.position.set(1.0, 1.45, 1.35);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    // Fill Light (Flattering Soft Peach/Rose Fill)
    const fillLight = new THREE.DirectionalLight(0xfce7f3, 1.4);
    fillLight.position.set(-1.1, 0.95, 1.15);
    scene.add(fillLight);

    // Rim/Back Light (Cyan Cyber Accent to match UI)
    const rimLight = new THREE.DirectionalLight(0x06b6d4, 3.4);
    rimLight.position.set(0.1, 1.6, -1.5);
    scene.add(rimLight);

    // Eye Catchlight (adds specular twinkle to corneas)
    const catchLight = new THREE.PointLight(0xffffff, 1.0, 2.5);
    catchLight.position.set(0, 0.14, 0.72);
    scene.add(catchLight);

    // Warm Chin & Jawline Sculpting Bounce Light
    const bounceLight = new THREE.DirectionalLight(0xfed7aa, 0.5);
    bounceLight.position.set(0, -0.9, 0.6);
    scene.add(bounceLight);

    // 5. Instantiate and Load Avatar Model
    const model = new AvatarModel();
    avatarModelRef.current = model;
    model.setGlassesVisible(showGlassesRef.current);
    scene.add(model.rootGroup);

    model
      .load('/model.glb', (p) => {
        if (!isDisposed) {
          setLoadProgress(Math.round(p * 100));
        }
      })
      .then(() => {
        if (!isDisposed) {
          setHasLoaded(true);
          setErrorMessage(null);
          if (onLoaded) onLoaded();
        }
      })
      .catch((err) => {
        if (!isDisposed) {
          console.error('Failed to load avatar model:', err);
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load 3D model');
          if (onError) onError(err);
        }
      });

    // 6. Handle Resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) continue;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    });
    resizeObserver.observe(container);

    // 7. Animation Render Loop
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const now = performance.now();
      const deltaTime = Math.min(0.1, (now - lastTime) / 1000);
      const currentTimeSec = now / 1000;
      lastTime = now;

      // Update controllers
      const exprData = expressionCtrlRef.current?.update(deltaTime, currentTimeSec) || {
        weights: new Map<string, number>(),
        headTiltZ: 0,
        blinkWeight: 0,
      };
      const visemeData =
        lipSyncCtrlRef.current?.update(deltaTime, currentTimeSec) || new Map<string, number>();

      // Apply to 3D Avatar
      model.update(
        deltaTime,
        currentTimeSec,
        exprData.weights,
        visemeData,
        exprData.headTiltZ,
        exprData.blinkWeight,
        isSpeakingRef.current
      );

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      envRenderTarget.dispose();
      renderer.dispose();
      model.dispose();
      avatarModelRef.current = null;
    };
  }, [onError, onLoaded]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden flex items-center justify-center"
    >
      {!hasLoaded && !errorMessage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-20">
          <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin mb-3" />
          <p className="text-xs font-medium text-cyan-300">Loading Professor Ada 3D Model...</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {loadProgress > 0 ? `${loadProgress}%` : 'Initializing WebGL Rig'}
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-4 text-center z-20">
          <p className="text-xs text-rose-400 font-medium mb-1">Failed to load 3D Model</p>
          <p className="text-[11px] text-slate-500 max-w-xs">{errorMessage}</p>
        </div>
      )}
    </div>
  );
};
