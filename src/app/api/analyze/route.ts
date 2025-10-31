import { NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { lookup as mimeLookup } from "mime-types";
import ffmpegStatic from "ffmpeg-static";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

const AUDIO_EXTS = new Set([
  ".mp3",
  ".wav",
  ".flac",
  ".aac",
  ".ogg",
  ".m4a",
  ".wma",
]);
const VIDEO_EXTS = new Set([
  ".mp4",
  ".avi",
  ".mkv",
  ".mov",
  ".wmv",
  ".flv",
  ".webm",
  ".m4v",
]);

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp";

const BASE_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const BASE_OUTPUT_DIR = path.join(process.cwd(), "public", "output");

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function ensureDirs() {
  await fs.mkdir(BASE_UPLOAD_DIR, { recursive: true });
  await fs.mkdir(BASE_OUTPUT_DIR, { recursive: true });
}

function detectFileType(p: string): "audio" | "video" | "unknown" {
  const ext = path.extname(p).toLowerCase();
  if (AUDIO_EXTS.has(ext)) return "audio";
  if (VIDEO_EXTS.has(ext)) return "video";
  const mt = mimeLookup(p) || "";
  if (typeof mt === "string") {
    if (mt.startsWith("audio/")) return "audio";
    if (mt.startsWith("video/")) return "video";
  }
  return "unknown";
}

async function saveUploadedFile(file: File): Promise<string> {
  await ensureDirs();
  const ext = path.extname(file.name) || "";
  const fname = `${randomUUID().slice(0, 8)}${ext}`;
  const outPath = path.join(BASE_UPLOAD_DIR, fname);
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(outPath, buf);
  log(`Saved upload: ${outPath}`);
  return outPath;
}

function ffmpegPath(): string | null {
  if (process.env.FFMPEG_PATH && process.env.FFMPEG_PATH.trim())
    return process.env.FFMPEG_PATH;
  if (ffmpegStatic) return ffmpegStatic as string;
  return null;
}

async function extractAudioFromVideo(
  videoPath: string,
  outputDir: string,
  outputFilename = "extracted_audio.mp3"
): Promise<string> {
  const bin = ffmpegPath();
  if (!bin) {
    log("FFmpeg not available; will upload video directly to Gemini");
    return videoPath;
  }
  const out = path.join(outputDir, outputFilename);
  await fs.mkdir(outputDir, { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const args = [
      "-y",
      "-i",
      videoPath,
      "-vn",
      "-acodec",
      "libmp3lame",
      "-q:a",
      "2",
      out,
      "-loglevel",
      "error",
    ];
    execFile(bin, args, (err) => (err ? reject(err) : resolve()));
  });

  return out;
}

async function createOutputDirectory(
  mediaDisplayName: string
): Promise<string> {
  const base = path.parse(mediaDisplayName).name.replace(/[-\s]/g, "_");
  const outDir = path.join(BASE_OUTPUT_DIR, base);
  await fs.mkdir(outDir, { recursive: true });
  log(`Output directory: ${outDir}`);
  return outDir;
}

function safeJsonParse(text: string): any {
  const t = `${text || ""}`.trim();
  try {
    return JSON.parse(t);
  } catch {}

  // Detect markdown JSON blocks like ```json ... ```
  const mdStart = t.indexOf("```");
  if (mdStart !== -1) {
    const start = mdStart + 3;
    const end = t.indexOf("```", start);
    if (end > start) {
      try {
        return JSON.parse(t.slice(start, end).trim());
      } catch {}
    }
  }

  // Try extracting plain JSON objects
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s !== -1 && e !== -1 && e > s) {
    try {
      return JSON.parse(t.slice(s, e + 1));
    } catch {}
  }

  log(
    `Failed to parse JSON from response (first 200 chars): ${t.slice(0, 200)}`
  );
  return {};
}

async function processMediaFile(
  mediaPath: string,
  outputDir: string
): Promise<{ path: string; mime: string }> {
  const ftype = detectFileType(mediaPath);
  log(`Detected file type: ${ftype}`);
  if (ftype === "video") {
    const audio = await extractAudioFromVideo(mediaPath, outputDir);
    const mime = (mimeLookup(audio) as string) || "audio/mpeg";
    return { path: audio, mime };
  }
  if (ftype === "audio") {
    const mime = (mimeLookup(mediaPath) as string) || "audio/mpeg";
    return { path: mediaPath, mime };
  }
  throw new Error(
    `Unsupported file type: ${ftype}. Provide audio or video file.`
  );
}

