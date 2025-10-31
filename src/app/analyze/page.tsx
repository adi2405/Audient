"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";

type AnalysisResponse = {
  status: string;
  device: string;
  model: string;
  compute_type: string;
  timestamp: string;
  output_dir: string;
  transcription: {
    detected_language: string;
    language_confidence: number;
    raw_transcription: string;
    english_transcription: string;
  };
  analysis: {
    dominant_emotion: string | null;
    emotion_confidence: number;
    emotion_scores: Record<string, number>;
    overall_sentiment: string;
    sentiment_confidence: number;
    sentiment_breakdown: Record<string, number>;
    primary_intent: string | null;
    intent_confidence: number;
    intent_scores: Record<string, number>;
    secondary_intents: string[];
    summary: string;
    key_topics: string[];
    content_type: string;
  };
  artifacts: {
    processed_audio: string;
    raw_transcript: string;
    english_transcript: string;
    analysis_txt: string;
  };
};

export default function AnalyzePage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setResults(null);
    setError(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setResults(null);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setError("Please upload an audio or video file.");

    setLoading(true);
    setError(null);
    setResults(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(errData.error || `Server error (${res.status})`);
      }

      const data = await res.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong while analyzing the file.");
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case "positive":
        return "text-green-600 bg-green-50 border-green-200";
      case "negative":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    return "Low";
  };

  return (
    <main className="min-h-screen text-gray-900 p-6 pt-30">
      <section className="max-w-6xl mx-auto shadow-2xl rounded-3xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3 pb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Audient Analyzer
          </h1>
          <p className="text-gray-600">
            Advanced emotion detection, sentiment analysis, and intent
            classification model
          </p>
        </div>

        {/* Upload Form */}
        <div className="mb-8">
          <div
            className={`relative border-2 border-dashed rounded-2xl p-8 transition-all ${
              dragActive
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="audio/*,video/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              id="file-upload"
            />
            <div className="text-center pointer-events-none">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                {file ? file.name : "Drop your file here or click to browse"}
              </p>
              <p className="text-sm text-gray-500">
                Supports audio (MP3, WAV, FLAC, etc.) and video files (MP4, AVI,
                etc.)
              </p>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!file || loading}
            className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all font-medium text-lg flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Analyze Media
              </>
            )}
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="font-medium">{error}</p>
          </motion.div>
        )}

        {/* Results */}
        <AnimatePresence>
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Success Badge */}
              <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-xl p-4">
                <CheckCircle className="h-5 w-5" />
                <p className="font-medium">Analysis completed successfully!</p>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-gray-500 mb-1">Language</p>
                  <p className="font-semibold uppercase">
                    {results.transcription.detected_language}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-gray-500 mb-1">Confidence</p>
                  <p className="font-semibold">
                    {(results.transcription.language_confidence * 100).toFixed(
                      1
                    )}
                    %
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-gray-500 mb-1">Content Type</p>
                  <p className="font-semibold capitalize">
                    {results.analysis.content_type}
                  </p>
                </div>
              </div>

              {/* Main Analysis Cards */}
              <div className="grid md:grid-cols-3 gap-6">
                {/* Emotion Card */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-6 shadow-md">
                  <h3 className="text-lg font-bold mb-3 text-purple-700">
                    🎭 Emotion
                  </h3>
                  <p className="text-2xl font-bold mb-2 capitalize">
                    {results.analysis.dominant_emotion || "N/A"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Confidence:{" "}
                    {getConfidenceLabel(results.analysis.emotion_confidence)} (
                    {(results.analysis.emotion_confidence * 100).toFixed(1)}%)
                  </p>
                </div>

                {/* Sentiment Card */}
                <div
                  className={`border rounded-2xl p-6 shadow-md ${getSentimentColor(
                    results.analysis.overall_sentiment
                  )}`}
                >
                  <h3 className="text-lg font-bold mb-3">📊 Sentiment</h3>
                  <p className="text-2xl font-bold mb-2 capitalize">
                    {results.analysis.overall_sentiment}
                  </p>
                  <p className="text-sm opacity-80">
                    Confidence:{" "}
                    {getConfidenceLabel(results.analysis.sentiment_confidence)}{" "}
                    ({(results.analysis.sentiment_confidence * 100).toFixed(1)}
                    %)
                  </p>
                </div>

                {/* Intent Card */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-6 shadow-md">
                  <h3 className="text-lg font-bold mb-3 text-blue-700">
                    🎯 Intent
                  </h3>
                  <p className="text-2xl font-bold mb-2">
                    {results.analysis.primary_intent || "N/A"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Confidence:{" "}
                    {getConfidenceLabel(results.analysis.intent_confidence)} (
                    {(results.analysis.intent_confidence * 100).toFixed(1)}%)
                  </p>
                </div>
              </div>

              {/* Summary Section */}
              <section className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-6 shadow-md">
                <h3 className="text-xl font-bold mb-3 text-indigo-700">
                  📝 Content Summary
                </h3>
                <p className="text-gray-700 leading-relaxed text-justify">
                  {results.analysis.summary}
                </p>
                {results.analysis.key_topics.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-600 mb-2">
                      Key Topics:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {results.analysis.key_topics.map((topic, idx) => (
                        <span
                          key={idx}
                          className="bg-white border border-indigo-200 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {results.analysis.secondary_intents.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-600 mb-2">
                      Secondary Intents:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {results.analysis.secondary_intents.map((intent, idx) => (
                        <span
                          key={idx}
                          className="bg-white border border-purple-200 text-purple-700 px-3 py-1 rounded-full text-sm"
                        >
                          {intent}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Detailed Scores */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Emotion Scores */}
                {Object.keys(results.analysis.emotion_scores).length > 0 && (
                  <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold mb-4 text-gray-800">
                      🎭 Emotion Breakdown
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(results.analysis.emotion_scores)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([emotion, score]) => (
                          <div key={emotion}>
                            <div className="flex justify-between mb-1 text-sm">
                              <span className="font-medium capitalize">
                                {emotion}
                              </span>
                              <span className="text-gray-600">
                                {(score * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                                style={{ width: `${score * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  </section>
                )}

                {/* Intent Scores */}
                {Object.keys(results.analysis.intent_scores).length > 0 && (
                  <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold mb-4 text-gray-800">
                      🎯 Intent Breakdown
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(results.analysis.intent_scores)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([intent, score]) => (
                          <div key={intent}>
                            <div className="flex justify-between mb-1 text-sm">
                              <span className="font-medium">{intent}</span>
                              <span className="text-gray-600">
                                {(score * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all"
                                style={{ width: `${score * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Sentiment Breakdown */}
              <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4 text-gray-800">
                  📊 Sentiment Distribution
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(results.analysis.sentiment_breakdown).map(
                    ([sentiment, score]) => (
                      <div
                        key={sentiment}
                        className="text-center p-4 bg-gray-50 rounded-xl border border-gray-200"
                      >
                        <p
                          className="text-3xl font-bold mb-1"
                          style={{
                            color:
                              sentiment === "positive"
                                ? "#16a34a"
                                : sentiment === "negative"
                                ? "#dc2626"
                                : "#6b7280",
                          }}
                        >
                          {(score * 100).toFixed(1)}%
                        </p>
                        <p className="text-sm font-medium text-gray-600 capitalize">
                          {sentiment}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </section>

              {/* Transcriptions */}
              <div className="space-y-6">
                {/* Raw Transcription */}
                {results.transcription.detected_language !== "en" && (
                  <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold mb-3 text-gray-800">
                      🗣️ Original Transcription (
                      {results.transcription.detected_language.toUpperCase()})
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 max-h-64 overflow-y-auto">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {results.transcription.raw_transcription ||
                          "No transcription available."}
                      </p>
                    </div>
                  </section>
                )}

                {/* English Transcription */}
                <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold mb-3 text-gray-800">
                    📝 English Transcription
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 max-h-64 overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {results.transcription.english_transcription ||
                        "No transcription available."}
                    </p>
                  </div>
                </section>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}
