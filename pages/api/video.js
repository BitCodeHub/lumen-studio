// Video generation endpoint - Text to Video & Image to Video using AnimateDiff Evolved
const COMFYUI_URL = process.env.COMFYUI_URL || 'http://localhost:8188';
const AUTH = Buffer.from(process.env.COMFYUI_AUTH || 'lumen:studio2026').toString('base64');

// SD 1.5 + AnimateDiff Evolved workflow (correct node connections)
const buildTextToVideoWorkflow = (prompt, frames = 16) => ({
  // Load checkpoint
  "1": { "inputs": { "ckpt_name": "SD1.5/v1-5-pruned-emaonly.safetensors" }, "class_type": "CheckpointLoaderSimple" },
  // Load AnimateDiff motion model
  "2": { "inputs": { "model_name": "mm_sd_v15_v2.ckpt" }, "class_type": "ADE_LoadAnimateDiffModel" },
  // Apply AnimateDiff to model (outputs M_MODELS)
  "3": { "inputs": { "motion_model": ["2", 0], "start_percent": 0, "end_percent": 1, "model": ["1", 0] }, "class_type": "ADE_ApplyAnimateDiffModelSimple" },
  // Use Evolved Sampling - takes original model + m_models
  "4": { "inputs": { 
    "model": ["1", 0],  // Original MODEL
    "m_models": ["3", 0],  // M_MODELS from AnimateDiff
    "beta_schedule": "sqrt_linear (AnimateDiff)" 
  }, "class_type": "ADE_UseEvolvedSampling" },
  // Positive prompt
  "5": { "inputs": { "text": prompt + ", smooth motion, high quality, detailed, cinematic", "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
  // Negative prompt
  "6": { "inputs": { "text": "ugly, blurry, static, low quality, watermark, deformed, jpeg artifacts", "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
  // Empty latent for frames
  "7": { "inputs": { "width": 512, "height": 512, "batch_size": frames }, "class_type": "EmptyLatentImage" },
  // KSampler with evolved model
  "8": { "inputs": { 
    "seed": Math.floor(Math.random() * 1e9), 
    "steps": 20, 
    "cfg": 7.5, 
    "sampler_name": "euler_ancestral", 
    "scheduler": "normal", 
    "denoise": 1, 
    "model": ["4", 0],  // Evolved model output
    "positive": ["5", 0], 
    "negative": ["6", 0], 
    "latent_image": ["7", 0] 
  }, "class_type": "KSampler" },
  // VAE Decode
  "9": { "inputs": { "samples": ["8", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
  // Save as animated WEBP
  "10": { "inputs": { 
    "filename_prefix": "video", 
    "fps": 12, 
    "lossless": false, 
    "quality": 85, 
    "method": "default", 
    "images": ["9", 0] 
  }, "class_type": "SaveAnimatedWEBP" }
});

// Image-to-video using SD 1.5 + AnimateDiff Evolved
const buildImageToVideoWorkflow = (filename, prompt, frames = 16) => ({
  // Load source image
  "1": { "inputs": { "image": filename, "upload": "image" }, "class_type": "LoadImage" },
  // Load checkpoint
  "2": { "inputs": { "ckpt_name": "SD1.5/v1-5-pruned-emaonly.safetensors" }, "class_type": "CheckpointLoaderSimple" },
  // Load AnimateDiff motion model
  "3": { "inputs": { "model_name": "mm_sd_v15_v2.ckpt" }, "class_type": "ADE_LoadAnimateDiffModel" },
  // Apply AnimateDiff
  "4": { "inputs": { "motion_model": ["3", 0], "start_percent": 0, "end_percent": 1, "model": ["2", 0] }, "class_type": "ADE_ApplyAnimateDiffModelSimple" },
  // Use Evolved Sampling
  "5": { "inputs": { 
    "model": ["2", 0], 
    "m_models": ["4", 0], 
    "beta_schedule": "sqrt_linear (AnimateDiff)" 
  }, "class_type": "ADE_UseEvolvedSampling" },
  // Encode image to latent
  "6": { "inputs": { "pixels": ["1", 0], "vae": ["2", 2] }, "class_type": "VAEEncode" },
  // Positive prompt
  "7": { "inputs": { "text": prompt || "smooth natural motion, high quality animation", "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
  // Negative prompt
  "8": { "inputs": { "text": "ugly, blurry, static, low quality, watermark", "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
  // KSampler with img2img denoise
  "9": { "inputs": { 
    "seed": Math.floor(Math.random() * 1e9), 
    "steps": 20, 
    "cfg": 7, 
    "sampler_name": "euler_ancestral", 
    "scheduler": "normal", 
    "denoise": 0.65, 
    "model": ["5", 0], 
    "positive": ["7", 0], 
    "negative": ["8", 0], 
    "latent_image": ["6", 0] 
  }, "class_type": "KSampler" },
  // VAE Decode
  "10": { "inputs": { "samples": ["9", 0], "vae": ["2", 2] }, "class_type": "VAEDecode" },
  // Save as animated WEBP
  "11": { "inputs": { 
    "filename_prefix": "animate", 
    "fps": 12, 
    "lossless": false, 
    "quality": 85, 
    "method": "default", 
    "images": ["10", 0] 
  }, "class_type": "SaveAnimatedWEBP" }
});

// Parse duration from prompt
function parseDuration(prompt) {
  const lower = prompt.toLowerCase();
  const match = lower.match(/(\d+)\s*(second|sec|s)/);
  if (match) {
    const seconds = parseInt(match[1]);
    return Math.min(Math.max(seconds * 12, 12), 32);
  }
  return 16;
}

// Import job queue functions
import fs from 'fs/promises';
import path from 'path';

const JOBS_FILE = path.join(process.cwd(), 'data', 'video-jobs.json');

async function createJob(prompt, duration, comfyPromptId) {
  const dataDir = path.join(process.cwd(), 'data');
  try { await fs.mkdir(dataDir, { recursive: true }); } catch (e) {}
  
  let jobs = { jobs: {} };
  try {
    const data = await fs.readFile(JOBS_FILE, 'utf8');
    jobs = JSON.parse(data);
  } catch (e) {}
  
  const jobId = `vid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  jobs.jobs[jobId] = {
    id: jobId,
    prompt,
    duration,
    comfyPromptId,
    status: 'rendering',
    progress: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    outputs: []
  };
  
  await fs.writeFile(JOBS_FILE, JSON.stringify(jobs, null, 2));
  return jobId;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, filename } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt required' });
  }

  try {
    const frames = parseDuration(prompt);
    const duration = Math.round(frames / 12);
    let workflow;
    let type;

    if (filename) {
      workflow = buildImageToVideoWorkflow(filename, prompt, frames);
      type = 'image_to_video';
    } else {
      workflow = buildTextToVideoWorkflow(prompt, frames);
      type = 'text_to_video';
    }

    const response = await fetch(COMFYUI_URL + '/prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + AUTH,
      },
      body: JSON.stringify({ prompt: workflow }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error('ComfyUI error: ' + text);
    }

    const data = await response.json();
    
    // Create job in queue for tracking
    const jobId = await createJob(prompt, duration, data.prompt_id);
    
    return res.status(200).json({
      status: 'generating',
      prompt_id: data.prompt_id,
      job_id: jobId,
      operation: 'video',
      type: type,
      frames: frames,
      duration: duration,
      message: filename 
        ? `Animating your image (~${duration}s video)...` 
        : `Creating video (~${duration}s)...`,
      poll_url: `/api/video-queue?jobId=${jobId}`,
      note: 'Poll the poll_url every 5 seconds for progress. You will get a WhatsApp notification when complete.'
    });

  } catch (error) {
    console.error('Video error:', error);
    return res.status(500).json({ error: error.message });
  }
}
