// Full Marketing Ad Video Production Pipeline
// Combines: AI Scene Planning → ComfyUI Generation → Remotion Composition → Final Render

const COMFYUI_URL = process.env.COMFYUI_URL || 'https://spark-comfyui.ngrok.app';
const AUTH = Buffer.from(process.env.COMFYUI_AUTH || 'lumen:studio2026').toString('base64');

// Ad style templates with scene patterns
const AD_TEMPLATES = {
  apple: {
    name: 'Apple Style',
    scenes: [
      { type: 'intro', duration: 3, description: 'Clean white background, product silhouette fades in' },
      { type: 'reveal', duration: 4, description: 'Product rotating 360°, premium materials highlighted' },
      { type: 'features', duration: 5, description: 'Feature callouts with minimal text, one at a time' },
      { type: 'lifestyle', duration: 4, description: 'Product in elegant real-world setting' },
      { type: 'hero', duration: 3, description: 'Hero shot with dramatic lighting' },
      { type: 'cta', duration: 3, description: 'Logo, tagline, call to action' },
    ],
    style: 'minimalist, white background, premium, clean typography, elegant motion',
    music: 'ambient electronic, minimal beats',
    transitions: 'smooth fades, subtle zooms'
  },
  nike: {
    name: 'Nike Style',
    scenes: [
      { type: 'hook', duration: 2, description: 'Fast cuts, intense action, dramatic opening' },
      { type: 'athlete', duration: 4, description: 'Athletic performance, slow motion moments' },
      { type: 'struggle', duration: 4, description: 'Challenge and determination' },
      { type: 'triumph', duration: 4, description: 'Victory moment, achievement' },
      { type: 'product', duration: 3, description: 'Product reveal with energy' },
      { type: 'cta', duration: 3, description: 'Bold text, inspiring message, logo' },
    ],
    style: 'dramatic lighting, high contrast, dynamic motion, athletic',
    music: 'energetic, inspiring, hip-hop beats',
    transitions: 'fast cuts, motion blur, zoom impacts'
  },
  tech: {
    name: 'Tech Startup',
    scenes: [
      { type: 'problem', duration: 4, description: 'Show the pain point, frustration' },
      { type: 'solution', duration: 3, description: 'Product introduction as the solution' },
      { type: 'demo', duration: 6, description: 'UI/UX showcase, features in action' },
      { type: 'benefits', duration: 4, description: 'Key benefits with animations' },
      { type: 'social', duration: 3, description: 'Social proof, testimonials, logos' },
      { type: 'cta', duration: 3, description: 'Sign up CTA, website, offer' },
    ],
    style: 'gradient backgrounds, floating UI elements, clean sans-serif, modern',
    music: 'upbeat electronic, corporate friendly',
    transitions: 'slide reveals, scale up, parallax'
  },
  luxury: {
    name: 'Luxury Brand',
    scenes: [
      { type: 'ambiance', duration: 4, description: 'Mood setting, golden hour lighting' },
      { type: 'craftsmanship', duration: 5, description: 'Detail shots, materials, texture' },
      { type: 'lifestyle', duration: 4, description: 'Aspirational setting, elegance' },
      { type: 'product', duration: 4, description: 'Hero product shot, premium feel' },
      { type: 'brand', duration: 3, description: 'Logo, heritage, brand essence' },
    ],
    style: 'golden hour, rich colors, slow motion, elegant serif fonts',
    music: 'orchestral, piano, sophisticated',
    transitions: 'slow dissolves, gentle camera moves'
  },
  social: {
    name: 'Social Media',
    scenes: [
      { type: 'hook', duration: 2, description: 'Attention grab, bold text, question or statement' },
      { type: 'content1', duration: 3, description: 'First key point with visual' },
      { type: 'content2', duration: 3, description: 'Second key point' },
      { type: 'content3', duration: 3, description: 'Third key point' },
      { type: 'cta', duration: 2, description: 'Follow, like, share CTA' },
    ],
    style: 'bold colors, big text, vertical-friendly, trendy effects',
    music: 'trending audio, upbeat, catchy',
    transitions: 'fast cuts, scale pops, wipes'
  },
  corporate: {
    name: 'Corporate',
    scenes: [
      { type: 'intro', duration: 3, description: 'Company intro, professional setting' },
      { type: 'values', duration: 4, description: 'Core values, mission visualization' },
      { type: 'team', duration: 4, description: 'Diverse team, collaboration' },
      { type: 'services', duration: 5, description: 'Services/products overview' },
      { type: 'results', duration: 4, description: 'Stats, achievements, trust signals' },
      { type: 'contact', duration: 3, description: 'Contact info, logo, professional close' },
    ],
    style: 'blue tones, professional, clean, trustworthy',
    music: 'corporate background, inspirational',
    transitions: 'smooth cuts, professional reveals'
  }
};

// Duration presets (in seconds)
const DURATION_PRESETS = {
  '6s': 6,
  '15s': 15,
  '30s': 30,
  '60s': 60
};

// Generate scene breakdown from template + product
function generateSceneBreakdown(template, product, duration) {
  const scenes = template.scenes;
  const totalTemplateDuration = scenes.reduce((acc, s) => acc + s.duration, 0);
  const scale = duration / totalTemplateDuration;
  
  return scenes.map((scene, idx) => ({
    id: idx + 1,
    type: scene.type,
    duration: Math.round(scene.duration * scale),
    description: scene.description.replace(/product/gi, product),
    prompt: `${scene.description}, ${product}, ${template.style}`,
    transition: idx < scenes.length - 1 ? template.transitions.split(',')[0].trim() : 'fade out'
  }));
}

