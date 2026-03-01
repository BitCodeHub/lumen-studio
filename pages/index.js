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
    // Viral Classics
    { name: 'Drake', prompt: 'drake:', hint: 'Reject vs Prefer' },
    { name: 'Expanding Brain', prompt: 'expanding_brain:', hint: '4 levels of enlightenment' },
    { name: 'Distracted BF', prompt: 'distracted_bf:', hint: 'BF / New thing / GF' },
    { name: 'Woman Yelling', prompt: 'woman_yelling_cat:', hint: 'Woman yelling / Cat' },
    { name: 'Two Buttons', prompt: 'two_buttons:', hint: 'Choice 1 / Choice 2' },
    { name: 'Gru Plan', prompt: 'gru_plan:', hint: '4 panels, last backfires' },
    // Reaction Memes
    { name: 'This Is Fine', prompt: 'this_is_fine:', hint: 'Calm in chaos' },
    { name: 'Surprised Pikachu', prompt: 'surprised_pikachu:', hint: 'Obvious outcome' },
    { name: 'Stonks', prompt: 'stonks:', hint: 'Financial wisdom' },
    { name: 'Not Stonks', prompt: 'not_stonks:', hint: 'Financial failure' },
    { name: 'Gigachad', prompt: 'gigachad:', hint: 'Chad response' },
    { name: 'Wojak', prompt: 'wojak:', hint: 'Sad/crying feeling' },
    // Discussion Memes
    { name: 'Change My Mind', prompt: 'change_my_mind:', hint: 'Hot take' },
    { name: 'UNO Draw 25', prompt: 'uno_draw_25:', hint: 'Do X or draw 25' },
    { name: 'Always Has Been', prompt: 'always_has_been:', hint: 'Wait its all X?' },
    { name: 'Leonardo Pointing', prompt: 'leonardo_pointing:', hint: 'When you see it' },
    // Comparison Memes
    { name: 'Bernie Asking', prompt: 'bernie_asking:', hint: 'Once again asking' },
    { name: 'Buff Doge vs Cheems', prompt: 'buff_doge_cheems:', hint: 'Strong vs weak' },
    { name: 'Virgin vs Chad', prompt: 'virgin_vs_chad:', hint: 'Lame vs based' },
    { name: 'Batman Slap', prompt: 'batman_slap:', hint: 'Robin says / Batman slaps' },
    // Gaming & Tech
    { name: 'Press F', prompt: 'press_f:', hint: 'Pay respects' },
    { name: 'One Does Not Simply', prompt: 'one_does_not_simply:', hint: 'Walk into Mordor' },
    { name: 'Roll Safe', prompt: 'roll_safe:', hint: 'Cant fail if...' },
    { name: 'Disaster Girl', prompt: 'disaster_girl:', hint: 'Sinister smile' },
    // Animal Memes
    { name: 'Doge', prompt: 'doge:', hint: 'Much wow, very X' },
    { name: 'Cheems', prompt: 'cheems:', hint: 'Bonk / sad cheems' },
    { name: 'Evil Kermit', prompt: 'evil_kermit:', hint: 'Me / My dark side' },
    { name: 'Mocking Spongebob', prompt: 'mocking_spongebob:', hint: 'AlTeRnAtInG tExT' },
    // More Classics
    { name: 'Success Kid', prompt: 'success_kid:', hint: 'Small victory' },
    { name: 'Hide the Pain Harold', prompt: 'hide_pain_harold:', hint: 'Hiding pain' },
  ],
};

