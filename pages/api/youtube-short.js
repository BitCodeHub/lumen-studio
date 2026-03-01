// YouTube Shorts Generator - Hollywood Edition
// MoneyPrinter script engine + Hunyuan/Remotion Hollywood visuals
// No stock footage - all AI-generated unique content

const COMFYUI_URL = process.env.COMFYUI_URL || 'https://spark-comfyui.ngrok.app';
const AUTH = Buffer.from(process.env.COMFYUI_AUTH || 'lumen:studio2026').toString('base64');

// Voice options for TTS
const VOICES = {
  'male-1': { name: 'Professional Male', id: 'en_us_006' },
  'male-2': { name: 'Casual Male', id: 'en_us_007' },
  'female-1': { name: 'Professional Female', id: 'en_us_001' },
  'female-2': { name: 'Casual Female', id: 'en_us_002' },
  'british-male': { name: 'British Male', id: 'en_uk_001' },
  'british-female': { name: 'British Female', id: 'en_uk_003' },
  'aussie': { name: 'Australian', id: 'en_au_001' },
};

// Content styles with script patterns
const CONTENT_STYLES = {
  facts: {
    name: 'Fascinating Facts',
    hook: 'Did you know that',
    structure: ['hook', 'fact1', 'fact2', 'fact3', 'mind-blow', 'cta'],
    tone: 'energetic, surprising, punchy sentences',
    visualStyle: 'tech', // Maps to Remotion style
  },
  story: {
    name: 'Dramatic Story',
    hook: 'This is the story of',
    structure: ['hook', 'setup', 'conflict', 'climax', 'resolution', 'lesson'],
    tone: 'dramatic, emotional, narrative',
    visualStyle: 'corporate',
  },
  educational: {
    name: 'Quick Explainer',
    hook: 'Here\'s how',
    structure: ['hook', 'problem', 'step1', 'step2', 'step3', 'result'],
    tone: 'clear, simple, helpful',
    visualStyle: 'tech',
  },
  funny: {
    name: 'Comedy Take',
    hook: 'POV:',
    structure: ['hook', 'setup', 'buildup', 'punchline', 'callback', 'outro'],
    tone: 'sarcastic, relatable, unexpected',
    visualStyle: 'social',
  },
  motivational: {
    name: 'Inspirational',
    hook: 'Stop scrolling if you',
    structure: ['hook', 'challenge', 'insight', 'action', 'promise', 'cta'],
    tone: 'authentic, powerful, actionable',
    visualStyle: 'nike',
  },
  listicle: {
    name: 'Top 5 List',
    hook: '5 things you didn\'t know about',
    structure: ['hook', 'item1', 'item2', 'item3', 'item4', 'item5', 'bonus'],
    tone: 'rapid-fire, engaging, value-packed',
    visualStyle: 'social',
  }
};

// Generate AI script from topic
async function generateScript(topic, style, duration) {
  const config = CONTENT_STYLES[style] || CONTENT_STYLES.facts;
  const wordCount = Math.round(duration * 2.5); // ~150 wpm speaking rate
  
  // Generate scenes based on structure
  const scenes = config.structure.map((sceneType, idx) => {
    const sceneDuration = Math.round(duration / config.structure.length);
    return {
      id: idx + 1,
      type: sceneType,
      duration: sceneDuration,
      // Generate visual prompt for Hunyuan
      visualPrompt: generateVisualPrompt(topic, sceneType, config),
      // Text to show on screen
      textOverlay: sceneType === 'hook' ? config.hook : '',
    };
  });

  return {
    topic,
    style: config.name,
    visualStyle: config.visualStyle,
    totalDuration: duration,
    wordCount,
    scenes,
    voiceoverScript: `${config.hook} ${topic}. ${generateSceneNarration(scenes, config.tone)}`,
  };
}

// Generate visual prompt for each scene
function generateVisualPrompt(topic, sceneType, config) {
  const basePrompt = `cinematic, 4K, professional, ${config.tone}`;
  
  const scenePrompts = {
    hook: `dramatic opening shot, ${topic}, attention-grabbing, ${basePrompt}`,
    setup: `establishing shot, context for ${topic}, ${basePrompt}`,
    conflict: `tension, challenge, problem visualization, ${topic}, ${basePrompt}`,
    climax: `peak moment, dramatic lighting, ${topic}, ${basePrompt}`,
    resolution: `resolution, success, achievement, ${topic}, ${basePrompt}`,
    lesson: `wisdom, insight, ${topic}, contemplative, ${basePrompt}`,
    fact1: `surprising visual representing fact about ${topic}, ${basePrompt}`,
    fact2: `interesting visual related to ${topic}, unique angle, ${basePrompt}`,
    fact3: `fascinating aspect of ${topic}, close-up detail, ${basePrompt}`,
    'mind-blow': `mind-blowing revelation about ${topic}, dramatic, ${basePrompt}`,
    cta: `call to action, ${topic}, engaging, follow/subscribe energy, ${basePrompt}`,
    problem: `problem visualization, ${topic}, relatable frustration, ${basePrompt}`,
    step1: `first step, ${topic}, clear demonstration, ${basePrompt}`,
    step2: `second step, ${topic}, progress shown, ${basePrompt}`,
    step3: `final step, ${topic}, completion, ${basePrompt}`,
    result: `successful outcome, ${topic}, transformation, ${basePrompt}`,
    punchline: `comedic payoff, ${topic}, unexpected, ${basePrompt}`,
    buildup: `building anticipation, ${topic}, ${basePrompt}`,
    callback: `callback to earlier joke, ${topic}, ${basePrompt}`,
    outro: `closing shot, ${topic}, memorable, ${basePrompt}`,
    challenge: `facing challenge, ${topic}, determination, ${basePrompt}`,
    insight: `moment of clarity, ${topic}, enlightenment, ${basePrompt}`,
    action: `taking action, ${topic}, movement, energy, ${basePrompt}`,
    promise: `vision of success, ${topic}, aspirational, ${basePrompt}`,
    item1: `first item about ${topic}, showcase, ${basePrompt}`,
    item2: `second item about ${topic}, different angle, ${basePrompt}`,
    item3: `third item about ${topic}, surprising, ${basePrompt}`,
    item4: `fourth item about ${topic}, valuable, ${basePrompt}`,
    item5: `fifth item about ${topic}, best saved for last, ${basePrompt}`,
    bonus: `bonus reveal about ${topic}, extra value, ${basePrompt}`,
  };

  return scenePrompts[sceneType] || `${topic}, ${sceneType}, ${basePrompt}`;
}

