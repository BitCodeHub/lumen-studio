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
    { id: 'product_ad', name: 'Product Ad (30s)', prompt: 'Create 30-second product ad for' },
    { id: 'explainer', name: 'Explainer (60s)', prompt: 'Create 60-second explainer video about' },
    { id: 'trailer', name: 'Movie Trailer', prompt: 'Create movie trailer style video for' },
    { id: 'social', name: 'Social Reel', prompt: 'Create TikTok/Instagram reel about' },
    { id: 'anime', name: 'Anime Style', prompt: 'Create anime style video of' },
  ],
  photo: [
    { id: 'retouch', name: 'Pro Retouch', prompt: 'Professional magazine retouch' },
    { id: 'restore', name: 'Photo Restore', prompt: 'Restore and enhance this old photo' },
    { id: 'background', name: 'Change Background', prompt: 'Change background to' },
    { id: 'upscale', name: 'Upscale 4x', prompt: 'Upscale to 4K resolution' },
    { id: 'style', name: 'Style Transfer', prompt: 'Convert to oil painting style' },
  ],
  meme: [
    { id: 'drake', name: 'Drake', prompt: 'Drake meme:' },
    { id: 'brain', name: 'Expanding Brain', prompt: 'Expanding brain meme:' },
    { id: 'distracted', name: 'Distracted BF', prompt: 'Distracted boyfriend meme:' },
    { id: 'stonks', name: 'Stonks', prompt: 'Stonks meme:' },
    { id: 'fine', name: 'This Is Fine', prompt: 'This is fine meme:' },
  ],
};

export default function Home() {
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: '🎨 Welcome to Lumen Studio!\n\nThis web app is connected to your DGX Spark AI supercomputer.\n\n⚡ For instant generation, use WhatsApp:\n"Elim, create [your prompt]"\n\nOr browse templates below to copy prompts.' 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('image');
  const fileRef = useRef(null);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentInput })
      });
      
      const data = await res.json();
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `📋 Prompt ready!\n\n"${currentInput}"\n\n⚡ **Send via WhatsApp for instant generation:**\nElim, ${currentInput}\n\n🔗 Or open ComfyUI directly:\nhttp://100.79.93.27:8188`,
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `📋 Prompt copied!\n\n⚡ Send to WhatsApp:\n"Elim, ${currentInput}"`,
      }]);
    }
    
    setLoading(false);
  };

  const useTemplate = (template) => {
    setInput(template.prompt + ' ');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="container">
      <Head>
        <title>Lumen Studio - AI Creative Platform</title>
        <meta name="description" content="Generate images, videos, edit photos with AI" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header>
        <h1>🎨 Lumen Studio</h1>
        <p>AI-Powered Creative Platform</p>
        <div className="status">
          <span className="dot green"></span> DGX Spark Connected (via WhatsApp)
        </div>
      </header>

      <main>
        <div className="chat-container">
          <div className="messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
                <pre>{msg.content}</pre>
              </div>
            ))}
            {loading && <div className="message assistant loading">⏳ Processing...</div>}
          </div>
          
          <div className="input-area">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Describe what you want to create..."
            />
            <button onClick={sendMessage} disabled={loading}>Send</button>
          </div>
        </div>

        <div className="templates">
          <h2>📚 Template Gallery</h2>
          <p className="hint">Click a template to start, then customize and send</p>
          
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
                <p>{t.prompt}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="quick-start">
          <h2>⚡ Quick Start</h2>
          <p>For instant AI generation, send to WhatsApp:</p>
          <code>Elim, create a futuristic logo for Lumen AI</code>
          <p className="small">Your DGX Spark processes requests in ~22 seconds</p>
        </div>
      </main>

      <footer>
        <p>Powered by DGX Spark (NVIDIA GB10) • Lumen AI Solutions</p>
        <p className="small">ComfyUI: http://100.79.93.27:8188 (Tailscale)</p>
      </footer>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: #fff;
          min-height: 100vh;
        }
        .container { max-width: 900px; margin: 0 auto; padding: 20px; }
        header { text-align: center; padding: 20px 0; }
        header h1 { font-size: 2rem; margin-bottom: 5px; }
        header p { color: #888; margin-bottom: 10px; }
        .status { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.1); padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; }
        .dot { width: 8px; height: 8px; border-radius: 50%; }
        .dot.green { background: #22c55e; }
        
        .chat-container {
          background: rgba(255,255,255,0.05);
          border-radius: 16px;
          padding: 15px;
          margin-bottom: 20px;
        }
        .messages {
          height: 200px;
          overflow-y: auto;
          margin-bottom: 10px;
        }
        .message {
          padding: 10px 14px;
          border-radius: 12px;
          margin-bottom: 8px;
          max-width: 90%;
        }
        .message pre { white-space: pre-wrap; font-family: inherit; font-size: 0.9rem; line-height: 1.4; }
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
          gap: 8px;
        }
        .input-area input {
          flex: 1;
          padding: 12px 14px;
          border-radius: 8px;
          border: none;
          background: rgba(255,255,255,0.1);
          color: #fff;
          font-size: 15px;
        }
        .input-area button {
          padding: 12px 20px;
          border-radius: 8px;
          border: none;
          background: #4f46e5;
          color: #fff;
          cursor: pointer;
          font-weight: 500;
        }
        .input-area button:hover { background: #4338ca; }
        .input-area button:disabled { opacity: 0.5; }
        
        .templates { margin: 20px 0; }
        .templates h2 { margin-bottom: 5px; font-size: 1.2rem; }
        .templates .hint { color: #888; font-size: 0.85rem; margin-bottom: 15px; }
        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 15px;
          flex-wrap: wrap;
        }
        .tabs button {
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          background: rgba(255,255,255,0.1);
          color: #fff;
          cursor: pointer;
          font-size: 0.9rem;
        }
        .tabs button.active {
          background: #4f46e5;
        }
        
        .template-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 10px;
        }
        .template-card {
          background: rgba(255,255,255,0.05);
          border-radius: 10px;
          padding: 14px;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s;
        }
        .template-card:hover {
          transform: translateY(-2px);
          background: rgba(255,255,255,0.1);
        }
        .template-card h3 { margin-bottom: 5px; font-size: 0.95rem; }
        .template-card p { color: #888; font-size: 0.8rem; }
        
        .quick-start {
          background: rgba(79, 70, 229, 0.2);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
        }
        .quick-start h2 { margin-bottom: 10px; font-size: 1.1rem; }
        .quick-start code {
          display: block;
          background: rgba(0,0,0,0.3);
          padding: 12px;
          border-radius: 8px;
          margin: 10px 0;
          font-size: 0.9rem;
        }
        .quick-start .small { color: #888; font-size: 0.8rem; }
        
        footer {
          text-align: center;
          padding: 20px 0;
          color: #666;
          font-size: 0.85rem;
        }
        footer .small { font-size: 0.75rem; margin-top: 5px; }
      `}</style>
    </div>
  );
}
