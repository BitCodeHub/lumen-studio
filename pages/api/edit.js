// Image editing endpoint with full SAM + inpainting - MAXIMUM PHOTOREALISM
const COMFYUI_URL = process.env.COMFYUI_URL || 'http://localhost:8188';
const AUTH = Buffer.from(process.env.COMFYUI_AUTH || 'lumen:studio2026').toString('base64');

// MAXIMUM PHOTOREALISM - Universal anti-AI negative prompt (SAME AS GENERATE)
const PHOTO_NEGATIVE = `ugly, blurry, low quality, deformed, disfigured, bad anatomy, bad proportions, watermark, text, signature, jpeg artifacts, poorly drawn, cartoon, anime, illustration, painting, drawing, cgi, 3d render, artificial, fake, plastic, oversaturated, amateur, grainy, noisy, AI generated, airbrushed, smooth skin, digital art, unrealistic, overprocessed, HDR, hyper saturated, video game, unnatural colors, synthetic, computer generated, midjourney, dall-e, stable diffusion artifacts`;

// Extract what to mask from the prompt (e.g., "add meatball in the bowl" -> "bowl")
function extractMaskTarget(prompt) {
  const lower = prompt.toLowerCase();
  
  // Patterns to find the target area
  const patterns = [
    /in the (\w+)/,           // "in the bowl"
    /on the (\w+)/,           // "on the table"
    /to the (\w+)/,           // "to the image"
    /into the (\w+)/,         // "into the soup"
    /inside the (\w+)/,       // "inside the room"
    /around the (\w+)/,       // "around the face"
    /near the (\w+)/,         // "near the window"
  ];
  
  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (match) return match[1];
  }
  
  // Default targets based on common scenarios
  if (lower.includes('bowl') || lower.includes('soup') || lower.includes('dish')) return 'bowl';
  if (lower.includes('face') || lower.includes('person')) return 'face';
  if (lower.includes('background')) return 'background';
  if (lower.includes('sky')) return 'sky';
  
  return 'center'; // Default - mask center area
}

// Extract what to add from the prompt
function extractAddition(prompt) {
  const lower = prompt.toLowerCase();
  
  const patterns = [
    /add (?:a |an |some )?(\w+(?:\s+\w+)?)/,      // "add meatball"
    /put (?:a |an |some )?(\w+(?:\s+\w+)?)/,      // "put flowers"
    /place (?:a |an |some )?(\w+(?:\s+\w+)?)/,    // "place a car"
    /insert (?:a |an |some )?(\w+(?:\s+\w+)?)/,   // "insert text"
    /include (?:a |an |some )?(\w+(?:\s+\w+)?)/,  // "include people"
  ];
  
  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (match) return match[1];
  }
  
  return prompt; // Return full prompt if no pattern matched
}

