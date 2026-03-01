import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

const TEMPLATES = {
  image: [
    { name: 'Logo Design', prompt: 'Professional modern logo for', icon: '✦' },
    { name: 'Product Shot', prompt: 'Professional product photography of', icon: '📦' },
    { name: 'Portrait', prompt: 'Professional portrait photo of', icon: '👤' },
    { name: 'Landscape', prompt: 'Beautiful cinematic landscape of', icon: '🏔' },
    { name: 'Abstract', prompt: 'Abstract artistic representation of', icon: '◐' },
  ],
  meme: [
    { name: 'Drake', prompt: 'drake:', icon: '🎵' },
    { name: 'Expanding Brain', prompt: 'expanding_brain:', icon: '🧠' },
    { name: 'Distracted BF', prompt: 'distracted_bf:', icon: '👀' },
    { name: 'This Is Fine', prompt: 'this_is_fine:', icon: '🔥' },
    { name: 'Stonks', prompt: 'stonks:', icon: '📈' },
    { name: 'Change My Mind', prompt: 'change_my_mind:', icon: '☕' },
  ],
  video: [
    { name: 'Product Ad', prompt: 'Create 30-second Apple-style ad for', icon: '🎬' },
    { name: 'Explainer', prompt: 'Create 60-second explainer video about', icon: '💡' },
    { name: 'Trailer', prompt: 'Create Hollywood movie trailer for', icon: '🎥' },
  ],
  edit: [
    { name: 'Retouch', prompt: 'Professional magazine quality retouch', icon: '✨' },
    { name: 'Upscale', prompt: 'Upscale to 4K HD quality', icon: '🔍' },
    { name: 'Background', prompt: 'Change background to', icon: '🖼' },
  ],
};

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('image');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const detectMemeTemplate = (text) => {
    const templates = ['drake:', 'expanding_brain:', 'distracted_bf:', 'this_is_fine:', 'stonks:', 'change_my_mind:', 'woman_yelling_cat:', 'two_buttons:', 'gru_plan:', 'surprised_pikachu:', 'gigachad:', 'wojak:', 'uno_draw_25:', 'always_has_been:', 'leonardo_pointing:', 'bernie_asking:', 'buff_doge_cheems:', 'virgin_vs_chad:', 'batman_slap:', 'press_f:', 'one_does_not_simply:', 'roll_safe:', 'disaster_girl:', 'doge:', 'cheems:', 'evil_kermit:', 'mocking_spongebob:', 'success_kid:', 'hide_pain_harold:'];
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
        if (++attempts < 30) setTimeout(poll, 1000);
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
          setMessages(prev => [...prev, { role: 'assistant', content: 'Generating...', status: 'loading' }]);
          setLoading(false);
          pollForImage(data.prompt_id, idx);
          return;
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to generate. Please try again.', status: 'error' }]);
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
          setMessages(prev => [...prev, { role: 'assistant', content: 'Generating...', status: 'loading' }]);
          setLoading(false);
          pollForImage(data.prompt_id, idx);
          return;
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to generate. Please try again.', status: 'error' }]);
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.', status: 'error' }]);
    }
    setLoading(false);
  };

  return (
    <div className="app">
      <Head>
        <title>Lumen Studio</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      </Head>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-icon">◆</span>
          <span className="logo-text">Lumen Studio</span>
        </div>
        
        <nav className="nav">
          <div className="nav-section">
            <span className="nav-label">Create</span>
            {Object.keys(TEMPLATES).map(key => (
              <button 
                key={key} 
                className={'nav-item' + (activeTab === key ? ' active' : '')}
                onClick={() => setActiveTab(key)}
              >
                <span className="nav-icon">{key === 'image' ? '🖼' : key === 'meme' ? '😂' : key === 'video' ? '🎬' : '✨'}</span>
                <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="status-dot"></div>
          <span>Ready</span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main">
        {/* Header */}
        <header className="header">
          <div>
            <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Generation</h1>
            <p className="subtitle">Describe what you want to create</p>
          </div>
        </header>

        {/* Chat Area */}
        <div className="chat-container">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">◆</div>
              <h2>What would you like to create?</h2>
              <p>Select a template below or describe your idea</p>
              
              <div className="templates-grid">
                {TEMPLATES[activeTab].map((t, i) => (
                  <button key={i} className="template-card" onClick={() => setInput(t.prompt + ' ')}>
                    <span className="template-icon">{t.icon}</span>
                    <span className="template-name">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages">
              {messages.map((m, i) => (
                <div key={i} className={'message ' + m.role + (m.status ? ' ' + m.status : '')}>
                  {m.role === 'assistant' && (
                    <div className="message-avatar">◆</div>
                  )}
                  <div className="message-content">
                    {m.status === 'loading' && (
                      <div className="loading-indicator">
                        <div className="loading-spinner"></div>
                        <span>Generating your {activeTab}...</span>
                      </div>
                    )}
                    {m.content && m.status !== 'loading' && <p>{m.content}</p>}
                    {m.image && (
                      <div className="image-result">
                        <img src={m.image} alt="Generated" />
                        <div className="image-actions">
                          <a href={m.image} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                            Open
                          </a>
                          <a href={m.image} download className="btn-primary">
                            Download
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="input-container">
          <div className="input-wrapper">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && sendMessage()}
              placeholder={activeTab === 'meme' ? 'Try: drake: Using AI vs Using Google' : 'Describe what you want to create...'}
              disabled={loading}
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()} className="send-btn">
              {loading ? (
                <span className="loading-spinner small"></span>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              )}
            </button>
          </div>
          <p className="input-hint">Press Enter to generate</p>
        </div>
      </main>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #0a0a0f; color: #e5e5e5; }
        
        .app { display: flex; height: 100vh; }
        
        /* Sidebar */
        .sidebar { width: 240px; background: #0f0f14; border-right: 1px solid #1a1a24; display: flex; flex-direction: column; }
        .logo { padding: 20px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #1a1a24; }
        .logo-icon { font-size: 20px; color: #6366f1; }
        .logo-text { font-weight: 600; font-size: 15px; }
        
        .nav { flex: 1; padding: 16px 12px; }
        .nav-section { margin-bottom: 24px; }
        .nav-label { font-size: 11px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px; padding: 0 8px; margin-bottom: 8px; display: block; }
        .nav-item { width: 100%; display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: none; background: transparent; color: #888; font-size: 14px; border-radius: 8px; cursor: pointer; transition: all 0.15s; text-align: left; }
        .nav-item:hover { background: #1a1a24; color: #e5e5e5; }
        .nav-item.active { background: #6366f1; color: white; }
        .nav-icon { font-size: 16px; }
        
        .sidebar-footer { padding: 16px 20px; border-top: 1px solid #1a1a24; display: flex; align-items: center; gap: 8px; font-size: 13px; color: #666; }
        .status-dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; }
        
        /* Main */
        .main { flex: 1; display: flex; flex-direction: column; background: #0a0a0f; }
        
        .header { padding: 24px 32px; border-bottom: 1px solid #1a1a24; }
        .header h1 { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
        .subtitle { font-size: 14px; color: #666; }
        
        /* Chat */
        .chat-container { flex: 1; overflow-y: auto; padding: 32px; }
        
        .empty-state { text-align: center; padding: 60px 20px; max-width: 600px; margin: 0 auto; }
        .empty-icon { font-size: 48px; color: #6366f1; margin-bottom: 24px; }
        .empty-state h2 { font-size: 24px; font-weight: 600; margin-bottom: 8px; }
        .empty-state p { color: #666; margin-bottom: 32px; }
        
        .templates-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
        .template-card { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px 16px; background: #12121a; border: 1px solid #1a1a24; border-radius: 12px; cursor: pointer; transition: all 0.15s; }
        .template-card:hover { background: #1a1a24; border-color: #6366f1; transform: translateY(-2px); }
        .template-icon { font-size: 24px; }
        .template-name { font-size: 13px; font-weight: 500; }
        
        .messages { max-width: 800px; margin: 0 auto; }
        .message { display: flex; gap: 16px; margin-bottom: 24px; }
        .message.user { justify-content: flex-end; }
        .message.user .message-content { background: #6366f1; border-radius: 16px 16px 4px 16px; padding: 12px 16px; max-width: 70%; }
        .message.assistant .message-content { background: #12121a; border: 1px solid #1a1a24; border-radius: 16px; padding: 16px; flex: 1; max-width: 100%; }
        .message-avatar { width: 32px; height: 32px; background: #6366f1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
        
        .loading-indicator { display: flex; align-items: center; gap: 12px; color: #888; }
        .loading-spinner { width: 20px; height: 20px; border: 2px solid #333; border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; }
        .loading-spinner.small { width: 16px; height: 16px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .image-result img { width: 100%; max-width: 512px; border-radius: 12px; margin-bottom: 12px; }
        .image-actions { display: flex; gap: 8px; }
        .btn-primary, .btn-secondary { padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; text-decoration: none; transition: all 0.15s; border: none; cursor: pointer; }
        .btn-primary { background: #6366f1; color: white; }
        .btn-primary:hover { background: #5558e3; }
        .btn-secondary { background: #1a1a24; color: #e5e5e5; border: 1px solid #2a2a34; }
        .btn-secondary:hover { background: #2a2a34; }
        
        /* Input */
        .input-container { padding: 24px 32px; border-top: 1px solid #1a1a24; background: #0a0a0f; }
        .input-wrapper { display: flex; gap: 12px; max-width: 800px; margin: 0 auto; background: #12121a; border: 1px solid #1a1a24; border-radius: 12px; padding: 4px; }
        .input-wrapper input { flex: 1; padding: 14px 16px; background: transparent; border: none; color: #e5e5e5; font-size: 15px; outline: none; }
        .input-wrapper input::placeholder { color: #555; }
        .send-btn { width: 48px; height: 48px; background: #6366f1; border: none; border-radius: 10px; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
        .send-btn:hover:not(:disabled) { background: #5558e3; }
        .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .input-hint { text-align: center; font-size: 12px; color: #444; margin-top: 12px; }
        
        /* Responsive */
        @media (max-width: 768px) {
          .sidebar { display: none; }
          .header { padding: 16px 20px; }
          .chat-container { padding: 20px; }
          .input-container { padding: 16px 20px; }
        }
      `}</style>
    </div>
  );
}
