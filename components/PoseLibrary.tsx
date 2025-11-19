import React, { useState } from 'react';
import { SavedPose } from '../types';
import { Save, Trash2, Play, RefreshCcw } from 'lucide-react';

interface PoseLibraryProps {
  savedPoses: SavedPose[];
  onSavePose: (name: string) => void;
  onLoadPose: (pose: SavedPose) => void;
  onDeletePose: (id: string) => void;
  onResetPose: () => void;
  hasActiveModel: boolean;
}

const PoseLibrary: React.FC<PoseLibraryProps> = ({ 
    savedPoses, 
    onSavePose, 
    onLoadPose, 
    onDeletePose, 
    onResetPose,
    hasActiveModel 
}) => {
  const [newPoseName, setNewPoseName] = useState('');

  const handleSaveClick = () => {
    if (newPoseName.trim()) {
      onSavePose(newPoseName.trim());
      setNewPoseName('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 border-l border-gray-700 w-80">
      <div className="p-4 border-b border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900">
        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <Save className="w-5 h-5 text-emerald-400" />
          Pose Library
        </h2>
        <p className="text-xs text-gray-400">
          Save and load your custom poses locally.
        </p>
      </div>

      <div className="p-4 border-b border-gray-700 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New pose name..."
            value={newPoseName}
            onChange={(e) => setNewPoseName(e.target.value)}
            disabled={!hasActiveModel}
            className="flex-1 bg-gray-700 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
            onKeyDown={(e) => e.key === 'Enter' && handleSaveClick()}
          />
          <button
            onClick={handleSaveClick}
            disabled={!hasActiveModel || !newPoseName.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-3 py-2 rounded-md transition-colors"
            title="Save Current Pose"
          >
            <Save className="w-4 h-4" />
          </button>
        </div>
        <button
            onClick={onResetPose}
            disabled={!hasActiveModel}
            className="w-full flex items-center justify-center gap-2 text-xs text-gray-300 bg-gray-700 hover:bg-gray-600 py-2 rounded-md transition-colors"
        >
            <RefreshCcw className="w-3 h-3" /> Reset to Default
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {!hasActiveModel && (
            <div className="text-center py-8 text-gray-500 text-sm px-4">
                Load a model to start saving poses.
            </div>
        )}
        
        {hasActiveModel && savedPoses.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm px-4">
            No saved poses yet. <br/> Pose your character and save it above!
          </div>
        )}

        {savedPoses.map((pose) => (
          <div key={pose.id} className="bg-gray-700/40 border border-gray-600 rounded-lg p-3 hover:border-gray-500 transition-all group">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-medium text-gray-200 text-sm">{pose.name}</h3>
                <span className="text-[10px] text-gray-500">
                  {new Date(pose.date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button
                  onClick={() => onDeletePose(pose.id)}
                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            <button
              onClick={() => onLoadPose(pose)}
              className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-indigo-600 text-gray-300 hover:text-white py-1.5 rounded text-xs transition-colors"
            >
              <Play className="w-3 h-3" /> Load Pose
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PoseLibrary;