// Full SAM + Inpainting workflow (proper masking) - PHOTOREALISTIC
const WORKFLOWS = {
  // SAM-based inpainting - segments target area and inpaints with MAX QUALITY
  sam_inpaint: (filename, prompt, maskTarget, addition) => ({
    // Load the image
    "1": { "inputs": { "image": filename, "upload": "image" }, "class_type": "LoadImage" },
    
    // Load SAM model
    "2": { "inputs": { "model_name": "sam_vit_b_01ec64.pth" }, "class_type": "SAMModelLoader (segment anything)" },
    
    // Load GroundingDino model
    "3": { "inputs": { "model_name": "groundingdino_swint_ogc.pth" }, "class_type": "GroundingDinoModelLoader (segment anything)" },
    
    // Segment the target area (e.g., "bowl") to get mask
    "4": { "inputs": { 
      "sam_model": ["2", 0], 
      "grounding_dino_model": ["3", 0], 
      "image": ["1", 0], 
      "prompt": maskTarget,
      "threshold": 0.3
    }, "class_type": "GroundingDinoSAMSegment (segment anything)" },
    
    // Load checkpoint
    "5": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    
    // Encode for inpainting with mask
    "6": { "inputs": { 
      "pixels": ["1", 0], 
      "vae": ["5", 2], 
      "mask": ["4", 1],  // Mask from SAM
      "grow_mask_by": 8 
    }, "class_type": "VAEEncodeForInpaint" },
    
    // Positive prompt - what to add (PHOTOREALISTIC)
    "7": { "inputs": { 
      "text": `${addition}, seamlessly integrated into scene, matching lighting and perspective exactly, photorealistic, natural placement, professional photography, RAW photo, 8k uhd, real photograph, natural textures, realistic material, matching color temperature and shadows`, 
      "clip": ["5", 1] 
    }, "class_type": "CLIPTextEncode" },
    
    // Negative prompt (FULL ANTI-AI)
    "8": { "inputs": { 
      "text": PHOTO_NEGATIVE + ", mismatched lighting, floating, different style, out of place, visible seams, edge artifacts, pasted on", 
      "clip": ["5", 1] 
    }, "class_type": "CLIPTextEncode" },
    
    // KSampler - inpaint with LOWER CFG, MORE STEPS (photorealistic)
    "9": { "inputs": { 
      "seed": Math.floor(Math.random() * 1e9), 
      "steps": 45,      // Higher steps for quality
      "cfg": 4.5,       // Lower CFG for natural look
      "sampler_name": "dpmpp_2m_sde", 
      "scheduler": "karras", 
      "denoise": 1,     // Full denoise in masked area only
      "model": ["5", 0], 
      "positive": ["7", 0], 
      "negative": ["8", 0], 
      "latent_image": ["6", 0] 
    }, "class_type": "KSampler" },
    
    // Decode
    "10": { "inputs": { "samples": ["9", 0], "vae": ["5", 2] }, "class_type": "VAEDecode" },
    
    // Save
    "11": { "inputs": { "filename_prefix": "inpaint", "images": ["10", 0] }, "class_type": "SaveImage" }
  }),

  // Fallback: Low-denoise img2img for when SAM fails - PHOTOREALISTIC
  add_element: (filename, prompt) => ({
    "1": { "inputs": { "image": filename, "upload": "image" }, "class_type": "LoadImage" },
    "2": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "3": { "inputs": { "pixels": ["1", 0], "vae": ["2", 2] }, "class_type": "VAEEncode" },
    "4": { "inputs": { "text": `${prompt}, seamlessly integrated, matching lighting and style exactly, photorealistic, natural placement, same scene, RAW photo, 8k uhd, real photograph, natural imperfections`, "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "text": PHOTO_NEGATIVE + ", mismatched lighting, floating, unnatural, out of place, different style", "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
    "6": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 45, "cfg": 4.5, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 0.35, "model": ["2", 0], "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["3", 0] }, "class_type": "KSampler" },
    "7": { "inputs": { "samples": ["6", 0], "vae": ["2", 2] }, "class_type": "VAEDecode" },
    "8": { "inputs": { "filename_prefix": "edit_add", "images": ["7", 0] }, "class_type": "SaveImage" }
  }),

  // Transform/modify existing elements - PHOTOREALISTIC
  transform: (filename, prompt) => ({
    "1": { "inputs": { "image": filename, "upload": "image" }, "class_type": "LoadImage" },
    "2": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "3": { "inputs": { "pixels": ["1", 0], "vae": ["2", 2] }, "class_type": "VAEEncode" },
    "4": { "inputs": { "text": `${prompt}, photorealistic, same scene, matching style exactly, RAW photo, 8k uhd, real photograph, natural textures, professional photography`, "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "text": PHOTO_NEGATIVE, "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
    "6": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 45, "cfg": 4.5, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 0.55, "model": ["2", 0], "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["3", 0] }, "class_type": "KSampler" },
    "7": { "inputs": { "samples": ["6", 0], "vae": ["2", 2] }, "class_type": "VAEDecode" },
    "8": { "inputs": { "filename_prefix": "edit_transform", "images": ["7", 0] }, "class_type": "SaveImage" }
  }),

  // Upscale 4x with 4x-UltraSharp
  upscale: (filename) => ({
    "1": { "inputs": { "image": filename, "upload": "image" }, "class_type": "LoadImage" },
    "2": { "inputs": { "model_name": "4x-UltraSharp.pth" }, "class_type": "UpscaleModelLoader" },
    "3": { "inputs": { "upscale_model": ["2", 0], "image": ["1", 0] }, "class_type": "ImageUpscaleWithModel" },
    "4": { "inputs": { "filename_prefix": "upscale", "images": ["3", 0] }, "class_type": "SaveImage" }
  }),

  // Face restoration with GFPGAN
  face_restore: (filename) => ({
    "1": { "inputs": { "image": filename, "upload": "image" }, "class_type": "LoadImage" },
    "2": { "inputs": { "model_name": "GFPGANv1.4.pth" }, "class_type": "FaceRestoreModelLoader" },
    "3": { "inputs": { "facerestore_model": ["2", 0], "image": ["1", 0], "fidelity": 0.7 }, "class_type": "FaceRestoreCFWithModel" },
    "4": { "inputs": { "filename_prefix": "face_restore", "images": ["3", 0] }, "class_type": "SaveImage" }
  }),

  // Style transfer with IP-Adapter - preserve photorealism
  style_transfer: (filename, prompt) => ({
    "1": { "inputs": { "image": filename, "upload": "image" }, "class_type": "LoadImage" },
    "2": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "3": { "inputs": { "ipadapter_file": "ip-adapter-plus_sdxl_vit-h.safetensors" }, "class_type": "IPAdapterModelLoader" },
    "4": { "inputs": { "clip_name": "CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors" }, "class_type": "CLIPVisionLoader" },
    "5": { "inputs": { "model": ["2", 0], "ipadapter": ["3", 0], "image": ["1", 0], "clip_vision": ["4", 0], "weight": 0.8, "start_at": 0, "end_at": 1 }, "class_type": "IPAdapterApply" },
    "6": { "inputs": { "text": `${prompt || "artistic style transfer, same composition"}, photorealistic output, RAW photo, 8k uhd, real photograph`, "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
    "7": { "inputs": { "text": PHOTO_NEGATIVE + ", different composition, cropped", "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
    "8": { "inputs": { "width": 1024, "height": 1024, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "9": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 45, "cfg": 4.5, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 1, "model": ["5", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["8", 0] }, "class_type": "KSampler" },
    "10": { "inputs": { "samples": ["9", 0], "vae": ["2", 2] }, "class_type": "VAEDecode" },
    "11": { "inputs": { "filename_prefix": "style", "images": ["10", 0] }, "class_type": "SaveImage" }
  }),

  // Remove element - inpaint to remove
  remove: (filename, prompt, target) => ({
    "1": { "inputs": { "image": filename, "upload": "image" }, "class_type": "LoadImage" },
    "2": { "inputs": { "model_name": "sam_vit_b_01ec64.pth" }, "class_type": "SAMModelLoader (segment anything)" },
    "3": { "inputs": { "model_name": "groundingdino_swint_ogc.pth" }, "class_type": "GroundingDinoModelLoader (segment anything)" },
    "4": { "inputs": { 
      "sam_model": ["2", 0], 
      "grounding_dino_model": ["3", 0], 
      "image": ["1", 0], 
      "prompt": target,
      "threshold": 0.3
    }, "class_type": "GroundingDinoSAMSegment (segment anything)" },
    "5": { "inputs": { "ckpt_name": "juggernautXL_v9.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "6": { "inputs": { "pixels": ["1", 0], "vae": ["5", 2], "mask": ["4", 1], "grow_mask_by": 12 }, "class_type": "VAEEncodeForInpaint" },
    "7": { "inputs": { "text": "clean background, seamless fill, natural continuation of surrounding area, photorealistic, RAW photo, 8k uhd, matching textures and lighting", "clip": ["5", 1] }, "class_type": "CLIPTextEncode" },
    "8": { "inputs": { "text": PHOTO_NEGATIVE + ", visible seams, different texture, patch, obvious edit", "clip": ["5", 1] }, "class_type": "CLIPTextEncode" },
    "9": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 45, "cfg": 4.5, "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "denoise": 1, "model": ["5", 0], "positive": ["7", 0], "negative": ["8", 0], "latent_image": ["6", 0] }, "class_type": "KSampler" },
    "10": { "inputs": { "samples": ["9", 0], "vae": ["5", 2] }, "class_type": "VAEDecode" },
    "11": { "inputs": { "filename_prefix": "remove", "images": ["10", 0] }, "class_type": "SaveImage" }
  }),
};

// Detect operation from prompt
function detectOperation(prompt) {
  const lower = prompt.toLowerCase();
  
  // Remove operations - use SAM to remove
  if (lower.includes('remove ') || lower.includes('delete ') || lower.includes('erase ') ||
      lower.includes('get rid of') || lower.includes('take out ')) {
    return 'remove';
  }
  
  // Add/insert operations - use SAM inpainting
  if (lower.includes('add ') || lower.includes('put ') || lower.includes('place ') || 
      lower.includes('insert ') || lower.includes('include ')) {
    return 'sam_inpaint';
  }
  
  // Transform/change operations
  if (lower.includes('change ') || lower.includes('make ') || lower.includes('turn ') ||
      lower.includes('convert ') || lower.includes('transform ')) {
    return 'transform';
  }
  
  // Upscale
  if (lower.includes('upscale') || lower.includes('4k') || lower.includes('hd') || 
      lower.includes('enhance resolution') || lower.includes('higher resolution') ||
      lower.includes('enlarge')) {
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
  
  return 'add_element'; // Fallback to low-denoise
}

// Extract removal target
function extractRemoveTarget(prompt) {
  const lower = prompt.toLowerCase();
  const patterns = [
    /remove (?:the )?(\w+(?:\s+\w+)?)/,
    /delete (?:the )?(\w+(?:\s+\w+)?)/,
    /erase (?:the )?(\w+(?:\s+\w+)?)/,
    /get rid of (?:the )?(\w+(?:\s+\w+)?)/,
    /take out (?:the )?(\w+(?:\s+\w+)?)/,
  ];
  
  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (match) return match[1];
  }
  return 'object';
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
      case 'sam_inpaint':
        const maskTarget = extractMaskTarget(prompt);
        const addition = extractAddition(prompt);
        workflow = WORKFLOWS.sam_inpaint(filename, prompt, maskTarget, addition);
        description = `SAM inpainting: adding "${addition}" in "${maskTarget}" area (photorealistic)`;
        break;
      case 'remove':
        const removeTarget = extractRemoveTarget(prompt);
        workflow = WORKFLOWS.remove(filename, prompt, removeTarget);
        description = `SAM removal: removing "${removeTarget}" (photorealistic)`;
        break;
      case 'add_element':
        workflow = WORKFLOWS.add_element(filename, prompt);
        description = 'Adding element (photorealistic fallback)';
        break;
      case 'transform':
        workflow = WORKFLOWS.transform(filename, prompt);
        description = 'Transforming image (photorealistic)';
        break;
      case 'upscale':
        workflow = WORKFLOWS.upscale(filename);
        description = 'Upscaling to 4K with UltraSharp';
        break;
      case 'face_restore':
        workflow = WORKFLOWS.face_restore(filename);
        description = 'Restoring face details with GFPGAN';
        break;
      case 'style_transfer':
        workflow = WORKFLOWS.style_transfer(filename, prompt);
        description = 'Applying style transfer (photorealistic output)';
        break;
      default:
        workflow = WORKFLOWS.add_element(filename, prompt || 'enhance this image');
        description = 'Processing image (photorealistic)';
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
      // If SAM fails, fallback to add_element
      if ((op === 'sam_inpaint' || op === 'remove') && text.includes('error')) {
        console.log('SAM failed, falling back to add_element');
        const fallbackWorkflow = WORKFLOWS.add_element(filename, prompt);
        const fallbackRes = await fetch(COMFYUI_URL + '/prompt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + AUTH,
          },
          body: JSON.stringify({ prompt: fallbackWorkflow }),
        });
        
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          return res.status(200).json({
            status: 'generating',
            prompt_id: data.prompt_id,
            operation: 'add_element',
            message: 'Adding element (photorealistic fallback)...',
          });
        }
      }
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
