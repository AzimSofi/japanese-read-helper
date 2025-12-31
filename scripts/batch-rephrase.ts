#!/usr/bin/env npx tsx
/**
 * Batch AI Rephrasing Script
 *
 * Processes large Japanese texts through Gemini AI for rephrasing.
 * Runs continuously with configurable delays, saving progress to allow resumption.
 *
 * Usage:
 *   npx tsx scripts/batch-rephrase.ts "book-name" [options]
 *
 * Options:
 *   --chunk-size <n>  Target characters per chunk (default: 5000)
 *   --delay <n>       Seconds between chunks (default: 600 = 10min)
 *   --model <name>    Gemini model to use (default: gemini-2.5-flash)
 *   --reset           Start fresh, ignore existing progress
 *   --dry-run         Show chunks without processing
 */

import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';

// Load environment variables (try .env.local first, then .env)
const envLocalPath = path.join(process.cwd(), '.env.local');
const envPath = path.join(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// ============================================================================
// Constants (copied from lib/constants.ts to avoid Next.js import issues)
// ============================================================================

const AI_MODELS = {
  GEMINI_FLASH: 'gemini-2.0-flash-exp',
  GEMINI_2_5_FLASH: 'gemini-2.5-flash',
  GEMINI_2_5_FLASH_LITE: 'gemini-2.5-flash-lite',
  GEMINI_PRO: 'gemini-1.5-pro-latest',
} as const;

const VN_RETRY_CONFIG = {
  MAX_ATTEMPTS: 4,
  INITIAL_ATTEMPT: 1,
} as const;

// AI instruction prompt - simplified summary format (1 rephrase per line)
const ai_instructions = `
以下の文章について、日本語学習者が意味を掴みやすくするために、元の一行ごとに要約してください。回答は必ず下記の構成に従ってください。

<（原文）
>>元の文のメッセージを要約してください。

一行ずつ、このフォーマットを繰り返してください。

例：
< かつて１０００年の都と謳われた古都のはずれに、世界はどこまでもシンプルであり、人は今日からでも幸せになれる、と説く哲学者が住んでいた。
>> 古都のはずれに、「世界はシンプルで人は幸せになれる」と説く哲学者が住んでいた。

< 納得のいかない青年は、哲学者のもとを訪ね、その真意を問いただそうとしていた。
>> その教えに納得できない青年が、哲学者の本当の考えを聞きに行った。

< 悩み多き彼の目には、世界は矛盾に満ちた混沌としか映らず、ましてや幸福などありえなかった。
>> 悩みの多い青年には、世界は複雑で、幸せになれるとは思えなかった。

---
それでは、以下の文章でお願いします：
`;

// ============================================================================
// Types
// ============================================================================

interface ProgressFile {
  version: number;
  source: {
    fileName: string;
    directory: string;
    totalCharacters: number;
    hash: string;
  };
  chunks: {
    total: number;
    completed: number;
    items: ChunkProgress[];
  };
  settings: {
    chunkSize: number;
    delaySeconds: number;
    model: string;
  };
  startedAt: string;
  lastUpdatedAt: string;
}

interface ChunkProgress {
  index: number;
  startChar: number;
  endChar: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  completedAt?: string;
  error?: string;
}

interface ParsedItem {
  head: string;
  subItems: string[];
}

interface CLIOptions {
  bookName: string;
  chunkSize: number;
  delaySeconds: number;
  model: string;
  reset: boolean;
  dryRun: boolean;
  apiUrl: string;
  baseDir: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Strip ruby tags from text for character counting
 */
function stripRubyTags(text: string): string {
  // Remove <ruby>kanji<rt>reading</rt></ruby> -> kanji
  return text.replace(/<ruby>(?:<rb>)?(.+?)(?:<\/rb>)?<rt>.+?<\/rt><\/ruby>/g, '$1');
}

/**
 * Simple hash function for detecting source changes
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Parse markdown response from AI (simplified version)
 */
function parseMarkdown(text: string): ParsedItem[] {
  const hasHeadingPrefix = /^[<＜](?!ruby>|rt>)/m.test(text);
  const hasSubItemSeparator = text.includes('>>');

  if (!hasHeadingPrefix && !hasSubItemSeparator) {
    return [];
  }

  const lines = text.split('\n');
  const items: ParsedItem[] = [];
  let currentItem: ParsedItem | null = null;
  let collectingHeader = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (collectingHeader && currentItem) {
        currentItem.head += '\n';
      }
      continue;
    }

    // Heading line (< or ＜ prefix)
    if (/^[<＜]/.test(trimmed) && !/^<ruby>/.test(trimmed)) {
      currentItem = {
        head: trimmed.replace(/^[<＜]\s*/, ''),
        subItems: [],
      };
      items.push(currentItem);
      collectingHeader = true;
    }
    // Subitem line (>> prefix)
    else if (trimmed.startsWith('>>')) {
      collectingHeader = false;
      if (currentItem) {
        currentItem.subItems.push(trimmed.replace(/^>>\s*/, ''));
      }
    }
    // Continue collecting multi-line header
    else if (collectingHeader && currentItem) {
      currentItem.head += '\n' + trimmed;
    }
  }

  return items;
}

