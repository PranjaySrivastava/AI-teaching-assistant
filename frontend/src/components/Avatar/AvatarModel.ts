import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface MorphTargetMeshInfo {
  mesh: THREE.Mesh | THREE.SkinnedMesh;
  dict: { [key: string]: number };
  influences: number[];
}

export class AvatarModel {
  public rootGroup: THREE.Group = new THREE.Group();
  public isLoaded = false;

  private morphMeshes: MorphTargetMeshInfo[] = [];
  private bones: Map<string, THREE.Bone> = new Map();

  // Reference initial bone rotations
  private baseHeadRot: THREE.Euler = new THREE.Euler();
  private baseNeckRot: THREE.Euler = new THREE.Euler();
  private baseSpineRot: THREE.Euler = new THREE.Euler();

  // Natural subtle eye saccades for conscious presence
  private nextSaccadeTime = 0;
  private currentSaccadeX = 0;
  private currentSaccadeY = 0;
  private targetSaccadeX = 0;
  private targetSaccadeY = 0;

  // Toggle glasses visibility (defaults to false to showcase beautiful face)
  public showGlasses = false;

  public setGlassesVisible(visible: boolean) {
    this.showGlasses = visible;
    this.rootGroup.traverse((child) => {
      if (child.name.includes('glasses')) {
        child.visible = visible;
      }
    });
  }

  public async load(url: string, onProgress?: (progress: number) => void): Promise<void> {
    const loader = new GLTFLoader();

    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          const scene = gltf.scene;

          // Collect morph target meshes & bones
          scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh || (child as THREE.SkinnedMesh).isSkinnedMesh) {
              const mesh = child as THREE.SkinnedMesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              mesh.frustumCulled = false;

              if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
                this.morphMeshes.push({
                  mesh,
                  dict: mesh.morphTargetDictionary,
                  influences: mesh.morphTargetInfluences,
                });
              }

