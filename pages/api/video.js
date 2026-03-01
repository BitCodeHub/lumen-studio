// Video generation endpoint - Text to Video & Image to Video
const COMFYUI_URL = process.env.COMFYUI_URL || 'http://localhost:8188';
const AUTH = Buffer.from(process.env.COMFYUI_AUTH || 'lumen:studio2026').toString('base64');

// SDXL + AnimateDiff workflow for text-to-video (most reliable)
const buildTextToVideoWorkflow = (prompt, frames = 16) => ({
  "1": { "inputs": { "ckpt_name": "sd_xl_base_1.0.safetensors" }, "class_type": "CheckpointLoaderSimple" },
  "2": { "inputs": { "model_name": "mm_sd_v15_v2.ckpt" }, "class_type": "ADE_LoadAnimateDiffModel" },
  "3": { "inputs": { "motion_model": ["2", 0], "start_percent": 0, "end_percent": 1, "model": ["1", 0] }, "class_type": "ADE_ApplyAnimateDiffModelSimple" },
  "4": { "inputs": { "text": prompt + ", smooth motion, high quality, cinematic", "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
  "5": { "inputs": { "text": "ugly, blurry, static, low quality, watermark, deformed", "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
  "6": { "inputs": { "width": 512, "height": 512, "batch_size": frames }, "class_type": "EmptyLatentImage" },
  "7": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 20, "cfg": 7.5, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["3", 0], "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["6", 0] }, "class_type": "KSampler" },
  "8": { "inputs": { "samples": ["7", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
  "9": { "inputs": { "filename_prefix": "video", "fps": 12, "images": ["8", 0] }, "class_type": "SaveAnimatedWEBP" }
});

// AnimateDiff workflow for image-to-video
const buildImageToVideoWorkflow = (filename, prompt, frames = 16) => ({
  "1": { "inputs": { "image": filename, "upload": "image" }, "class_type": "LoadImage" },
  "2": { "inputs": { "ckpt_name": "sd_xl_base_1.0.safetensors" }, "class_type": "CheckpointLoaderSimple" },
  "3": { "inputs": { "model_name": "mm_sd_v15_v2.ckpt" }, "class_type": "ADE_LoadAnimateDiffModel" },
  "4": { "inputs": { "motion_model": ["3", 0], "start_percent": 0, "end_percent": 1, "model": ["2", 0] }, "class_type": "ADE_ApplyAnimateDiffModelSimple" },
  "5": { "inputs": { "pixels": ["1", 0], "vae": ["2", 2] }, "class_type": "VAEEncode" },
  "6": { "inputs": { "text": prompt || "smooth natural motion, high quality animation", "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
  "7": { "inputs": { "text": "ugly, blurry, static, low quality, watermark", "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
  "8": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 20, "cfg": 7, "sampler_name": "euler", "scheduler": "normal", "denoise": 0.65, "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0] }, "class_type": "KSampler" },
  "9": { "inputs": { "samples": ["8", 0], "vae": ["2", 2] }, "class_type": "VAEDecode" },
  "10": { "inputs": { "filename_prefix": "animate", "fps": 12, "images": ["9", 0] }, "class_type": "SaveAnimatedWEBP" }
});

// Parse duration from prompt
function parseDuration(prompt) {
  const lower = prompt.toLowerCase();
  const match = lower.match(/(\d+)\s*(second|sec|s)/);
  if (match) {
    const seconds = parseInt(match[1]);
    return Math.min(Math.max(seconds * 12, 12), 32); // 12fps
  }
  return 16; // Default ~1.3 seconds
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
    
    return res.status(200).json({
      status: 'generating',
      prompt_id: data.prompt_id,
      operation: 'video',
      type: type,
      frames: frames,
      message: filename 
        ? `Animating your image with AnimateDiff (~${Math.round(frames/12)}s)...` 
        : `Creating video with AnimateDiff (~${Math.round(frames/12)}s)...`,
    });

  } catch (error) {
    console.error('Video error:', error);
    return res.status(500).json({ error: error.message });
  }
}
