export default async function handler(req, res) {
  try {
    // For Render deployment - fetch from Cloudflare Workers gallery
    // Format the URL correctly
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    const response = await fetch('https://lumen-gallery.lumenai.workers.dev/gallery' + `?page=${page}&limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`Gallery CDN returned ${response.status}`);
    }
    
    const data = await response.json();
    
    res.status(200).json({
      images: data.images || [],
      total: data.total || 0,
      page: page,
      limit: limit,
      hasMore: data.hasMore || false
    });
  } catch (error) {
    console.error('Trends API error:', error);
    res.status(500).json({ error: 'Failed to fetch trends', message: error.message });
  }
}
