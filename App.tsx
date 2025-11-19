import React, { useState, useCallback, useRef, useEffect } from 'react';
import Scene from './components/Scene';
import BoneList from './components/BoneList';
import AIPanel from './components/AIPanel';
import PoseLibrary from './components/PoseLibrary';
import { BoneInfo, ControlMode, ViewMode, SavedPose, PoseHandler } from './types';
import { Upload, Move, Rotate3D, MousePointer2, Box, Grid3x3, Bone, Eye, EyeOff, Sun, Camera, Sparkles, Save } from 'lucide-react';

const App: React.FC = () => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [bones, setBones] = useState<BoneInfo[]>([]);
  const [selectedBoneId, setSelectedBoneId] = useState<string | null>(null);
  const [controlMode, setControlMode] = useState<ControlMode>(ControlMode.ROTATE);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.SOLID);
  const [showOverlays, setShowOverlays] = useState<boolean>(true);
  const [brightness, setBrightness] = useState<number>(1.0);
  const [fileName, setFileName] = useState<string>("");
  
  const [activeTab, setActiveTab] = useState<'ai' | 'poses'>('ai');
  const [savedPoses, setSavedPoses] = useState<SavedPose[]>([]);

  // Ref to trigger screenshot function in Scene
  const captureRef = useRef<(() => void) | null>(null);
  // Ref to handle pose get/set operations
  const poseHandlerRef = useRef<PoseHandler | null>(null);

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
      setFileUrl(url);
      setFileName(file.name);
      // Reset state
      setBones([]);
      setSelectedBoneId(null);
    }
  };

  const handleBonesDetected = useCallback((detectedBones: BoneInfo[]) => {
    setBones(detectedBones);
  }, []);

  const handleTakeScreenshot = () => {
    if (captureRef.current) {
      captureRef.current();
    }
  };

  const handleSavePose = (name: string) => {
      if (poseHandlerRef.current) {
          const transforms = poseHandlerRef.current.getPose();
          const newPose: SavedPose = {
              id: crypto.randomUUID(),
              name,
              date: Date.now(),
              transforms
          };
          setSavedPoses(prev => [newPose, ...prev]);
      }
  };

  const handleLoadPose = (pose: SavedPose) => {
      if (poseHandlerRef.current) {
          poseHandlerRef.current.setPose(pose.transforms);
      }
  };

  const handleDeletePose = (id: string) => {
      setSavedPoses(prev => prev.filter(p => p.id !== id));
  };

  const handleResetPose = () => {
      if (poseHandlerRef.current) {
          poseHandlerRef.current.resetPose();
      }
  };

  return (
    <div className="flex h-screen w-screen bg-gray-900 overflow-hidden font-sans">
      {/* Left Sidebar: Bone List */}
      <BoneList 
        bones={bones} 
        selectedBoneId={selectedBoneId} 
        onSelectBone={setSelectedBoneId} 
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
                    {fileName || "Import FBX"}
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
                    title={showOverlays ? "Show Scene Only (Hidden Overlays)" : "Show Overlays"}
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
            {!fileUrl && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 pointer-events-none">
                    <Upload className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg font-light opacity-50">Drop an FBX file to start</p>
                    <p className="text-sm mt-2 opacity-30">Supports Mixamo & Standard Rigs</p>
                </div>
            )}
            <Scene 
                fileUrl={fileUrl} 
                onBonesDetected={handleBonesDetected}
                selectedBoneId={selectedBoneId}
                setSelectedBoneId={setSelectedBoneId}
                controlMode={controlMode}
                viewMode={viewMode}
                showOverlays={showOverlays}
                brightness={brightness}
                captureRef={captureRef}
                poseHandlerRef={poseHandlerRef}
            />
            
            {/* Quick Hint Overlay */}
            {showOverlays && (
                <div className="absolute bottom-4 left-4 pointer-events-none">
                    <div className="bg-black/50 backdrop-blur-sm p-3 rounded-lg border border-white/10 text-xs text-gray-400 space-y-1">
                        <div className="flex items-center gap-2">
                            <MousePointer2 className="w-3 h-3" /> <span>Select joint markers</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Rotate3D className="w-3 h-3" /> <span>Rotate to pose</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Camera className="w-3 h-3" /> <span>Take picture</span>
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
              >
                  <Sparkles className="w-4 h-4" /> AI
              </button>
              <button 
                  onClick={() => setActiveTab('poses')}
                  className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                      activeTab === 'poses' 
                      ? 'text-white border-b-2 border-emerald-400 bg-gray-700/50' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
              >
                  <Save className="w-4 h-4" /> Poses
              </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
              {activeTab === 'ai' ? (
                  <AIPanel boneNames={bones.map(b => b.name)} />
              ) : (
                  <PoseLibrary 
                    savedPoses={savedPoses}
                    onSavePose={handleSavePose}
                    onLoadPose={handleLoadPose}
                    onDeletePose={handleDeletePose}
                    onResetPose={handleResetPose}
                    hasActiveModel={!!fileUrl}
                  />
              )}
          </div>
      </div>
    </div>
  );
};

export default App;