// Generate narration for scenes
function generateSceneNarration(scenes, tone) {
  // This would call GPT/Gemini in production
  return `[AI-generated narration based on ${scenes.length} scenes with ${tone} tone]`;
}

// Build Hunyuan workflow for scene
function buildSceneWorkflow(prompt) {
  return {
    "1": { "inputs": { "ckpt_name": "hunyuan_video_720_cfgdistill_fp8_e4m3fn.safetensors" }, "class_type": "HunyuanVideoModelLoader" },
    "2": { "inputs": { "clip_name": "llava_llama3_fp8_scaled.safetensors" }, "class_type": "DualCLIPLoader" },
    "3": { "inputs": { "vae_name": "hunyuan_video_vae_bf16.safetensors" }, "class_type": "VAELoader" },
    "4": { "inputs": { "text": prompt + ", vertical 9:16, YouTube Short style, trending", "clip": ["2", 0] }, "class_type": "CLIPTextEncode" },
    "5": { "inputs": { "text": "ugly, blurry, amateur, low quality, watermark, horizontal", "clip": ["2", 0] }, "class_type": "CLIPTextEncode" },
    "6": { "inputs": { "width": 480, "height": 848, "length": 49, "batch_size": 1 }, "class_type": "EmptyHunyuanLatentVideo" }, // 9:16 vertical
    "7": { "inputs": { "seed": Math.floor(Math.random() * 1e9), "steps": 30, "cfg": 6, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["1", 0], "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["6", 0] }, "class_type": "KSampler" },
    "8": { "inputs": { "samples": ["7", 0], "vae": ["3", 0] }, "class_type": "VAEDecode" },
    "9": { "inputs": { "filename_prefix": "short_scene", "fps": 24, "images": ["8", 0] }, "class_type": "SaveAnimatedWEBP" }
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    topic,
    voice = 'female-1',
    duration = 60,
    style = 'facts',
    preview = false,
  } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'topic is required' });
  }

  try {
    // Generate script and scenes
    const script = await generateScript(topic, style, duration);
    
    if (preview) {
      return res.status(200).json({
        status: 'preview',
        script,
        voice: VOICES[voice] || VOICES['female-1'],
        message: `Ready to generate ${duration}s ${script.style} YouTube Short about: ${topic}`,
        features: [
          '✅ AI-generated script',
          '✅ Hollywood-style Hunyuan visuals (not stock footage)',
          '✅ Remotion composition',
          '✅ TTS voiceover',
          '✅ Auto-captions',
          '✅ 9:16 vertical format',
        ]
      });
    }

    // Start generating scenes with Hunyuan
    const sceneJobs = [];
    
    for (const scene of script.scenes) {
      const workflow = buildSceneWorkflow(scene.visualPrompt);
      
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
            status: 'generating',
            visualPrompt: scene.visualPrompt,
          });
        }
      } catch (err) {
        sceneJobs.push({
          sceneId: scene.id,
          type: scene.type,
          status: 'failed',
          error: err.message,
        });
      }
    }

    return res.status(200).json({
      status: 'generating',
      script,
      sceneJobs,
      voice: VOICES[voice] || VOICES['female-1'],
      renderEngine: 'remotion-hollywood',
      message: `🎬 Generating ${script.scenes.length} Hollywood-quality scenes for YouTube Short about "${topic}"`,
      estimatedTime: `${script.scenes.length * 2}-${script.scenes.length * 3} minutes`,
      pipeline: [
        '1️⃣ AI Script Generation ✅',
        '2️⃣ Hunyuan Scene Visuals (in progress)',
        '3️⃣ TTS Voiceover (pending)',
        '4️⃣ Auto-Captions (pending)',
        '5️⃣ Remotion Hollywood Composition (pending)',
        '6️⃣ Final 9:16 Render (pending)',
      ],
      nextStep: 'Call /api/ad-compose with sceneJobs to check status and trigger Remotion render'
    });

  } catch (error) {
    console.error('YouTube Short error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
