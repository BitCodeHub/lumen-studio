// Meme Generator API - Uses actual templates with text overlays
// Templates from imgflip.com (most popular meme formats)

const MEME_TEMPLATES = {
  drake: {
    id: '181913649',
    name: 'Drake Hotline Bling',
    boxes: 2,
    description: 'Top: Thing you reject, Bottom: Thing you prefer'
  },
  expanding_brain: {
    id: '93895088',
    name: 'Expanding Brain',
    boxes: 4,
    description: '4 levels of increasingly enlightened ideas'
  },
  distracted_bf: {
    id: '112126428',
    name: 'Distracted Boyfriend',
    boxes: 3,
    description: 'Guy looking at other girl while girlfriend watches'
  },
  this_is_fine: {
    id: '55311130',
    name: 'This Is Fine',
    boxes: 2,
    description: 'Dog in burning room saying this is fine'
  },
  change_my_mind: {
    id: '129242436',
    name: 'Change My Mind',
    boxes: 1,
    description: 'Steven Crowder sitting at table with sign'
  },
  two_buttons: {
    id: '87743020',
    name: 'Two Buttons',
    boxes: 3,
    description: 'Sweating guy choosing between two buttons'
  },
  stonks: {
    id: '259237855',
    name: 'Stonks',
    boxes: 1,
    description: 'Meme man with stonks arrow'
  },
  uno_draw_25: {
    id: '217743513',
    name: 'UNO Draw 25',
    boxes: 2,
    description: 'Draw 25 or do something'
  },
  always_has_been: {
    id: '252600902',
    name: 'Always Has Been',
    boxes: 2,
    description: 'Astronaut with gun behind another astronaut'
  },
  gru_plan: {
    id: '131940431',
    name: "Gru's Plan",
    boxes: 4,
    description: 'Gru presenting plan that backfires'
  }
};

// Imgflip API (free tier: 100 captions/month)
// Sign up at imgflip.com/signup to get credentials
const IMGFLIP_USERNAME = process.env.IMGFLIP_USERNAME || '';
const IMGFLIP_PASSWORD = process.env.IMGFLIP_PASSWORD || '';

// Fallback: ComfyUI with meme-specific prompts
const COMFYUI_URL = 'https://spark-comfyui.ngrok.app';
const AUTH = Buffer.from('lumen:studio2026').toString('base64');

// Meme-specific prompts for AI generation (fallback)
const MEME_PROMPTS = {
  drake: (texts) => `Drake Hotline Bling meme format, two panel vertical meme, top panel Drake disapproving and looking away from "${texts[0]}", bottom panel Drake smiling and pointing at "${texts[1]}", white background, bold Impact font text overlay, classic meme format`,
  expanding_brain: (texts) => `Expanding brain meme, 4 panel vertical format, small brain for "${texts[0]}", medium brain for "${texts[1]}", large glowing brain for "${texts[2]}", cosmic enlightened brain for "${texts[3]}", Impact font white text with black outline`,
  distracted_bf: (texts) => `Distracted boyfriend meme, man looking at woman labeled "${texts[1]}" while his girlfriend labeled "${texts[2]}" looks disapprovingly, original is "${texts[0]}", stock photo style, white text labels`,
  this_is_fine: (texts) => `This is fine dog meme, cartoon dog sitting in burning room, speech bubble saying "${texts[0]}", flames and fire, calm expression, meme format`,
  change_my_mind: (texts) => `Steven Crowder Change My Mind meme, man sitting at table with sign that says "${texts[0]}", outdoor campus setting, meme format`,
  stonks: (texts) => `Stonks meme, meme man (pink/peach colored head) in business suit, green upward arrow stock chart, text "${texts[0]}", surreal meme format`,
  uno_draw_25: (texts) => `UNO Draw 25 meme, person holding UNO cards, two options: "${texts[0]}" or "Draw 25 cards", meme format`,
  always_has_been: (texts) => `Always has been meme, two astronauts in space, one looking at Earth saying "${texts[0]}", second astronaut behind with gun saying "${texts[1] || 'Always has been'}", Earth visible, space background`
};

