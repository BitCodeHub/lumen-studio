// Poll for generation status and get the image when ready
const COMFYUI_URL = process.env.COMFYUI_URL || 'http://localhost:8188';
const AUTH = Buffer.from(process.env.COMFYUI_AUTH || 'lumen:studio2026').toString('base64');

export default async function handler(req, res) {
  const { prompt_id } = req.query;

  if (!prompt_id) {
    return res.status(400).json({ error: 'prompt_id required' });
  }

  try {
    // Check if the prompt is done
    const historyRes = await fetch(COMFYUI_URL + '/history/' + prompt_id, {
      headers: { 'Authorization': 'Basic ' + AUTH }
    });

    if (!historyRes.ok) {
      return res.status(200).json({ status: 'pending' });
    }

    const history = await historyRes.json();
    const promptData = history[prompt_id];

    if (!promptData || !promptData.outputs) {
      return res.status(200).json({ status: 'pending' });
    }

    // Find the output image
    for (const nodeId in promptData.outputs) {
      const output = promptData.outputs[nodeId];
      if (output.images && output.images.length > 0) {
        const image = output.images[0];
        // Use proxy endpoint to avoid CORS/auth issues
        const imageUrl = '/api/image?filename=' + encodeURIComponent(image.filename) + '&subfolder=' + encodeURIComponent(image.subfolder || '') + '&type=' + encodeURIComponent(image.type || 'output');
        
        // Return filename for future edit operations
        return res.status(200).json({
          status: 'complete',
          image_url: imageUrl,
          filename: image.filename,
          subfolder: image.subfolder || '',
          type: image.type || 'output'
        });
      }
    }

    return res.status(200).json({ status: 'pending' });

  } catch (error) {
    console.error('Status check error:', error);
    return res.status(200).json({ status: 'pending' });
  }
}
