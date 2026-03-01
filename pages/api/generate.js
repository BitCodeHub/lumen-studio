const COMFYUI_URL = process.env.COMFYUI_URL || 'http://localhost:8188';
const AUTH = Buffer.from(process.env.COMFYUI_AUTH || 'lumen:studio2026').toString('base64');

// Auto-select LoRA based on category
const CATEGORY_LORAS = {
  'food': 'food_lora.safetensors',
  'portrait': 'portrait_lora.safetensors',
  'product': 'product_lora.safetensors',
  'car': 'automotive_lora.safetensors',
  'landscape': 'landscape_lora.safetensors',
  'architecture': 'architecture_lora.safetensors',
  'wedding': 'wedding_lora.safetensors',
  'fashion': 'fashion_lora.safetensors',
};

// Inject LoRA into workflow if available
function injectLora(workflow, loraName, strength = 0.8) {
  if (!loraName) return workflow;
  
  // Find the checkpoint loader node
  let checkpointNodeId = null;
  let modelOutputNode = null;
  
  for (const [nodeId, node] of Object.entries(workflow)) {
    if (node.class_type === 'CheckpointLoaderSimple') {
      checkpointNodeId = nodeId;
      break;
    }
  }
  
  if (!checkpointNodeId) return workflow;
  
  // Find nodes that use the model output from checkpoint
  const modelUsers = [];
  for (const [nodeId, node] of Object.entries(workflow)) {
    if (node.inputs?.model?.[0] === checkpointNodeId && node.inputs?.model?.[1] === 0) {
      modelUsers.push(nodeId);
    }
  }
  
  // Insert LoRA loader between checkpoint and model users
  const loraNodeId = '99'; // Use high ID to avoid conflicts
  workflow[loraNodeId] = {
    inputs: {
      lora_name: loraName,
      strength_model: strength,
      strength_clip: strength,
      model: [checkpointNodeId, 0],
      clip: [checkpointNodeId, 1]
    },
    class_type: 'LoraLoader'
  };
  
  // Update model users to use LoRA output
  for (const nodeId of modelUsers) {
    workflow[nodeId].inputs.model = [loraNodeId, 0];
  }
  
  // Update CLIP users to use LoRA output
  for (const [nodeId, node] of Object.entries(workflow)) {
    if (node.inputs?.clip?.[0] === checkpointNodeId && node.inputs?.clip?.[1] === 1) {
      workflow[nodeId].inputs.clip = [loraNodeId, 1];
    }
  }
  
  return workflow;
}

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

// MAXIMUM PHOTOREALISM - Universal anti-AI negative prompt
const PHOTO_NEGATIVE = `ugly, blurry, low quality, deformed, disfigured, bad anatomy, bad proportions, watermark, text, signature, jpeg artifacts, poorly drawn, cartoon, anime, illustration, painting, drawing, cgi, 3d render, artificial, fake, plastic, oversaturated, amateur, grainy, noisy, AI generated, airbrushed, smooth skin, digital art, unrealistic, overprocessed, HDR, hyper saturated, video game, unnatural colors, synthetic, computer generated, midjourney, dall-e, stable diffusion artifacts`;

