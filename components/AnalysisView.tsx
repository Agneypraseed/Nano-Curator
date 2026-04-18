import React from 'react';
import { StyleAnalysis } from '../types';
import { Sparkles, Shirt, User } from 'lucide-react';

interface AnalysisViewProps {
  analysis: StyleAnalysis;
  originalImage: string;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ analysis, originalImage }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl mx-auto animate-fade-in-up">
      {/* Left Column: Image & Stats */}
      <div className="space-y-6">
        <div className="relative aspect-square w-full rounded-3xl overflow-hidden shadow-xl border border-slate-100 bg-white">
          <img 
            src={`data:image/jpeg;base64,${originalImage}`} 
            alt="Original" 
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 text-white">
            <h3 className="font-semibold text-lg">Your Profile</h3>
            <div className="flex gap-4 mt-2 text-sm opacity-90">
              <span className="flex items-center gap-1"><User className="w-4 h-4" /> {analysis.faceShape} Face</span>
              <span className="flex items-center gap-1">✨ {analysis.skinTone}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Recommendations */}
      <div className="space-y-6">
        {analysis.styles.map((style, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                    <h3 className="text-lg font-bold text-slate-800">{style.title}</h3>
                    <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-full">Option {idx + 1}</span>
                </div>
                
                <div className="flex items-start gap-3 mb-4">
                    <Shirt className="w-5 h-5 text-indigo-600 mt-1 shrink-0" />
                    <div className="space-y-1">
                        <h4 className="font-semibold text-sm uppercase tracking-wider text-slate-500">Style Description</h4>
                        <p className="text-slate-700 leading-relaxed text-sm">{style.description}</p>
                    </div>
                </div>

                <div className="bg-indigo-50 p-4 rounded-xl flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                    <div>
                        <h4 className="font-semibold text-xs uppercase tracking-wider text-indigo-900 mb-1">Why this works</h4>
                        <p className="text-indigo-900/80 text-sm leading-relaxed italic">
                        "{style.reasoning}"
                        </p>
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};