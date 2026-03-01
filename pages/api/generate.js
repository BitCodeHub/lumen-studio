const COMFYUI_URL = process.env.COMFYUI_URL || 'http://localhost:8188';
const AUTH = Buffer.from(process.env.COMFYUI_AUTH || 'lumen:studio2026').toString('base64');

// Photography category detection (order matters - most specific first)
function detectCategory(prompt) {
  const lower = prompt.toLowerCase();
  
  // Portrait/People photography (check FIRST - people are primary subject)
  const portraitKeywords = ['portrait', 'person', 'woman', 'man', 'girl', 'boy', 
    'fashion', 'model', 'face', 'human', 'people', 'headshot', 'influencer',
    'selfie', 'couple', 'family', 'child', 'baby', 'elderly', 'bride', 'groom',
    'wedding', 'dress', 'suit', 'businessman', 'businesswoman', 'athlete',
    'dancer', 'musician', 'actor', 'actress', 'celebrity'];
  if (portraitKeywords.some(k => lower.includes(k))) return 'portrait';
  
  // Car/Vehicle photography (check before product - cars are specific)
  const carKeywords = ['car', 'vehicle', 'automobile', 'sports car', 'luxury car',
    'motorcycle', 'bike', 'truck', 'suv', 'sedan', 'coupe', 'ferrari', 'porsche',
    'lamborghini', 'bmw', 'mercedes', 'tesla', 'audi', 'lexus', 'driving'];
  if (carKeywords.some(k => lower.includes(k))) return 'car';
  
  // Food photography
  const foodKeywords = ['food', 'dish', 'meal', 'bowl', 'plate', 'pho', 'ramen', 
    'sushi', 'pasta', 'pizza', 'burger', 'steak', 'salad', 'soup', 'noodle',
    'bun bo', 'banh mi', 'cuisine', 'restaurant', 'cooking', 'recipe', 'delicious',
    'dessert', 'cake', 'coffee', 'drink', 'cocktail', 'wine', 'breakfast', 
    'lunch', 'dinner', 'appetizer', 'entree'];
  if (foodKeywords.some(k => lower.includes(k))) return 'food';
  
  // Product photography
  const productKeywords = ['product', 'bottle', 'package', 'box', 'shoe', 'watch',
    'jewelry', 'perfume', 'cosmetic', 'makeup', 'handbag', 'electronics', 'phone',
    'headphones', 'sneaker', 'apparel', 'accessory', 'gadget', 'device'];
  if (productKeywords.some(k => lower.includes(k))) return 'product';
  
  // Landscape/Nature photography
  const landscapeKeywords = ['landscape', 'mountain', 'ocean', 'beach', 'forest',
    'sunset', 'sunrise', 'nature', 'sky', 'clouds', 'river', 'lake', 'waterfall',
    'desert', 'valley', 'field', 'garden', 'park', 'outdoor'];
  if (landscapeKeywords.some(k => lower.includes(k))) return 'landscape';
  
  // Architecture/Interior photography
  const archKeywords = ['architecture', 'building', 'interior', 'room', 'house',
    'apartment', 'office', 'kitchen', 'bathroom', 'bedroom', 'living room',
    'modern', 'minimalist', 'luxury home', 'real estate', 'hotel', 'lobby'];
  if (archKeywords.some(k => lower.includes(k))) return 'architecture';
  
  // Default to general photography
  return 'general';
}

// Universal photorealistic negative prompt
const PHOTO_NEGATIVE = `ugly, blurry, low quality, deformed, disfigured, bad anatomy, bad proportions, watermark, text, signature, jpeg artifacts, poorly drawn, cartoon, anime, illustration, painting, drawing, cgi, 3d render, artificial, fake, plastic, oversaturated, amateur, grainy, noisy`;

