export default function handler(req, res) {
  res.status(200).json({ 
    status: 'ok', 
    service: 'Lumen Studio',
    version: '1.0.0',
    capabilities: ['image', 'video', 'photo', 'meme'],
    templates: '3000+'
  });
}
