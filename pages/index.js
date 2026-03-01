import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

const CAPABILITIES = {
  generate: {
    title: 'Generate',
    icon: '✨',
    desc: 'Create images from text',
    templates: [
      { name: 'Logo Design', prompt: 'Professional modern logo for' },
      { name: 'Product Shot', prompt: 'Professional product photography of' },
      { name: 'Portrait', prompt: 'Professional portrait photo of' },
      { name: 'Landscape', prompt: 'Cinematic landscape of' },
      { name: 'Concept Art', prompt: 'Concept art of' },
      { name: 'Architecture', prompt: 'Architectural visualization of' },
    ]
  },
  video: {
    title: 'Video',
    icon: '🎬',
    desc: 'AI video generation',
    templates: [
      { name: 'Product Ad', prompt: 'Create 30-second Apple-style ad for' },
      { name: 'Explainer', prompt: 'Create 60-second explainer video about' },
      { name: 'Movie Trailer', prompt: 'Create Hollywood movie trailer for' },
      { name: 'Social Reel', prompt: 'Create TikTok viral reel about' },
      { name: 'Documentary', prompt: 'Create Netflix-style documentary about' },
      { name: 'Music Video', prompt: 'Create MTV-style music video for' },
    ]
  },
  edit: {
    title: 'Edit',
    icon: '🖼',
    desc: 'Transform existing images',
    templates: [
      { name: 'Upscale 4K', prompt: 'Upscale to 4K HD quality:' },
      { name: 'Remove BG', prompt: 'Remove background from:' },
      { name: 'Face Restore', prompt: 'Restore and enhance face in:' },
      { name: 'Colorize', prompt: 'Colorize this black and white image:' },
      { name: 'Style Transfer', prompt: 'Apply artistic style to:' },
      { name: 'Inpaint', prompt: 'Edit and fix this image:' },
    ]
  },
  animate: {
    title: 'Animate',
    icon: '🎭',
    desc: 'Bring images to life',
    templates: [
      { name: 'Image to Video', prompt: 'Animate this image:' },
      { name: 'Character Motion', prompt: 'Add walking motion to:' },
      { name: 'Camera Move', prompt: 'Add cinematic camera movement:' },
      { name: 'Loop Animation', prompt: 'Create seamless loop of:' },
    ]
  },
  meme: {
    title: 'Meme',
    icon: '😂',
    desc: 'Create viral memes',
    templates: [
      { name: 'Drake', prompt: 'drake:' },
      { name: 'Expanding Brain', prompt: 'expanding_brain:' },
      { name: 'Distracted BF', prompt: 'distracted_bf:' },
      { name: 'This Is Fine', prompt: 'this_is_fine:' },
      { name: 'Stonks', prompt: 'stonks:' },
      { name: 'Change My Mind', prompt: 'change_my_mind:' },
    ]
  },
  model3d: {
    title: '3D',
    icon: '🧊',
    desc: 'Generate 3D models',
    templates: [
      { name: 'Object', prompt: '3D model of' },
      { name: 'Character', prompt: '3D character model of' },
      { name: 'Scene', prompt: '3D environment scene of' },
      { name: 'Product', prompt: '3D product model of' },
    ]
  }
};

