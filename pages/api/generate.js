import axios from 'axios';

const COMFYUI_URL = process.env.COMFYUI_URL || 'http://100.79.93.27:8188';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, type, template } = req.body;

  try {
    // For now, return processing status
    // Full ComfyUI integration requires workflow templates
    return res.status(200).json({
      status: 'queued',
      message: `Processing: ${prompt}`,
      type: type || 'image',
      template: template,
      note: 'Full ComfyUI integration pending. Use WhatsApp for immediate processing.',
      spark_url: COMFYUI_URL
    });

    // TODO: Full ComfyUI API integration
    // const workflow = buildWorkflow(prompt, type, template);
    // const response = await axios.post(`${COMFYUI_URL}/prompt`, { prompt: workflow });
    // return res.status(200).json(response.data);

  } catch (error) {
    console.error('ComfyUI error:', error);
    return res.status(500).json({ error: 'Processing failed', details: error.message });
  }
}