export default function Home() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '🎨 Welcome to Lumen Studio!\n\nDescribe what you want to create, or select a template below to get started.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('image');

  // Check if input is a meme template request
  const detectMemeTemplate = (text) => {
    const memeTemplates = [
      // Viral Classics
      'drake:', 'expanding_brain:', 'distracted_bf:', 'woman_yelling_cat:', 'two_buttons:', 'gru_plan:',
      // Reaction Memes
      'this_is_fine:', 'surprised_pikachu:', 'stonks:', 'not_stonks:', 'gigachad:', 'wojak:',
      // Discussion Memes
      'change_my_mind:', 'uno_draw_25:', 'always_has_been:', 'leonardo_pointing:',
      // Comparison Memes
      'bernie_asking:', 'buff_doge_cheems:', 'virgin_vs_chad:', 'batman_slap:',
      // Gaming & Tech
      'press_f:', 'one_does_not_simply:', 'roll_safe:', 'disaster_girl:',
      // Animal Memes
      'doge:', 'cheems:', 'evil_kermit:', 'mocking_spongebob:',
      // More Classics
      'success_kid:', 'hide_pain_harold:'
    ];
    for (const t of memeTemplates) {
      if (text.toLowerCase().startsWith(t)) {
        return { template: t.replace(':', ''), text: text.substring(t.length).trim() };
      }
    }
    return null;
  };

  // Poll for image completion
  const pollForImage = async (promptId, messageIndex) => {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    
    const poll = async () => {
      try {
        const res = await fetch('/api/status?prompt_id=' + promptId);
        const data = await res.json();
        
        if (data.status === 'complete' && data.image_url) {
          // Update the message with the image
          setMessages(prev => {
            const updated = [...prev];
            updated[messageIndex] = {
              ...updated[messageIndex],
              content: '✅ Done!',
              image: data.image_url
            };
            return updated;
          });
          return;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          setMessages(prev => {
            const updated = [...prev];
            updated[messageIndex] = {
              ...updated[messageIndex],
              content: '⏳ Taking longer than expected. Check back shortly.'
            };
            return updated;
          });
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    };
    
    poll();
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
            content: '😂 ' + data.template + ' meme created!',
            image: data.url
          }]);
        } else if (data.status === 'generating' && data.prompt_id) {
          // AI-generated meme - add pending message and poll
          const newIndex = messages.length + 1; // +1 for user message
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '🎨 Creating your ' + (data.template || 'meme') + '...\n\n⏳ This takes about 20 seconds.',
            pending: true
          }]);
          setLoading(false);
          pollForImage(data.prompt_id, newIndex);
          return;
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '❌ Something went wrong. Please try again.'
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
        
        if (data.status === 'generating' && data.prompt_id) {
          // Add pending message and start polling
          const newIndex = messages.length + 1; // +1 for user message
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '✅ Creating your image...\n\n⏳ This takes about 20 seconds.',
            pending: true
          }]);
          setLoading(false);
          pollForImage(data.prompt_id, newIndex);
          return;
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '❌ Something went wrong. Please try again.'
          }]);
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Unable to connect. Please try again in a moment.'
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
      </header>

      <main>
        <div className="chat">
          <div className="messages">
            {messages.map((m, i) => (
              <div key={i} className={'msg ' + m.role}>
                <pre>{m.content}</pre>
                {m.image && (
                  <div className="image-container">
                    <img src={m.image} alt="Generated image" className="generated-image" />
                    <div className="image-actions">
                      <a href={m.image} target="_blank" rel="noopener noreferrer" className="btn-view">View Full</a>
                      <a href={m.image} download className="btn-download">⬇️ Download</a>
                    </div>
                  </div>
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

      <footer>Powered by Lumen AI</footer>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, sans-serif; background: #0f0f1a; color: #fff; min-height: 100vh; }
        .container { max-width: 800px; margin: 0 auto; padding: 16px; }
        header { text-align: center; padding: 20px 0; }
        header h1 { font-size: 1.8rem; }
        header p { color: #888; font-size: 0.9rem; }
        .chat { background: #1a1a2e; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
        .messages { height: 400px; overflow-y: auto; margin-bottom: 12px; }
        .msg { padding: 10px 14px; border-radius: 10px; margin-bottom: 8px; max-width: 85%; }
        .msg pre { white-space: pre-wrap; font-family: inherit; font-size: 0.9rem; line-height: 1.4; }
        .image-container { margin-top: 10px; }
        .generated-image { max-width: 100%; border-radius: 8px; display: block; }
        .image-actions { display: flex; gap: 8px; margin-top: 8px; }
        .btn-view, .btn-download { padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 0.85rem; font-weight: 500; }
        .btn-view { background: #2a2a3e; color: #fff; }
        .btn-download { background: #4f46e5; color: #fff; }
        .btn-view:hover, .btn-download:hover { opacity: 0.9; }
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