              // Glamorous & Expressive PBR surface tuning tailored per mesh
              if (mesh.material) {
                const mat = mesh.material as THREE.MeshStandardMaterial;
                if (mat.isMeshStandardMaterial) {
                  if (mesh.name === 'Eye_Mesh') {
                    // Ultra-glossy, moist cornea with high-contrast catchlight reflection
                    mat.roughness = 0.01;
                    mat.metalness = 0.0;
                    mat.envMapIntensity = 3.2;
                  } else if (mesh.name === 'Eyelash_Mesh') {
                    // Deep defined mascara-like eyelashes framing the eyes
                    mat.roughness = 0.7;
                    mat.transparent = true;
                    mat.opacity = 0.95;
                    mat.color.setHex(0x111111);
                  } else if (mesh.name === 'EyeAO_Mesh') {
                    // Soften under-eye shadow for a bright, youthful eye area
                    mat.transparent = true;
                    mat.opacity = 0.3;
                  } else if (mesh.name === 'Head_Mesh') {
                    // Radiant, velvet-soft porcelain skin with subtle warm rosy complexion
                    mat.roughness = 0.52;
                    mat.metalness = 0.0;
                    mat.envMapIntensity = 0.85;
                    mat.color.setRGB(1.025, 0.98, 0.97);
                  } else if (mesh.name === 'Body_Mesh') {
                    // Elegant silk/satin blouse texture
                    mat.roughness = 0.65;
                    mat.metalness = 0.06;
                    mat.envMapIntensity = 0.5;
                  } else if (mesh.name.includes('hair')) {
                    // Silky, lustrous hair with soft warm highlights
                    mat.roughness = 0.32;
                    mat.metalness = 0.1;
                    mat.envMapIntensity = 1.3;
                    mat.color.setRGB(1.02, 0.98, 0.96);
                  } else if (mesh.name === 'avaturn_glasses_0') {
                    // Sleek, delicate metallic designer frames
                    mat.map = null; // Unbind dark baked texture to reveal true metallic champagne gold
                    mat.roughness = 0.18;
                    mat.metalness = 0.85;
                    mat.color.setHex(0xd4af37);
                    mat.envMapIntensity = 2.2;
                    mesh.scale.set(0.96, 0.96, 0.94);
                    mesh.visible = this.showGlasses;
                  } else if (mesh.name === 'avaturn_glasses_1') {
                    // Ultra-thin transparent AR optical lenses (eyes fully visible)
                    mat.roughness = 0.01;
                    mat.metalness = 0.08;
                    mat.transparent = true;
                    mat.opacity = 0.14;
                    mat.envMapIntensity = 2.6;
                    mesh.visible = this.showGlasses;
                  } else if (mesh.name === 'Teeth_Mesh' || mesh.name === 'Tongue_Mesh') {
                    mat.roughness = 0.18;
                    mat.metalness = 0.0;
                    mat.color.setHex(0xffffff);
                  }
                  mat.needsUpdate = true;
                }
              }
            }

            if ((child as THREE.Bone).isBone) {
              this.bones.set(child.name, child as THREE.Bone);
            }
          });

          // Save base bone rotations with poised, upright posture
          const neck = this.bones.get('Neck');
          if (neck) {
            // Straighten neck slightly from forward slouch to lift chin cleanly
            neck.rotation.set(0.22, 0, 0);
            this.baseNeckRot.copy(neck.rotation);
          }

          const head = this.bones.get('Head');
          if (head) {
            // Set poised eye-level head angle
            head.rotation.set(-0.04, 0, 0);
            this.baseHeadRot.copy(head.rotation);
          }

          const spine = this.bones.get('Spine2') || this.bones.get('Spine1');
          if (spine) this.baseSpineRot.copy(spine.rotation);

          // Relax arms from horizontal T-pose to natural resting pose
          const leftArm = this.bones.get('LeftArm');
          if (leftArm) {
            leftArm.rotation.set(1.15, 0.05, -0.05);
          }

          const rightArm = this.bones.get('RightArm');
          if (rightArm) {
            rightArm.rotation.set(1.15, -0.05, 0.05);
          }

          const leftForeArm = this.bones.get('LeftForeArm');
          if (leftForeArm) {
            leftForeArm.rotation.set(0.08, 0, -0.15);
          }

          const rightForeArm = this.bones.get('RightForeArm');
          if (rightForeArm) {
            rightForeArm.rotation.set(0.08, 0, 0.15);
          }

          // Position model vertically so head/eyes/chest are centered
          scene.position.set(0, -1.6, 0);
          this.rootGroup.add(scene);
          this.isLoaded = true;
          resolve();
        },
        (xhr) => {
          if (xhr.lengthComputable && onProgress) {
            onProgress(xhr.loaded / xhr.total);
          }
        },
        (error) => {
          console.error('Error loading avatar model:', error);
          reject(error);
        }
      );
    });
  }

  public update(
    deltaTime: number,
    currentTimeSec: number,
    expressionWeights: Map<string, number>,
    visemeWeights: Map<string, number>,
    headTiltZ: number,
    blinkWeight: number,
    pointerPosition?: { x: number; y: number }
  ) {
    if (!this.isLoaded) return;

    // 1. Reset morph target influences smoothly
    for (const info of this.morphMeshes) {
      for (let i = 0; i < info.influences.length; i++) {
        info.influences[i] = 0;
      }
    }

    // Combine all blendshape targets to apply
    const combinedTargets: Record<string, number> = {};

    // A. Sentiment expressions
    expressionWeights.forEach((val, key) => {
      combinedTargets[key] = (combinedTargets[key] || 0) + val;
    });

    // B. Lip-sync visemes (override or blend mouth shapes with natural scaled intensity)
    visemeWeights.forEach((val, key) => {
      const scale = key === 'viseme_aa' || key === 'viseme_O' ? 0.55 : 0.65;
      combinedTargets[key] = (combinedTargets[key] || 0) + val * scale;
    });

    // Visible anatomical speech articulation: coupling visemes with subtle, natural jawOpen and mouthOpen
    visemeWeights.forEach((val, key) => {
      if (val > 0.01) {
        if (key === 'viseme_aa') {
          // Modest, realistic mouth opening (not gaping)
          combinedTargets['jawOpen'] = Math.max(combinedTargets['jawOpen'] || 0, val * 0.28);
          combinedTargets['mouthOpen'] = Math.max(combinedTargets['mouthOpen'] || 0, val * 0.2);
        } else if (key === 'viseme_O') {
          combinedTargets['jawOpen'] = Math.max(combinedTargets['jawOpen'] || 0, val * 0.18);
          combinedTargets['mouthFunnel'] = Math.max(combinedTargets['mouthFunnel'] || 0, val * 0.3);
          combinedTargets['mouthPucker'] = Math.max(
            combinedTargets['mouthPucker'] || 0,
            val * 0.15
          );
        } else if (key === 'viseme_E' || key === 'viseme_I') {
          combinedTargets['jawOpen'] = Math.max(combinedTargets['jawOpen'] || 0, val * 0.12);
          combinedTargets['mouthOpen'] = Math.max(combinedTargets['mouthOpen'] || 0, val * 0.1);
          combinedTargets['mouthSmile'] = Math.max(combinedTargets['mouthSmile'] || 0, val * 0.12);
        } else if (key === 'viseme_PP') {
          combinedTargets['jawOpen'] = 0;
          combinedTargets['mouthClose'] = Math.max(combinedTargets['mouthClose'] || 0, val * 0.38);
        } else if (key === 'viseme_FF' || key === 'viseme_TH' || key === 'viseme_DD') {
          combinedTargets['jawOpen'] = Math.max(combinedTargets['jawOpen'] || 0, val * 0.1);
        }
      }
    });

    // C. Blinking
    if (blinkWeight > 0.001) {
      // Support ARKit eyeBlink and Avaturn eyesClosed
      combinedTargets['eyeBlinkLeft'] = Math.max(combinedTargets['eyeBlinkLeft'] || 0, blinkWeight);
      combinedTargets['eyeBlinkRight'] = Math.max(
        combinedTargets['eyeBlinkRight'] || 0,
        blinkWeight
      );
      combinedTargets['eyesClosed'] = Math.max(combinedTargets['eyesClosed'] || 0, blinkWeight);
    }

    // D. Natural eye micro-saccades (subtle periodic eye darting)
    if (currentTimeSec >= this.nextSaccadeTime) {
      this.targetSaccadeX = (Math.random() - 0.5) * 0.07;
      this.targetSaccadeY = (Math.random() - 0.5) * 0.04;
      this.nextSaccadeTime = currentTimeSec + 2.2 + Math.random() * 2.2;
    }
    this.currentSaccadeX +=
      (this.targetSaccadeX - this.currentSaccadeX) * Math.min(1.0, deltaTime * 9.0);
    this.currentSaccadeY +=
      (this.targetSaccadeY - this.currentSaccadeY) * Math.min(1.0, deltaTime * 9.0);

    if (this.currentSaccadeX > 0.005) {
      combinedTargets['eyeLookOutLeft'] =
        (combinedTargets['eyeLookOutLeft'] || 0) + this.currentSaccadeX;
      combinedTargets['eyeLookInRight'] =
        (combinedTargets['eyeLookInRight'] || 0) + this.currentSaccadeX;
    } else if (this.currentSaccadeX < -0.005) {
      combinedTargets['eyeLookInLeft'] =
        (combinedTargets['eyeLookInLeft'] || 0) - this.currentSaccadeX;
      combinedTargets['eyeLookOutRight'] =
        (combinedTargets['eyeLookOutRight'] || 0) - this.currentSaccadeX;
    }

    if (this.currentSaccadeY > 0.005) {
      combinedTargets['eyeLookUpLeft'] =
        (combinedTargets['eyeLookUpLeft'] || 0) + this.currentSaccadeY;
      combinedTargets['eyeLookUpRight'] =
        (combinedTargets['eyeLookUpRight'] || 0) + this.currentSaccadeY;
    } else if (this.currentSaccadeY < -0.005) {
      combinedTargets['eyeLookDownLeft'] =
        (combinedTargets['eyeLookDownLeft'] || 0) - this.currentSaccadeY;
      combinedTargets['eyeLookDownRight'] =
        (combinedTargets['eyeLookDownRight'] || 0) - this.currentSaccadeY;
    }

    // Safeguard smile: if separate mouthSmileLeft / Right exist, avoid duplicating with mouthSmile
    if (combinedTargets['mouthSmileLeft'] || combinedTargets['mouthSmileRight']) {
      delete combinedTargets['mouthSmile'];
    }

    // Apply combined weights to all meshes that have each target
    for (const info of this.morphMeshes) {
      Object.entries(combinedTargets).forEach(([targetName, weight]) => {
        const idx = info.dict[targetName];
        if (idx !== undefined) {
          info.influences[idx] = Math.min(1.0, Math.max(0.0, weight));
        }
      });
    }

    // 2. Procedural Breathing & Micro-Gestures
    const breathCycle = Math.sin(currentTimeSec * 2.2);

    const spine = this.bones.get('Spine2') || this.bones.get('Spine1');
    if (spine) {
      spine.rotation.x = this.baseSpineRot.x + breathCycle * 0.008;
      spine.rotation.y = this.baseSpineRot.y + Math.sin(currentTimeSec * 0.6) * 0.003;
    }

    const neck = this.bones.get('Neck');
    if (neck) {
      neck.rotation.x = this.baseNeckRot.x - breathCycle * 0.004;
      neck.rotation.z = this.baseNeckRot.z + headTiltZ * 0.18;
    }

    const head = this.bones.get('Head');
    if (head) {
      // Forward-facing head with subtle organic micro-drift and sentiment tilt
      const microSwayX = Math.sin(currentTimeSec * 0.8) * 0.002;
      const microSwayY = Math.cos(currentTimeSec * 0.5) * 0.003;

      head.rotation.x = this.baseHeadRot.x + microSwayX;
      head.rotation.y = this.baseHeadRot.y + microSwayY;
      head.rotation.z = this.baseHeadRot.z + headTiltZ * 0.35;
    }
  }

  public dispose() {
    this.rootGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else if (mesh.material) {
          mesh.material.dispose();
        }
      }
    });
    this.morphMeshes = [];
    this.bones.clear();
    this.isLoaded = false;
  }
}
