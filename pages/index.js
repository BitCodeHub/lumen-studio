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
    { name: 'Drake', prompt: 'drake:', template: 'drake', hint: 'Top text vs Bottom text (what you reject vs what you prefer)' },
    { name: 'Expanding Brain', prompt: 'expanding_brain:', template: 'expanding_brain', hint: '4 levels separated by /' },
    { name: 'Distracted BF', prompt: 'distracted_bf:', template: 'distracted_bf', hint: 'Boyfriend / New thing / Girlfriend' },
    { name: 'This Is Fine', prompt: 'this_is_fine:', template: 'this_is_fine', hint: 'Top text / Bottom text' },
    { name: 'Change My Mind', prompt: 'change_my_mind:', template: 'change_my_mind', hint: 'Your controversial opinion' },
    { name: 'Stonks', prompt: 'stonks:', template: 'stonks', hint: 'Your caption' },
    { name: 'UNO Draw 25', prompt: 'uno_draw_25:', template: 'uno_draw_25', hint: 'Do this thing / or draw 25' },
    { name: 'Always Has Been', prompt: 'always_has_been:', template: 'always_has_been', hint: 'Wait its all X? / Always has been' },
  ],
};

export default function Home() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '🎨 Welcome to Lumen Studio!\n\nType what you want to create and I will generate it using your DGX Spark GPU.\n\nOr select a template below to get started.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('image');

  // Check if input is a meme template request
  const detectMemeTemplate = (text) => {
    const memeTemplates = ['drake:', 'expanding_brain:', 'distracted_bf:', 'this_is_fine:', 
                          'change_my_mind:', 'stonks:', 'uno_draw_25:', 'always_has_been:'];
    for (const t of memeTemplates) {
      if (text.toLowerCase().startsWith(t)) {
        return { template: t.replace(':', ''), text: text.substring(t.length).trim() };
      }
    }
    return null;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      // Check if this is a meme request
      const memeRequest = detectMemeTemplate(currentInput);
      
      let res, data;
      
      if (memeRequest) {
        // Use meme API for meme templates
        res = await fetch('/api/meme', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            template: memeRequest.template, 
            text: memeRequest.text 
          })
        });
        data = await res.json();
        
        if (data.status === 'success') {
          // Instant meme from Imgflip
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '😂 ' + data.template + ' meme generated!\n\n',
            image: data.url
          }]);
        } else if (data.status === 'generating') {
          // AI-generated meme (takes ~22 sec)
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '🎨 ' + data.message + '\n\n⏳ Processing on DGX Spark GPU...\n\n🔗 View results: ' + data.check_at
          }]);
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '❌ Error: ' + (data.message || data.error) + '\n\n' + (data.hint || '')
          }]);
        }
      } else {
        // Use regular generate API for images/videos
        res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: currentInput })
        });
        data = await res.json();
        
        if (data.status === 'generating') {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '✅ ' + data.message + '\n\n⏳ Processing on DGX Spark GPU...\nGeneration takes ~22 seconds.\n\n🔗 View results: ' + data.check_at
          }]);
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '❌ Error: ' + data.message + '\n\n' + (data.hint || '')
          }]);
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Connection error. Please try again.'
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
              <div key={i} className={'msg ' + m.role}>
                <pre>{m.content}</pre>
                {m.image && (
                  <a href={m.image} target="_blank" rel="noopener noreferrer">
                    <img src={m.image} alt="Generated meme" className="meme-image" />
                  </a>
                )}
              </div>
            ))}
            {loading && <div className="msg assistant">⏳ Processing...</div>}
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

      <style jsx global>{`
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
        .meme-image { max-width: 100%; border-radius: 8px; margin-top: 8px; cursor: pointer; transition: transform 0.2s; }
        .meme-image:hover { transform: scale(1.02); }
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
      `}</style>
    </div>
  );
}