async function downloadToTmp(url: string): Promise<string> {
  await ensureDirs();
  const ext = path.extname(new URL(url).pathname) || "";
  const fname = `${randomUUID().slice(0, 8)}${ext}`;
  const outPath = path.join(BASE_UPLOAD_DIR, fname);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outPath, buf);
  log(`Downloaded external media: ${outPath}`);
  return outPath;
}

const TRANSCRIBE_JSON_PROMPT = `You are an expert audio transcription system. Your task is to:

1. Accurately transcribe the audio with proper punctuation, capitalization, and formatting
2. Detect the spoken language with high confidence
3. If not English, provide a natural, context-aware English translation

CRITICAL INSTRUCTIONS:
- Preserve speaker intent, tone, and nuance
- Use proper sentence structure and paragraph breaks for readability
- Maintain technical terms, names, and domain-specific vocabulary accurately
- For non-English content, translate idiomatically (not word-for-word)
- Handle multiple speakers, background noise, and accents appropriately

OUTPUT FORMAT (strict JSON only, no additional text):
{
  "detected_language": "ISO-639-1 code (e.g., 'en', 'es', 'hi', 'fr')",
  "language_confidence": 0.0-1.0,
  "raw_transcription": "Complete transcription in original language",
  "translated_transcription": "Natural English translation or same as raw if already English"
}`;

const ANALYZE_JSON_PROMPT = `You are an expert content analyst specializing in emotion recognition, sentiment analysis, intent classification, and content summarization.

ANALYZE the English transcript below across four dimensions:

1. EMOTION ANALYSIS:
   - Identify the dominant emotional tone (joy, sadness, anger, fear, surprise, disgust, neutral, excitement, frustration, contentment)
   - Provide granular scores for all detected emotions (0.0-1.0)
   - Consider subtle emotional cues and tonal shifts

2. SENTIMENT ANALYSIS:
   - Overall sentiment: positive, neutral, or negative
   - Confidence level (0.0-1.0)
   - Detailed breakdown showing proportion of positive/neutral/negative content
   - Account for sarcasm, irony, and mixed sentiments

3. INTENT CLASSIFICATION:
   - Primary intent from: Educational/Tutorial, Entertainment, Informative/News, Motivational, 
     Review/Opinion, Story/Narrative, Religious/Spiritual, Political/Opinion, Social Awareness, 
     Personal Experience, Technology/Product Demo, Comedy/Satire, Q&A/Interview, 
     Marketing/Promotional, Instructional/How-To
   - Provide scores for all relevant intents (0.0-1.0)
   - Consider secondary intents if applicable

4. CONTENT SUMMARY:
   - Create a concise yet comprehensive summary (2-4 sentences)
   - Capture key themes, main points, and core message
   - Preserve important context and takeaways

OUTPUT FORMAT (strict JSON only, no additional text):
{
  "dominant_emotion": "primary emotion or null if unclear",
  "emotion_confidence": 0.0-1.0,
  "emotion_scores": {
    "emotion_name": 0.0-1.0
  },
  "overall_sentiment": "positive|neutral|negative",
  "sentiment_confidence": 0.0-1.0,
  "sentiment_breakdown": {
    "positive": 0.0-1.0,
    "neutral": 0.0-1.0,
    "negative": 0.0-1.0
  },
  "primary_intent": "intent category or null",
  "intent_confidence": 0.0-1.0,
  "intent_scores": {
    "intent_name": 0.0-1.0
  },
  "secondary_intents": ["intent1", "intent2"],
  "summary": "Concise content summary",
  "key_topics": ["topic1", "topic2", "topic3"],
  "content_type": "monologue|dialogue|lecture|conversation|presentation"
}

ENSURE: All score objects contain relevant entries, sentiment_breakdown sums to 1.0, and all confidence scores are realistic.`;

function makeGenAI() {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey)
    throw new Error(
      "Set GOOGLE_API_KEY or GEMINI_API_KEY env var for Gemini API"
    );
  return new GoogleGenAI({ apiKey });
}

async function extractText(result: any): Promise<string> {
  try {
    if (typeof result?.output_text === "string") return result.output_text;
    if (typeof result?.response?.text === "function")
      return result.response.text();
    if (typeof result?.response?.output_text === "string")
      return result.response.output_text;
    if (typeof result?.text === "string") return result.text;
  } catch {}
  return "";
}

