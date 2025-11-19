export interface BoneInfo {
  id: string;
  name: string;
  depth: number;
}

export interface AIAnalysisResult {
  description: string;
  poseSuggestions: {
    title: string;
    description: string;
  }[];
}

export enum ControlMode {
  ROTATE = 'rotate',
  TRANSLATE = 'translate'
}

export enum ViewMode {
  SOLID = 'solid',
  MESH = 'mesh',
  RIG = 'rig'
}

export interface BoneTransform {
    name: string;
    position: [number, number, number];
    quaternion: [number, number, number, number];
    scale: [number, number, number];
}

export interface SavedPose {
    id: string;
    name: string;
    date: number;
    transforms: BoneTransform[];
}

export interface PoseHandler {
    getPose: () => BoneTransform[];
    setPose: (transforms: BoneTransform[]) => void;
    resetPose: () => void;
}
