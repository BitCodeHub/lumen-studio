// Video generation endpoint - Text to Video & Image to Video
const COMFYUI_URL = process.env.COMFYUI_URL || 'http://localhost:8188';
const AUTH = Buffer.from(process.env.COMFYUI_AUTH || 'lumen:studio2026').toString('base64');

// Hunyuan Video workflow (text to video)
const buildHunyuanWorkflow = (prompt, frames = 49) => ({
  "1": { "inputs": { "ckpt_name": "hunyuan_video_720_cfgdistill_fp8_e4m3fn.safetensors" }, "class_type": "HunyuanVideoModelLoader" },
  "2": { "inputs": { "clip_name": "llava_llama3_fp8_scaled.safetensors" }, "class_type": "DualCLIPLoader" },
  "3": { "inputs": { "vae_name": "hunyuan_video_vae_bf16.safetensors" }, "class_type": "VAELoader" },
  "4": { "inputs": { "text": prompt + ", high quality, smooth motion, cinematic", "clip": ["2", 0] }, "class_type": "CLIPTextEncode" },
  "5": { "inputs": { "text": "ugly, blurry, low quality, static, watermark", "clip": ["2", 0] }, "class_type": "CLIPTextEncode" },
  "6": { "inputs": { "width": 848, "height": 480, "length": frames, "batch_size": 1 }, "class_type": "EmptyHunyuanLatentVideo" },
  "7": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 30, "cfg": 6, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["1", 0], "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["6", 0] }, "class_type": "KSampler" },
  "8": { "inputs": { "samples": ["7", 0], "vae": ["3", 0] }, "class_type": "VAEDecode" },
  "9": { "inputs": { "filename_prefix": "video", "fps": 24, "images": ["8", 0] }, "class_type": "SaveAnimatedWEBP" }
});

// AnimateDiff workflow (image to video)
const buildAnimateDiffWorkflow = (filename, prompt, frames = 16) => ({
  "1": { "inputs": { "image": filename, "upload": "image" }, "class_type": "LoadImage" },
  "2": { "inputs": { "ckpt_name": "sd_xl_base_1.0.safetensors" }, "class_type": "CheckpointLoaderSimple" },
  "3": { "inputs": { "model_name": "mm_sd_v15_v2.ckpt" }, "class_type": "ADE_LoadAnimateDiffModel" },
  "4": { "inputs": { "motion_model": ["3", 0], "start_percent": 0, "end_percent": 1, "model": ["2", 0] }, "class_type": "ADE_ApplyAnimateDiffModelSimple" },
  "5": { "inputs": { "pixels": ["1", 0], "vae": ["2", 2] }, "class_type": "VAEEncode" },
  "6": { "inputs": { "text": prompt || "smooth natural motion, high quality animation", "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
  "7": { "inputs": { "text": "ugly, blurry, static, low quality, watermark", "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
  "8": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 20, "cfg": 7, "sampler_name": "euler", "scheduler": "normal", "denoise": 0.65, "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0] }, "class_type": "KSampler" },
  "9": { "inputs": { "samples": ["8", 0], "vae": ["2", 2] }, "class_type": "VAEDecode" },
  "10": { "inputs": { "frame_rate": 12, "loop_count": 0, "filename_prefix": "animate", "format": "video/webm", "pingpong": false, "save_output": true, "images": ["9", 0] }, "class_type": "VHS_VideoCombine" }
});

// Parse duration from prompt
function parseDuration(prompt) {
  const lower = prompt.toLowerCase();
  const match = lower.match(/(\d+)\s*(second|sec|s)/);
  if (match) {
    const seconds = parseInt(match[1]);
    return Math.min(Math.max(seconds * 24, 24), 97);
  }
  return 49;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, filename, videoType } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt required' });
  }

  try {
    const frames = parseDuration(prompt);
    let workflow;
    let type;

    if (filename) {
      // Image to Video with AnimateDiff
      workflow = buildAnimateDiffWorkflow(filename, prompt, Math.min(frames, 24));
      type = 'image_to_video';
    } else {
      // Text to Video with Hunyuan
      workflow = buildHunyuanWorkflow(prompt, Math.min(frames, 49));
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
        ? `Animating your image with AnimateDiff...` 
        : `Creating ${Math.round(frames/24)}s video with Hunyuan...`,
    });

  } catch (error) {
    console.error('Video error:', error);
    return res.status(500).json({ error: error.message });
  }
}
