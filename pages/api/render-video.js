// Remotion Video Render API - Hollywood-grade video production
import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const REMOTION_PATH = path.join(process.cwd(), 'remotion-engine');

// Scene types to Remotion-compatible format
function formatScenesForRemotion(scenes, assetUrls = {}) {
  return scenes.map((scene, idx) => ({
    id: scene.id || idx + 1,
    type: scene.type,
    duration: scene.duration,
    description: scene.description,
    assetUrl: assetUrls[scene.id] || assetUrls[idx + 1] || null,
    assetType: assetUrls[scene.id] ? (assetUrls[scene.id].endsWith('.webp') || assetUrls[scene.id].endsWith('.mp4') ? 'video' : 'image') : null,
  }));
}

// Get composition ID based on duration
function getCompositionId(duration) {
  if (duration <= 15) return 'MarketingAd15s';
  if (duration >= 60) return 'MarketingAd60s';
  return 'MarketingAd';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    scenes,           // Array of scene objects
    style = 'tech',   // apple, nike, tech, luxury, social, corporate
    duration = 30,    // Total duration in seconds
    product,          // Product name
    tagline,          // Product tagline
    primaryColor = '#22c55e',
    secondaryColor = '#0d0d0d',
    logoUrl,
    musicUrl,
    assetUrls = {},   // Map of scene ID to asset URL
    preview = false,  // Just validate, don't render
  } = req.body;

  if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
    return res.status(400).json({ error: 'scenes array required' });
  }

  if (!product) {
    return res.status(400).json({ error: 'product name required' });
  }

  try {
    // Format scenes for Remotion
    const remotionScenes = formatScenesForRemotion(scenes, assetUrls);
    const compositionId = getCompositionId(duration);
    const fps = 24;
    const totalFrames = duration * fps;

    // Build props for Remotion
    const props = {
      scenes: remotionScenes,
      style,
      product,
      tagline: tagline || '',
      primaryColor,
      secondaryColor,
      logoUrl: logoUrl || null,
      musicUrl: musicUrl || null,
    };

    // Preview mode - just return the configuration
    if (preview) {
      return res.status(200).json({
        status: 'preview',
        compositionId,
        duration,
        fps,
        totalFrames,
        scenes: remotionScenes,
        props,
        message: `Ready to render ${duration}s ${style} video with ${scenes.length} scenes`
      });
    }

    // Create unique output path
    const outputDir = '/tmp/lumen-studio-render-' + Date.now();
    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, 'output.mp4');

    // Write props to temp file for Remotion
    const propsPath = path.join(outputDir, 'props.json');
    await fs.writeFile(propsPath, JSON.stringify(props));

    // Build the render command
    const renderCmd = [
      'npx', 'remotion', 'render',
      compositionId,
      outputPath,
      '--props', propsPath,
      '--frames', `0-${totalFrames - 1}`,
      '--codec', 'h264',
      '--pixel-format', 'yuv420p',
      '--crf', '18',
      '--log', 'error',
    ].join(' ');

    // Execute render
    console.log('Starting Remotion render:', renderCmd);
    
    try {
      const { stdout, stderr } = await execAsync(renderCmd, {
        cwd: REMOTION_PATH,
        timeout: 600000, // 10 minute timeout
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      });

      // Check if output exists
      const exists = await fs.access(outputPath).then(() => true).catch(() => false);
      
      if (!exists) {
        throw new Error('Render completed but output file not found');
      }

      // Read and return the video
      const videoBuffer = await fs.readFile(outputPath);
      const base64 = videoBuffer.toString('base64');

      // Cleanup
      await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {});

      return res.status(200).json({
        status: 'complete',
        video: {
          base64,
          size: videoBuffer.length,
          format: 'mp4',
          duration,
          fps,
        },
        message: `Successfully rendered ${duration}s Hollywood-grade ${style} video!`
      });

    } catch (renderError) {
      console.error('Render error:', renderError);
      
      // Try to get more details
      return res.status(500).json({
        error: 'Render failed',
        details: renderError.message,
        stderr: renderError.stderr,
      });
    }

  } catch (error) {
    console.error('Video render error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: '100mb',
  },
};
