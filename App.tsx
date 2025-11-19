import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Scene from './components/Scene';
import BoneList from './components/BoneList';
import AIPanel from './components/AIPanel';
import PoseLibrary from './components/PoseLibrary';
import { BoneInfo, ControlMode, ViewMode, SavedPose, PoseHandler, LoadedModel } from './types';
import { Upload, Move, Rotate3D, MousePointer2, Box, Grid3x3, Bone, Eye, EyeOff, Sun, Camera, Sparkles, Save, RefreshCcw, Image as ImageIcon, Monitor, Globe } from 'lucide-react';

const App: React.FC = () => {
  const [models, setModels] = useState<LoadedModel[]>([]);
  const [selectedBoneId, setSelectedBoneId] = useState<string | null>(null);
  const [controlMode, setControlMode] = useState<ControlMode>(ControlMode.ROTATE);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.SOLID);
  const [showOverlays, setShowOverlays] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [brightness, setBrightness] = useState<number>(1.0);
  
  // Scene Background State
  const [backgroundColor, setBackgroundColor] = useState<string>('#111827');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundIs360, setBackgroundIs360] = useState<boolean>(false);
  
  const [activeTab, setActiveTab] = useState<'ai' | 'poses' | 'scene'>('ai');
  const [savedPoses, setSavedPoses] = useState<SavedPose[]>([]);

  // Ref to trigger screenshot function in Scene
  const captureRef = useRef<(() => void) | null>(null);
  
  // Ref to hold pose handlers for each model
  const poseHandlersRef = useRef<Map<string, PoseHandler>>(new Map());

  // Load poses from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('mixamo_poses');
    if (saved) {
      try {
        setSavedPoses(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load poses", e);
      }
    }
  }, []);

  // Save poses to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('mixamo_poses', JSON.stringify(savedPoses));
  }, [savedPoses]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const newModel: LoadedModel = {
          id: crypto.randomUUID(),
          url,
          fileName: file.name,
          bones: [],
          visible: true
      };
      
      setModels(prev => [...prev, newModel]);
      // Don't reset selectedBoneId to allow multi-model workflow
    }
    // Reset the input value to allow selecting the same file again if needed
    event.target.value = ''; 
  };

  const handleBackgroundUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          if (backgroundImage) URL.revokeObjectURL(backgroundImage);
          const url = URL.createObjectURL(file);
          setBackgroundImage(url);
      }
      event.target.value = '';
  };

  const handleClearBackground = () => {
      if (backgroundImage) URL.revokeObjectURL(backgroundImage);
      setBackgroundImage(null);
  };

  const handleBonesDetected = useCallback((modelId: string, detectedBones: BoneInfo[]) => {
    setModels(prev => prev.map(m => 
        m.id === modelId ? { ...m, bones: detectedBones } : m
    ));
  }, []);

  const handleToggleModelVisibility = (modelId: string) => {
      setModels(prev => prev.map(m => 
          m.id === modelId ? { ...m, visible: !m.visible } : m
      ));
  };

  const handleDeleteModel = (modelId: string) => {
      // Clean up the object URL to avoid memory leaks
      const model = models.find(m => m.id === modelId);
      if (model) {
          URL.revokeObjectURL(model.url);
      }

      setModels(prev => prev.filter(m => m.id !== modelId));
      poseHandlersRef.current.delete(modelId);
      
      // If selected bone belonged to this model, deselect it
      if (model && model.bones.some(b => b.id === selectedBoneId)) {
          setSelectedBoneId(null);
      }
  };

  const registerPoseHandler = useCallback((modelId: string, handler: PoseHandler) => {
      poseHandlersRef.current.set(modelId, handler);
  }, []);

  const unregisterPoseHandler = useCallback((modelId: string) => {
      poseHandlersRef.current.delete(modelId);
  }, []);

  // Helper to find which model owns the selected bone
  const activeModelId = useMemo(() => {
      if (!selectedBoneId) return models.length > 0 ? models[models.length - 1].id : null;
      const found = models.find(m => m.bones.some(b => b.id === selectedBoneId));
      return found ? found.id : (models.length > 0 ? models[0].id : null);
  }, [models, selectedBoneId]);

  const handleTakeScreenshot = () => {
    if (captureRef.current) {
      captureRef.current();
    }
  };

  const handleSavePose = (name: string) => {
      if (activeModelId && poseHandlersRef.current.has(activeModelId)) {
          const handler = poseHandlersRef.current.get(activeModelId)!;
          const transforms = handler.getPose();
          const newPose: SavedPose = {
              id: crypto.randomUUID(),
              name: `${name} (${models.find(m=>m.id===activeModelId)?.fileName})`,
              date: Date.now(),
              transforms
          };
          setSavedPoses(prev => [newPose, ...prev]);
      }
  };

  const handleLoadPose = (pose: SavedPose) => {
      // If we have an active model, try to apply it there.
      // Or we could try to apply to ALL models? For now, active model is safer.
      if (activeModelId && poseHandlersRef.current.has(activeModelId)) {
          const handler = poseHandlersRef.current.get(activeModelId)!;
          handler.setPose(pose.transforms);
      }
  };

  const handleDeletePose = (id: string) => {
      setSavedPoses(prev => prev.filter(p => p.id !== id));
  };

  const handleResetPose = () => {
      if (activeModelId && poseHandlersRef.current.has(activeModelId)) {
          poseHandlersRef.current.get(activeModelId)!.resetPose();
      }
  };

  // Aggregate all bones for AI context (taking the first model or active one)
  const aiContextBones = useMemo(() => {
      if (activeModelId) {
          return models.find(m => m.id === activeModelId)?.bones.map(b => b.name) || [];
      }
      return models.length > 0 ? models[0].bones.map(b => b.name) : [];
  }, [models, activeModelId]);

  const renderScenePanel = () => (
      <div className="flex flex-col h-full bg-gray-800 w-80">
          <div className="p-4 border-b border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900">
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-sky-400" />
                  Scene Settings
              </h2>
              <p className="text-xs text-gray-400">
                  Customize the environment, lighting, and background.
              </p>
          </div>
          
          <div className="p-4 space-y-6 overflow-y-auto flex-1">
              {/* Background Color */}
              <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Background Color</label>
                  <div className="flex items-center gap-3">
                      <input 
                          type="color" 
                          value={backgroundColor}
                          onChange={(e) => setBackgroundColor(e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer border-none bg-transparent"
                          title="Choose Background Color"
                      />
                      <span className="text-xs text-gray-400 font-mono">{backgroundColor}</span>
                  </div>
              </div>

              {/* Background Image */}
              <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex justify-between">
                      Background Image
                      {backgroundImage && (
                          <button onClick={handleClearBackground} className="text-xs text-red-400 hover:text-red-300 underline">
                              Remove
                          </button>
                      )}
                  </label>
                  
                  {!backgroundImage ? (
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-6 h-6 text-gray-400 mb-1" />
                              <p className="text-xs text-gray-400">Click to upload image</p>
                          </div>
                          <input type="file" accept="image/*" className="hidden" onChange={handleBackgroundUpload} />
                      </label>
                  ) : (
                      <div className="relative w-full h-24 rounded-lg overflow-hidden border border-gray-600 group">
                          <img src={backgroundImage} alt="Background" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                             <label className="cursor-pointer text-xs bg-black/70 text-white px-2 py-1 rounded hover:bg-black">
                                 Change
                                 <input type="file" accept="image/*" className="hidden" onChange={handleBackgroundUpload} />
                             </label>
                          </div>
                      </div>
                  )}
              </div>

              {/* Image Settings */}
              {backgroundImage && (
                <div className="bg-gray-700/30 p-3 rounded-lg border border-gray-700 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {backgroundIs360 ? <Globe className="w-4 h-4 text-sky-400" /> : <Monitor className="w-4 h-4 text-gray-400" />}
                            <span className="text-sm text-gray-300">360° Environment</span>
                        </div>
                        <button 
                            onClick={() => setBackgroundIs360(!backgroundIs360)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${backgroundIs360 ? 'bg-sky-500' : 'bg-gray-600'}`}
                        >
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition duration-200 ease-in-out ${backgroundIs360 ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-tight">
                        {backgroundIs360 
                            ? "Wraps the image around the scene (equirectangular)." 
                            : "Displays image as a static backdrop behind the floor."}
                    </p>
                </div>
              )}

              {/* Floor & Grid */}
              <div className="space-y-3 pt-4 border-t border-gray-700">
                  <h3 className="text-sm font-medium text-gray-300">Floor & Grid</h3>
                  <div className="flex items-center justify-between bg-gray-700/30 p-3 rounded-lg border border-gray-700">
                        <span className="text-sm text-gray-400">Show Grid & Shadows</span>
                        <button 
                            onClick={() => setShowGrid(!showGrid)}
                            className={`p-1.5 rounded-md transition-colors ${showGrid ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-400'}`}
                        >
                            {showGrid ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                  </div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="flex h-screen w-screen bg-gray-900 overflow-hidden font-sans">
      {/* Left Sidebar: Bone List */}
      <BoneList 
        models={models} 
        selectedBoneId={selectedBoneId} 
        onSelectBone={setSelectedBoneId} 
        onToggleModelVisibility={handleToggleModelVisibility}
        onDeleteModel={handleDeleteModel}
      />

      {/* Center: Viewport & Toolbar */}
      <div className="flex-1 flex flex-col relative">
        {/* Top Toolbar */}
        <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 shrink-0 z-10">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 mr-4">
                    <div className="p-1.5 bg-indigo-600 rounded-md">
                         <Box className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-lg tracking-tight hidden sm:block">PoseMaster</span>
                </div>

                <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-xs font-medium transition-colors text-gray-200 border border-gray-600">
                    <Upload className="w-4 h-4" />
                    Import FBX
                    <input 
                        type="file" 
                        accept=".fbx" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                    />
                </label>
            </div>

            {/* Center Controls: View Modes */}
            <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-700">
                <button 
                    onClick={() => setViewMode(ViewMode.MESH)}
                    className={`p-2 rounded-md transition-all ${viewMode === ViewMode.MESH ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                    title="Mesh View"
                >
                    <Grid3x3 className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => setViewMode(ViewMode.SOLID)}
                    className={`p-2 rounded-md transition-all ${viewMode === ViewMode.SOLID ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                    title="Solid View"
                >
                    <Box className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => setViewMode(ViewMode.RIG)}
                    className={`p-2 rounded-md transition-all ${viewMode === ViewMode.RIG ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                    title="Rig View"
                >
                    <Bone className="w-5 h-5" />
                </button>
            </div>

            {/* Right Controls: Tools */}
            <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-700 items-center">
                <button 
                    onClick={() => setControlMode(ControlMode.ROTATE)}
                    className={`p-2 rounded-md transition-all ${controlMode === ControlMode.ROTATE ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                    title="Rotate Joint"
                >
                    <Rotate3D className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => setControlMode(ControlMode.TRANSLATE)}
                    className={`p-2 rounded-md transition-all ${controlMode === ControlMode.TRANSLATE ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                    title="Move Joint"
                >
                    <Move className="w-5 h-5" />
                </button>
                <div className="w-px h-5 bg-gray-700 mx-1" />
                <button 
                    onClick={() => setShowOverlays(!showOverlays)}
                    className={`p-2 rounded-md transition-all ${!showOverlays ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                    title={showOverlays ? "Hide Bone Indicators" : "Show Bone Indicators"}
                >
                    {showOverlays ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
                
                <div className="flex items-center gap-2 px-2 border-l border-r border-gray-700 ml-1 mr-1">
                   <Sun className="w-4 h-4 text-yellow-500" />
                   <input 
                     type="range" 
                     min="0.2" 
                     max="2.5" 
                     step="0.1" 
                     value={brightness}
                     onChange={(e) => setBrightness(parseFloat(e.target.value))}
                     className="w-16 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                     title={`Brightness: ${Math.round(brightness * 100)}%`}
                   />
                </div>

                <button 
                    onClick={handleResetPose}
                    className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                    title="Reset Pose (Active Model)"
                >
                    <RefreshCcw className="w-5 h-5" />
                </button>

                <button
                    onClick={handleTakeScreenshot}
                    className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                    title="Take Picture (PNG)"
                >
                    <Camera className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* 3D Canvas */}
        <div className="flex-1 relative bg-[#111827]">
            {models.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 pointer-events-none z-10">
                    <Upload className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg font-light opacity-50">Drop an FBX file to start</p>
                    <p className="text-sm mt-2 opacity-30">Supports Mixamo & Standard Rigs</p>
                </div>
            )}
            <Scene 
                models={models} 
                onBonesDetected={handleBonesDetected}
                selectedBoneId={selectedBoneId}
                setSelectedBoneId={setSelectedBoneId}
                controlMode={controlMode}
                viewMode={viewMode}
                showOverlays={showOverlays}
                showGrid={showGrid}
                brightness={brightness}
                backgroundColor={backgroundColor}
                backgroundImage={backgroundImage}
                backgroundIs360={backgroundIs360}
                captureRef={captureRef}
                registerPoseHandler={registerPoseHandler}
                unregisterPoseHandler={unregisterPoseHandler}
            />
            
            {/* Quick Hint Overlay */}
            {showOverlays && models.length > 0 && (
                <div className="absolute bottom-4 left-4 pointer-events-none z-10">
                    <div className="bg-black/50 backdrop-blur-sm p-3 rounded-lg border border-white/10 text-xs text-gray-400 space-y-1">
                        <div className="flex items-center gap-2">
                            <MousePointer2 className="w-3 h-3" /> <span>Select joint markers</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Rotate3D className="w-3 h-3" /> <span>Rotate to pose</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <RefreshCcw className="w-3 h-3" /> <span>Reset pose</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Right Sidebar: Tabs & Panels */}
      <div className="flex flex-col h-full w-80 border-l border-gray-700 bg-gray-800">
          {/* Tabs */}
          <div className="flex border-b border-gray-700">
              <button 
                  onClick={() => setActiveTab('ai')}
                  className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                      activeTab === 'ai' 
                      ? 'text-white border-b-2 border-yellow-400 bg-gray-700/50' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                  title="AI Assistant"
              >
                  <Sparkles className="w-4 h-4" />
              </button>
              <button 
                  onClick={() => setActiveTab('poses')}
                  className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                      activeTab === 'poses' 
                      ? 'text-white border-b-2 border-emerald-400 bg-gray-700/50' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                  title="Pose Library"
              >
                  <Save className="w-4 h-4" />
              </button>
              <button 
                  onClick={() => setActiveTab('scene')}
                  className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                      activeTab === 'scene' 
                      ? 'text-white border-b-2 border-sky-400 bg-gray-700/50' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                  title="Scene Settings"
              >
                  <ImageIcon className="w-4 h-4" />
              </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden relative">
              {activeTab === 'ai' && <AIPanel boneNames={aiContextBones} />}
              {activeTab === 'poses' && (
                  <PoseLibrary 
                    savedPoses={savedPoses}
                    onSavePose={handleSavePose}
                    onLoadPose={handleLoadPose}
                    onDeletePose={handleDeletePose}
                    onResetPose={handleResetPose}
                    hasActiveModel={models.length > 0}
                  />
              )}
              {activeTab === 'scene' && renderScenePanel()}
          </div>
      </div>
    </div>
  );
};

export default App;