// Build ComfyUI workflow for scene image/video generation
function buildSceneWorkflow(scenePrompt, isVideo = true) {
  if (isVideo) {
    // Use Hunyuan for video scenes
    return {
      "1": { "inputs": { "ckpt_name": "hunyuan_video_720_cfgdistill_fp8_e4m3fn.safetensors" }, "class_type": "HunyuanVideoModelLoader" },
      "2": { "inputs": { "clip_name": "llava_llama3_fp8_scaled.safetensors" }, "class_type": "DualCLIPLoader" },
      "3": { "inputs": { "vae_name": "hunyuan_video_vae_bf16.safetensors" }, "class_type": "VAELoader" },
      "4": { "inputs": { "text": scenePrompt + ", cinematic, professional, 4K quality", "clip": ["2", 0] }, "class_type": "CLIPTextEncode" },
      "5": { "inputs": { "text": "ugly, blurry, amateur, low quality, watermark, text", "clip": ["2", 0] }, "class_type": "CLIPTextEncode" },
      "6": { "inputs": { "width": 848, "height": 480, "length": 49, "batch_size": 1 }, "class_type": "EmptyHunyuanLatentVideo" },
      "7": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 30, "cfg": 6, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["1", 0], "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["6", 0] }, "class_type": "KSampler" },
      "8": { "inputs": { "samples": ["7", 0], "vae": ["3", 0] }, "class_type": "VAEDecode" },
      "9": { "inputs": { "filename_prefix": "scene", "fps": 24, "images": ["8", 0] }, "class_type": "SaveAnimatedWEBP" }
    };
  } else {
    // Use FLUX for still images
    return {
      "1": { "inputs": { "unet_name": "flux1-dev.safetensors", "weight_dtype": "fp8_e4m3fn" }, "class_type": "UNETLoader" },
      "2": { "inputs": { "clip_name1": "t5xxl_fp8_e4m3fn.safetensors", "clip_name2": "clip_l.safetensors", "type": "flux" }, "class_type": "DualCLIPLoader" },
      "3": { "inputs": { "vae_name": "ae.safetensors" }, "class_type": "VAELoader" },
      "4": { "inputs": { "text": scenePrompt + ", professional photography, 4K", "clip": ["2", 0] }, "class_type": "CLIPTextEncode" },
      "5": { "inputs": { "width": 1344, "height": 768, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
      "6": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 28, "cfg": 3.5, "sampler_name": "euler", "scheduler": "simple", "denoise": 1, "model": ["1", 0], "positive": ["4", 0], "negative": ["4", 0], "latent_image": ["5", 0] }, "class_type": "KSampler" },
      "7": { "inputs": { "samples": ["6", 0], "vae": ["3", 0] }, "class_type": "VAEDecode" },
      "8": { "inputs": { "filename_prefix": "scene", "images": ["7", 0] }, "class_type": "SaveImage" }
    };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    prompt,           // "30 second Apple-style ad for iPhone case"
    style = 'tech',   // apple, nike, tech, luxury, social, corporate
    duration = '30s', // 6s, 15s, 30s, 60s
    product,          // Product name (extracted from prompt if not provided)
    useVideo = true,  // Generate video clips (true) or images (false)
    preview = false   // Just return scene breakdown without generating
  } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt required' });
  }

  try {
    // Get template
    const template = AD_TEMPLATES[style] || AD_TEMPLATES.tech;
    const durationSec = DURATION_PRESETS[duration] || 30;
    
    // Extract product from prompt if not provided
    const productName = product || prompt.replace(/.*(?:for|about|featuring)\s+/i, '').trim() || 'product';
    
    // Generate scene breakdown
    const scenes = generateSceneBreakdown(template, productName, durationSec);
    
    // Calculate total frames needed
    const fps = 24;
    const totalFrames = durationSec * fps;
    
    // Build response with scene plan
    const response = {
      status: 'planned',
      template: template.name,
      style: style,
      duration: durationSec,
      product: productName,
      scenes: scenes,
      totalFrames: totalFrames,
      fps: fps,
      musicStyle: template.music,
      estimatedTime: useVideo ? `${scenes.length * 2}-${scenes.length * 3} minutes` : `${scenes.length * 0.5}-${scenes.length * 1} minutes`,
      message: `Planned ${scenes.length} scenes for ${durationSec}s ${template.name} ad`
    };

    // If preview mode, just return the plan
    if (preview) {
      return res.status(200).json(response);
    }

    // Start generating scenes
    const sceneJobs = [];
    
    for (const scene of scenes) {
      const workflow = buildSceneWorkflow(scene.prompt, useVideo);
      
      try {
        const genResponse = await fetch(COMFYUI_URL + '/prompt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + AUTH,
          },
          body: JSON.stringify({ prompt: workflow }),
        });

        if (genResponse.ok) {
          const data = await genResponse.json();
          sceneJobs.push({
            sceneId: scene.id,
            type: scene.type,
            promptId: data.prompt_id,
            status: 'generating'
          });
        }
      } catch (err) {
        sceneJobs.push({
          sceneId: scene.id,
          type: scene.type,
          status: 'failed',
          error: err.message
        });
      }
    }

    return res.status(200).json({
      ...response,
      status: 'generating',
      sceneJobs: sceneJobs,
      message: `Generating ${sceneJobs.filter(j => j.status === 'generating').length} scenes. This will take ${response.estimatedTime}.`,
      note: 'After scenes complete, they will be composed with Remotion into final video'
    });

  } catch (error) {
    console.error('Ad video error:', error);
    return res.status(500).json({ error: error.message });
  }
}
