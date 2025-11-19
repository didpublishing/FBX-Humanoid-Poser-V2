import React, { useEffect, useRef, useState, Suspense, useMemo, useLayoutEffect, ReactNode } from 'react';
import { Canvas, useLoader, useThree, createPortal, useFrame } from '@react-three/fiber';
import { FBXLoader } from 'three-stdlib';
import { OrbitControls, TransformControls, Environment, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { BoneInfo, ControlMode, ViewMode, PoseHandler, BoneTransform, LoadedModel } from '../types';

interface JointMarkerProps {
    bone: THREE.Bone;
    isSelected: boolean;
    onSelect: (id: string) => void;
}

const JointMarker: React.FC<JointMarkerProps> = ({ bone, isSelected, onSelect }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHover] = useState(false);
    
    useFrame(() => {
        if (!meshRef.current || !bone) return;
        
        // Target visual size in world units (approx 5cm)
        const VISUAL_SIZE = 0.05; 
        
        const parentScale = new THREE.Vector3();
        bone.getWorldScale(parentScale);
        
        // Invert the scale so the marker appears at constant size in world space.
        const sx = Math.max(0.0001, Math.abs(parentScale.x));
        const sy = Math.max(0.0001, Math.abs(parentScale.y));
        const sz = Math.max(0.0001, Math.abs(parentScale.z));

        meshRef.current.scale.set(
            VISUAL_SIZE / sx,
            VISUAL_SIZE / sy,
            VISUAL_SIZE / sz
        );
    });

    return (
        <mesh
            ref={meshRef}
            onClick={(e) => { e.stopPropagation(); onSelect(bone.uuid); }}
            onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
            onPointerOut={(e) => { e.stopPropagation(); setHover(false); }}
        >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
                color={isSelected ? "#fbbf24" : (hovered ? "#818cf8" : "#6366f1")}
                emissive={isSelected ? "#fbbf24" : (hovered ? "#818cf8" : "#000000")}
                emissiveIntensity={isSelected ? 0.8 : 0.2}
                transparent
                opacity={isSelected ? 0.9 : (hovered ? 0.8 : 0.6)}
                depthTest={false} 
                depthWrite={false}
            />
        </mesh>
    );
};

interface ModelProps {
  id: string;
  url: string;
  visible: boolean;
  onBonesDetected: (modelId: string, bones: BoneInfo[]) => void;
  selectedBoneId: string | null;
  setSelectedBoneId: (id: string | null) => void;
  controlMode: ControlMode;
  viewMode: ViewMode;
  showOverlays: boolean;
  registerPoseHandler: (modelId: string, handler: PoseHandler) => void;
  unregisterPoseHandler: (modelId: string) => void;
}

