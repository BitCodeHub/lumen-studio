// Image proxy - fetches images from ComfyUI with auth and serves to frontend
const COMFYUI_URL = process.env.COMFYUI_URL || 'https://spark-comfyui.ngrok.app';
const AUTH = Buffer.from(process.env.COMFYUI_AUTH || 'lumen:studio2026').toString('base64');

export default async function handler(req, res) {
  const { filename, subfolder, type } = req.query;
  
  if (!filename) {
    return res.status(400).json({ error: 'filename required' });
  }

  try {
    const imageUrl = COMFYUI_URL + '/view?filename=' + encodeURIComponent(filename) + '&subfolder=' + encodeURIComponent(subfolder || '') + '&type=' + encodeURIComponent(type || 'output');
    
    const response = await fetch(imageUrl, {
      headers: { 'Authorization': 'Basic ' + AUTH }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch image' });
    }

    const buffer = await response.arrayBuffer();
    
    res.setHeader('Content-Type', response.headers.get('content-type') || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(Buffer.from(buffer));
    
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
}
