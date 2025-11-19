import React, { useState } from 'react';
import { Sparkles, Bot, Loader2 } from 'lucide-react';
import { analyzeSkeleton } from '../services/geminiService';
import { AIAnalysisResult } from '../types';

interface AIPanelProps {
  boneNames: string[];
}

const AIPanel: React.FC<AIPanelProps> = ({ boneNames }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (boneNames.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeSkeleton(boneNames);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
      setError("Failed to analyze skeleton. Ensure API Key is valid.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 border-l border-gray-700 w-80">
      <div className="p-4 border-b border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900">
        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          AI Pose Assistant
        </h2>
        <p className="text-xs text-gray-400">
          Get intelligent insights about your character rig and posing suggestions.
        </p>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {!analysis && !isLoading && (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
            <Bot className="w-12 h-12 text-gray-600" />
            <p className="text-sm text-gray-400">
              Import a model and ask Gemini to analyze the skeleton structure.
            </p>
            <button
              onClick={handleAnalyze}
              disabled={boneNames.length === 0}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                boneNames.length === 0
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg hover:shadow-indigo-500/25'
              }`}
            >
              Generate Insights
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-64 space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-sm text-gray-300 animate-pulse">Gemini is thinking...</p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {analysis && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
              <h3 className="text-sm font-semibold text-indigo-300 mb-1">Character Type</h3>
              <p className="text-sm text-gray-200 leading-relaxed">{analysis.description}</p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                Suggested Poses
              </h3>
              {analysis.poseSuggestions.map((pose, idx) => (
                <div key={idx} className="bg-gray-700/30 p-3 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors">
                  <h4 className="text-sm font-medium text-white mb-1">{pose.title}</h4>
                  <p className="text-xs text-gray-400">{pose.description}</p>
                </div>
              ))}
            </div>
            
            <button
              onClick={handleAnalyze}
              className="w-full py-2 text-xs text-gray-400 hover:text-white underline decoration-gray-600 hover:decoration-white"
            >
              Regenerate Analysis
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIPanel;