const Model: React.FC<ModelProps> = ({ 
    id, 
    url, 
    visible, 
    onBonesDetected, 
    selectedBoneId, 
    setSelectedBoneId, 
    controlMode, 
    viewMode, 
    showOverlays, 
    registerPoseHandler,
    unregisterPoseHandler
}) => {
  const fbx = useLoader(FBXLoader, url);
  const { camera, controls } = useThree();
  const [bones, setBones] = useState<THREE.Bone[]>([]);
  const initialPoseRef = useRef<BoneTransform[]>([]);
  
  // Use SkeletonUtils.clone to correctly clone SkinnedMeshes and bind them to the new skeleton
  const scene = useMemo(() => {
    // 1. Deep clone with re-binding
    const clone = SkeletonUtils.clone(fbx);

    // 2. Reset transforms to ensure clean measurement
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    clone.scale.set(1, 1, 1);
    clone.updateMatrixWorld(true);

    // 3. Calculate Bounding Box
    const box = new THREE.Box3();
    box.makeEmpty();

    // We focus on Meshes for size to avoid invisible root node issues
    let hasMeshes = false;
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        // Ensure geometry bounds are present
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        
        // Expand box by the mesh in its T-Pose/Rest state
        box.expandByObject(mesh);
        hasMeshes = true;
      }
    });

    // Fallback if no meshes
    if (!hasMeshes) {
        box.setFromObject(clone);
    }

    // Safety check for valid box
    if (box.isEmpty() || !isFinite(box.min.x)) {
        box.min.set(-0.5, 0, -0.5);
        box.max.set(0.5, 1.8, 0.5);
    }

    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // 4. Normalize Scale to ~2.5 units height
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const targetSize = 2.5;
    const scaleFactor = targetSize / maxDim;

    clone.scale.set(scaleFactor, scaleFactor, scaleFactor);

    // 5. Center the model on the floor (Y=0)
    clone.position.x = -center.x * scaleFactor;
    clone.position.y = -box.min.y * scaleFactor; // Align bottom to 0
    clone.position.z = -center.z * scaleFactor;

    clone.updateMatrixWorld(true);

    return clone;
  }, [fbx]);

  // View Mode Updates
  useEffect(() => {
    if (!scene) return;

    scene.visible = visible;

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.frustumCulled = false;

        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        
        materials.forEach((mat) => {
          if (!mat.userData.originalColor) {
             mat.userData.originalColor = mat.color ? mat.color.getHex() : 0xffffff;
          }

          mat.wireframe = false;
          mat.transparent = false;
          mat.opacity = 1.0;
          mat.depthWrite = true;
          mat.side = THREE.DoubleSide;
          
          if (mat.color) {
            const baseColor = mat.userData.originalColor === 0x000000 ? 0xcccccc : mat.userData.originalColor;
            mat.color.setHex(baseColor);
          }
          
          switch (viewMode) {
            case ViewMode.MESH:
              mat.wireframe = true;
              if (mat.color) mat.color.setHex(0x8888ff);
              break;
            case ViewMode.RIG:
              mat.transparent = true;
              mat.opacity = 0.15;
              mat.depthWrite = false;
              if (mat.color) mat.color.setHex(0x888888);
              break;
            case ViewMode.SOLID:
            default:
              break;
          }
          mat.needsUpdate = true;
        });
      }
    });
  }, [scene, viewMode, visible]);

  // Bone detection and Initial Pose Capture
  useLayoutEffect(() => {
    if (!scene) return;

    const detectedBones: THREE.Bone[] = [];
    const boneInfos: BoneInfo[] = [];

    scene.traverse((child) => {
      if (child instanceof THREE.Bone) {
        detectedBones.push(child);
        
        let depth = 0;
        let parent = child.parent;
        while (parent && parent instanceof THREE.Bone) {
          depth++;
          parent = parent.parent;
        }

        boneInfos.push({
          id: child.uuid,
          name: child.name,
          depth: depth
        });
      }
    });

    setBones(detectedBones);
    // Only notify if we actually found bones to avoid loops, though dependency array handles most
    if (detectedBones.length > 0) {
        onBonesDetected(id, boneInfos);
    }

    // Capture Initial Pose
    initialPoseRef.current = detectedBones.map(b => ({
        name: b.name,
        position: [b.position.x, b.position.y, b.position.z],
        quaternion: [b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w],
        scale: [b.scale.x, b.scale.y, b.scale.z]
    }));
    
    // Reset Camera Focus only on first load of first model (optional logic, but good for UX)
    // We won't force it here to allow adding models without jarring camera jumps.
  }, [scene, id, onBonesDetected]);

  // Expose Pose Handling Methods
  useEffect(() => {
    const handler: PoseHandler = {
        getPose: () => {
            return bones.map(b => ({
                name: b.name,
                position: [b.position.x, b.position.y, b.position.z],
                quaternion: [b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w],
                scale: [b.scale.x, b.scale.y, b.scale.z]
            }));
        },
        setPose: (transforms: BoneTransform[]) => {
            transforms.forEach(t => {
                const bone = bones.find(b => b.name === t.name);
                if (bone) {
                    bone.position.set(...t.position);
                    bone.quaternion.set(...t.quaternion);
                    bone.scale.set(...t.scale);
                    bone.updateMatrix();
                }
            });
        },
        resetPose: () => {
            initialPoseRef.current.forEach(t => {
                const bone = bones.find(b => b.name === t.name);
                if (bone) {
                    bone.position.set(...t.position);
                    bone.quaternion.set(...t.quaternion);
                    bone.scale.set(...t.scale);
                    bone.updateMatrix();
                }
            });
        }
    };

    registerPoseHandler(id, handler);
    return () => unregisterPoseHandler(id);
  }, [bones, id, registerPoseHandler, unregisterPoseHandler]);

  const selectedObject = useMemo(() => {
    if (!visible) return null;
    return bones.find(b => b.uuid === selectedBoneId);
  }, [bones, selectedBoneId, visible]);

  // Transform Controls dragging logic
  const controlsRef = useRef<React.ElementRef<typeof TransformControls>>(null);
  useEffect(() => {
    if (controlsRef.current) {
        const callback = (event: any) => {
            const orbitControls = controls as unknown as OrbitControlsImpl;
            if (orbitControls) {
                orbitControls.enabled = !event.value;
            }
        };
        // @ts-ignore
        controlsRef.current.addEventListener('dragging-changed', callback);
        // @ts-ignore
        return () => controlsRef.current?.removeEventListener('dragging-changed', callback);
    }
  }, [controls, selectedObject]);

  return (
    <>
      <primitive object={scene} dispose={null} />
      
      {viewMode === ViewMode.RIG && visible && (
        <primitive object={new THREE.SkeletonHelper(scene)} />
      )}

      {showOverlays && visible && bones.map((bone) => (
             createPortal(
                <JointMarker 
                    bone={bone} 
                    isSelected={bone.uuid === selectedBoneId}
                    onSelect={setSelectedBoneId}
                />, 
                bone
            )
      ))}

      {showOverlays && selectedObject && (
        <TransformControls 
            ref={controlsRef}
            object={selectedObject} 
            mode={controlMode} 
            size={0.7} 
            space="local"
        />
      )}
    </>
  );
};

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: string;
}

class SceneErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: "" };

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error: error.message || "Failed to load model" };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Html center>
          <div className="bg-red-900/90 text-white p-6 rounded-xl border border-red-500 shadow-2xl max-w-sm text-center pointer-events-auto">
            <div className="text-4xl mb-2">⚠️</div>
            <h3 className="font-bold text-lg mb-2">Error Loading Scene</h3>
            <p className="text-sm text-red-200 mb-4">{this.state.error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 rounded-md text-sm"
            >
              Reload App
            </button>
          </div>
        </Html>
      );
    }
    return this.props.children;
  }
}

const ScreenshotHandler: React.FC<{ captureRef?: React.MutableRefObject<(() => void) | null> }> = ({ captureRef }) => {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    if (captureRef) {
      captureRef.current = () => {
        gl.render(scene, camera);
        const dataUrl = gl.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.setAttribute('download', `pose-master-snap-${timestamp}.png`);
        link.setAttribute('href', dataUrl);
        link.click();
      };
    }
    return () => {
      if (captureRef) captureRef.current = null;
    };
  }, [gl, scene, camera, captureRef]);

  return null;
};

interface SceneProps {
  models: LoadedModel[];
  onBonesDetected: (modelId: string, bones: BoneInfo[]) => void;
  selectedBoneId: string | null;
  setSelectedBoneId: (id: string | null) => void;
  controlMode: ControlMode;
  viewMode: ViewMode;
  showOverlays: boolean;
  brightness: number;
  captureRef?: React.MutableRefObject<(() => void) | null>;
  registerPoseHandler: (modelId: string, handler: PoseHandler) => void;
  unregisterPoseHandler: (modelId: string) => void;
}

const Scene: React.FC<SceneProps> = ({ 
    models, 
    onBonesDetected, 
    selectedBoneId, 
    setSelectedBoneId, 
    controlMode, 
    viewMode, 
    showOverlays, 
    brightness, 
    captureRef,
    registerPoseHandler,
    unregisterPoseHandler
}) => {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [2, 1.5, 4], fov: 45 }} gl={{ preserveDrawingBuffer: true }}>
      <SceneErrorBoundary>
        <color attach="background" args={['#111827']} />
        
        <ambientLight intensity={0.7 * brightness} />
        <spotLight position={[5, 10, 5]} angle={0.5} penumbra={1} intensity={1.5 * brightness} castShadow shadow-mapSize={[2048, 2048]} />
        <pointLight position={[-5, 5, -5]} intensity={0.5 * brightness} color="#818cf8" />
        <directionalLight position={[0, 5, 5]} intensity={1 * brightness} />
        
        <Environment preset="city" />

        <Suspense fallback={<Html center><div className="flex flex-col items-center gap-2"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div><div className="text-indigo-200 font-mono text-sm">Loading Model...</div></div></Html>}>
            {models.map(model => (
                <Model 
                    key={model.id}
                    id={model.id}
                    url={model.url}
                    visible={model.visible}
                    onBonesDetected={onBonesDetected} 
                    selectedBoneId={selectedBoneId}
                    setSelectedBoneId={setSelectedBoneId}
                    controlMode={controlMode}
                    viewMode={viewMode}
                    showOverlays={showOverlays}
                    registerPoseHandler={registerPoseHandler}
                    unregisterPoseHandler={unregisterPoseHandler}
                />
            ))}
        </Suspense>

        <OrbitControls 
            makeDefault 
            minPolarAngle={0} 
            maxPolarAngle={Math.PI / 1.8}
            enablePan={true}
            enableZoom={true}
            minDistance={0.5}
            maxDistance={20}
        />
        
        <ContactShadows resolution={1024} scale={20} blur={1.5} opacity={0.4} far={10} color="#000000" />
        {showOverlays && <gridHelper args={[20, 20, '#374151', '#1f2937']} position={[0, 0, 0]} />}
        
        <ScreenshotHandler captureRef={captureRef} />
      </SceneErrorBoundary>
    </Canvas>
  );
};

export default Scene;