import React, { useState } from 'react';
import { BoneInfo } from '../types';
import { Search, ChevronRight, Bone } from 'lucide-react';

interface BoneListProps {
  bones: BoneInfo[];
  selectedBoneId: string | null;
  onSelectBone: (id: string) => void;
}

const BoneList: React.FC<BoneListProps> = ({ bones, selectedBoneId, onSelectBone }) => {
  const [search, setSearch] = useState('');

  const filteredBones = bones.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase())
  );

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

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {filteredBones.length === 0 && (
          <div className="text-gray-500 text-center mt-10 text-sm">
            No joints found. Import an FBX.
          </div>
        )}
        {filteredBones.map((bone) => (
          <button
            key={bone.id}
            onClick={() => onSelectBone(bone.id)}
            className={`w-full text-left px-3 py-2 text-xs rounded-md transition-colors flex items-center gap-2 ${
              selectedBoneId === bone.id
                ? 'bg-indigo-600 text-white font-medium'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
            style={{ paddingLeft: `${Math.min(bone.depth * 12 + 12, 100)}px` }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" />
            <span className="truncate">{bone.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BoneList;