/**
 * Validate AI response format
 */
function validateResponse(response: string): boolean {
  const items = parseMarkdown(response);
  if (items.length === 0) return false;

  return items.every(item =>
    item.head && item.head.length > 0 && item.subItems.length >= 1
  );
}

// ============================================================================
// Text Chunking
// ============================================================================

/**
 * Split text into chunks at paragraph boundaries
 */
function chunkText(text: string, targetSize: number = 5000): { chunks: string[]; boundaries: { start: number; end: number }[] } {
  const strippedText = stripRubyTags(text);
  const paragraphs = text.split(/\n\s*\n/);

  const chunks: string[] = [];
  const boundaries: { start: number; end: number }[] = [];

  let currentChunk = '';
  let currentChunkStripped = '';
  let chunkStart = 0;
  let currentPos = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    if (!paragraph) continue;

    const paragraphStripped = stripRubyTags(paragraph);
    const separator = currentChunk ? '\n\n' : '';

    // Check if adding this paragraph would exceed target
    if (currentChunkStripped.length + paragraphStripped.length + separator.length > targetSize) {
      // If current chunk has content, save it
      if (currentChunk) {
        chunks.push(currentChunk);
        boundaries.push({ start: chunkStart, end: currentPos });
        chunkStart = currentPos;
        currentChunk = '';
        currentChunkStripped = '';
      }

      // If single paragraph is larger than target, split by sentences
      if (paragraphStripped.length > targetSize) {
        const sentences = paragraph.split(/(?<=[。！？])/);
        let sentenceChunk = '';
        let sentenceChunkStripped = '';

        for (const sentence of sentences) {
          const sentenceStripped = stripRubyTags(sentence);

          if (sentenceChunkStripped.length + sentenceStripped.length > targetSize && sentenceChunk) {
            chunks.push(sentenceChunk);
            boundaries.push({ start: chunkStart, end: currentPos });
            chunkStart = currentPos;
            sentenceChunk = sentence;
            sentenceChunkStripped = sentenceStripped;
          } else {
            sentenceChunk += sentence;
            sentenceChunkStripped += sentenceStripped;
          }
        }

        if (sentenceChunk) {
          currentChunk = sentenceChunk;
          currentChunkStripped = sentenceChunkStripped;
        }
      } else {
        currentChunk = paragraph;
        currentChunkStripped = paragraphStripped;
      }
    } else {
      currentChunk += separator + paragraph;
      currentChunkStripped += separator + paragraphStripped;
    }

    currentPos += paragraph.length + 2; // +2 for paragraph separator
  }

  // Don't forget the last chunk
  if (currentChunk) {
    chunks.push(currentChunk);
    boundaries.push({ start: chunkStart, end: currentPos });
  }

  return { chunks, boundaries };
}