async function geminiTranscribe(
  localPath: string,
  mimeType: string,
  outputDir: string
) {
  log(`Uploading file for transcription: ${localPath}`);
  const ai = makeGenAI();

  // Upload with config
  const uploaded = await ai.files.upload({
    file: localPath,
    config: {
      mimeType,
      displayName: path.basename(localPath),
    },
  });

  // Resolve metadata and URI
  const name = uploaded?.name;
  const fileMeta = name ? await ai.files.get({ name }) : uploaded;
  const fileUri = fileMeta?.uri;
  const fileMime = fileMeta?.mimeType || mimeType;

  if (!fileUri)
    throw new Error("Failed to obtain uploaded file URI from Gemini");

  // Generate transcription JSON (use 'config', not 'generationConfig')
  const gen = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      { role: "user", parts: [{ text: TRANSCRIBE_JSON_PROMPT }] },
      { role: "user", parts: [{ fileData: { fileUri, mimeType: fileMime } }] },
    ],
    config: {
      maxOutputTokens: 4096,
      temperature: 0.1,
    },
  });

  const text = await extractText(gen);
  const data = safeJsonParse(text || "{}");

  const detected_language = (data.detected_language || "en")
    .trim()
    .toLowerCase();
  const language_confidence = Number(data.language_confidence ?? 0.95);
  const raw_transcription = (data.raw_transcription || "").trim();
  const translated_transcription = (
    data.translated_transcription || raw_transcription
  ).trim();

  const rawPath = path.join(outputDir, "transcription_raw.txt");
  const enPath = path.join(outputDir, "transcription_en.txt");
  await fs.writeFile(rawPath, raw_transcription, "utf-8");
  await fs.writeFile(enPath, translated_transcription, "utf-8");

  log(
    `Transcription complete. Language: ${detected_language} (${(
      language_confidence * 100
    ).toFixed(2)}%)`
  );

  return {
    detected_language,
    language_confidence,
    raw_transcription,
    translated_transcription,
    raw_path: rawPath,
    translated_path: enPath,
  };
}

