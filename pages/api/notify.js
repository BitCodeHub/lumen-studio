// WhatsApp Notification API
// Sends notifications when video generation completes

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { message, target } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message required' });
  }
  
  try {
    // Try to send via clawdbot message tool
    // This hooks into the local gateway
    const response = await fetch('http://localhost:3002/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'whatsapp',
        target: target || '+19495422279',
        message
      })
    }).catch(() => null);
    
    if (response?.ok) {
      return res.status(200).json({ success: true, method: 'gateway' });
    }
    
    // Fallback: Log to console for manual pickup
    console.log('=== VIDEO NOTIFICATION ===');
    console.log('Target:', target);
    console.log('Message:', message);
    console.log('========================');
    
    return res.status(200).json({ 
      success: true, 
      method: 'logged',
      note: 'Notification logged. Gateway not available.'
    });
    
  } catch (e) {
    console.error('Notification error:', e);
    return res.status(500).json({ error: e.message });
  }
}
