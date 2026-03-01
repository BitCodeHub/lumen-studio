import https from 'https';
import http from 'http';

const COMFYUI_URL = process.env.COMFYUI_URL || 'http://100.79.93.27:8188';

// Simple text-to-image workflow for FLUX
function buildWorkflow(prompt) {
  return {
    "3": {
      "inputs": {
        "seed": Math.floor(Math.random() * 1000000000),
        "steps": 20,
        "cfg": 7,
        "sampler_name": "euler",
        "scheduler": "normal",
        "denoise": 1,
        "model": ["4", 0],
        "positive": ["6", 0],
        "negative": ["7", 0],
        "latent_image": ["5", 0]
      },
      "class_type": "KSampler"
    },
    "4": {
      "inputs": { "ckpt_name": "flux1-dev.safetensors" },
      "class_type": "CheckpointLoaderSimple"
    },
    "5": {
      "inputs": { "width": 1024, "height": 1024, "batch_size": 1 },
      "class_type": "EmptyLatentImage"
    },
    "6": {
      "inputs": { "text": prompt, "clip": ["4", 1] },
      "class_type": "CLIPTextEncode"
    },
    "7": {
      "inputs": { "text": "ugly, blurry, low quality", "clip": ["4", 1] },
      "class_type": "CLIPTextEncode"
    },
    "8": {
      "inputs": { "samples": ["3", 0], "vae": ["4", 2] },
      "class_type": "VAEDecode"
    },
    "9": {
      "inputs": { "filename_prefix": "lumen_studio", "images": ["8", 0] },
      "class_type": "SaveImage"
    }
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt required' });
  }

  try {
    // Queue the workflow on ComfyUI
    const workflow = buildWorkflow(prompt);
    
    const response = await fetch(`${COMFYUI_URL}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow })
    });

    if (!response.ok) {
      throw new Error(`ComfyUI returned ${response.status}`);
    }

    const data = await response.json();
    
    return res.status(200).json({
      status: 'queued',
      prompt_id: data.prompt_id,
      message: `Generating: "${prompt}"`,
      note: 'Check ComfyUI at http://100.79.93.27:8188 for results'
    });

  } catch (error) {
    console.error('ComfyUI error:', error);
    
    // Return helpful message if ComfyUI not reachable
    return res.status(200).json({
      status: 'offline',
      message: `ComfyUI not reachable from Render. Use WhatsApp instead.`,
      prompt: prompt,
      workaround: 'Send to WhatsApp: "Elim, generate: ' + prompt + '"'
    });
  }
}