const QUICK_ACTIONS = ['Logo', 'Product Photo', 'Meme', 'Video Ad', '3D Model', 'Animate'];

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const detectMemeTemplate = (text) => {
    const templates = ['drake:', 'expanding_brain:', 'distracted_bf:', 'this_is_fine:', 'stonks:', 'change_my_mind:', 'woman_yelling_cat:', 'surprised_pikachu:', 'gigachad:', 'wojak:', 'uno_draw_25:', 'always_has_been:'];
    for (const t of templates) {
      if (text.toLowerCase().startsWith(t)) {
        return { template: t.replace(':', ''), text: text.substring(t.length).trim() };
      }
    }
    return null;
  };

  const pollForImage = async (promptId, messageIndex) => {
    let attempts = 0;
    const poll = async () => {
      try {
        const res = await fetch('/api/status?prompt_id=' + promptId);
        const data = await res.json();
        if (data.status === 'complete' && data.image_url) {
          setMessages(prev => {
            const updated = [...prev];
            updated[messageIndex] = { ...updated[messageIndex], content: null, image: data.image_url, status: 'complete' };
            return updated;
          });
          return;
        }
        if (++attempts < 60) setTimeout(poll, 1000);
        else {
          setMessages(prev => {
            const updated = [...prev];
            updated[messageIndex] = { ...updated[messageIndex], content: 'Generation timed out. Please try again.', status: 'error' };
            return updated;
          });
        }
      } catch (e) { console.error(e); }
    };
    poll();
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const currentInput = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: currentInput }]);
    setLoading(true);

    try {
      const memeRequest = detectMemeTemplate(currentInput);
      let res, data;

      if (memeRequest) {
        res = await fetch('/api/meme', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template: memeRequest.template, text: memeRequest.text })
        });
        data = await res.json();
        
        if (data.status === 'success') {
          setMessages(prev => [...prev, { role: 'assistant', image: data.url, status: 'complete' }]);
        } else if (data.status === 'generating' && data.prompt_id) {
          const idx = messages.length + 1;
          setMessages(prev => [...prev, { role: 'assistant', status: 'loading' }]);
          setLoading(false);
          pollForImage(data.prompt_id, idx);
          return;
        }
      } else {
        res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: currentInput })
        });
        data = await res.json();
        
        if (data.status === 'generating' && data.prompt_id) {
          const idx = messages.length + 1;
          setMessages(prev => [...prev, { role: 'assistant', status: 'loading' }]);
          setLoading(false);
          pollForImage(data.prompt_id, idx);
          return;
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.', status: 'error' }]);
    }
    setLoading(false);
  };

  const startNewChat = () => {
    if (messages.length > 0) {
      setChatHistory(prev => [...prev, { id: Date.now(), messages: messages, preview: messages[0]?.content?.slice(0, 30) }]);
    }
    setMessages([]);
    setActiveMode(null);
  };

  return (
    <div className="app">
      <Head>
        <title>Lumen Creative Studio - Luna Labs</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      </Head>

      {/* Sidebar */}
      <aside className="sidebar">
        <header className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">L</span>
            <div>
              <span className="logo-title">Lumen Creative Studio</span>
              <span className="logo-subtitle">Luna Labs</span>
            </div>
          </div>
        </header>

        <button className="new-chat-btn" onClick={startNewChat}>
          <span>+</span> New Creation
        </button>

        <div className="sidebar-section">
          <span className="section-label">CHAT HISTORY</span>
          {chatHistory.length === 0 ? (
            <p className="empty-text">No previous chats</p>
          ) : (
            chatHistory.slice(-5).reverse().map(chat => (
              <button key={chat.id} className="history-item" onClick={() => setMessages(chat.messages)}>
                {chat.preview || 'Untitled'}...
              </button>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <div className="documents-section">
            <span className="section-label">CAPABILITIES</span>
            <p className="capability-count">6 modes available</p>
          </div>
          <p className="powered-by">Powered by Luna Labs AI</p>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        {messages.length === 0 ? (
          <div className="welcome">
            <div className="welcome-content">
              <h1>Lumen Creative Studio</h1>
              <p className="welcome-subtitle">Generate images, videos, 3D models, and more. Powered by Luna Labs - AI Supercomputer.</p>

              <div className="capabilities-grid">
                {Object.entries(CAPABILITIES).map(([key, cap]) => (
                  <button key={key} className={'capability-card' + (activeMode === key ? ' active' : '')} onClick={() => setActiveMode(activeMode === key ? null : key)}>
                    <span className="cap-icon">{cap.icon}</span>
                    <div>
                      <span className="cap-title">{cap.title}</span>
                      <span className="cap-desc">{cap.desc}</span>
                    </div>
                  </button>
                ))}
              </div>

              {activeMode && (
                <div className="templates-section">
                  <span className="section-label">{CAPABILITIES[activeMode].title.toUpperCase()} TEMPLATES</span>
                  <div className="templates-row">
                    {CAPABILITIES[activeMode].templates.map((t, i) => (
                      <button key={i} className="template-pill" onClick={() => setInput(t.prompt + ' ')}>
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="quick-actions">
                {QUICK_ACTIONS.map((action, i) => (
                  <button key={i} className="quick-pill" onClick={() => setInput(action + ': ')}>
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="chat-area">
            <div className="messages">
              {messages.map((m, i) => (
                <div key={i} className={'message ' + m.role}>
                  {m.role === 'assistant' && <div className="avatar">L</div>}
                  <div className="message-body">
                    {m.status === 'loading' && (
                      <div className="loading-state">
                        <div className="spinner"></div>
                        <span>Creating your content...</span>
                      </div>
                    )}
                    {m.content && <p>{m.content}</p>}
                    {m.image && (
                      <div className="image-result">
                        <img src={m.image} alt="Generated" />
                        <div className="image-buttons">
                          <a href={m.image} target="_blank" rel="noopener noreferrer">Open</a>
                          <a href={m.image} download className="primary">Download</a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Input */}
        <div className="input-area">
          <div className="input-box">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && sendMessage()}
              placeholder="Describe what you want to create..."
              disabled={loading}
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()} className="send-btn">
              {loading ? <span className="spinner small"></span> : '→'}
            </button>
          </div>
          <div className="input-hints">
            {['Logo design', 'Product photo', 'Drake meme', 'Video ad'].map((hint, i) => (
              <button key={i} className="hint-pill" onClick={() => setInput(hint)}>{hint}</button>
            ))}
          </div>
        </div>
      </main>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, sans-serif; background: #0d0d0d; color: #e5e5e5; }
        
        .app { display: flex; height: 100vh; }
        
        /* Sidebar */
        .sidebar { width: 260px; background: #111; border-right: 1px solid #1a1a1a; display: flex; flex-direction: column; }
        .sidebar-header { padding: 16px; border-bottom: 1px solid #1a1a1a; }
        .logo { display: flex; align-items: center; gap: 12px; }
        .logo-icon { width: 32px; height: 32px; background: #22c55e; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 600; color: #000; }
        .logo-title { display: block; font-weight: 600; font-size: 14px; }
        .logo-subtitle { display: block; font-size: 11px; color: #666; }
        
        .new-chat-btn { margin: 16px; padding: 12px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; color: #fff; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.15s; }
        .new-chat-btn:hover { background: #222; border-color: #22c55e; }
        .new-chat-btn span { color: #22c55e; font-size: 18px; }
        
        .sidebar-section { flex: 1; padding: 0 16px; }
        .section-label { display: block; font-size: 11px; font-weight: 600; color: #555; letter-spacing: 0.5px; margin-bottom: 12px; }
        .empty-text { font-size: 13px; color: #444; }
        .history-item { display: block; width: 100%; text-align: left; padding: 10px 12px; background: transparent; border: none; color: #888; font-size: 13px; border-radius: 6px; cursor: pointer; margin-bottom: 4px; }
        .history-item:hover { background: #1a1a1a; color: #fff; }
        
        .sidebar-footer { padding: 16px; border-top: 1px solid #1a1a1a; }
        .documents-section { margin-bottom: 12px; }
        .capability-count { font-size: 13px; color: #666; }
        .powered-by { font-size: 11px; color: #444; }
        
        /* Main */
        .main { flex: 1; display: flex; flex-direction: column; background: #0d0d0d; }
        
        .welcome { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px; }
        .welcome-content { max-width: 800px; text-align: center; }
        .welcome-content h1 { font-size: 32px; font-weight: 600; margin-bottom: 12px; }
        .welcome-subtitle { color: #666; font-size: 16px; margin-bottom: 40px; }
        
        .capabilities-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 32px; }
        .capability-card { display: flex; align-items: center; gap: 12px; padding: 16px; background: #151515; border: 1px solid #222; border-radius: 12px; cursor: pointer; text-align: left; transition: all 0.15s; }
        .capability-card:hover { background: #1a1a1a; border-color: #333; }
        .capability-card.active { border-color: #22c55e; background: #1a2a1a; }
        .cap-icon { font-size: 24px; }
        .cap-title { display: block; font-weight: 500; font-size: 14px; }
        .cap-desc { display: block; font-size: 12px; color: #666; }
        
        .templates-section { margin-bottom: 32px; }
        .templates-row { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 12px; }
        .template-pill { padding: 8px 16px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 20px; color: #ccc; font-size: 13px; cursor: pointer; transition: all 0.15s; }
        .template-pill:hover { background: #222; border-color: #22c55e; color: #fff; }
        
        .quick-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
        .quick-pill { padding: 8px 16px; background: transparent; border: 1px solid #333; border-radius: 20px; color: #888; font-size: 13px; cursor: pointer; transition: all 0.15s; }
        .quick-pill:hover { border-color: #22c55e; color: #22c55e; }
        
        /* Chat */
        .chat-area { flex: 1; overflow-y: auto; padding: 24px 40px; }
        .messages { max-width: 800px; margin: 0 auto; }
        .message { display: flex; gap: 12px; margin-bottom: 24px; }
        .message.user { justify-content: flex-end; }
        .message.user .message-body { background: #22c55e; color: #000; border-radius: 16px 16px 4px 16px; padding: 12px 16px; max-width: 70%; }
        .avatar { width: 32px; height: 32px; background: #22c55e; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 600; color: #000; flex-shrink: 0; }
        .message.assistant .message-body { background: #151515; border: 1px solid #222; border-radius: 16px; padding: 16px; flex: 1; }
        
        .loading-state { display: flex; align-items: center; gap: 12px; color: #888; }
        .spinner { width: 20px; height: 20px; border: 2px solid #333; border-top-color: #22c55e; border-radius: 50%; animation: spin 0.8s linear infinite; }
        .spinner.small { width: 16px; height: 16px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .image-result img { max-width: 100%; border-radius: 12px; margin-bottom: 12px; }
        .image-buttons { display: flex; gap: 8px; }
        .image-buttons a { padding: 8px 16px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; color: #ccc; text-decoration: none; font-size: 13px; transition: all 0.15s; }
        .image-buttons a:hover { background: #222; }
        .image-buttons a.primary { background: #22c55e; border-color: #22c55e; color: #000; }
        
        /* Input */
        .input-area { padding: 20px 40px; border-top: 1px solid #1a1a1a; }
        .input-box { display: flex; gap: 8px; max-width: 800px; margin: 0 auto; background: #151515; border: 1px solid #222; border-radius: 12px; padding: 4px; }
        .input-box input { flex: 1; padding: 14px 16px; background: transparent; border: none; color: #fff; font-size: 15px; outline: none; }
        .input-box input::placeholder { color: #555; }
        .send-btn { width: 44px; height: 44px; background: #22c55e; border: none; border-radius: 10px; color: #000; font-size: 20px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .input-hints { display: flex; gap: 8px; justify-content: center; margin-top: 12px; }
        .hint-pill { padding: 6px 12px; background: transparent; border: 1px solid #222; border-radius: 16px; color: #666; font-size: 12px; cursor: pointer; }
        .hint-pill:hover { border-color: #333; color: #888; }
        
        @media (max-width: 900px) {
          .capabilities-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .sidebar { display: none; }
          .welcome { padding: 20px; }
          .capabilities-grid { grid-template-columns: 1fr; }
          .chat-area, .input-area { padding: 16px 20px; }
        }
      `}</style>
    </div>
  );
}