async function geminiAnalyze(englishText: string, outputDir: string) {
  log("Starting content analysis");
  let textToAnalyze = englishText.slice(0, 12000);
  if (englishText.length > 12000) {
    const lastPeriod = textToAnalyze.lastIndexOf(".");
    if (lastPeriod > 8000)
      textToAnalyze = textToAnalyze.slice(0, lastPeriod + 1);
  }

  const ai = makeGenAI();
  const gen = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      { role: "user", parts: [{ text: ANALYZE_JSON_PROMPT }] },
      { role: "user", parts: [{ text: textToAnalyze }] },
    ],
    config: {
      maxOutputTokens: 2048,
      temperature: 0.2,
    },
  });

  const text = await extractText(gen);
  const data = safeJsonParse(text || "{}");

  const analysis = {
    dominant_emotion: data.dominant_emotion ?? null,
    emotion_confidence: Number(data.emotion_confidence ?? 0.0),
    emotion_scores: data.emotion_scores ?? {},
    overall_sentiment: data.overall_sentiment ?? "neutral",
    sentiment_confidence: Number(data.sentiment_confidence ?? 0.0),
    sentiment_breakdown: data.sentiment_breakdown ?? {
      positive: 0.33,
      neutral: 0.34,
      negative: 0.33,
    },
    primary_intent: data.primary_intent ?? null,
    intent_confidence: Number(data.intent_confidence ?? 0.0),
    intent_scores: data.intent_scores ?? {},
    secondary_intents: data.secondary_intents ?? [],
    summary: data.summary ?? textToAnalyze.slice(0, 300) + "...",
    key_topics: data.key_topics ?? [],
    content_type: data.content_type ?? "unknown",
  };

  const outPath = path.join(outputDir, "detailed_analysis.txt");
  const lines: string[] = [];
  lines.push("=".repeat(70));
  lines.push("COMPREHENSIVE MEDIA ANALYSIS (Gemini)");
  lines.push("=".repeat(70), "");
  lines.push("EMOTIONAL ANALYSIS");
  lines.push("-".repeat(70));
  lines.push(
    `Dominant Emotion: ${analysis.dominant_emotion} (Confidence: ${(
      analysis.emotion_confidence * 100
    ).toFixed(2)}%)`,
    ""
  );
  lines.push("Emotion Scores:");
  Object.entries(analysis.emotion_scores)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .forEach(([k, v]) =>
      lines.push(`  ${k}: ${(Number(v) * 100).toFixed(2)}%`)
    );

  lines.push("", "", "SENTIMENT ANALYSIS");
  lines.push("-".repeat(70));
  lines.push(
    `Overall Sentiment: ${String(
      analysis.overall_sentiment
    ).toUpperCase()} (Confidence: ${(
      analysis.sentiment_confidence * 100
    ).toFixed(2)}%)`,
    ""
  );
  lines.push("Sentiment Breakdown:");
  Object.entries(analysis.sentiment_breakdown).forEach(([k, v]) =>
    lines.push(`  ${k}: ${(Number(v) * 100).toFixed(2)}%`)
  );

  lines.push("", "", "INTENT CLASSIFICATION");
  lines.push("-".repeat(70));
  lines.push(
    `Primary Intent: ${analysis.primary_intent} (Confidence: ${(
      analysis.intent_confidence * 100
    ).toFixed(2)}%)`
  );
  if (analysis.secondary_intents?.length) {
    lines.push(`Secondary Intents: ${analysis.secondary_intents.join(", ")}`);
  }
  lines.push("", "Intent Scores:");
  Object.entries(analysis.intent_scores)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .forEach(([k, v]) =>
      lines.push(`  ${k}: ${(Number(v) * 100).toFixed(2)}%`)
    );

  lines.push("", "", "CONTENT SUMMARY");
  lines.push("-".repeat(70));
  lines.push(
    `Content Type: ${String(analysis.content_type).toUpperCase()}`,
    ""
  );
  lines.push(analysis.summary, "");
  if (analysis.key_topics?.length) {
    lines.push(`Key Topics: ${analysis.key_topics.join(", ")}`);
  }

  await fs.writeFile(outPath, lines.join("\n"), "utf-8");
  log("Analysis complete");

  return { ...analysis, analysis_path: outPath };
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  try {
    await ensureDirs();

    let mediaPath = "";
    let displayName = "";
    let uploadedMime = "";

    // Handle multipart form-data upload
    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      if (!file || !file.name) {
        return new Response(JSON.stringify({ error: "No file uploaded" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
      }
      mediaPath = await saveUploadedFile(file);
      displayName = file.name;
      uploadedMime = (mimeLookup(file.name) as string) || "";
    } else {
      // JSON body: accept media_path (local path) or media_url (remote)
      const body = await req.json().catch(() => ({} as any));
      const inputPath = body?.media_path as string | undefined;
      const mediaUrl = body?.media_url as string | undefined;
      if (inputPath) {
        mediaPath = path.resolve(inputPath);
        displayName = path.basename(mediaPath);
      } else if (mediaUrl) {
        mediaPath = await downloadToTmp(mediaUrl);
        displayName =
          path.basename(new URL(mediaUrl).pathname) || path.basename(mediaPath);
      } else {
        return new Response(
          JSON.stringify({
            error:
              "Provide either multipart 'file' upload or JSON 'media_path'/'media_url'",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders() },
          }
        );
      }
    }

    const outputDir = await createOutputDirectory(displayName);
    const processed = await processMediaFile(mediaPath, outputDir);

    const transcription = await geminiTranscribe(
      processed.path,
      processed.mime,
      outputDir
    );
    const analysis = await geminiAnalyze(
      transcription.translated_transcription,
      outputDir
    );

    const resp = {
      status: "success",
      device: "gemini-api",
      model: GEMINI_MODEL,
      compute_type: "cloud",
      timestamp: new Date().toISOString(),
      output_dir: outputDir,
      transcription: {
        detected_language: transcription.detected_language,
        language_confidence: transcription.language_confidence,
        raw_transcription: transcription.raw_transcription,
        english_transcription: transcription.translated_transcription,
      },
      analysis: {
        dominant_emotion: analysis.dominant_emotion,
        emotion_confidence: analysis.emotion_confidence,
        emotion_scores: analysis.emotion_scores,
        overall_sentiment: analysis.overall_sentiment,
        sentiment_confidence: analysis.sentiment_confidence,
        sentiment_breakdown: analysis.sentiment_breakdown,
        primary_intent: analysis.primary_intent,
        intent_confidence: analysis.intent_confidence,
        intent_scores: analysis.intent_scores,
        secondary_intents: analysis.secondary_intents,
        summary: analysis.summary,
        key_topics: analysis.key_topics,
        content_type: analysis.content_type,
      },
      artifacts: {
        processed_audio: processed.path,
        raw_transcript: transcription.raw_path,
        english_transcript: transcription.translated_path,
        analysis_txt: analysis.analysis_path,
      },
    };

    return new Response(JSON.stringify(resp), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  } catch (e: any) {
    const msg = e?.message || String(e);
    log(`Analyze error: ${msg}`);
    const status = msg.includes("Unsupported file type")
      ? 400
      : msg.includes("not found")
      ? 404
      : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  }
}
