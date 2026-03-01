// Video generation endpoint - Text to Video, Image to Video, Multi-asset Ads
const COMFYUI_URL = process.env.COMFYUI_URL || 'https://spark-comfyui.ngrok.app';
const AUTH = Buffer.from(process.env.COMFYUI_AUTH || 'lumen:studio2026').toString('base64');

// Video workflow templates
const WORKFLOWS = {
  // Text to Video (Hunyuan)
  text_to_video: (prompt, frames = 49) => ({
    "1": { "inputs": { "ckpt_name": "hunyuan_video_720_cfgdistill_fp8_e4m3fn.safetensors" }, "class_type": "HunyuanVideoModelLoader" },
    "2": { "inputs": { "clip_name": "llava_llama3_fp8_scaled.safetensors" }, "class_type": "DualCLIPLoader" },
    "3": { "inputs": { "vae_name": "hunyuan_video_vae_bf16.safetensors" }, "class_type": "VAELoader" },
    "4": { "inputs": { "text": prompt, "clip": ["2", 0] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "width": 848, "height": 480, "length": frames, "batch_size": 1 }, "class_type": "EmptyHunyuanLatentVideo" },
    "6": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 30, "cfg": 6, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["1", 0], "positive": ["4", 0], "negative": ["4", 0], "latent_image": ["5", 0] }, "class_type": "KSampler" },
    "7": { "inputs": { "samples": ["6", 0], "vae": ["3", 0] }, "class_type": "VAEDecode" },
    "8": { "inputs": { "filename_prefix": "video", "fps": 24, "images": ["7", 0] }, "class_type": "SaveAnimatedWEBP" }
  }),

  // Image to Video (AnimateDiff)
  image_to_video: (filename, prompt, frames = 16) => ({
    "1": { "inputs": { "image": filename, "upload": "image" }, "class_type": "LoadImage" },
    "2": { "inputs": { "ckpt_name": "sd_xl_base_1.0.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "3": { "inputs": { "model_name": "AnimateDiff_00.ckpt" }, "class_type": "ADE_LoadAnimateDiffModel" },
    "4": { "inputs": { "model": ["2", 0], "motion_model": ["3", 0] }, "class_type": "ADE_ApplyAnimateDiffModel" },
    "5": { "inputs": { "pixels": ["1", 0], "vae": ["2", 2] }, "class_type": "VAEEncode" },
    "6": { "inputs": { "text": prompt || "smooth natural motion, high quality", "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
    "7": { "inputs": { "text": "ugly, blurry, static", "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
    "8": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 20, "cfg": 7, "sampler_name": "euler", "scheduler": "normal", "denoise": 0.6, "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0] }, "class_type": "KSampler" },
    "9": { "inputs": { "samples": ["8", 0], "vae": ["2", 2] }, "class_type": "VAEDecode" },
    "10": { "inputs": { "filename_prefix": "animate", "fps": 12, "images": ["9", 0] }, "class_type": "SaveAnimatedWEBP" }
  }),

  // Quick video with LTX (fastest)
  quick_video: (prompt, frames = 24) => ({
    "1": { "inputs": { "ckpt_name": "ltx-video-2b-v0.9.1.safetensors" }, "class_type": "LTXVModelLoader" },
    "2": { "inputs": { "clip_name": "t5xxl_fp8_e4m3fn.safetensors" }, "class_type": "CLIPLoader" },
    "3": { "inputs": { "vae_name": "ltx_video_vae.safetensors" }, "class_type": "VAELoader" },
    "4": { "inputs": { "text": prompt, "clip": ["2", 0] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "width": 768, "height": 512, "length": frames, "batch_size": 1 }, "class_type": "EmptyLTXVLatentVideo" },
    "6": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 20, "cfg": 3, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["1", 0], "positive": ["4", 0], "negative": ["4", 0], "latent_image": ["5", 0] }, "class_type": "KSampler" },
    "7": { "inputs": { "samples": ["6", 0], "vae": ["3", 0] }, "class_type": "VAEDecode" },
    "8": { "inputs": { "filename_prefix": "quick_video", "fps": 24, "images": ["7", 0] }, "class_type": "SaveAnimatedWEBP" }
  })
};

// Detect video type from prompt
function detectVideoType(prompt, hasImage) {
  const lower = prompt.toLowerCase();
  
  if (hasImage) {
    return 'image_to_video';
  }
  
  if (lower.includes('quick') || lower.includes('fast') || lower.includes('draft')) {
    return 'quick_video';
  }
  
  // Default to text_to_video for quality
  return 'text_to_video';
}

// Parse duration from prompt
function parseDuration(prompt) {
  const lower = prompt.toLowerCase();
  const match = lower.match(/(\d+)\s*(second|sec|s)/);
  if (match) {
    const seconds = parseInt(match[1]);
    return Math.min(Math.max(seconds * 24, 24), 120); // 24fps, max 5 sec
  }
  return 49; // Default ~2 seconds
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, filename, videoType, duration } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt required' });
  }

  try {
    const type = videoType || detectVideoType(prompt, !!filename);
    const frames = duration || parseDuration(prompt);
    
    let workflow;
    switch (type) {
      case 'image_to_video':
        if (!filename) {
          return res.status(400).json({ error: 'filename required for image_to_video' });
        }
        workflow = WORKFLOWS.image_to_video(filename, prompt, Math.min(frames, 32));
        break;
      case 'quick_video':
        workflow = WORKFLOWS.quick_video(prompt, Math.min(frames, 48));
        break;
      default:
        workflow = WORKFLOWS.text_to_video(prompt, Math.min(frames, 49));
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
      type: type,
      frames: frames,
      message: 'Creating your video (' + type + ')...',
      note: 'Video generation takes 1-3 minutes'
    });

  } catch (error) {
    console.error('Video error:', error);
    return res.status(500).json({ error: error.message });
  }
}
