// Video generation endpoint - Text to Video using Hunyuan
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

// Parse duration from prompt
function parseDuration(prompt) {
  const lower = prompt.toLowerCase();
  const match = lower.match(/(\d+)\s*(second|sec|s)/);
  if (match) {
    const seconds = parseInt(match[1]);
    return Math.min(Math.max(seconds * 24, 24), 97); // 24fps, max ~4 sec
  }
  return 49; // Default ~2 seconds
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
    
    // If user uploaded an image, enhance the prompt with that context
    // (Image-to-video requires AnimateDiff which isn't installed)
    let enhancedPrompt = prompt;
    if (filename) {
      // For now, we'll use the prompt description to generate a matching video
      // TODO: Install AnimateDiff custom nodes for true image-to-video
      enhancedPrompt = prompt + ", matching the uploaded reference image style";
    }
    
    const workflow = buildHunyuanWorkflow(enhancedPrompt, frames);

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
      frames: frames,
      message: `Creating ${Math.round(frames/24)}s video...`,
      note: filename 
        ? 'Using your description to create a video (true image-to-video requires additional setup)'
        : 'Video generation takes 1-3 minutes'
    });

  } catch (error) {
    console.error('Video error:', error);
    return res.status(500).json({ error: error.message });
  }
}
