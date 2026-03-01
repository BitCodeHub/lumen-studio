// Ad Video Composition - Hollywood-grade video production
// Uses Remotion for professional motion graphics and transitions

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);
const COMFYUI_URL = process.env.COMFYUI_URL || 'https://spark-comfyui.ngrok.app';
const AUTH = Buffer.from(process.env.COMFYUI_AUTH || 'lumen:studio2026').toString('base64');

// Check if all scenes are complete
async function checkScenesComplete(promptIds) {
  const results = [];
  
  for (const promptId of promptIds) {
    try {
      const res = await fetch(`${COMFYUI_URL}/history/${promptId}`, {
        headers: { 'Authorization': 'Basic ' + AUTH }
      });
      
      if (res.ok) {
        const data = await res.json();
        const job = data[promptId];
        
        if (job && job.outputs) {
          // Find output images/videos
          const outputs = Object.values(job.outputs).flat();
          const files = [];
          
          for (const output of outputs) {
            if (output.images) {
              files.push(...output.images.map(img => ({
                filename: img.filename,
                type: img.type || 'output',
                subfolder: img.subfolder || ''
              })));
            }
          }
          
          results.push({
            promptId,
            status: 'complete',
            files
          });
        } else {
          results.push({ promptId, status: 'processing' });
        }
      } else {
        results.push({ promptId, status: 'unknown' });
      }
    } catch (error) {
      results.push({ promptId, status: 'error', error: error.message });
    }
  }
  
  return results;
}

// Download scene files from ComfyUI
async function downloadScenes(sceneFiles, outputDir) {
  const downloadedFiles = [];
  
  for (const scene of sceneFiles) {
    for (const file of scene.files || []) {
      const url = `${COMFYUI_URL}/view?filename=${file.filename}&type=${file.type}&subfolder=${file.subfolder}`;
      
      try {
        const res = await fetch(url, {
          headers: { 'Authorization': 'Basic ' + AUTH }
        });
        
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          const localPath = path.join(outputDir, `scene_${scene.promptId}_${file.filename}`);
          await fs.writeFile(localPath, Buffer.from(buffer));
          downloadedFiles.push({
            promptId: scene.promptId,
            localPath,
            originalName: file.filename
          });
        }
      } catch (error) {
        console.error(`Failed to download ${file.filename}:`, error);
      }
    }
  }
  
  return downloadedFiles;
}

// Compose video with FFmpeg
async function composeWithFFmpeg(sceneFiles, options) {
  const { outputPath, fps = 24, transition = 'fade', transitionDuration = 0.5 } = options;
  
  // Create concat file for FFmpeg
  const concatContent = sceneFiles.map(f => `file '${f.localPath}'`).join('\n');
  const concatFile = path.join(path.dirname(outputPath), 'concat.txt');
  await fs.writeFile(concatFile, concatContent);
  
  // Simple concat (for webp animations, we need to convert first)
  // For MVP, just concat the files
  const cmd = `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c:v libx264 -pix_fmt yuv420p -r ${fps} "${outputPath}"`;
  
  try {
    await execAsync(cmd);
    return { success: true, outputPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    sceneJobs,     // Array of { promptId, sceneId, type }
    checkOnly = false,  // Just check status, don't compose
    compose = false     // Actually compose the video
  } = req.body;

  if (!sceneJobs || !Array.isArray(sceneJobs)) {
    return res.status(400).json({ error: 'sceneJobs array required' });
  }

  try {
    const promptIds = sceneJobs.map(j => j.promptId);
    const results = await checkScenesComplete(promptIds);
    
    const complete = results.filter(r => r.status === 'complete');
    const processing = results.filter(r => r.status === 'processing');
    const failed = results.filter(r => r.status === 'error');
    
    const response = {
      total: results.length,
      complete: complete.length,
      processing: processing.length,
      failed: failed.length,
      allComplete: complete.length === results.length,
      scenes: results.map((r, i) => ({
        ...sceneJobs[i],
        status: r.status,
        files: r.files || []
      }))
    };

    if (checkOnly) {
      return res.status(200).json(response);
    }

    if (!response.allComplete) {
      return res.status(200).json({
        ...response,
        message: `${processing.length} scenes still processing. Check again in 30 seconds.`
      });
    }

    if (compose && response.allComplete) {
      // Download scene assets
      const outputDir = '/tmp/lumen-studio-compose-' + Date.now();
      await fs.mkdir(outputDir, { recursive: true });
      
      const downloadedFiles = await downloadScenes(complete, outputDir);
      
      if (downloadedFiles.length === 0) {
        return res.status(500).json({ error: 'No files downloaded' });
      }

      // Build asset URL map for Remotion
      const assetUrls = {};
      downloadedFiles.forEach((file, idx) => {
        assetUrls[idx + 1] = file.localPath;
      });

      // Call Remotion render API
      const { style = 'tech', product = 'Product', tagline = '', duration = 30 } = req.body;
      
      try {
        const renderRes = await fetch(new URL('/api/render-video', req.headers.origin || 'http://localhost:3000'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenes: sceneJobs.map((job, idx) => ({
              id: idx + 1,
              type: job.type || 'feature',
              duration: 5, // Default 5s per scene
              description: job.description || '',
            })),
            style,
            product,
            tagline,
            duration,
            assetUrls,
          }),
        });

        const renderData = await renderRes.json();

        if (renderData.status === 'complete' && renderData.video) {
          // Cleanup temp files
          await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {});
          
          return res.status(200).json({
            ...response,
            status: 'complete',
            renderEngine: 'remotion',
            video: renderData.video,
            message: '🎬 Hollywood-grade video rendered successfully with Remotion!'
          });
        } else {
          // Fall back to FFmpeg if Remotion fails
          console.log('Remotion render failed, falling back to FFmpeg:', renderData.error);
          
          const outputPath = path.join(outputDir, 'final_ad.mp4');
          const composeResult = await composeWithFFmpeg(downloadedFiles, { outputPath });
          
          if (composeResult.success) {
            const videoBuffer = await fs.readFile(outputPath);
            const base64 = videoBuffer.toString('base64');
            
            return res.status(200).json({
              ...response,
              status: 'complete',
              renderEngine: 'ffmpeg-fallback',
              video: {
                base64: base64,
                size: videoBuffer.length,
                format: 'mp4'
              },
              message: 'Video composed with FFmpeg (Remotion fallback)'
            });
          }
        }
      } catch (renderError) {
        console.error('Remotion render error:', renderError);
        
        // Fall back to FFmpeg
        const outputPath = path.join(outputDir, 'final_ad.mp4');
        const composeResult = await composeWithFFmpeg(downloadedFiles, { outputPath });
        
        if (composeResult.success) {
          const videoBuffer = await fs.readFile(outputPath);
          const base64 = videoBuffer.toString('base64');
          
          return res.status(200).json({
            ...response,
            status: 'complete',
            renderEngine: 'ffmpeg-fallback',
            video: {
              base64: base64,
              size: videoBuffer.length,
              format: 'mp4'
            },
            message: 'Video composed with FFmpeg'
          });
        }
      }
      
      return res.status(500).json({
        ...response,
        error: 'Composition failed'
      });
    }

    return res.status(200).json({
      ...response,
      message: response.allComplete ? 'All scenes complete! Set compose=true to create final video.' : `Waiting for ${processing.length} scenes...`
    });

  } catch (error) {
    console.error('Compose error:', error);
    return res.status(500).json({ error: error.message });
  }
}