// Portrait/People workflow (Juggernaut XL - best for humans)
function buildPortraitWorkflow(prompt) {
  const enhanced = `${prompt}, masterpiece, ultra high resolution, photorealistic, RAW photo, 8k uhd, shot on Sony A7R IV, 85mm f/1.4 GM lens, professional photography, cinematic lighting, shallow depth of field, natural skin texture, detailed skin pores, catch lights in eyes, studio quality, sharp focus, professional retouching`;
  
  return {
    "1": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "2": { "inputs": { "width": 1024, "height": 1344, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "3": { "inputs": { "text": enhanced, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "4": { "inputs": { "text": PHOTO_NEGATIVE + ", bad hands, bad fingers, extra fingers, missing fingers, extra limbs, mutation", "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 40, "cfg": 6, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["2", 0] }, "class_type": "KSampler" },
    "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
    "7": { "inputs": { "filename_prefix": "portrait", "images": ["6", 0] }, "class_type": "SaveImage" }
  };
}

// Food Photography workflow
function buildFoodWorkflow(prompt) {
  const enhanced = `${prompt}, professional food photography, shot on Canon EOS R5, 100mm macro lens, f/2.8 aperture, natural window lighting, soft diffused shadows, steam rising naturally, shallow depth of field, food magazine cover quality, michelin star presentation, appetizing, mouth-watering, high-end restaurant styling, RAW photo, 8k uhd, photorealistic, natural colors, realistic textures, editorial quality`;
  
  return {
    "1": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "2": { "inputs": { "width": 1024, "height": 1024, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "3": { "inputs": { "text": enhanced, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "4": { "inputs": { "text": PHOTO_NEGATIVE + ", unappetizing, raw meat, rotten, spoiled, artificial colors, neon lighting", "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 35, "cfg": 5, "sampler_name": "dpmpp_2m", "scheduler": "karras", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["2", 0] }, "class_type": "KSampler" },
    "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
    "7": { "inputs": { "filename_prefix": "food", "images": ["6", 0] }, "class_type": "SaveImage" }
  };
}

// Product Photography workflow
function buildProductWorkflow(prompt) {
  const enhanced = `${prompt}, professional product photography, shot on Phase One IQ4, 120mm macro lens, f/8 aperture, studio lighting setup, softbox lighting, clean white background, commercial advertising quality, sharp focus throughout, product catalog style, RAW photo, 8k uhd, photorealistic, perfect reflections, luxury presentation, high-end advertising`;
  
  return {
    "1": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "2": { "inputs": { "width": 1024, "height": 1024, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "3": { "inputs": { "text": enhanced, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "4": { "inputs": { "text": PHOTO_NEGATIVE + ", dirty, damaged, scratched, fingerprints, dust", "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 35, "cfg": 6, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["2", 0] }, "class_type": "KSampler" },
    "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
    "7": { "inputs": { "filename_prefix": "product", "images": ["6", 0] }, "class_type": "SaveImage" }
  };
}

// Landscape Photography workflow
function buildLandscapeWorkflow(prompt) {
  const enhanced = `${prompt}, professional landscape photography, shot on Nikon Z9, 24-70mm f/2.8 lens, golden hour lighting, dramatic sky, National Geographic quality, ultra wide dynamic range, RAW photo, 8k uhd, photorealistic, stunning composition, rule of thirds, leading lines, epic vista, award-winning nature photography`;
  
  return {
    "1": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "2": { "inputs": { "width": 1344, "height": 768, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "3": { "inputs": { "text": enhanced, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "4": { "inputs": { "text": PHOTO_NEGATIVE + ", flat lighting, boring composition, hdr overprocessed", "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 35, "cfg": 6, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["2", 0] }, "class_type": "KSampler" },
    "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
    "7": { "inputs": { "filename_prefix": "landscape", "images": ["6", 0] }, "class_type": "SaveImage" }
  };
}

// Architecture/Interior Photography workflow
function buildArchitectureWorkflow(prompt) {
  const enhanced = `${prompt}, professional architectural photography, shot on Canon 5DS R, 24mm tilt-shift lens, perfectly straight verticals, interior design magazine quality, natural daylight through windows, ambient lighting, clean modern aesthetic, RAW photo, 8k uhd, photorealistic, Architectural Digest style, luxury real estate photography`;
  
  return {
    "1": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "2": { "inputs": { "width": 1344, "height": 896, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "3": { "inputs": { "text": enhanced, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "4": { "inputs": { "text": PHOTO_NEGATIVE + ", tilted, crooked, distorted perspective, cluttered, messy", "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 35, "cfg": 6, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["2", 0] }, "class_type": "KSampler" },
    "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
    "7": { "inputs": { "filename_prefix": "architecture", "images": ["6", 0] }, "class_type": "SaveImage" }
  };
}

// Car/Automotive Photography workflow
function buildCarWorkflow(prompt) {
  const enhanced = `${prompt}, professional automotive photography, shot on Hasselblad H6D, dramatic studio lighting, reflections on bodywork, showroom quality, car magazine cover, RAW photo, 8k uhd, photorealistic, perfect paint finish, dynamic angle, motion blur background optional, luxury automotive advertising`;
  
  return {
    "1": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "2": { "inputs": { "width": 1344, "height": 896, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "3": { "inputs": { "text": enhanced, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "4": { "inputs": { "text": PHOTO_NEGATIVE + ", damaged, dented, scratched, dirty, cheap car", "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 35, "cfg": 6, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["2", 0] }, "class_type": "KSampler" },
    "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
    "7": { "inputs": { "filename_prefix": "car", "images": ["6", 0] }, "class_type": "SaveImage" }
  };
}

// General Photography workflow (high quality default)
function buildGeneralWorkflow(prompt) {
  const enhanced = `${prompt}, professional photography, shot on high-end DSLR camera, perfect lighting, RAW photo, 8k uhd, photorealistic, sharp focus, high dynamic range, magazine quality, award-winning photography, natural colors, realistic textures`;
  
  return {
    "1": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "2": { "inputs": { "width": 1024, "height": 1024, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "3": { "inputs": { "text": enhanced, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "4": { "inputs": { "text": PHOTO_NEGATIVE, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 35, "cfg": 6, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["2", 0] }, "class_type": "KSampler" },
    "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
    "7": { "inputs": { "filename_prefix": "photo", "images": ["6", 0] }, "class_type": "SaveImage" }
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
    let category;

    // Manual model override
    if (model) {
      switch(model) {
        case 'portrait':
        case 'person':
          workflow = buildPortraitWorkflow(prompt);
          selectedModel = 'Juggernaut XL (Portrait)';
          break;
        case 'food':
          workflow = buildFoodWorkflow(prompt);
          selectedModel = 'Juggernaut XL (Food)';
          break;
        case 'product':
          workflow = buildProductWorkflow(prompt);
          selectedModel = 'Juggernaut XL (Product)';
          break;
        case 'landscape':
        case 'nature':
          workflow = buildLandscapeWorkflow(prompt);
          selectedModel = 'Juggernaut XL (Landscape)';
          break;
        case 'architecture':
        case 'interior':
          workflow = buildArchitectureWorkflow(prompt);
          selectedModel = 'Juggernaut XL (Architecture)';
          break;
        case 'car':
        case 'automotive':
          workflow = buildCarWorkflow(prompt);
          selectedModel = 'Juggernaut XL (Automotive)';
          break;
        default:
          workflow = buildGeneralWorkflow(prompt);
          selectedModel = 'Juggernaut XL (Photo)';
      }
    } else {
      // Auto-detect category from prompt
      category = detectCategory(prompt);
      
      switch(category) {
        case 'portrait':
          workflow = buildPortraitWorkflow(prompt);
          selectedModel = 'Juggernaut XL (Portrait)';
          break;
        case 'food':
          workflow = buildFoodWorkflow(prompt);
          selectedModel = 'Juggernaut XL (Food)';
          break;
        case 'product':
          workflow = buildProductWorkflow(prompt);
          selectedModel = 'Juggernaut XL (Product)';
          break;
        case 'landscape':
          workflow = buildLandscapeWorkflow(prompt);
          selectedModel = 'Juggernaut XL (Landscape)';
          break;
        case 'architecture':
          workflow = buildArchitectureWorkflow(prompt);
          selectedModel = 'Juggernaut XL (Architecture)';
          break;
        case 'car':
          workflow = buildCarWorkflow(prompt);
          selectedModel = 'Juggernaut XL (Automotive)';
          break;
        default:
          workflow = buildGeneralWorkflow(prompt);
          selectedModel = 'Juggernaut XL (Photo)';
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
      category: category || 'manual',
      message: `Creating photorealistic image with ${selectedModel}...`
    });

  } catch (error) {
    console.error('Generation error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Unable to generate image. Please try again.'
    });
  }
}