// ============================================================================
// Progress Management
// ============================================================================

function getProgressPath(sourceDir: string, bookName: string): string {
  return path.join(sourceDir, `${bookName}-rephrase-progress.json`);
}

function getOutputPath(sourceDir: string, bookName: string): string {
  return path.join(sourceDir, `${bookName}-rephrase.txt`);
}

function loadProgress(progressPath: string): ProgressFile | null {
  if (!fs.existsSync(progressPath)) return null;

  try {
    const content = fs.readFileSync(progressPath, 'utf-8');
    return JSON.parse(content) as ProgressFile;
  } catch {
    console.error('Failed to load progress file');
    return null;
  }
}

function saveProgress(progressPath: string, progress: ProgressFile): void {
  progress.lastUpdatedAt = new Date().toISOString();
  fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf-8');
}

function createProgress(
  bookName: string,
  directory: string,
  sourceText: string,
  chunks: string[],
  boundaries: { start: number; end: number }[],
  settings: CLIOptions
): ProgressFile {
  return {
    version: 1,
    source: {
      fileName: bookName,
      directory: directory,
      totalCharacters: stripRubyTags(sourceText).length,
      hash: simpleHash(sourceText),
    },
    chunks: {
      total: chunks.length,
      completed: 0,
      items: chunks.map((_, index) => ({
        index,
        startChar: boundaries[index].start,
        endChar: boundaries[index].end,
        status: 'pending' as const,
        attempts: 0,
      })),
    },
    settings: {
      chunkSize: settings.chunkSize,
      delaySeconds: settings.delaySeconds,
      model: settings.model,
    },
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// AI Processing
// ============================================================================

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

async function processChunk(
  chunk: string,
  model: string,
  maxAttempts: number = VN_RETRY_CONFIG.MAX_ATTEMPTS
): Promise<{ success: boolean; response: string; attempts: number }> {
  const ai = getAIClient();
  let currentInstruction = ai_instructions;
  let attempt = 0;

  // Strip furigana from chunk before sending to AI
  const cleanChunk = stripRubyTags(chunk);

  while (attempt < maxAttempts) {
    attempt++;
    console.log(`    Attempt ${attempt}/${maxAttempts}...`);

    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: currentInstruction + cleanChunk,
      });

      const responseText = response.text || '';

      if (validateResponse(responseText)) {
        return { success: true, response: responseText, attempts: attempt };
      }

      // Invalid format - prepare retry with correction
      console.log('    Invalid format, retrying with correction prompt...');
      currentInstruction =
        '回答のフォーマットが正しくありません。もう一度やり直してください。必ず下記の構成に従ってください。\n' +
        ai_instructions;

    } catch (error) {
      console.error(`    API error on attempt ${attempt}:`, error);

      // Wait before retry on API error
      if (attempt < maxAttempts) {
        const waitTime = Math.min(30, attempt * 10);
        console.log(`    Waiting ${waitTime}s before retry...`);
        await sleep(waitTime * 1000);
      }
    }
  }

  return { success: false, response: '', attempts: attempt };
}

// ============================================================================
// Database Sync
// ============================================================================

/**
 * Sync the output file to the database so users can read it immediately
 */
async function syncToDatabase(
  apiUrl: string,
  fileName: string,
  directory: string
): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl}/api/text-entries`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileName, directory }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`    Database sync failed: ${response.status} - ${errorText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`    Database sync error:`, error);
    return false;
  }
}

// ============================================================================
// Main Processing
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

