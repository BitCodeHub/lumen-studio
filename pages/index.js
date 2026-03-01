import { useState, useRef } from 'react';
import Head from 'next/head';

const TEMPLATES = {
  image: [
    { id: 'logo', name: 'Logo Design', prompt: 'Create a professional logo for' },
    { id: 'product', name: 'Product Shot', prompt: 'Product photography of' },
    { id: 'portrait', name: 'AI Portrait', prompt: 'Professional portrait photo of' },
    { id: 'landscape', name: 'Landscape', prompt: 'Beautiful landscape of' },
    { id: 'abstract', name: 'Abstract Art', prompt: 'Abstract artistic representation of' },
  ],
  video: [
    { id: 'product_ad', name: 'Product Ad (30s)', style: 'Apple keynote style' },
    { id: 'explainer', name: 'Explainer (60s)', style: 'Clear instructional' },
    { id: 'trailer', name: 'Movie Trailer', style: 'Hollywood blockbuster' },
    { id: 'social', name: 'Social Reel', style: 'TikTok/Instagram' },
    { id: 'anime', name: 'Anime Style', style: 'Japanese animation' },
  ],
  photo: [
    { id: 'retouch', name: 'Pro Retouch', desc: 'Magazine-quality skin and lighting' },
    { id: 'restore', name: 'Photo Restore', desc: 'Fix old/damaged photos' },
    { id: 'background', name: 'Change Background', desc: 'Any location worldwide' },
    { id: 'upscale', name: 'Upscale 4x', desc: 'AI enhancement to 4K' },
    { id: 'style', name: 'Style Transfer', desc: 'Oil painting, anime, etc.' },
  ],
  meme: [
    { id: 'drake', name: 'Drake', format: 'No / Yes comparison' },
    { id: 'brain', name: 'Expanding Brain', format: 'Levels of enlightenment' },
    { id: 'distracted', name: 'Distracted BF', format: 'Temptation meme' },
    { id: 'stonks', name: 'Stonks', format: 'Financial decisions' },
    { id: 'fine', name: 'This Is Fine', format: 'Chaos acceptance' },
  ],
};

export default function Home() {
  const [mode, setMode] = useState('chat');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Welcome to Lumen Studio! Describe what you want to create, or browse templates below.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('image');
  const fileRef = useRef(null);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Simulate processing (will connect to ComfyUI API)
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Processing: "${input}"\n\nThis will connect to DGX Spark ComfyUI API. For now, use WhatsApp to process requests.`,
        type: 'processing'
      }]);
      setLoading(false);
    }, 1000);
  };

  const useTemplate = (template) => {
    setInput(template.prompt || template.desc || template.format || template.name);
  };

  return (
    <div className="container">
      <Head>
        <title>Lumen Studio - AI Creative Platform</title>
        <meta name="description" content="Generate images, videos, edit photos with AI" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header>
        <h1>🎨 Lumen Studio</h1>
        <p>AI-Powered Creative Platform</p>
      </header>

      <main>
        <div className="chat-container">
          <div className="messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {loading && <div className="message assistant loading">Processing...</div>}
          </div>
          
          <div className="input-area">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Describe what you want to create..."
            />
            <button onClick={() => fileRef.current?.click()}>📎</button>
            <button onClick={sendMessage} disabled={loading}>Send</button>
            <input type="file" ref={fileRef} hidden accept="image/*" />
          </div>
        </div>

        <div className="templates">
          <div className="tabs">
            {['image', 'video', 'photo', 'meme'].map(tab => (
              <button
                key={tab}
                className={activeTab === tab ? 'active' : ''}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'image' && '🖼️ Images'}
                {tab === 'video' && '🎬 Video'}
                {tab === 'photo' && '📷 Photo Edit'}
                {tab === 'meme' && '😂 Memes'}
              </button>
            ))}
          </div>
          
          <div className="template-grid">
            {TEMPLATES[activeTab]?.map(t => (
              <div key={t.id} className="template-card" onClick={() => useTemplate(t)}>
                <h3>{t.name}</h3>
                <p>{t.prompt || t.style || t.desc || t.format}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer>
        <p>Powered by DGX Spark • Lumen AI Solutions</p>
      </footer>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: #fff;
          min-height: 100vh;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        header { text-align: center; padding: 30px 0; }
        header h1 { font-size: 2.5rem; margin-bottom: 10px; }
        header p { color: #888; }
        
        .chat-container {
          background: rgba(255,255,255,0.05);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 30px;
        }
        .messages {
          height: 300px;
          overflow-y: auto;
          margin-bottom: 15px;
          padding: 10px;
        }
        .message {
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 10px;
          max-width: 80%;
        }
        .message.user {
          background: #4f46e5;
          margin-left: auto;
        }
        .message.assistant {
          background: rgba(255,255,255,0.1);
        }
        .message.loading { opacity: 0.6; }
        
        .input-area {
          display: flex;
          gap: 10px;
        }
        .input-area input[type="text"] {
          flex: 1;
          padding: 12px 16px;
          border-radius: 8px;
          border: none;
          background: rgba(255,255,255,0.1);
          color: #fff;
          font-size: 16px;
        }
        .input-area button {
          padding: 12px 20px;
          border-radius: 8px;
          border: none;
          background: #4f46e5;
          color: #fff;
          cursor: pointer;
          font-size: 16px;
        }
        .input-area button:hover { background: #4338ca; }
        .input-area button:disabled { opacity: 0.5; }
        
        .templates { margin-top: 30px; }
        .tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .tabs button {
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          background: rgba(255,255,255,0.1);
          color: #fff;
          cursor: pointer;
        }
        .tabs button.active {
          background: #4f46e5;
        }
        
        .template-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 15px;
        }
        .template-card {
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 20px;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s;
        }
        .template-card:hover {
          transform: translateY(-2px);
          background: rgba(255,255,255,0.1);
        }
        .template-card h3 { margin-bottom: 8px; font-size: 1.1rem; }
        .template-card p { color: #888; font-size: 0.9rem; }
        
        footer {
          text-align: center;
          padding: 30px 0;
          color: #666;
        }
      `}</style>
    </div>
  );
}
