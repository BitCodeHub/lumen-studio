// Meme Generator API - Uses actual templates with text overlays
// Templates from imgflip.com (most popular meme formats)

const MEME_TEMPLATES = {
  // Viral Classics
  drake: { id: '181913649', name: 'Drake Hotline Bling', boxes: 2 },
  expanding_brain: { id: '93895088', name: 'Expanding Brain', boxes: 4 },
  distracted_bf: { id: '112126428', name: 'Distracted Boyfriend', boxes: 3 },
  woman_yelling_cat: { id: '188390779', name: 'Woman Yelling at Cat', boxes: 2 },
  two_buttons: { id: '87743020', name: 'Two Buttons', boxes: 3 },
  gru_plan: { id: '131940431', name: "Gru's Plan", boxes: 4 },
  
  // Reaction Memes
  this_is_fine: { id: '55311130', name: 'This Is Fine', boxes: 2 },
  surprised_pikachu: { id: '155067746', name: 'Surprised Pikachu', boxes: 1 },
  stonks: { id: '259237855', name: 'Stonks', boxes: 1 },
  not_stonks: { id: '259237855', name: 'Not Stonks', boxes: 1 },
  gigachad: { id: '370867422', name: 'Gigachad', boxes: 1 },
  wojak: { id: '309868304', name: 'Wojak', boxes: 1 },
  
  // Discussion Memes
  change_my_mind: { id: '129242436', name: 'Change My Mind', boxes: 1 },
  uno_draw_25: { id: '217743513', name: 'UNO Draw 25', boxes: 2 },
  always_has_been: { id: '252600902', name: 'Always Has Been', boxes: 2 },
  leonardo_pointing: { id: '274531637', name: 'Leonardo Pointing', boxes: 1 },
  
  // Comparison Memes
  bernie_asking: { id: '91545132', name: 'Bernie I Am Once Again Asking', boxes: 1 },
  buff_doge_cheems: { id: '247375501', name: 'Buff Doge vs Cheems', boxes: 4 },
  virgin_vs_chad: { id: '345077269', name: 'Virgin vs Chad', boxes: 4 },
  batman_slap: { id: '438680', name: 'Batman Slapping Robin', boxes: 2 },
  
  // Gaming & Tech
  press_f: { id: '94282258', name: 'Press F to Pay Respects', boxes: 1 },
  one_does_not_simply: { id: '61579', name: 'One Does Not Simply', boxes: 2 },
  roll_safe: { id: '89370399', name: 'Roll Safe Think About It', boxes: 2 },
  disaster_girl: { id: '97984', name: 'Disaster Girl', boxes: 2 },
  
  // Animal Memes
  doge: { id: '8072285', name: 'Doge', boxes: 1 },
  cheems: { id: '247375501', name: 'Cheems', boxes: 1 },
  evil_kermit: { id: '84341851', name: 'Evil Kermit', boxes: 2 },
  mocking_spongebob: { id: '102156234', name: 'Mocking Spongebob', boxes: 1 },
  
  // More Classics
  success_kid: { id: '61544', name: 'Success Kid', boxes: 2 },
  hide_pain_harold: { id: '27920', name: 'Hide the Pain Harold', boxes: 2 }
};

// Imgflip API (free tier: 100 captions/month)
// Sign up at imgflip.com/signup to get credentials
const IMGFLIP_USERNAME = process.env.IMGFLIP_USERNAME || '';
const IMGFLIP_PASSWORD = process.env.IMGFLIP_PASSWORD || '';

// Fallback: ComfyUI with meme-specific prompts
const COMFYUI_URL = process.env.COMFYUI_URL || 'https://spark-comfyui.ngrok.app';
const AUTH = Buffer.from(process.env.COMFYUI_AUTH || 'lumen:studio2026').toString('base64');