async function main() {
  // Parse CLI arguments
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Batch AI Rephrasing Script

Usage:
  npx tsx scripts/batch-rephrase.ts <book-name> [options]

Options:
  --chunk-size <n>  Target characters per chunk (default: 5000)
  --delay <n>       Seconds between chunks (default: 600 = 10min)
  --model <name>    Gemini model (default: gemini-2.0-flash-exp)
  --api-url <url>   App URL for database sync (default: http://localhost:3333)
  --base-dir <dir>  Base directory name in public/ (default: bookv2-furigana)
  --reset           Start fresh, ignore existing progress
  --dry-run         Show chunks without processing

Example:
  npx tsx scripts/batch-rephrase.ts "my-book" --delay 300
  npx tsx scripts/batch-rephrase.ts "my-book" --base-dir bookv3-rephrase
`);
    process.exit(0);
  }

  const options: CLIOptions = {
    bookName: args[0],
    chunkSize: 5000,
    delaySeconds: 600,
    model: AI_MODELS.GEMINI_FLASH, // gemini-2.0-flash-exp - same as app uses
    reset: false,
    dryRun: false,
    apiUrl: 'http://localhost:3333',
    baseDir: 'bookv2-furigana',
  };

  // Parse options
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--chunk-size':
        options.chunkSize = parseInt(args[++i], 10);
        break;
      case '--delay':
        options.delaySeconds = parseInt(args[++i], 10);
        break;
      case '--model':
        options.model = args[++i];
        break;
      case '--api-url':
        options.apiUrl = args[++i];
        break;
      case '--base-dir':
        options.baseDir = args[++i];
        break;
      case '--reset':
        options.reset = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
    }
  }

  // Find source file
  const baseDir = path.join(process.cwd(), 'public', options.baseDir);
  const sourceDir = path.join(baseDir, options.bookName);
  const sourcePath = path.join(sourceDir, `${options.bookName}.txt`);

  if (!fs.existsSync(sourcePath)) {
    console.error(`Source file not found: ${sourcePath}`);
    console.log('\nAvailable books:');

    if (fs.existsSync(baseDir)) {
      const dirs = fs.readdirSync(baseDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
      dirs.forEach(d => console.log(`  - ${d}`));
    }

    process.exit(1);
  }

  console.log(`\n=== Batch AI Rephrasing ===`);
  console.log(`Source: ${sourcePath}`);

  // Load source text
  const sourceText = fs.readFileSync(sourcePath, 'utf-8');
  const strippedLength = stripRubyTags(sourceText).length;
  console.log(`Total characters: ${strippedLength.toLocaleString()} (excluding furigana)`);

  // Check for existing progress
  const progressPath = getProgressPath(sourceDir, options.bookName);
  const outputPath = getOutputPath(sourceDir, options.bookName);

  let progress = options.reset ? null : loadProgress(progressPath);
  let chunks: string[];

  if (progress) {
    // Verify source hasn't changed
    const currentHash = simpleHash(sourceText);
    if (progress.source.hash !== currentHash) {
      console.log('\nSource file has changed since last run.');
      console.log('Use --reset to start fresh.');
      process.exit(1);
    }

    console.log(`\nResuming from progress: ${progress.chunks.completed}/${progress.chunks.total} chunks done`);

    // Recreate chunks from source (progress only stores boundaries)
    const result = chunkText(sourceText, progress.settings.chunkSize);
    chunks = result.chunks;
  } else {
    // Create new progress
    const result = chunkText(sourceText, options.chunkSize);
    chunks = result.chunks;

    console.log(`\nChunks: ${chunks.length} (target size: ${options.chunkSize} chars)`);
    console.log(`Delay: ${options.delaySeconds}s (${formatDuration(options.delaySeconds)}) between chunks`);
    console.log(`Model: ${options.model}`);
    console.log(`Database sync: ${options.apiUrl}`);

    const estimatedTime = chunks.length * options.delaySeconds;
    console.log(`Estimated total time: ${formatDuration(estimatedTime)}`);

    progress = createProgress(
      options.bookName,
      `${options.baseDir}/${options.bookName}`,
      sourceText,
      chunks,
      result.boundaries,
      options
    );
  }

  // Dry run - just show chunk info
  if (options.dryRun) {
    console.log('\n=== Dry Run - Chunk Preview ===');
    chunks.forEach((chunk, i) => {
      const stripped = stripRubyTags(chunk);
      const preview = stripped.slice(0, 50).replace(/\n/g, ' ');
      console.log(`\nChunk ${i + 1}/${chunks.length} (${stripped.length} chars):`);
      console.log(`  ${preview}...`);
    });
    process.exit(0);
  }

  // Setup graceful shutdown
  let shouldStop = false;
  process.on('SIGINT', () => {
    console.log('\n\nReceived SIGINT. Saving progress and exiting...');
    shouldStop = true;
  });

  // Process chunks
  console.log('\n=== Starting Processing ===\n');

  const startTime = Date.now();
  let processedCount = 0;

  for (let i = 0; i < chunks.length; i++) {
    if (shouldStop) break;

    const chunkProgress = progress.chunks.items[i];

    // Skip completed chunks
    if (chunkProgress.status === 'completed') {
      continue;
    }

    const chunk = chunks[i];
    const chunkStripped = stripRubyTags(chunk);

    console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunkStripped.length} chars)...`);

    // Update status
    chunkProgress.status = 'processing';
    saveProgress(progressPath, progress);

    // Process with AI
    const result = await processChunk(chunk, progress.settings.model);
    chunkProgress.attempts = result.attempts;

    if (result.success) {
      chunkProgress.status = 'completed';
      chunkProgress.completedAt = new Date().toISOString();
      progress.chunks.completed++;

      // Append to output file
      const separator = fs.existsSync(outputPath) ? '\n\n' : '';
      fs.appendFileSync(outputPath, separator + result.response, 'utf-8');

      // Sync to database so users can read immediately
      const outputFileName = `${options.bookName}-rephrase`;
      const outputDirectory = `${options.baseDir}/${options.bookName}`;
      console.log(`  Syncing to database...`);
      const synced = await syncToDatabase(options.apiUrl, outputFileName, outputDirectory);
      if (synced) {
        console.log(`  Database synced! Users can now read the updated content.`);
      } else {
        console.log(`  Warning: Database sync failed. File saved locally.`);
      }

      processedCount++;

      // Calculate ETA
      const elapsed = (Date.now() - startTime) / 1000;
      const avgTime = elapsed / processedCount;
      const remaining = chunks.length - progress.chunks.completed;
      const eta = remaining * Math.max(avgTime, progress.settings.delaySeconds);

      console.log(`  Done! (${progress.chunks.completed}/${chunks.length})`);
      console.log(`  ETA for remaining: ${formatDuration(eta)}`);
    } else {
      chunkProgress.status = 'failed';
      chunkProgress.error = 'Max retries exceeded';
      console.log(`  Failed after ${result.attempts} attempts`);
    }

    saveProgress(progressPath, progress);

    // Wait before next chunk (unless it's the last one)
    if (i < chunks.length - 1 && !shouldStop) {
      const pendingCount = progress.chunks.items.filter(c => c.status === 'pending').length;
      if (pendingCount > 0) {
        console.log(`\n  Waiting ${formatDuration(progress.settings.delaySeconds)} before next chunk...`);
        console.log(`  (Press Ctrl+C to stop and save progress)\n`);
        await sleep(progress.settings.delaySeconds * 1000);
      }
    }
  }

  // Final summary
  console.log('\n=== Processing Complete ===');
  console.log(`Completed: ${progress.chunks.completed}/${progress.chunks.total} chunks`);

  const failed = progress.chunks.items.filter(c => c.status === 'failed').length;
  if (failed > 0) {
    console.log(`Failed: ${failed} chunks`);
  }

  console.log(`Output: ${outputPath}`);
  console.log(`Progress: ${progressPath}`);

  if (progress.chunks.completed === progress.chunks.total) {
    console.log('\nAll chunks processed successfully!');
  } else if (shouldStop) {
    console.log('\nStopped by user. Run again to resume.');
  } else {
    console.log('\nSome chunks failed. Check progress file for details.');
  }
}

// Run
main().catch(console.error);