async function generateMemeImgflip(templateId, texts) {
  const params = new URLSearchParams({
    template_id: templateId,
    username: IMGFLIP_USERNAME,
    password: IMGFLIP_PASSWORD,
  });
  
  texts.forEach((text, i) => {
    params.append(`boxes[${i}][text]`, text);
  });

  const response = await fetch('https://api.imgflip.com/caption_image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  const data = await response.json();
  
  if (data.success) {
    return { url: data.data.url, page_url: data.data.page_url, method: 'imgflip' };
  } else {
    throw new Error(data.error_message || 'Imgflip API error');
  }
}

// Fallback: Generate with ComfyUI using meme-specific prompt
async function generateMemeAI(templateKey, texts) {
  const promptFn = MEME_PROMPTS[templateKey];
  if (!promptFn) throw new Error('No AI prompt for this template');
  
  const prompt = promptFn(texts);
  
  // Simple SDXL workflow
  const workflow = {
    "3": {
      "inputs": {
        "seed": Math.floor(Math.random() * 1000000000),
        "steps": 25,
        "cfg": 7.5,
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
      "inputs": { "ckpt_name": "sd_xl_base_1.0.safetensors" },
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
      "inputs": { "text": "photo realistic, photograph, blurry, ugly, deformed, text errors, wrong text", "clip": ["4", 1] },
      "class_type": "CLIPTextEncode"
    },
    "8": {
      "inputs": { "samples": ["3", 0], "vae": ["4", 2] },
      "class_type": "VAEDecode"
    },
    "9": {
      "inputs": { "filename_prefix": "meme", "images": ["8", 0] },
      "class_type": "SaveImage"
    }
  };

  const response = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Basic ${AUTH}`
    },
    body: JSON.stringify({ prompt: workflow })
  });

  if (!response.ok) {
    throw new Error(`ComfyUI error: ${response.status}`);
  }

  const data = await response.json();
  return { 
    prompt_id: data.prompt_id,
    check_at: `${COMFYUI_URL}/view?filename=meme_00001_.png`,
    method: 'ai',
    note: 'AI-generated meme (22 sec processing)'
  };
}

function parseUserInput(input, templateKey) {
  const template = MEME_TEMPLATES[templateKey];
  
  // Try to split by common separators
  const separators = [' vs ', ' / ', ' | ', '\n', ' -> '];
  
  for (const sep of separators) {
    if (input.includes(sep)) {
      const parts = input.split(sep).map(s => s.trim());
      return parts.slice(0, template.boxes);
    }
  }
  
  // If no separator found, use the whole text
  // For multi-box memes, duplicate or truncate as needed
  if (template.boxes === 1) {
    return [input];
  } else if (template.boxes === 2) {
    return [input, input]; // User should provide both
  } else {
    return Array(template.boxes).fill(input);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { template, text, texts } = req.body;

  if (!template) {
    return res.status(400).json({ 
      error: 'Template required',
      available: Object.keys(MEME_TEMPLATES),
      hint: 'Pass template name (e.g., "drake") and text array or single string'
    });
  }

  const templateKey = template.toLowerCase().replace(/[^a-z_]/g, '_');
  const memeTemplate = MEME_TEMPLATES[templateKey];

  if (!memeTemplate) {
    return res.status(400).json({ 
      error: `Unknown template: ${template}`,
      available: Object.keys(MEME_TEMPLATES)
    });
  }

  try {
    // Use provided texts array or parse from single text
    let memeTexts;
    if (Array.isArray(texts)) {
      memeTexts = texts.slice(0, memeTemplate.boxes);
    } else if (text) {
      memeTexts = parseUserInput(text, templateKey);
    } else {
      return res.status(400).json({ 
        error: 'Text required',
        hint: `For ${memeTemplate.name}, provide ${memeTemplate.boxes} text(s). ${memeTemplate.description}`
      });
    }

    // Pad with empty strings if needed
    while (memeTexts.length < memeTemplate.boxes) {
      memeTexts.push('');
    }

    let result;
    
    // Try Imgflip first if credentials exist
    if (IMGFLIP_USERNAME && IMGFLIP_PASSWORD) {
      try {
        result = await generateMemeImgflip(memeTemplate.id, memeTexts);
        return res.status(200).json({
          status: 'success',
          template: memeTemplate.name,
          url: result.url,
          page_url: result.page_url,
          texts: memeTexts,
          method: 'imgflip'
        });
      } catch (imgflipError) {
        console.log('Imgflip failed, trying AI fallback:', imgflipError.message);
      }
    }
    
    // Fallback to AI generation
    result = await generateMemeAI(templateKey, memeTexts);
    return res.status(200).json({
      status: 'generating',
      template: memeTemplate.name,
      prompt_id: result.prompt_id,
      check_at: result.check_at,
      texts: memeTexts,
      method: 'ai',
      message: `🎨 Generating ${memeTemplate.name} meme with AI...`,
      note: 'Processing on DGX Spark (~22 seconds)'
    });

  } catch (error) {
    console.error('Meme generation error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message,
      hint: 'Try again or use a different template'
    });
  }
}
