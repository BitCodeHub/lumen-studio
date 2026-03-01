const COMFYUI_URL = process.env.COMFYUI_URL || 'http://localhost:8188';
const AUTH = Buffer.from(process.env.COMFYUI_AUTH || 'lumen:studio2026').toString('base64');

// Detect if prompt needs photorealistic treatment
function isPhotorealistic(prompt) {
  const keywords = ['photo', 'portrait', 'person', 'woman', 'man', 'girl', 'boy', 
    'fashion', 'model', 'realistic', 'photography', 'cinematic', 'face', 
    'human', 'people', 'professional', 'studio', 'headshot', 'influencer'];
  const lower = prompt.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

// Detect food photography
function isFoodPhoto(prompt) {
  const keywords = ['food', 'dish', 'meal', 'bowl', 'plate', 'pho', 'ramen', 
    'sushi', 'pasta', 'pizza', 'burger', 'steak', 'salad', 'soup', 'noodle',
    'bun bo', 'banh mi', 'cuisine', 'restaurant', 'cooking', 'recipe', 'delicious'];
  const lower = prompt.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

// Juggernaut XL workflow for photorealistic images (OpenAI quality)
function buildPhotorealisticWorkflow(prompt) {
  const enhancedPrompt = `${prompt}, masterpiece, ultra high resolution, photorealistic, RAW photo, 8k uhd, dslr, professional photography, cinematic lighting, 85mm lens, shallow depth of field, natural skin texture, detailed skin pores, studio lighting, sharp focus`;
  const negativePrompt = `ugly, blurry, low quality, deformed, disfigured, bad anatomy, bad hands, bad fingers, extra fingers, missing fingers, extra limbs, mutation, watermark, text, signature, jpeg artifacts, poorly drawn, cartoon, anime, illustration, painting, drawing, cgi, 3d render`;
  
  return {
    "1": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "2": { "inputs": { "width": 1024, "height": 1344, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "3": { "inputs": { "text": enhancedPrompt, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "4": { "inputs": { "text": negativePrompt, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { 
      "seed": Math.floor(Math.random() * 1e9), 
      "steps": 35, 
      "cfg": 7, 
      "sampler_name": "dpmpp_2m_sde", 
      "scheduler": "karras", 
      "denoise": 1, 
      "model": ["1", 0], 
      "positive": ["3", 0], 
      "negative": ["4", 0], 
      "latent_image": ["2", 0] 
    }, "class_type": "KSampler" },
    "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
    "7": { "inputs": { "filename_prefix": "photo", "images": ["6", 0] }, "class_type": "SaveImage" }
  };
}

// FLUX.1-dev workflow for general high-quality images
function buildFLUXWorkflow(prompt) {
  const enhancedPrompt = `${prompt}, highly detailed, professional quality, sharp focus, 8k`;
  
  return {
    "1": { "inputs": { "ckpt_name": "flux1-dev.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "2": { "inputs": { "width": 1024, "height": 1024, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "3": { "inputs": { "text": enhancedPrompt, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "4": { "inputs": { "text": "ugly, blurry, low quality, deformed, watermark", "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { 
      "seed": Math.floor(Math.random() * 1e9), 
      "steps": 28, 
      "cfg": 3.5, 
      "sampler_name": "euler", 
      "scheduler": "simple", 
      "denoise": 1, 
      "model": ["1", 0], 
      "positive": ["3", 0], 
      "negative": ["4", 0], 
      "latent_image": ["2", 0] 
    }, "class_type": "KSampler" },
    "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
    "7": { "inputs": { "filename_prefix": "flux", "images": ["6", 0] }, "class_type": "SaveImage" }
  };
}

// Food Photography workflow - photorealistic restaurant quality
function buildFoodWorkflow(prompt) {
  const enhancedPrompt = `${prompt}, professional food photography, shot on Canon EOS R5, 100mm macro lens, f/2.8 aperture, natural window lighting, soft shadows, steam rising, wooden table background, shallow depth of field, food magazine cover quality, michelin star presentation, appetizing, mouth-watering, high-end restaurant, RAW photo, 8k uhd, photorealistic, natural colors, realistic textures`;
  const negativePrompt = `artificial, plastic, fake, oversaturated, neon colors, cartoon, illustration, drawing, painting, cgi, 3d render, blurry, grainy, low quality, watermark, text, ugly, deformed, unrealistic lighting, flat lighting, harsh shadows, amateur`;
  
  return {
    "1": { "inputs": { "ckpt_name": "flux1-dev.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "2": { "inputs": { "width": 1024, "height": 1024, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "3": { "inputs": { "text": enhancedPrompt, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "4": { "inputs": { "text": negativePrompt, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { 
      "seed": Math.floor(Math.random() * 1e9), 
      "steps": 30, 
      "cfg": 4, 
      "sampler_name": "dpmpp_2m", 
      "scheduler": "karras", 
      "denoise": 1, 
      "model": ["1", 0], 
      "positive": ["3", 0], 
      "negative": ["4", 0], 
      "latent_image": ["2", 0] 
    }, "class_type": "KSampler" },
    "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
    "7": { "inputs": { "filename_prefix": "food", "images": ["6", 0] }, "class_type": "SaveImage" }
  };
}

// SDXL workflow for fast general images
function buildSDXLWorkflow(prompt) {
  return {
    "1": { "inputs": { "ckpt_name": "sd_xl_base_1.0.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "2": { "inputs": { "width": 1024, "height": 1024, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "3": { "inputs": { "text": prompt + ", high quality, detailed", "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "4": { "inputs": { "text": "ugly, blurry, low quality, deformed", "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { 
      "seed": Math.floor(Math.random() * 1e9), 
      "steps": 25, 
      "cfg": 7, 
      "sampler_name": "euler", 
      "scheduler": "normal", 
      "denoise": 1, 
      "model": ["1", 0], 
      "positive": ["3", 0], 
      "negative": ["4", 0], 
      "latent_image": ["2", 0] 
    }, "class_type": "KSampler" },
    "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
    "7": { "inputs": { "filename_prefix": "sdxl", "images": ["6", 0] }, "class_type": "SaveImage" }
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, model } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt required' });
  }

  try {
    let workflow;
    let selectedModel;

    // Model selection logic
    if (model === 'juggernaut' || model === 'photo' || model === 'photorealistic') {
      workflow = buildPhotorealisticWorkflow(prompt);
      selectedModel = 'Juggernaut XL v9';
    } else if (model === 'food') {
      workflow = buildFoodWorkflow(prompt);
      selectedModel = 'FLUX.1-dev (Food Photography)';
    } else if (model === 'flux' || model === 'flux-dev') {
      workflow = buildFLUXWorkflow(prompt);
      selectedModel = 'FLUX.1-dev';
    } else if (model === 'sdxl' || model === 'fast') {
      workflow = buildSDXLWorkflow(prompt);
      selectedModel = 'SDXL Base';
    } else {
      // Auto-detect based on prompt content
      if (isFoodPhoto(prompt)) {
        workflow = buildFoodWorkflow(prompt);
        selectedModel = 'FLUX.1-dev (Food Photography)';
      } else if (isPhotorealistic(prompt)) {
        workflow = buildPhotorealisticWorkflow(prompt);
        selectedModel = 'Juggernaut XL v9';
      } else {
        workflow = buildFLUXWorkflow(prompt);
        selectedModel = 'FLUX.1-dev';
      }
    }
    
    const response = await fetch(COMFYUI_URL + '/prompt', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + AUTH
      },
      body: JSON.stringify({ prompt: workflow })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error('ComfyUI error: ' + response.status + ' - ' + text);
    }

    const data = await response.json();
    
    return res.status(200).json({
      status: 'generating',
      prompt_id: data.prompt_id,
      model: selectedModel,
      message: `Creating your image with ${selectedModel}...`
    });

  } catch (error) {
    console.error('Generation error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Unable to generate image. Please try again.'
    });
  }
}
