export default async function handler(req, res) {
  try {
    // Fetch from gallery API (same images)
    const galleryUrl = 'https://lumen-gallery.lumenai.workers.dev/images';
    const response = await fetch(galleryUrl);
    const data = await response.json();
    
    // Return in same format as gallery
    res.status(200).json({
      images: data.images || [],
      total: data.total || 0,
      page: 1,
      limit: 24,
      hasMore: data.total > 24
    });
  } catch (error) {
    console.error('Trends API error:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
}