// Portrait/People workflow (Juggernaut XL - best for humans)
function buildPortraitWorkflow(prompt) {
  const enhanced = `${prompt}, masterpiece, ultra high resolution, photorealistic, RAW photo, 8k uhd, shot on Sony A7R IV with 85mm f/1.4 GM lens, professional photography, cinematic lighting, shallow depth of field, natural skin texture with visible pores, imperfect skin with natural blemishes, catch lights in eyes, studio quality, sharp focus, professional color grading, film grain, real photograph taken by professional photographer, Vogue magazine quality, natural makeup, realistic hair strands`;
  
  return {
    "1": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "2": { "inputs": { "width": 1024, "height": 1344, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "3": { "inputs": { "text": enhanced, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "4": { "inputs": { "text": PHOTO_NEGATIVE + ", bad hands, bad fingers, extra fingers, missing fingers, extra limbs, mutation, wax figure, mannequin, doll, porcelain skin", "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 45, "cfg": 4.5, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["2", 0] }, "class_type": "KSampler" },
    "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
    "7": { "inputs": { "filename_prefix": "portrait", "images": ["6", 0] }, "class_type": "SaveImage" }
  };
}

// Food Photography workflow
function buildFoodWorkflow(prompt) {
  const enhanced = `${prompt}, professional food photography, shot on Canon EOS R5 with 100mm macro lens at f/2.8, natural window lighting with soft diffused shadows, steam rising naturally, shallow depth of field, food magazine cover quality, michelin star presentation, appetizing, mouth-watering, high-end restaurant styling, RAW photo, 8k uhd, photorealistic, natural colors, realistic textures, editorial quality, Bon Appetit magazine style, real photograph, natural imperfections in food`;
  
  return {
    "1": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "2": { "inputs": { "width": 1024, "height": 1024, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "3": { "inputs": { "text": enhanced, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "4": { "inputs": { "text": PHOTO_NEGATIVE + ", unappetizing, raw meat, rotten, spoiled, artificial colors, neon lighting, stock photo, clip art", "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 45, "cfg": 4, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["2", 0] }, "class_type": "KSampler" },
    "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
    "7": { "inputs": { "filename_prefix": "food", "images": ["6", 0] }, "class_type": "SaveImage" }
  };
}

// Product Photography workflow
function buildProductWorkflow(prompt) {
  const enhanced = `${prompt}, professional product photography, shot on Phase One IQ4 150MP with 120mm macro lens at f/8, studio lighting setup with softboxes, clean gradient background, commercial advertising quality, sharp focus throughout, product catalog style, RAW photo, 8k uhd, photorealistic, perfect reflections, luxury presentation, high-end advertising, real photograph for e-commerce, natural material textures`;
  
  return {
    "1": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "2": { "inputs": { "width": 1024, "height": 1024, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "3": { "inputs": { "text": enhanced, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "4": { "inputs": { "text": PHOTO_NEGATIVE + ", dirty, damaged, scratched, fingerprints, dust, cheap looking, toy", "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 45, "cfg": 4.5, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["2", 0] }, "class_type": "KSampler" },
    "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
    "7": { "inputs": { "filename_prefix": "product", "images": ["6", 0] }, "class_type": "SaveImage" }
  };
}

// Landscape Photography workflow
function buildLandscapeWorkflow(prompt) {
  const enhanced = `${prompt}, professional landscape photography, shot on Nikon Z9 with 24-70mm f/2.8 lens, golden hour lighting, dramatic sky with natural cloud formations, National Geographic quality, ultra wide dynamic range, RAW photo, 8k uhd, photorealistic, stunning composition using rule of thirds, leading lines, epic vista, award-winning nature photography, real photograph, subtle film grain, natural atmospheric haze`;
  
  return {
    "1": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "2": { "inputs": { "width": 1344, "height": 768, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "3": { "inputs": { "text": enhanced, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "4": { "inputs": { "text": PHOTO_NEGATIVE + ", flat lighting, boring composition, overprocessed HDR, neon sky, fantasy landscape", "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 45, "cfg": 4.5, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["2", 0] }, "class_type": "KSampler" },
    "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
    "7": { "inputs": { "filename_prefix": "landscape", "images": ["6", 0] }, "class_type": "SaveImage" }
  };
}

// Architecture/Interior Photography workflow
function buildArchitectureWorkflow(prompt) {
  const enhanced = `${prompt}, professional architectural photography, shot on Canon 5DS R with 24mm tilt-shift lens, perfectly straight verticals, interior design magazine quality, natural daylight through windows combined with ambient lighting, clean modern aesthetic, RAW photo, 8k uhd, photorealistic, Architectural Digest style, luxury real estate photography, real photograph, natural material textures, realistic reflections`;
  
  return {
    "1": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "2": { "inputs": { "width": 1344, "height": 896, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "3": { "inputs": { "text": enhanced, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "4": { "inputs": { "text": PHOTO_NEGATIVE + ", tilted, crooked, distorted perspective, cluttered, messy, fisheye distortion", "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 45, "cfg": 4.5, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["2", 0] }, "class_type": "KSampler" },
    "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
    "7": { "inputs": { "filename_prefix": "architecture", "images": ["6", 0] }, "class_type": "SaveImage" }
  };
}

// Car/Automotive Photography workflow
function buildCarWorkflow(prompt) {
  const enhanced = `${prompt}, professional automotive photography, shot on Hasselblad H6D-100c with 80mm lens, dramatic studio lighting with perfect reflections on bodywork, showroom quality, car magazine cover, RAW photo, 8k uhd, photorealistic, perfect paint finish with metallic flake visible, dynamic angle, motion blur on wheels if moving, luxury automotive advertising, real photograph of real car, chrome reflections, realistic headlights`;
  
  return {
    "1": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "2": { "inputs": { "width": 1344, "height": 896, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "3": { "inputs": { "text": enhanced, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "4": { "inputs": { "text": PHOTO_NEGATIVE + ", damaged, dented, scratched, dirty, cheap car, toy car, model car, hot wheels", "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 45, "cfg": 4.5, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["2", 0] }, "class_type": "KSampler" },
    "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
    "7": { "inputs": { "filename_prefix": "car", "images": ["6", 0] }, "class_type": "SaveImage" }
  };
}

// General Photography workflow (high quality default)
function buildGeneralWorkflow(prompt) {
  const enhanced = `${prompt}, professional photography, shot on high-end full-frame DSLR camera with premium lens, perfect lighting setup, RAW photo, 8k uhd, photorealistic, tack sharp focus, high dynamic range, magazine quality, award-winning photography, natural colors, realistic textures, subtle film grain, real photograph taken by professional photographer, natural imperfections`;
  
  return {
    "1": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "2": { "inputs": { "width": 1024, "height": 1024, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "3": { "inputs": { "text": enhanced, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "4": { "inputs": { "text": PHOTO_NEGATIVE, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 45, "cfg": 4.5, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["2", 0] }, "class_type": "KSampler" },
    "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
    "7": { "inputs": { "filename_prefix": "photo", "images": ["6", 0] }, "class_type": "SaveImage" }
  };
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
    
    // Apply LoRA if specified or auto-select based on category
    if (lora) {
      workflow = injectLora(workflow, lora);
      appliedLora = lora;
    } else if (autoLora && category && CATEGORY_LORAS[category]) {
      // Auto-apply trained LoRA for this category if available
      workflow = injectLora(workflow, CATEGORY_LORAS[category]);
      appliedLora = CATEGORY_LORAS[category];
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
