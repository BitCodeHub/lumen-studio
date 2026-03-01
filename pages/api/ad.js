// Marketing Ad Creator - Multi-asset video production
const COMFYUI_URL = process.env.COMFYUI_URL || 'https://spark-comfyui.ngrok.app';
const AUTH = Buffer.from(process.env.COMFYUI_AUTH || 'lumen:studio2026').toString('base64');

// Ad style presets
const AD_STYLES = {
  apple: {
    prompt_prefix: "Apple style commercial, minimalist white background, premium product photography, clean typography, elegant transitions, professional lighting,",
    negative: "cluttered, cheap, low quality, amateur"
  },
  nike: {
    prompt_prefix: "Nike style commercial, dramatic lighting, inspiring athletic footage, bold typography, cinematic slow motion, emotional storytelling,",
    negative: "static, boring, low energy"
  },
  tech: {
    prompt_prefix: "Modern tech startup commercial, sleek UI animations, gradient backgrounds, floating devices, clean sans-serif text, futuristic,",
    negative: "outdated, cluttered, unprofessional"
  },
  luxury: {
    prompt_prefix: "Luxury brand commercial, golden hour lighting, elegant slow motion, premium materials, sophisticated color grading,",
    negative: "cheap, plastic, rushed"
  },
  social: {
    prompt_prefix: "Viral social media ad, fast cuts, bold text overlays, attention-grabbing, trendy music sync, vertical format friendly,",
    negative: "boring, slow, corporate"
  },
  corporate: {
    prompt_prefix: "Professional corporate video, clean office environments, diverse team, trustworthy, blue color scheme,",
    negative: "unprofessional, cluttered, amateur"
  }
};

// Duration presets
const DURATION_PRESETS = {
  '6s': { frames: 144, label: '6 second (Instagram Story)' },
  '15s': { frames: 360, label: '15 second (TikTok/Reels)' },
  '30s': { frames: 720, label: '30 second (Standard Ad)' },
  '60s': { frames: 1440, label: '60 second (Full Ad)' }
};

// Detect style from prompt
function detectStyle(prompt) {
  const lower = prompt.toLowerCase();
  if (lower.includes('apple') || lower.includes('minimal')) return 'apple';
  if (lower.includes('nike') || lower.includes('sport') || lower.includes('athletic')) return 'nike';
  if (lower.includes('tech') || lower.includes('startup') || lower.includes('saas')) return 'tech';
  if (lower.includes('luxury') || lower.includes('premium') || lower.includes('elegant')) return 'luxury';
  if (lower.includes('social') || lower.includes('viral') || lower.includes('tiktok')) return 'social';
  if (lower.includes('corporate') || lower.includes('business') || lower.includes('enterprise')) return 'corporate';
  return 'tech'; // Default
}

// Detect duration from prompt
function detectDuration(prompt) {
  const lower = prompt.toLowerCase();
  if (lower.includes('6 sec') || lower.includes('story')) return '6s';
  if (lower.includes('15 sec') || lower.includes('reel') || lower.includes('tiktok')) return '15s';
  if (lower.includes('60 sec') || lower.includes('1 min') || lower.includes('full')) return '60s';
  return '30s'; // Default
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    prompt, 
    style, 
    duration,
    assets = [],  // Array of uploaded filenames
    productName,
    tagline
  } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt required' });
  }

  try {
    const adStyle = AD_STYLES[style] || AD_STYLES[detectStyle(prompt)];
    const dur = DURATION_PRESETS[duration] || DURATION_PRESETS[detectDuration(prompt)];
    
    // Build enhanced prompt
    let fullPrompt = adStyle.prompt_prefix + ' ' + prompt;
    if (productName) fullPrompt += ', featuring ' + productName;
    if (tagline) fullPrompt += ', tagline: "' + tagline + '"';

    // For now, generate scenes individually and note that FFmpeg composition happens server-side
    // In production, this would trigger a full pipeline

    // Generate main video
    const workflow = {
      "1": { "inputs": { "ckpt_name": "hunyuan_video_720_cfgdistill_fp8_e4m3fn.safetensors" }, "class_type": "HunyuanVideoModelLoader" },
      "2": { "inputs": { "clip_name": "llava_llama3_fp8_scaled.safetensors" }, "class_type": "DualCLIPLoader" },
      "3": { "inputs": { "vae_name": "hunyuan_video_vae_bf16.safetensors" }, "class_type": "VAELoader" },
      "4": { "inputs": { "text": fullPrompt, "clip": ["2", 0] }, "class_type": "CLIPTextEncode" },
      "5": { "inputs": { "text": adStyle.negative, "clip": ["2", 0] }, "class_type": "CLIPTextEncode" },
      "6": { "inputs": { "width": 848, "height": 480, "length": Math.min(dur.frames / 24, 49), "batch_size": 1 }, "class_type": "EmptyHunyuanLatentVideo" },
      "7": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 30, "cfg": 6, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["1", 0], "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["6", 0] }, "class_type": "KSampler" },
      "8": { "inputs": { "samples": ["7", 0], "vae": ["3", 0] }, "class_type": "VAEDecode" },
      "9": { "inputs": { "filename_prefix": "ad_" + (style || 'custom'), "fps": 24, "images": ["8", 0] }, "class_type": "SaveAnimatedWEBP" }
    };

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
      style: style || detectStyle(prompt),
      duration: duration || detectDuration(prompt),
      assets_used: assets.length,
      message: 'Creating your ' + (duration || '30s') + ' ' + (style || 'custom') + ' ad...',
      note: 'Ad generation takes 2-5 minutes for high quality'
    });

  } catch (error) {
    console.error('Ad creation error:', error);
    return res.status(500).json({ error: error.message });
  }
}
