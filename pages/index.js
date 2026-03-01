import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

const CAPABILITIES = {
  generate: { title: 'Generate', icon: '✨', desc: 'Create images from text' },
  edit: { title: 'Edit', icon: '🖼', desc: 'Transform your images' },
  video: { title: 'Video', icon: '🎬', desc: 'AI video generation' },
  animate: { title: 'Animate', icon: '🎭', desc: 'Bring images to life' },
  meme: { title: 'Meme', icon: '😂', desc: 'Create viral memes' },
  model3d: { title: '3D', icon: '🧊', desc: 'Generate 3D models' },
};

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState(null); // Image waiting in input area
  const [pendingFilename, setPendingFilename] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input after image upload
  useEffect(() => {
    if (pendingImage) {
      inputRef.current?.focus();
    }
  }, [pendingImage]);

  const detectVideoRequest = (text) => {
    const lower = text.toLowerCase();
    return ['video', 'animate', 'motion', 'move', 'moving', 'clip'].some(kw => lower.includes(kw));
  };

  const detectMemeRequest = (text) => {
    const templates = ['drake:', 'expanding_brain:', 'distracted_bf:', 'this_is_fine:', 'stonks:', 'change_my_mind:'];
    for (const t of templates) {
      if (text.toLowerCase().startsWith(t)) {
        return { template: t.replace(':', ''), text: text.substring(t.length).trim() };
      }
    }
    return null;
  };

  const pollForResult = async (promptId, messageIndex, isVideo = false) => {
    let attempts = 0;
    const poll = async () => {
      try {
        const res = await fetch('/api/status?prompt_id=' + promptId);
        const data = await res.json();
        if (data.status === 'complete') {
          setMessages(prev => {
            const updated = [...prev];
            if (isVideo && data.video_url) {
              updated[messageIndex] = { ...updated[messageIndex], content: null, video: data.video_url, status: 'complete' };
            } else if (data.image_url) {
              updated[messageIndex] = { ...updated[messageIndex], content: null, image: data.image_url, status: 'complete' };
            }
            return updated;
          });
          return;
        }
        if (++attempts < 180) setTimeout(poll, 1000); // 3 min timeout
        else {
          setMessages(prev => {
            const updated = [...prev];
            updated[messageIndex] = { ...updated[messageIndex], content: 'Generation timed out. Please try again.', status: 'error' };
            return updated;
          });
        }
      } catch (e) { 
        if (++attempts < 180) setTimeout(poll, 2000);
      }
    };
    poll();
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setLoading(true);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        // Stage image in input area (like ChatGPT)
        setPendingImage(URL.createObjectURL(file));
        setPendingFilename(data.filename);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Upload failed: ' + error.message, status: 'error' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file);
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && !pendingFilename) || loading) return;
    
    const currentInput = input.trim();
    const currentImage = pendingImage;
    const currentFilename = pendingFilename;
    
    // Clear input states
    setInput('');
    setPendingImage(null);
    setPendingFilename(null);
    
    // Add user message to chat
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: currentInput || (currentFilename ? 'Process this image' : ''),
      image: currentImage
    }]);
    
    setLoading(true);

    try {
      let res, data;
      const isVideo = detectVideoRequest(currentInput);
      const meme = detectMemeRequest(currentInput);

      if (currentFilename && isVideo) {
        // Image to video
        res = await fetch('/api/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            filename: currentFilename, 
            prompt: currentInput,
            videoType: 'image_to_video'
          })
        });
      } else if (currentFilename) {
        // Image editing
        res = await fetch('/api/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            filename: currentFilename, 
            prompt: currentInput
          })
        });
      } else if (meme) {
        // Meme generation
        res = await fetch('/api/meme', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template: meme.template, text: meme.text })
        });
        data = await res.json();
        if (data.status === 'success') {
          setMessages(prev => [...prev, { role: 'assistant', image: data.url, status: 'complete' }]);
          setLoading(false);
          return;
        }
      } else if (isVideo) {
        // Text to video
        res = await fetch('/api/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: currentInput })
        });
      } else {
        // Text to image
        res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: currentInput })
        });
      }
      
      data = await res.json();
      
      if (data.status === 'generating' && data.prompt_id) {
        const idx = messages.length + 1;
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          status: 'loading',
          content: isVideo ? '🎬 Generating video...' : '✨ Generating...'
        }]);
        setLoading(false);
        pollForResult(data.prompt_id, idx, isVideo);
        return;
      } else if (data.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + error.message, status: 'error' }]);
    }
    setLoading(false);
  };

  const clearPendingImage = () => {
    setPendingImage(null);
    setPendingFilename(null);
  };

  return (
    <div className="app" onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>
      <Head>
        <title>Lumen Creative Studio</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      </Head>

      {/* Drag overlay */}
      {dragOver && (
        <div className="drag-overlay">
          <span>📁</span>
          <p>Drop image here</p>
        </div>
      )}

      {/* Main chat area */}
      <main className="main">
        {messages.length === 0 ? (
          <div className="welcome">
            <div className="welcome-content">
              <div className="logo-large">L</div>
              <h1>Lumen Creative Studio</h1>
              <p>AI-powered image & video generation on DGX Spark</p>
              
              <div className="suggestions">
                <button onClick={() => setInput('Create a professional logo for a tech startup called "Quantum Labs"')}>
                  ✨ Generate logo
                </button>
                <button onClick={() => setInput('Create a 30-second product ad for wireless earbuds')}>
                  🎬 Product video
                </button>
                <button onClick={() => setInput('drake: Using AI | Writing code manually')}>
                  😂 Make meme
                </button>
              </div>
              
              <p className="hint">📎 Upload an image and describe what you want to do with it</p>
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
                        <span>{m.content || 'Processing...'}</span>
                      </div>
                    )}
                    {m.status !== 'loading' && m.content && <p>{m.content}</p>}
                    {m.image && (
                      <div className="media-result">
                        <img src={m.image} alt="" />
                        {m.status === 'complete' && (
                          <div className="media-actions">
                            <a href={m.image} download>Download</a>
                          </div>
                        )}
                      </div>
                    )}
                    {m.video && (
                      <div className="media-result">
                        <video src={m.video} controls autoPlay loop />
                        <div className="media-actions">
                          <a href={m.video} download="video.mp4">Download</a>
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

        {/* Input area */}
        <div className="input-container">
          {/* Pending image preview (like ChatGPT) */}
          {pendingImage && (
            <div className="pending-image">
              <img src={pendingImage} alt="Upload" />
              <button onClick={clearPendingImage}>✕</button>
            </div>
          )}
          
          <div className="input-box">
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" 
              onChange={(e) => handleFileUpload(e.target.files[0])} />
            
            <button className="attach-btn" onClick={() => fileInputRef.current?.click()} disabled={loading}>
              📎
            </button>
            
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={pendingImage ? "What do you want to do with this image?" : "Describe what you want to create..."}
              disabled={loading}
            />
            
            <button className="send-btn" onClick={sendMessage} disabled={loading || (!input.trim() && !pendingFilename)}>
              {loading ? <span className="spinner small"></span> : '→'}
            </button>
          </div>
        </div>
      </main>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, sans-serif; background: #0a0a0a; color: #e5e5e5; }
        
        .app { display: flex; flex-direction: column; height: 100vh; height: 100dvh; }
        
        .drag-overlay { position: fixed; inset: 0; background: rgba(34, 197, 94, 0.15); border: 3px dashed #22c55e; z-index: 100; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .drag-overlay span { font-size: 48px; }
        .drag-overlay p { color: #22c55e; margin-top: 12px; }
        
        .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        
        .welcome { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .welcome-content { text-align: center; max-width: 500px; }
        .logo-large { width: 64px; height: 64px; background: #22c55e; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; color: #000; margin: 0 auto 20px; }
        .welcome h1 { font-size: 28px; font-weight: 600; margin-bottom: 8px; }
        .welcome > .welcome-content > p { color: #666; margin-bottom: 32px; }
        .suggestions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 32px; }
        .suggestions button { padding: 10px 16px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 20px; color: #ccc; font-size: 13px; cursor: pointer; }
        .suggestions button:hover { background: #222; border-color: #22c55e; color: #fff; }
        .hint { font-size: 13px; color: #555; }
        
        .chat-area { flex: 1; overflow-y: auto; padding: 16px; }
        .messages { max-width: 700px; margin: 0 auto; }
        
        .message { display: flex; gap: 12px; margin-bottom: 20px; }
        .message.user { justify-content: flex-end; }
        .message.user .message-body { background: #22c55e; color: #000; border-radius: 18px 18px 4px 18px; padding: 12px 16px; max-width: 80%; }
        .avatar { width: 32px; height: 32px; background: #22c55e; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 600; color: #000; flex-shrink: 0; font-size: 14px; }
        .message.assistant .message-body { background: #151515; border: 1px solid #222; border-radius: 18px; padding: 14px 16px; max-width: 85%; }
        
        .loading-state { display: flex; align-items: center; gap: 10px; color: #888; }
        .spinner { width: 18px; height: 18px; border: 2px solid #333; border-top-color: #22c55e; border-radius: 50%; animation: spin 0.8s linear infinite; }
        .spinner.small { width: 16px; height: 16px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .media-result img, .media-result video { max-width: 100%; border-radius: 12px; display: block; }
        .media-actions { margin-top: 10px; }
        .media-actions a { padding: 8px 16px; background: #22c55e; border-radius: 8px; color: #000; text-decoration: none; font-size: 13px; font-weight: 500; display: inline-block; }
        
        .input-container { padding: 12px 16px 16px; border-top: 1px solid #1a1a1a; background: #0a0a0a; }
        
        .pending-image { display: flex; align-items: flex-start; gap: 8px; max-width: 700px; margin: 0 auto 12px; padding: 8px; background: #151515; border: 1px solid #2a2a2a; border-radius: 12px; }
        .pending-image img { height: 80px; border-radius: 8px; }
        .pending-image button { background: #333; border: none; color: #fff; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 12px; flex-shrink: 0; }
        .pending-image button:hover { background: #ef4444; }
        
        .input-box { display: flex; gap: 8px; max-width: 700px; margin: 0 auto; background: #151515; border: 1px solid #2a2a2a; border-radius: 24px; padding: 6px; align-items: center; }
        .attach-btn { width: 40px; height: 40px; background: transparent; border: none; font-size: 20px; cursor: pointer; border-radius: 50%; flex-shrink: 0; }
        .attach-btn:hover { background: #222; }
        .attach-btn:disabled { opacity: 0.5; }
        .input-box input { flex: 1; padding: 10px 4px; background: transparent; border: none; color: #fff; font-size: 15px; outline: none; min-width: 0; }
        .input-box input::placeholder { color: #555; }
        .send-btn { width: 40px; height: 40px; background: #22c55e; border: none; border-radius: 50%; color: #000; font-size: 18px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        
        @media (max-width: 600px) {
          .welcome h1 { font-size: 24px; }
          .suggestions { flex-direction: column; }
          .suggestions button { width: 100%; }
          .pending-image img { height: 60px; }
        }
      `}</style>
    </div>
  );
}
