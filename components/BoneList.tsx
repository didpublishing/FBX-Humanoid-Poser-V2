import React, { useState } from 'react';
import { BoneInfo, LoadedModel } from '../types';
import { Search, ChevronRight, ChevronDown, Bone, Eye, EyeOff, Trash2, Box } from 'lucide-react';

interface BoneListProps {
  models: LoadedModel[];
  selectedBoneId: string | null;
  onSelectBone: (id: string) => void;
  onToggleModelVisibility: (modelId: string) => void;
  onDeleteModel: (modelId: string) => void;
}

const BoneList: React.FC<BoneListProps> = ({ 
    models, 
    selectedBoneId, 
    onSelectBone,
    onToggleModelVisibility,
    onDeleteModel
}) => {
  const [search, setSearch] = useState('');
  const [collapsedModels, setCollapsedModels] = useState<Set<string>>(new Set());

  const toggleCollapse = (modelId: string) => {
    setCollapsedModels(prev => {
      const next = new Set(prev);
      if (next.has(modelId)) {
        next.delete(modelId);
      } else {
        next.add(modelId);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 border-r border-gray-700 w-80">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <Bone className="w-5 h-5 text-indigo-400" />
          Skeleton Hierarchy
        </h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Search joints..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-700 text-gray-200 text-sm rounded-md pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {models.length === 0 && (
          <div className="text-gray-500 text-center mt-10 text-sm px-4">
            <Box className="w-8 h-8 mx-auto mb-2 opacity-20" />
            No models loaded. <br/> Import an FBX file to begin.
          </div>
        )}
        
        {models.map((model) => {
            const isCollapsed = collapsedModels.has(model.id);
            
            // Filter bones if searching, otherwise show all
            const filteredBones = search 
                ? model.bones.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
                : model.bones;

            // Auto-expand if searching matches
            const shouldForceExpand = search.length > 0 && filteredBones.length > 0;
            const effectiveCollapsed = shouldForceExpand ? false : isCollapsed;

            if (search.length > 0 && filteredBones.length === 0) return null;

            return (
                <div key={model.id} className="bg-gray-900/30 rounded-lg overflow-hidden border border-gray-700/50">
                    {/* Model Header */}
                    <div className="flex items-center justify-between p-2 bg-gray-800 hover:bg-gray-750 transition-colors group">
                        <button 
                            onClick={() => toggleCollapse(model.id)}
                            className="flex items-center gap-2 flex-1 text-left min-w-0"
                        >
                            {effectiveCollapsed ? <ChevronRight className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                            <span className="font-medium text-sm text-gray-200 truncate" title={model.fileName}>
                                {model.fileName}
                            </span>
                        </button>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => onToggleModelVisibility(model.id)}
                                className="p-1 text-gray-400 hover:text-white rounded"
                                title={model.visible ? "Hide Model" : "Show Model"}
                            >
                                {model.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                            <button 
                                onClick={() => onDeleteModel(model.id)}
                                className="p-1 text-gray-400 hover:text-red-400 rounded"
                                title="Remove Model"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Bones List */}
                    {!effectiveCollapsed && (
                        <div className="py-1 space-y-0.5">
                            {filteredBones.map((bone) => (
                                <button
                                    key={bone.id}
                                    onClick={() => onSelectBone(bone.id)}
                                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2 relative ${
                                    selectedBoneId === bone.id
                                        ? 'bg-indigo-600/20 text-indigo-200 font-medium'
                                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                                    }`}
                                    style={{ paddingLeft: `${Math.min(bone.depth * 12 + 16, 120)}px` }}
                                >
                                    {/* Guide Line */}
                                    <div 
                                        className="absolute left-0 top-0 bottom-0 border-l border-gray-700/30 pointer-events-none" 
                                        style={{ left: `${Math.min(bone.depth * 12 + 8, 112)}px` }} 
                                    />
                                    
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedBoneId === bone.id ? 'bg-indigo-400' : 'bg-gray-600'}`} />
                                    <span className="truncate">{bone.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default BoneList;