// Meme-specific prompts for AI generation (fallback)
const MEME_PROMPTS = {
  // Viral Classics
  drake: (texts) => `Drake Hotline Bling meme format, two panel vertical meme, top panel Drake disapproving "${texts[0]}", bottom panel Drake approving "${texts[1]}", white background, Impact font`,
  expanding_brain: (texts) => `Expanding brain meme 4 panels, small brain "${texts[0]}", medium brain "${texts[1]}", glowing brain "${texts[2]}", cosmic galaxy brain "${texts[3]}"`,
  distracted_bf: (texts) => `Distracted boyfriend meme, man looking at "${texts[1]}" while girlfriend "${texts[0]}" watches disapprovingly, stock photo style`,
  woman_yelling_cat: (texts) => `Woman yelling at cat meme, left panel angry woman pointing yelling "${texts[0]}", right panel confused white cat at dinner table "${texts[1]}"`,
  two_buttons: (texts) => `Two buttons meme, sweating man choosing between button "${texts[0]}" and button "${texts[1]}", anxious decision`,
  gru_plan: (texts) => `Gru plan meme 4 panels, Gru presenting "${texts[0]}", then "${texts[1]}", then "${texts[2]}", then realizes mistake "${texts[3]}"`,
  
  // Reaction Memes
  this_is_fine: (texts) => `This is fine meme, cartoon dog sitting calmly in burning room, speech bubble "${texts[0]}", flames everywhere`,
  surprised_pikachu: (texts) => `Surprised Pikachu meme, yellow Pikachu with shocked open mouth face, caption "${texts[0]}"`,
  stonks: (texts) => `Stonks meme, meme man surreal face in business suit, green arrow going up, text "${texts[0]}"`,
  not_stonks: (texts) => `Not stonks meme, meme man surreal face looking sad, red arrow going down, text "${texts[0]}"`,
  gigachad: (texts) => `Gigachad meme, extremely muscular handsome man, text "${texts[0]}", sigma male energy`,
  wojak: (texts) => `Wojak crying meme, bald man crying behind happy mask, text "${texts[0]}"`,
  
  // Discussion Memes
  change_my_mind: (texts) => `Change my mind meme, Steven Crowder at table with sign "${texts[0]}", outdoor setting, confident pose`,
  uno_draw_25: (texts) => `UNO Draw 25 meme, person holding many cards, choice between "${texts[0]}" or Draw 25`,
  always_has_been: (texts) => `Always has been meme, astronaut looking at Earth "${texts[0]}", second astronaut behind with gun "${texts[1] || 'Always has been'}"`,
  leonardo_pointing: (texts) => `Leonardo DiCaprio pointing meme from Once Upon Time Hollywood, excited pointing at TV, text "${texts[0]}"`,
  
  // Comparison Memes
  bernie_asking: (texts) => `Bernie Sanders meme, I am once again asking "${texts[0]}", mittens, winter coat`,
  buff_doge_cheems: (texts) => `Buff Doge vs Cheems meme, muscular Shiba "${texts[0]}" vs crying weak Cheems "${texts[1]}"`,
  virgin_vs_chad: (texts) => `Virgin vs Chad meme, hunched virgin "${texts[0]}" vs confident Chad "${texts[1]}"`,
  batman_slap: (texts) => `Batman slapping Robin meme, Robin says "${texts[0]}", Batman slaps saying "${texts[1]}"`,
  
  // Gaming & Tech
  press_f: (texts) => `Press F to pay respects meme, Call of Duty funeral scene, text "${texts[0]}"`,
  one_does_not_simply: (texts) => `One does not simply meme, Boromir from LOTR, text "One does not simply ${texts[0]}"`,
  roll_safe: (texts) => `Roll Safe think about it meme, man tapping head, text "${texts[0]}" with smart solution`,
  disaster_girl: (texts) => `Disaster girl meme, little girl smiling deviously at camera, house burning behind, text "${texts[0]}"`,
  
  // Animal Memes
  doge: (texts) => `Doge meme, Shiba Inu dog with comic sans text, "much ${texts[0]}", "very wow", "so amaze"`,
  cheems: (texts) => `Cheems meme, derpy Shiba Inu, text "${texts[0]}" with misspellings`,
  evil_kermit: (texts) => `Evil Kermit meme, Kermit talking to hooded evil Kermit, "Me: ${texts[0]}" "Also me: ${texts[1]}"`,
  mocking_spongebob: (texts) => `Mocking Spongebob meme, chicken Spongebob, alternating caps text "${texts[0]}"`,
  
  // More Classics
  success_kid: (texts) => `Success kid meme, baby with fist pump, text "${texts[0]}" success story`,
  hide_pain_harold: (texts) => `Hide the Pain Harold meme, older man smiling but eyes show pain, text "${texts[0]}"`
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
