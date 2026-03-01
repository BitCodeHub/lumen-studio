const COMFYUI_URL = process.env.COMFYUI_URL || 'http://localhost:8188';
const AUTH = Buffer.from(process.env.COMFYUI_AUTH || 'lumen:studio2026').toString('base64');

// Available LoRAs - only inject if they exist
const AVAILABLE_LORAS = {
  'food': 'food_lora.safetensors',
  'portrait': 'portrait_lora.safetensors',
  'product': 'product_lora.safetensors',
};

// Check if LoRA exists for category
function getLoraForCategory(category) {
  return AVAILABLE_LORAS[category] || null;
}

// Photography category detection (order matters - most specific first)
function detectCategory(prompt) {
  const lower = prompt.toLowerCase();
  
  // Portrait/People photography (check FIRST - people are primary subject)
  const portraitKeywords = ['portrait', 'person', 'woman', 'man', 'girl', 'boy', 
    'fashion', 'model', 'face', 'human', 'people', 'headshot', 'influencer',
    'selfie', 'couple', 'family', 'child', 'baby', 'elderly', 'bride', 'groom',
    'wedding', 'dress', 'suit', 'businessman', 'businesswoman', 'athlete',
    'dancer', 'musician', 'actor', 'actress', 'celebrity', 'asian'];
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

// MAXIMUM PHOTOREALISM - Universal anti-AI negative prompt
const PHOTO_NEGATIVE = `ugly, blurry, low quality, deformed, disfigured, bad anatomy, bad proportions, watermark, text, signature, jpeg artifacts, poorly drawn, cartoon, anime, illustration, painting, drawing, cgi, 3d render, artificial, fake, plastic, oversaturated, amateur, grainy, noisy, AI generated, airbrushed, smooth skin, digital art, unrealistic, overprocessed, HDR, hyper saturated, video game, unnatural colors, synthetic, computer generated, midjourney, dall-e, stable diffusion artifacts`;

// Build workflow with optional LoRA - proper integration from start
function buildWorkflowWithLora(baseWorkflow, loraName, strength = 0.7) {
  if (!loraName) return baseWorkflow;
  
  // Create new workflow with LoRA loader between checkpoint and sampler
  const workflow = {};
  
  // Node 1: Checkpoint loader (same)
  workflow["1"] = baseWorkflow["1"];
  
  // Node 2: LoRA loader (NEW - between checkpoint and everything else)
  workflow["2"] = {
    "inputs": {
      "lora_name": loraName,
      "strength_model": strength,
      "strength_clip": strength,
      "model": ["1", 0],
      "clip": ["1", 1]
    },
    "class_type": "LoraLoader"
  };
  
  // Node 3: Empty latent (was node 2)
  workflow["3"] = baseWorkflow["2"];
  
  // Node 4: Positive prompt - now uses LoRA clip output
  workflow["4"] = {
    ...baseWorkflow["3"],
    "inputs": {
      ...baseWorkflow["3"].inputs,
      "clip": ["2", 1]  // Use LoRA clip output
    }
  };
  
  // Node 5: Negative prompt - now uses LoRA clip output
  workflow["5"] = {
    ...baseWorkflow["4"],
    "inputs": {
      ...baseWorkflow["4"].inputs,
      "clip": ["2", 1]  // Use LoRA clip output
    }
  };
  
  // Node 6: KSampler - uses LoRA model and renumbered nodes
  workflow["6"] = {
    "inputs": {
      ...baseWorkflow["5"].inputs,
      "model": ["2", 0],      // Use LoRA model output
      "positive": ["4", 0],   // Renumbered positive
      "negative": ["5", 0],   // Renumbered negative
      "latent_image": ["3", 0] // Renumbered latent
    },
    "class_type": "KSampler"
  };
  
  // Node 7: VAE Decode
  workflow["7"] = {
    "inputs": {
      "samples": ["6", 0],
      "vae": ["1", 2]  // VAE still from checkpoint
    },
    "class_type": "VAEDecode"
  };
  
  // Node 8: Save Image
  workflow["8"] = {
    "inputs": {
      ...baseWorkflow["7"].inputs,
      "images": ["7", 0]  // Renumbered
    },
    "class_type": "SaveImage"
  };
  
  return workflow;
}

// Portrait/People workflow (Juggernaut XL - best for humans)
function buildPortraitWorkflow(prompt, loraName = null) {
  const enhanced = `${prompt}, masterpiece, ultra high resolution, photorealistic, RAW photo, 8k uhd, shot on Sony A7R IV with 85mm f/1.4 GM lens, professional photography, cinematic lighting, shallow depth of field, natural skin texture with visible pores, imperfect skin with natural blemishes, catch lights in eyes, studio quality, sharp focus, professional color grading, film grain, real photograph taken by professional photographer, Vogue magazine quality, natural makeup, realistic hair strands`;
  
  const base = {
    "1": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "2": { "inputs": { "width": 1024, "height": 1344, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "3": { "inputs": { "text": enhanced, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "4": { "inputs": { "text": PHOTO_NEGATIVE + ", bad hands, bad fingers, extra fingers, missing fingers, extra limbs, mutation, wax figure, mannequin, doll, porcelain skin", "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 45, "cfg": 4.5, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["2", 0] }, "class_type": "KSampler" },
    "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
    "7": { "inputs": { "filename_prefix": "portrait", "images": ["6", 0] }, "class_type": "SaveImage" }
  };
  
  return loraName ? buildWorkflowWithLora(base, loraName) : base;
}

// Food Photography workflow
function buildFoodWorkflow(prompt, loraName = null) {
  const enhanced = `${prompt}, professional food photography, shot on Canon EOS R5 with 100mm macro lens at f/2.8, natural window lighting with soft diffused shadows, steam rising naturally, shallow depth of field, food magazine cover quality, michelin star presentation, appetizing, mouth-watering, high-end restaurant styling, RAW photo, 8k uhd, photorealistic, natural colors, realistic textures, editorial quality, Bon Appetit magazine style, real photograph, natural imperfections in food`;
  
  const base = {
    "1": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "2": { "inputs": { "width": 1024, "height": 1024, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "3": { "inputs": { "text": enhanced, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "4": { "inputs": { "text": PHOTO_NEGATIVE + ", unappetizing, raw meat, rotten, spoiled, artificial colors, neon lighting, stock photo, clip art", "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 45, "cfg": 4, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["2", 0] }, "class_type": "KSampler" },
    "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
    "7": { "inputs": { "filename_prefix": "food", "images": ["6", 0] }, "class_type": "SaveImage" }
  };
  
  return loraName ? buildWorkflowWithLora(base, loraName) : base;
}

// Product Photography workflow
function buildProductWorkflow(prompt, loraName = null) {
  const enhanced = `${prompt}, professional product photography, shot on Phase One IQ4 150MP with 120mm macro lens at f/8, studio lighting setup with softboxes, clean gradient background, commercial advertising quality, sharp focus throughout, product catalog style, RAW photo, 8k uhd, photorealistic, perfect reflections, luxury presentation, high-end advertising, real photograph for e-commerce, natural material textures`;
  
  const base = {
    "1": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "2": { "inputs": { "width": 1024, "height": 1024, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "3": { "inputs": { "text": enhanced, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "4": { "inputs": { "text": PHOTO_NEGATIVE + ", dirty, damaged, scratched, fingerprints, dust, cheap looking, toy", "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 45, "cfg": 4.5, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["2", 0] }, "class_type": "KSampler" },
    "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
    "7": { "inputs": { "filename_prefix": "product", "images": ["6", 0] }, "class_type": "SaveImage" }
  };
  
  return loraName ? buildWorkflowWithLora(base, loraName) : base;
}

// Landscape Photography workflow
function buildLandscapeWorkflow(prompt, loraName = null) {
  const enhanced = `${prompt}, professional landscape photography, shot on Nikon Z9 with 24-70mm f/2.8 lens, golden hour lighting, dramatic sky with natural cloud formations, National Geographic quality, ultra wide dynamic range, RAW photo, 8k uhd, photorealistic, stunning composition using rule of thirds, leading lines, epic vista, award-winning nature photography, real photograph, subtle film grain, natural atmospheric haze`;
  
  const base = {
    "1": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "2": { "inputs": { "width": 1344, "height": 768, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "3": { "inputs": { "text": enhanced, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "4": { "inputs": { "text": PHOTO_NEGATIVE + ", flat lighting, boring composition, overprocessed HDR, neon sky, fantasy landscape", "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 45, "cfg": 4.5, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["2", 0] }, "class_type": "KSampler" },
    "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
    "7": { "inputs": { "filename_prefix": "landscape", "images": ["6", 0] }, "class_type": "SaveImage" }
  };
  
  return loraName ? buildWorkflowWithLora(base, loraName) : base;
}

// Architecture/Interior Photography workflow
function buildArchitectureWorkflow(prompt, loraName = null) {
  const enhanced = `${prompt}, professional architectural photography, shot on Canon 5DS R with 24mm tilt-shift lens, perfectly straight verticals, interior design magazine quality, natural daylight through windows combined with ambient lighting, clean modern aesthetic, RAW photo, 8k uhd, photorealistic, Architectural Digest style, luxury real estate photography, real photograph, natural material textures, realistic reflections`;
  
  const base = {
    "1": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "2": { "inputs": { "width": 1344, "height": 896, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "3": { "inputs": { "text": enhanced, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "4": { "inputs": { "text": PHOTO_NEGATIVE + ", tilted, crooked, distorted perspective, cluttered, messy, fisheye distortion", "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 45, "cfg": 4.5, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["2", 0] }, "class_type": "KSampler" },
    "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
    "7": { "inputs": { "filename_prefix": "architecture", "images": ["6", 0] }, "class_type": "SaveImage" }
  };
  
  return loraName ? buildWorkflowWithLora(base, loraName) : base;
}

// Car/Automotive Photography workflow
function buildCarWorkflow(prompt, loraName = null) {
  const enhanced = `${prompt}, professional automotive photography, shot on Hasselblad H6D-100c with 80mm lens, dramatic studio lighting with perfect reflections on bodywork, showroom quality, car magazine cover, RAW photo, 8k uhd, photorealistic, perfect paint finish with metallic flake visible, dynamic angle, motion blur on wheels if moving, luxury automotive advertising, real photograph of real car, chrome reflections, realistic headlights`;
  
  const base = {
    "1": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "2": { "inputs": { "width": 1344, "height": 896, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "3": { "inputs": { "text": enhanced, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "4": { "inputs": { "text": PHOTO_NEGATIVE + ", damaged, dented, scratched, dirty, cheap car, toy car, model car, hot wheels", "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 45, "cfg": 4.5, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["2", 0] }, "class_type": "KSampler" },
    "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
    "7": { "inputs": { "filename_prefix": "car", "images": ["6", 0] }, "class_type": "SaveImage" }
  };
  
  return loraName ? buildWorkflowWithLora(base, loraName) : base;
}

// General Photography workflow (high quality default)
function buildGeneralWorkflow(prompt, loraName = null) {
  const enhanced = `${prompt}, professional photography, shot on high-end full-frame DSLR camera with premium lens, perfect lighting setup, RAW photo, 8k uhd, photorealistic, tack sharp focus, high dynamic range, magazine quality, award-winning photography, natural colors, realistic textures, subtle film grain, real photograph taken by professional photographer, natural imperfections`;
  
  const base = {
    "1": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "2": { "inputs": { "width": 1024, "height": 1024, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "3": { "inputs": { "text": enhanced, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "4": { "inputs": { "text": PHOTO_NEGATIVE, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 45, "cfg": 4.5, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["2", 0] }, "class_type": "KSampler" },
    "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
    "7": { "inputs": { "filename_prefix": "photo", "images": ["6", 0] }, "class_type": "SaveImage" }
  };
  
  return loraName ? buildWorkflowWithLora(base, loraName) : base;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, model, lora, autoLora = true } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt required' });
  }

  try {
    let workflow;
    let selectedModel;
    let category;
    let appliedLora = null;

    // Auto-detect category from prompt
    category = detectCategory(prompt);
    
    // Get LoRA for this category if auto-apply is enabled and LoRA exists
    const categoryLora = autoLora ? getLoraForCategory(category) : null;
    const loraToUse = lora || categoryLora;

    // Build workflow based on category, with LoRA if available
    switch(category) {
      case 'portrait':
        workflow = buildPortraitWorkflow(prompt, loraToUse);
        selectedModel = 'Juggernaut XL (Portrait)';
        break;
      case 'food':
        workflow = buildFoodWorkflow(prompt, loraToUse);
        selectedModel = 'Juggernaut XL (Food)';
        break;
      case 'product':
        workflow = buildProductWorkflow(prompt, loraToUse);
        selectedModel = 'Juggernaut XL (Product)';
        break;
      case 'landscape':
        workflow = buildLandscapeWorkflow(prompt, loraToUse);
        selectedModel = 'Juggernaut XL (Landscape)';
        break;
      case 'architecture':
        workflow = buildArchitectureWorkflow(prompt, loraToUse);
        selectedModel = 'Juggernaut XL (Architecture)';
        break;
      case 'car':
        workflow = buildCarWorkflow(prompt, loraToUse);
        selectedModel = 'Juggernaut XL (Automotive)';
        break;
      default:
        workflow = buildGeneralWorkflow(prompt, loraToUse);
        selectedModel = 'Juggernaut XL (Photo)';
    }
    
    if (loraToUse) {
      appliedLora = loraToUse;
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
      console.error('ComfyUI error:', text);
      
      // If LoRA failed, retry without it
      if (appliedLora && text.includes('error')) {
        console.log('LoRA failed, retrying without LoRA...');
        
        // Rebuild without LoRA
        switch(category) {
          case 'portrait': workflow = buildPortraitWorkflow(prompt, null); break;
          case 'food': workflow = buildFoodWorkflow(prompt, null); break;
          case 'product': workflow = buildProductWorkflow(prompt, null); break;
          case 'landscape': workflow = buildLandscapeWorkflow(prompt, null); break;
          case 'architecture': workflow = buildArchitectureWorkflow(prompt, null); break;
          case 'car': workflow = buildCarWorkflow(prompt, null); break;
          default: workflow = buildGeneralWorkflow(prompt, null);
        }
        appliedLora = null;
        
        const retryResponse = await fetch(COMFYUI_URL + '/prompt', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + AUTH
          },
          body: JSON.stringify({ prompt: workflow })
        });
        
        if (retryResponse.ok) {
          const data = await retryResponse.json();
          return res.status(200).json({
            status: 'generating',
            prompt_id: data.prompt_id,
            model: selectedModel,
            category: category,
            lora: null,
            message: `Creating photorealistic image with ${selectedModel}...`
          });
        }
      }
      
      throw new Error('ComfyUI error: ' + response.status + ' - ' + text);
    }

    const data = await response.json();
    
    return res.status(200).json({
      status: 'generating',
      prompt_id: data.prompt_id,
      model: selectedModel,
      category: category,
      lora: appliedLora,
      message: `Creating photorealistic image with ${selectedModel}${appliedLora ? ` + ${appliedLora.replace('.safetensors', '')}` : ''}...`
    });

  } catch (error) {
    console.error('Generation error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Unable to generate image. Please try again.'
    });
  }
}
