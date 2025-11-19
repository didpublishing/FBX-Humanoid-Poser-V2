import React, { useState } from 'react';
import { X, Sparkles, Download, Loader2, Wand2, RefreshCw } from 'lucide-react';
import { generateRealisticRender } from '../services/geminiService';

interface RenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceImage: string | null;
}

const RenderModal: React.FC<RenderModalProps> = ({ isOpen, onClose, sourceImage }) => {
  const [prompt, setPrompt] = useState('Cinematic lighting, 8k resolution, photorealistic, detailed texture');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!sourceImage) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const result = await generateRealisticRender(sourceImage, prompt);
      setResultImage(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.setAttribute('download', `ai-render-${timestamp}.png`);
    link.setAttribute('href', resultImage);
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-400" />
            AI Realistic Renderer
          </h2>
          <button 
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Input Section (Left) */}
          <div className="w-full md:w-1/3 p-4 border-r border-gray-700 flex flex-col bg-gray-900">
             <div className="mb-4 flex-1 flex flex-col min-h-0">
                <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Source Capture</h3>
                <div className="relative flex-1 bg-black/50 rounded-lg overflow-hidden border border-gray-800 min-h-[200px]">
                    {sourceImage ? (
                        <img src={sourceImage} alt="Source" className="w-full h-full object-contain" />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-600">No source</div>
                    )}
                </div>
             </div>

             <div className="space-y-3">
                <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">Prompt Details</label>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe the character's appearance, clothing, style, and environment..."
                        className="w-full bg-gray-800 text-white text-sm rounded-md border border-gray-700 p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent h-32 resize-none"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                        The pose will be strictly preserved. Focus on style, materials, and lighting.
                    </p>
                </div>
                
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !sourceImage}
                    className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                        isGenerating 
                        ? 'bg-gray-700 text-gray-400 cursor-wait' 
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg'
                    }`}
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            Generate Render
                        </>
                    )}
                </button>
             </div>
          </div>

          {/* Output Section (Right) */}
          <div className="w-full md:w-2/3 p-4 bg-gray-950 flex flex-col relative">
             <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider flex justify-between items-center">
                 <span>Result</span>
                 {resultImage && !isGenerating && (
                     <div className="flex gap-2">
                         <button 
                            onClick={handleDownload}
                            className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs transition-colors"
                         >
                             <Download className="w-3 h-3" /> Save
                         </button>
                     </div>
                 )}
             </h3>

             <div className="flex-1 bg-gray-900 rounded-lg border border-gray-800 overflow-hidden flex items-center justify-center relative group">
                {isGenerating ? (
                    <div className="flex flex-col items-center justify-center space-y-4 text-purple-400">
                         <div className="relative w-16 h-16">
                            <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                         </div>
                         <p className="text-sm animate-pulse">Dreaming up pixels...</p>
                    </div>
                ) : resultImage ? (
                    <img src={resultImage} alt="AI Result" className="w-full h-full object-contain animate-in fade-in duration-500" />
                ) : error ? (
                    <div className="text-center p-8 max-w-xs">
                        <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3 text-red-400">
                            <X className="w-6 h-6" />
                        </div>
                        <p className="text-red-300 text-sm">{error}</p>
                    </div>
                ) : (
                    <div className="text-gray-700 flex flex-col items-center">
                        <Sparkles className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-sm">Ready to render</p>
                    </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RenderModal;
