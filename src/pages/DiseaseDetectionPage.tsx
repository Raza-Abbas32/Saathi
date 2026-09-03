import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import imageCompression from 'browser-image-compression';
import {
  ScanSearch,
  Upload,
  AlertCircle,
  Loader2,
  RotateCcw,
  Bot,
  MessageSquare,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { detectDisease, formatDiseaseMarkdown } from '@/services/api';
import type { DiseaseResult } from '@/types';
import DiseaseWeatherAssessment from '@/components/DiseaseWeatherAssessment';
import EconomicImpactCard from '@/components/EconomicImpactCard';
import { FarmActionPlanner } from '@/components/FarmActionPlanner';

export default function DiseaseDetectionPage() {
  const navigate = useNavigate();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnosisResult, setDiagnosisResult] = useState<DiseaseResult | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, etc.)');
      return;
    }
    
    setError(null);
    setIsCompressing(true);

    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 640,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(compressedFile);
    } catch (err) {
      console.error('Compression error:', err);
      setError('Could not process the image. Please try another photo.');
    } finally {
      setIsCompressing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // Directly send the image to Saathi AI chat to diagnose live
  const handleOpenDirectInChat = () => {
    if (!imagePreview) return;
    sessionStorage.setItem(
      'saathi-disease-handoff',
      JSON.stringify({
        userText: 'Please examine this crop leaf photo, identify any disease symptoms, and provide step-by-step treatment and prevention instructions.',
        imageUrl: imagePreview,
        autoAnalyze: true,
      })
    );
    navigate('/assistant?tab=disease');
  };

  const handleAnalyze = async () => {
    if (!imagePreview) return;
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const match = imagePreview.match(/^data:(.+);base64,(.+)$/);
      if (!match) {
        throw new Error('Could not read the selected image.');
      }
      const [, mimeType, base64Data] = match;

      const result = await detectDisease(base64Data, mimeType);
      setDiagnosisResult(result);
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      if (errorMessage.includes('503')) {
        setError('Google AI servers are currently busy. Please wait a moment and try again.');
      } else if (errorMessage.includes('JSON')) {
        setError('The AI returned an invalid response. Please try scanning again.');
      } else {
        setError(errorMessage || 'Could not analyze the image. Please try again.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOpenChatWithResult = () => {
    if (!imagePreview || !diagnosisResult) return;
    const aiText = formatDiseaseMarkdown(diagnosisResult);
    const userText = 'I uploaded a photo of my crop leaf for disease analysis.';

    sessionStorage.setItem(
      'saathi-disease-handoff',
      JSON.stringify({
        userText,
        aiText,
        imageUrl: imagePreview,
      })
    );

    navigate('/assistant?tab=disease');
  };

  const handleReset = () => {
    setImagePreview(null);
    setDiagnosisResult(null);
    setError(null);
  };

  return (
    <div>
      <PageHeader
        title="Disease Detection"
        subtitle="Upload a photo of your crop leaf and let our AI identify diseases and recommend treatment — early detection saves your harvest."
        icon={<ScanSearch className="w-6 h-6" />}
      />

      <div className="max-w-xl mx-auto">
        <div className="hero-card">
          <h3 className="font-semibold text-saathi-900 text-lg mb-4">
            Upload Crop Photo
          </h3>

          {diagnosisResult ? (
            <div className="space-y-4">
              {/* Image Preview Thumbnail */}
              {imagePreview && (
                <div className="relative rounded-xl overflow-hidden bg-saathi-50 max-h-48 border border-slate-200">
                  <img
                    src={imagePreview}
                    alt="Analyzed leaf"
                    className="w-full h-48 object-cover"
                  />
                  <button
                    onClick={handleReset}
                    className="absolute top-2.5 right-2.5 px-3 py-1.5 rounded-lg bg-white/90 text-xs font-semibold text-saathi-700 hover:bg-white shadow transition-all flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    New Scan
                  </button>
                </div>
              )}

              {/* Disease Diagnosis Result Card */}
              <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                      <span>🌱 Disease Detected</span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mt-0.5">
                      {diagnosisResult.diseaseName}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span>Crop: <strong className="text-slate-700">{diagnosisResult.cropType}</strong></span>
                      <span>•</span>
                      <span>Confidence: <strong className="text-slate-700">{diagnosisResult.confidence}%</strong></span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${
                      diagnosisResult.severity === 'severe'
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : diagnosisResult.severity === 'high'
                        ? 'bg-orange-100 text-orange-800 border-orange-300'
                        : diagnosisResult.severity === 'moderate'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : diagnosisResult.severity === 'low'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-green-100 text-green-800 border-green-300'
                    }`}
                  >
                    Severity: {diagnosisResult.severity}
                  </span>
                </div>

                {diagnosisResult.description && (
                  <p className="text-xs text-slate-600 leading-relaxed pt-1">
                    {diagnosisResult.description}
                  </p>
                )}

                {diagnosisResult.symptoms && diagnosisResult.symptoms.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60">
                    <p className="text-[11px] font-bold text-slate-700 mb-1">Visual Symptoms:</p>
                    <ul className="text-xs text-slate-600 space-y-0.5 pl-2">
                      {diagnosisResult.symptoms.map((s, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {diagnosisResult.treatment && diagnosisResult.treatment.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60">
                    <p className="text-[11px] font-bold text-slate-700 mb-1">Recommended Treatment:</p>
                    <ul className="text-xs text-slate-600 space-y-1 pl-2">
                      {diagnosisResult.treatment.map((t, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="font-semibold text-emerald-700 flex-shrink-0">{i + 1}.</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* ──────────────────── Divider ──────────────────── */}
              <div className="border-t border-slate-200" />

              {/* 🌦 Saathi Weather Assessment */}
              <DiseaseWeatherAssessment diseaseResult={diagnosisResult} />

              {/* 🌾 Saathi Farm Action Planner */}
              <FarmActionPlanner
                diseaseResult={diagnosisResult}
                className="mt-3"
              />

              {/* 💰 Economic Impact Intelligence */}
              <EconomicImpactCard
                cropOverride={diagnosisResult.cropType}
                className="mt-3"
              />

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  onClick={handleOpenChatWithResult}
                  className="btn-accent flex-1 flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Ask Saathi AI Follow-up
                </button>
                <button
                  onClick={handleReset}
                  className="py-2.5 px-4 rounded-xl border border-saathi-300 hover:border-saathi-400 text-saathi-700 hover:bg-saathi-50 font-medium text-xs flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Scan Another Photo
                </button>
              </div>
            </div>
          ) : !imagePreview ? (
            isCompressing ? (
              <div className="border-2 border-dashed border-saathi-200 rounded-xl p-12 flex flex-col items-center justify-center text-center bg-saathi-50 transition-all">
                <Loader2 className="w-8 h-8 text-saathi-500 animate-spin mb-4" />
                <p className="text-saathi-700 font-medium animate-text-loading">Optimizing image...</p>
                <p className="text-saathi-400 text-sm mt-1">Getting it ready for AI analysis</p>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? 'border-saathi-500 bg-saathi-50 scale-[1.02]'
                    : 'border-saathi-200 hover:border-saathi-400 hover:bg-saathi-50'
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-saathi-50 flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-saathi-500" />
                </div>
                <p className="text-saathi-700 font-medium mb-1">
                  Drag & drop or click to browse
                </p>
                <p className="text-saathi-400 text-sm">JPG, PNG supported</p>
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-saathi-50">
                <img
                  src={imagePreview}
                  alt="Crop preview"
                  className="w-full h-64 object-cover"
                />
                <button
                  onClick={handleReset}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center text-saathi-700 hover:bg-white shadow-hero transition-all"
                  aria-label="Remove image"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center gap-3 py-6">
                  <Loader2 className="w-8 h-8 text-saathi-500 animate-spin" />
                  <p className="text-saathi-600 font-medium animate-text-loading">Analyzing crop leaf photo with Saathi AI…</p>
                  <p className="text-saathi-400 text-sm">Identifying disease & preparing treatment plan...</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <button
                    onClick={handleAnalyze}
                    className="btn-accent w-full flex items-center justify-center gap-2"
                  >
                    <ScanSearch className="w-5 h-5" />
                    Analyze & Open in Saathi AI
                  </button>
                  <button
                    onClick={handleOpenDirectInChat}
                    className="w-full py-2.5 px-4 rounded-xl border border-saathi-300 hover:border-saathi-400 text-saathi-700 hover:bg-saathi-50 font-medium text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4 text-harvest-600" />
                    Diagnose Directly in Chat
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 p-4 rounded-xl bg-red-50 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {!imagePreview && (
            <div className="mt-4 flex items-start gap-2 p-4 rounded-xl bg-saathi-50 text-saathi-600 text-sm">
              <Bot className="w-5 h-5 flex-shrink-0 mt-0.5 text-saathi-400" />
              After analysis, results open in <strong className="text-saathi-700">Saathi AI</strong> where you can ask follow-up questions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}