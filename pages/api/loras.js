// List available LoRAs from ComfyUI
const COMFYUI_URL = process.env.COMFYUI_URL || 'http://localhost:8188';
const AUTH = Buffer.from(process.env.COMFYUI_AUTH || 'lumen:studio2026').toString('base64');

// Category mapping for trained LoRAs
const LORA_CATEGORIES = {
  'food': ['food_lora', 'cuisine', 'restaurant', 'dish'],
  'portrait': ['portrait_lora', 'face', 'headshot', 'fashion_portrait'],
  'product': ['product_lora', 'commercial', 'ecommerce'],
  'automotive': ['automotive_lora', 'car', 'vehicle'],
  'architecture': ['architecture_lora', 'interior', 'building'],
  'landscape': ['landscape_lora', 'nature', 'scenic'],
  'wedding': ['wedding_lora', 'bridal'],
  'fashion': ['fashion_lora', 'style', 'clothing'],
};

export default async function handler(req, res) {
  try {
    // Get object info which includes available LoRAs
    const response = await fetch(COMFYUI_URL + '/object_info/LoraLoader', {
      headers: { 'Authorization': 'Basic ' + AUTH }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch LoRA list');
    }

    const data = await response.json();
    const loraList = data?.LoraLoader?.input?.required?.lora_name?.[0] || [];

    // Categorize LoRAs
    const categorized = {};
    const uncategorized = [];

    for (const lora of loraList) {
      const loraLower = lora.toLowerCase();
      let found = false;

      for (const [category, keywords] of Object.entries(LORA_CATEGORIES)) {
        if (keywords.some(kw => loraLower.includes(kw))) {
          if (!categorized[category]) categorized[category] = [];
          categorized[category].push(lora);
          found = true;
          break;
        }
      }

      if (!found) {
        uncategorized.push(lora);
      }
    }

    // Return structured response
    return res.status(200).json({
      loras: loraList,
      categorized,
      uncategorized,
      total: loraList.length,
      trained: Object.keys(categorized).reduce((acc, cat) => {
        return acc + (categorized[cat]?.filter(l => l.includes('_lora')).length || 0);
      }, 0)
    });

  } catch (error) {
    console.error('LoRA list error:', error);
    return res.status(500).json({ 
      error: error.message,
      loras: [],
      categorized: {},
      uncategorized: []
    });
  }
}
