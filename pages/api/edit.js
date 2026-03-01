// Image editing endpoint - various workflows
const COMFYUI_URL = process.env.COMFYUI_URL || 'http://localhost:8188';
const AUTH = Buffer.from(process.env.COMFYUI_AUTH || 'lumen:studio2026').toString('base64');

// Workflow builders for different operations
const WORKFLOWS = {
  // Add element to image (low denoise to preserve original)
  add_element: (filename, prompt) => ({
    "1": { "inputs": { "image": filename, "upload": "image" }, "class_type": "LoadImage" },
    "2": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "3": { "inputs": { "pixels": ["1", 0], "vae": ["2", 2] }, "class_type": "VAEEncode" },
    "4": { "inputs": { "text": `${prompt}, seamlessly integrated, matching lighting and style, photorealistic, natural placement, same scene`, "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "text": "ugly, blurry, low quality, mismatched lighting, floating, unnatural, out of place, different style", "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
    "6": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 30, "cfg": 5, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 0.35, "model": ["2", 0], "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["3", 0] }, "class_type": "KSampler" },
    "7": { "inputs": { "samples": ["6", 0], "vae": ["2", 2] }, "class_type": "VAEDecode" },
    "8": { "inputs": { "filename_prefix": "edit_add", "images": ["7", 0] }, "class_type": "SaveImage" }
  }),

  // Transform/modify existing elements (medium denoise)
  transform: (filename, prompt) => ({
    "1": { "inputs": { "image": filename, "upload": "image" }, "class_type": "LoadImage" },
    "2": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "3": { "inputs": { "pixels": ["1", 0], "vae": ["2", 2] }, "class_type": "VAEEncode" },
    "4": { "inputs": { "text": `${prompt}, photorealistic, same scene, matching style`, "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "text": "ugly, blurry, low quality, cartoon, illustration", "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
    "6": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 30, "cfg": 6, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 0.55, "model": ["2", 0], "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["3", 0] }, "class_type": "KSampler" },
    "7": { "inputs": { "samples": ["6", 0], "vae": ["2", 2] }, "class_type": "VAEDecode" },
    "8": { "inputs": { "filename_prefix": "edit_transform", "images": ["7", 0] }, "class_type": "SaveImage" }
  }),

  // Standard img2img with prompt
  img2img: (filename, prompt, strength = 0.5) => ({
    "1": { "inputs": { "image": filename, "upload": "image" }, "class_type": "LoadImage" },
    "2": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "3": { "inputs": { "pixels": ["1", 0], "vae": ["2", 2] }, "class_type": "VAEEncode" },
    "4": { "inputs": { "text": prompt + ", photorealistic, high quality", "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "text": "ugly, blurry, low quality, deformed", "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
    "6": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 30, "cfg": 6, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": strength, "model": ["2", 0], "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["3", 0] }, "class_type": "KSampler" },
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
    "2": { "inputs": { "model_name": "GFPGANv1.4.pth" }, "class_type": "FaceRestoreModelLoader" },
    "3": { "inputs": { "facerestore_model": ["2", 0], "image": ["1", 0], "fidelity": 0.7 }, "class_type": "FaceRestoreCFWithModel" },
    "4": { "inputs": { "filename_prefix": "face_restore", "images": ["3", 0] }, "class_type": "SaveImage" }
  }),

  // Style transfer with IP-Adapter
  style_transfer: (filename, prompt) => ({
    "1": { "inputs": { "image": filename, "upload": "image" }, "class_type": "LoadImage" },
    "2": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "3": { "inputs": { "ipadapter_file": "ip-adapter-plus_sdxl_vit-h.safetensors" }, "class_type": "IPAdapterModelLoader" },
    "4": { "inputs": { "clip_name": "CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors" }, "class_type": "CLIPVisionLoader" },
    "5": { "inputs": { "model": ["2", 0], "ipadapter": ["3", 0], "image": ["1", 0], "clip_vision": ["4", 0], "weight": 0.8, "start_at": 0, "end_at": 1 }, "class_type": "IPAdapterApply" },
    "6": { "inputs": { "text": prompt || "artistic style transfer, same composition", "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
    "7": { "inputs": { "text": "ugly, blurry, different composition", "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
    "8": { "inputs": { "width": 1024, "height": 1024, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "9": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 30, "cfg": 6, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 1, "model": ["5", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["8", 0] }, "class_type": "KSampler" },
    "10": { "inputs": { "samples": ["9", 0], "vae": ["2", 2] }, "class_type": "VAEDecode" },
    "11": { "inputs": { "filename_prefix": "style", "images": ["10", 0] }, "class_type": "SaveImage" }
  }),

  // Remove background
  remove_bg: (filename) => ({
    "1": { "inputs": { "image": filename, "upload": "image" }, "class_type": "LoadImage" },
    "2": { "inputs": { "model_name": "u2net.onnx" }, "class_type": "RemBGSession" },
    "3": { "inputs": { "rmbg_session": ["2", 0], "image": ["1", 0] }, "class_type": "ImageRemoveBackground" },
    "4": { "inputs": { "filename_prefix": "nobg", "images": ["3", 0] }, "class_type": "SaveImage" }
  }),
};

// Detect operation from prompt
function detectOperation(prompt) {
  const lower = prompt.toLowerCase();
  
  // Add/insert operations (need low denoise)
  if (lower.includes('add ') || lower.includes('put ') || lower.includes('place ') || 
      lower.includes('insert ') || lower.includes('include ') || lower.includes('with ')) {
    return 'add_element';
  }
  
  // Transform/change operations (medium denoise)
  if (lower.includes('change ') || lower.includes('make ') || lower.includes('turn ') ||
      lower.includes('convert ') || lower.includes('transform ')) {
    return 'transform';
  }
  
  // Upscale
  if (lower.includes('upscale') || lower.includes('4k') || lower.includes('hd') || 
      lower.includes('enhance resolution') || lower.includes('higher resolution')) {
    return 'upscale';
  }
  
  // Face restore
  if (lower.includes('face') && (lower.includes('restore') || lower.includes('enhance') || lower.includes('fix'))) {
    return 'face_restore';
  }
  
  // Style transfer
  if (lower.includes('style') || lower.includes('in the style') || lower.includes('like a')) {
    return 'style_transfer';
  }
  
  // Remove background
  if (lower.includes('remove background') || lower.includes('no background') || 
      lower.includes('transparent') || lower.includes('cut out')) {
    return 'remove_bg';
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
    let description;

    switch (op) {
      case 'add_element':
        workflow = WORKFLOWS.add_element(filename, prompt);
        description = 'Adding element to image (preserving original)';
        break;
      case 'transform':
        workflow = WORKFLOWS.transform(filename, prompt);
        description = 'Transforming image';
        break;
      case 'upscale':
        workflow = WORKFLOWS.upscale(filename);
        description = 'Upscaling to 4K';
        break;
      case 'face_restore':
        workflow = WORKFLOWS.face_restore(filename);
        description = 'Restoring face details';
        break;
      case 'style_transfer':
        workflow = WORKFLOWS.style_transfer(filename, prompt);
        description = 'Applying style transfer';
        break;
      case 'remove_bg':
        workflow = WORKFLOWS.remove_bg(filename);
        description = 'Removing background';
        break;
      default:
        workflow = WORKFLOWS.img2img(filename, prompt || 'enhance this image', 0.45);
        description = 'Processing image';
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
      operation: op,
      message: description + '...',
    });

  } catch (error) {
    console.error('Edit error:', error);
    return res.status(500).json({ error: error.message });
  }
}
