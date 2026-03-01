import { useState } from 'react';
import Head from 'next/head';

const TEMPLATES = {
  image: [
    { name: 'Logo Design', prompt: 'Professional modern logo for' },
    { name: 'Product Shot', prompt: 'Professional product photography of' },
    { name: 'Portrait', prompt: 'Professional portrait photo of' },
    { name: 'Landscape', prompt: 'Beautiful cinematic landscape of' },
    { name: 'Abstract', prompt: 'Abstract artistic representation of' },
  ],
  video: [
    { name: 'Product Ad', prompt: 'Create 30-second Apple-style ad for' },
    { name: 'Explainer', prompt: 'Create 60-second explainer video about' },
    { name: 'Trailer', prompt: 'Create Hollywood movie trailer for' },
    { name: 'Social Reel', prompt: 'Create TikTok viral reel about' },
  ],
  photo: [
    { name: 'Retouch', prompt: 'Professional magazine quality retouch' },
    { name: 'Restore', prompt: 'Restore and enhance this photo' },
    { name: 'Background', prompt: 'Change background to' },
    { name: 'Upscale', prompt: 'Upscale to 4K HD quality' },
  ],
  meme: [
    { name: 'Drake', prompt: 'Drake meme format:' },
    { name: 'Expanding Brain', prompt: 'Expanding brain meme:' },
    { name: 'Distracted BF', prompt: 'Distracted boyfriend meme:' },
    { name: 'This Is Fine', prompt: 'This is fine meme:' },
  ],
};

export default function Home() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '🎨 Welcome to Lumen Studio!\n\nType what you want to create and I will generate it using your DGX Spark GPU.\n\nOr select a template below to get started.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('image');

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    setMessages(prev => [...prev, { role: 'user', content: input }]);
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
      
      if (data.status === 'generating') {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: \`✅ \${data.message}\n\n⏳ Processing on DGX Spark GPU...\nGeneration takes ~22 seconds.\n\n🔗 View results: \${data.check_at}\`
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: \`❌ Error: \${data.message}\n\n\${data.hint || ''}\`
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: \`❌ Connection error. Please try again.\`
      }]);
    }
    
    setLoading(false);
  };

  return (
    <div className="container">
      <Head>
        <title>Lumen Studio - AI Creative Platform</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header>
        <h1>🎨 Lumen Studio</h1>
        <p>AI-Powered Creative Platform</p>
        <span className="badge">⚡ DGX Spark Connected</span>
      </header>

      <main>
        <div className="chat">
          <div className="messages">
            {messages.map((m, i) => (
              <div key={i} className={\`msg \${m.role}\`}>
                <pre>{m.content}</pre>
              </div>
            ))}
            {loading && <div className="msg assistant">⏳ Sending to DGX Spark...</div>}
          </div>
          
          <div className="input-row">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && sendMessage()}
              placeholder="Describe what you want to create..."
              disabled={loading}
            />
            <button onClick={sendMessage} disabled={loading}>
              {loading ? '...' : 'Generate'}
            </button>
          </div>
        </div>

        <div className="templates">
          <div className="tabs">
            {Object.keys(TEMPLATES).map(t => (
              <button key={t} className={activeTab === t ? 'active' : ''} onClick={() => setActiveTab(t)}>
                {t === 'image' ? '🖼️' : t === 'video' ? '🎬' : t === 'photo' ? '📷' : '😂'} {t}
              </button>
            ))}
          </div>
          <div className="grid">
            {TEMPLATES[activeTab].map((t, i) => (
              <div key={i} className="card" onClick={() => setInput(t.prompt + ' ')}>
                <strong>{t.name}</strong>
                <small>{t.prompt}</small>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer>Powered by DGX Spark • Lumen AI</footer>

      <style jsx global>{\`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, sans-serif; background: #0f0f1a; color: #fff; min-height: 100vh; }
        .container { max-width: 800px; margin: 0 auto; padding: 16px; }
        header { text-align: center; padding: 20px 0; }
        header h1 { font-size: 1.8rem; }
        header p { color: #888; font-size: 0.9rem; }
        .badge { display: inline-block; background: #22c55e33; color: #22c55e; padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; margin-top: 8px; }
        .chat { background: #1a1a2e; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
        .messages { height: 250px; overflow-y: auto; margin-bottom: 12px; }
        .msg { padding: 10px 14px; border-radius: 10px; margin-bottom: 8px; max-width: 85%; }
        .msg pre { white-space: pre-wrap; font-family: inherit; font-size: 0.9rem; line-height: 1.4; }
        .msg.user { background: #4f46e5; margin-left: auto; }
        .msg.assistant { background: #2a2a3e; }
        .input-row { display: flex; gap: 8px; }
        .input-row input { flex: 1; padding: 12px; border-radius: 8px; border: none; background: #2a2a3e; color: #fff; font-size: 15px; }
        .input-row button { padding: 12px 20px; border-radius: 8px; border: none; background: #4f46e5; color: #fff; cursor: pointer; font-weight: 600; }
        .input-row button:disabled { opacity: 0.5; }
        .templates { margin: 16px 0; }
        .tabs { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
        .tabs button { padding: 8px 14px; border-radius: 8px; border: none; background: #2a2a3e; color: #fff; cursor: pointer; text-transform: capitalize; }
        .tabs button.active { background: #4f46e5; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
        .card { background: #1a1a2e; padding: 14px; border-radius: 10px; cursor: pointer; transition: 0.2s; }
        .card:hover { background: #2a2a3e; transform: translateY(-2px); }
        .card strong { display: block; margin-bottom: 4px; font-size: 0.95rem; }
        .card small { color: #888; font-size: 0.8rem; }
        footer { text-align: center; padding: 20px; color: #666; font-size: 0.85rem; }
      \`}</style>
    </div>
  );
}
