// Image editing endpoint - various workflows
const COMFYUI_URL = process.env.COMFYUI_URL || 'http://localhost:8188';
const AUTH = Buffer.from(process.env.COMFYUI_AUTH || 'lumen:studio2026').toString('base64');

// Workflow builders for different operations
const WORKFLOWS = {
  // Image-to-image with prompt
  img2img: (filename, prompt, strength = 0.7) => ({
    "1": { "inputs": { "image": filename, "upload": "image" }, "class_type": "LoadImage" },
    "2": { "inputs": { "ckpt_name": "sd_xl_base_1.0.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "3": { "inputs": { "pixels": ["1", 0], "vae": ["2", 2] }, "class_type": "VAEEncode" },
    "4": { "inputs": { "text": prompt, "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "text": "ugly, blurry, low quality", "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
    "6": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 25, "cfg": 7, "sampler_name": "euler", "scheduler": "normal", "denoise": strength, "model": ["2", 0], "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["3", 0] }, "class_type": "KSampler" },
    "7": { "inputs": { "samples": ["6", 0], "vae": ["2", 2] }, "class_type": "VAEDecode" },
    "8": { "inputs": { "filename_prefix": "edit", "images": ["7", 0] }, "class_type": "SaveImage" }
  }),

  // Upscale 4x
  upscale: (filename) => ({
    "1": { "inputs": { "image": filename, "upload": "image" }, "class_type": "LoadImage" },
    "2": { "inputs": { "model_name": "4x-UltraSharp.pth" }, "class_type": "UpscaleModelLoader" },
    "3": { "inputs": { "upscale_model": ["2", 0], "image": ["1", 0] }, "class_type": "ImageUpscaleWithModel" },
    "4": { "inputs": { "filename_prefix": "upscale", "images": ["3", 0] }, "class_type": "SaveImage" }
  }),

  // Face restoration
  face_restore: (filename) => ({
    "1": { "inputs": { "image": filename, "upload": "image" }, "class_type": "LoadImage" },
    "2": { "inputs": { "model_name": "GFPGANv1.4.pth", "image": ["1", 0] }, "class_type": "FaceRestoreWithModel" },
    "3": { "inputs": { "filename_prefix": "face_restore", "images": ["2", 0] }, "class_type": "SaveImage" }
  }),

  // Style transfer with IP-Adapter
  style_transfer: (filename, prompt) => ({
    "1": { "inputs": { "image": filename, "upload": "image" }, "class_type": "LoadImage" },
    "2": { "inputs": { "ckpt_name": "sd_xl_base_1.0.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "3": { "inputs": { "ipadapter_file": "ip-adapter_sdxl.safetensors" }, "class_type": "IPAdapterModelLoader" },
    "4": { "inputs": { "clip_name": "CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors" }, "class_type": "CLIPVisionLoader" },
    "5": { "inputs": { "model": ["2", 0], "ipadapter": ["3", 0], "image": ["1", 0], "clip_vision": ["4", 0], "weight": 0.8, "start_at": 0, "end_at": 1 }, "class_type": "IPAdapterApply" },
    "6": { "inputs": { "text": prompt || "artistic style transfer", "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
    "7": { "inputs": { "text": "ugly, blurry", "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
    "8": { "inputs": { "width": 1024, "height": 1024, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "9": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 25, "cfg": 7, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["5", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["8", 0] }, "class_type": "KSampler" },
    "10": { "inputs": { "samples": ["9", 0], "vae": ["2", 2] }, "class_type": "VAEDecode" },
    "11": { "inputs": { "filename_prefix": "style", "images": ["10", 0] }, "class_type": "SaveImage" }
  }),
};

// Detect operation from prompt
function detectOperation(prompt) {
  const lower = prompt.toLowerCase();
  if (lower.includes('upscale') || lower.includes('4k') || lower.includes('hd') || lower.includes('enhance resolution')) {
    return 'upscale';
  }
  if (lower.includes('face') && (lower.includes('restore') || lower.includes('enhance') || lower.includes('fix'))) {
    return 'face_restore';
  }
  if (lower.includes('style') || lower.includes('like') || lower.includes('in the style')) {
    return 'style_transfer';
  }
  return 'img2img';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename, prompt, operation } = req.body;

  if (!filename) {
    return res.status(400).json({ error: 'filename required' });
  }

  try {
    const op = operation || detectOperation(prompt || '');
    let workflow;

    switch (op) {
      case 'upscale':
        workflow = WORKFLOWS.upscale(filename);
        break;
      case 'face_restore':
        workflow = WORKFLOWS.face_restore(filename);
        break;
      case 'style_transfer':
        workflow = WORKFLOWS.style_transfer(filename, prompt);
        break;
      default:
        workflow = WORKFLOWS.img2img(filename, prompt || 'enhance this image', 0.5);
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
      throw new Error('ComfyUI error: ' + response.status);
    }

    const data = await response.json();
    
    return res.status(200).json({
      status: 'generating',
      prompt_id: data.prompt_id,
      operation: op,
      message: 'Processing your ' + op + '...',
    });

  } catch (error) {
    console.error('Edit error:', error);
    return res.status(500).json({ error: error.message });
  }
}
