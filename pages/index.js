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
      { name: 'Concept Art', prompt: 'Concept art of' },
      { name: 'Architecture', prompt: 'Architectural visualization of' },
      { name: 'Fashion', prompt: 'Fashion photography of' },
    ]
  },
  edit: {
    title: 'Edit',
    icon: '🖼',
    desc: 'Transform your images',
    templates: [
      { name: 'Upscale 4K', prompt: 'Upscale to 4K quality', needsUpload: true },
      { name: 'Remove Background', prompt: 'Remove background', needsUpload: true },
      { name: 'Face Enhance', prompt: 'Enhance and restore face', needsUpload: true },
      { name: 'Colorize', prompt: 'Colorize this image', needsUpload: true },
      { name: 'Style Transfer', prompt: 'Apply artistic style', needsUpload: true },
      { name: 'Inpaint/Fix', prompt: 'Fix and repair this image', needsUpload: true },
    ]
  },
  video: {
    title: 'Video',
    icon: '🎬',
    desc: 'AI video generation',
    isVideo: true,
    templates: [
      { name: 'Product Ad (30s)', prompt: 'Create 30-second Apple-style product ad for', style: 'apple' },
      { name: 'Social Reel (15s)', prompt: 'Create 15-second viral TikTok reel about', style: 'social' },
      { name: 'Tech Demo (60s)', prompt: 'Create 60-second tech startup demo for', style: 'tech' },
      { name: 'Corporate (30s)', prompt: 'Create 30-second corporate video about', style: 'corporate' },
      { name: 'Luxury Ad (30s)', prompt: 'Create 30-second luxury brand ad for', style: 'luxury' },
      { name: 'Quick Clip (6s)', prompt: 'Create quick 6-second Instagram story for', style: 'social' },
    ]
  },
  ads: {
    title: 'Marketing',
    icon: '📢',
    desc: 'Full marketing ads',
    isVideo: true,
    templates: [
      { name: 'Apple Style', prompt: 'Create Apple-style commercial for my product:', style: 'apple' },
      { name: 'Nike Style', prompt: 'Create inspiring Nike-style ad about:', style: 'nike' },
      { name: 'Startup Demo', prompt: 'Create SaaS product demo video for:', style: 'tech' },
      { name: 'E-commerce', prompt: 'Create product showcase ad for:', style: 'luxury' },
      { name: 'Social Campaign', prompt: 'Create viral social media campaign for:', style: 'social' },
      { name: 'Brand Story', prompt: 'Create emotional brand story video about:', style: 'corporate' },
    ]
  },
  animate: {
    title: 'Animate',
    icon: '🎭',
    desc: 'Bring images to life',
    templates: [
      { name: 'Image to Video', prompt: 'Animate this image', needsUpload: true },
      { name: 'Add Motion', prompt: 'Add natural motion', needsUpload: true },
      { name: 'Camera Move', prompt: 'Add cinematic camera movement', needsUpload: true },
      { name: 'Loop', prompt: 'Create seamless loop', needsUpload: true },
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
  },
  shorts: {
    title: 'YouTube Shorts',
    icon: '📱',
    desc: 'Auto-generate viral shorts',
    isVideo: true,
    templates: [
      { name: 'Facts Video', prompt: 'Create a YouTube Short about interesting facts:', style: 'facts' },
      { name: 'Story Video', prompt: 'Create a dramatic story Short about:', style: 'story' },
      { name: 'Explainer', prompt: 'Create an educational Short explaining:', style: 'educational' },
      { name: 'Funny Take', prompt: 'Create a funny YouTube Short about:', style: 'funny' },
      { name: 'Motivational', prompt: 'Create an inspiring Short about:', style: 'motivational' },
    ]
  }
};

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFilename, setUploadedFilename] = useState(null);
  const [lastGeneratedImage, setLastGeneratedImage] = useState(null); // Track last generated image for edits
  const [dragOver, setDragOver] = useState(false);
  const [showAdCreator, setShowAdCreator] = useState(false);
  const [adForm, setAdForm] = useState({
    productName: '',
    tagline: '',
    headline: '',
    ctaText: 'Learn More',
    style: 'apple',
    duration: '30s',
    musicStyle: 'upbeat',
    voiceover: 'none',
    voiceoverText: '',
  });
  const [adLogo, setAdLogo] = useState(null);
  const [adProductImages, setAdProductImages] = useState([]);
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const productImagesRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const detectMemeTemplate = (text) => {
    const templates = ['drake:', 'expanding_brain:', 'distracted_bf:', 'this_is_fine:', 'stonks:', 'change_my_mind:'];
    for (const t of templates) {
      if (text.toLowerCase().startsWith(t)) {
        return { template: t.replace(':', ''), text: text.substring(t.length).trim() };
      }
    }
    return null;
  };

  const detectVideoRequest = (text) => {
    const lower = text.toLowerCase();
    const videoKeywords = ['video', 'animate', 'motion', 'clip', 'reel', 'trailer', 'commercial', 'film', 'movie', 'documentary', 'second ad', 'sec ad', 's ad'];
    return videoKeywords.some(kw => lower.includes(kw));
  };

  const detectAdRequest = (text) => {
    const lower = text.toLowerCase();
    const adKeywords = ['ad for', 'commercial for', 'marketing', 'product ad', 'brand video', 'promo video', 'advertisement', 'apple style', 'nike style', 'startup demo', 'product demo'];
    return adKeywords.some(kw => lower.includes(kw));
  };

  // Detect if user wants to edit the previous image
  const detectEditRequest = (text) => {
    const lower = text.toLowerCase();
    const editKeywords = ['add ', 'put ', 'place ', 'insert ', 'remove ', 'delete ', 'change ', 'make it', 'make the', 'transform ', 'modify ', 'edit ', 'fix ', 'adjust ', 'replace ', 'swap ', 'in the bowl', 'in the image', 'to the image', 'on the', 'more ', 'less ', 'with '];
    return editKeywords.some(kw => lower.includes(kw));
  };

  // Poll for multi-scene ad video completion
  const pollForAdVideo = async (sceneJobs, messageIndex) => {
    let attempts = 0;
    const poll = async () => {
      try {
        const res = await fetch('/api/ad-compose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sceneJobs, checkOnly: true })
        });
        const data = await res.json();
        
        // Update progress
        setMessages(prev => {
          const updated = [...prev];
          const msg = updated[messageIndex];
          updated[messageIndex] = { 
            ...msg, 
            content: `🎬 Generating scenes: ${data.complete}/${data.total} complete${data.processing > 0 ? `\n⏳ ${data.processing} processing...` : ''}${data.failed > 0 ? `\n❌ ${data.failed} failed` : ''}`
          };
          return updated;
        });
        
        if (data.allComplete) {
          // All scenes ready - compose video
          setMessages(prev => {
            const updated = [...prev];
            updated[messageIndex] = { ...updated[messageIndex], content: '🎬 All scenes ready! Composing final video...' };
            return updated;
          });
          
          // Request composition
          const composeRes = await fetch('/api/ad-compose', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sceneJobs, compose: true })
          });
          const composeData = await composeRes.json();
          
          if (composeData.video) {
            setMessages(prev => {
              const updated = [...prev];
              updated[messageIndex] = { 
                ...updated[messageIndex], 
                content: null,
                video: 'data:video/mp4;base64,' + composeData.video.base64,
                status: 'complete'
              };
              return updated;
            });
          } else {
            setMessages(prev => {
              const updated = [...prev];
              updated[messageIndex] = { 
                ...updated[messageIndex], 
                content: '⚠️ Scene generation complete but composition not yet available. Individual scenes ready for download.',
                scenes: data.scenes,
                status: 'partial'
              };
              return updated;
            });
          }
          return;
        }
        
        if (++attempts < 300) setTimeout(poll, 2000);  // Poll every 2 seconds, up to 10 minutes
        else {
          setMessages(prev => {
            const updated = [...prev];
            updated[messageIndex] = { ...updated[messageIndex], content: 'Video generation taking longer than expected. Check back later.', status: 'timeout' };
            return updated;
          });
        }
      } catch (e) { 
        console.error(e);
        if (++attempts < 300) setTimeout(poll, 5000);  // Retry on error
      }
    };
    poll();
  };

  const pollForImage = async (promptId, messageIndex) => {
    let attempts = 0;
    const poll = async () => {
      try {
        const res = await fetch('/api/status?prompt_id=' + promptId);
        const data = await res.json();
        if (data.status === 'complete' && data.image_url) {
          // Save the filename for future edit operations
          if (data.filename) {
            setLastGeneratedImage(data.filename);
          }
          setMessages(prev => {
            const updated = [...prev];
            updated[messageIndex] = { ...updated[messageIndex], content: null, image: data.image_url, filename: data.filename, status: 'complete' };
            return updated;
          });
          return;
        }
        if (++attempts < 120) setTimeout(poll, 1000);
        else {
          setMessages(prev => {
            const updated = [...prev];
            updated[messageIndex] = { ...updated[messageIndex], content: 'Taking longer than expected...', status: 'timeout' };
            return updated;
          });
        }
      } catch (e) { console.error(e); }
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
        setUploadedFile(URL.createObjectURL(file));
        setUploadedFilename(data.filename);
        setMessages(prev => [...prev, { 
          role: 'user', 
          content: 'Uploaded: ' + file.name,
          image: URL.createObjectURL(file),
          isUpload: true
        }]);
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
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      handleFileUpload(file);
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && !uploadedFilename) || loading) return;
    
    const currentInput = input;
    const currentFile = uploadedFilename;
    setInput('');
    
    if (currentInput) {
      setMessages(prev => [...prev, { role: 'user', content: currentInput }]);
    }
    setLoading(true);

    try {
      const memeRequest = detectMemeTemplate(currentInput);
      const isVideoRequest = detectVideoRequest(currentInput);
      const isAdRequest = detectAdRequest(currentInput);
      let res, data;

      // Determine which image to edit (uploaded or last generated)
      const imageToEdit = currentFile || (detectEditRequest(currentInput) ? lastGeneratedImage : null);
      
      if (imageToEdit && isVideoRequest) {
        // Image to video (AnimateDiff)
        res = await fetch('/api/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: imageToEdit, prompt: currentInput, videoType: 'image_to_video' })
        });
        data = await res.json();
        setUploadedFile(null);
        setUploadedFilename(null);
      } else if (imageToEdit) {
        // Image editing workflow (either uploaded image or editing last generated)
        res = await fetch('/api/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: imageToEdit, prompt: currentInput })
        });
        data = await res.json();
        setUploadedFile(null);
        setUploadedFilename(null);
      } else if (isAdRequest) {
        // Full marketing ad video creation (multi-scene)
        res = await fetch('/api/ad-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            prompt: currentInput,
            duration: currentInput.match(/(\d+)\s*s/)?.[0] || '30s'
          })
        });
        data = await res.json();
        
        if (data.status === 'generating' && data.sceneJobs) {
          // Multi-scene generation started
          const idx = messages.length + (currentInput ? 1 : 0);
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            status: 'loading', 
            operation: 'ad-video',
            scenes: data.scenes,
            sceneJobs: data.sceneJobs,
            template: data.template,
            content: `🎬 Creating ${data.duration}s ${data.template} ad...\n\n${data.scenes.map((s, i) => `Scene ${i+1}: ${s.type} (${s.duration}s)`).join('\n')}\n\nGenerating ${data.sceneJobs.length} scenes...`
          }]);
          setLoading(false);
          pollForAdVideo(data.sceneJobs, idx);
          return;
        }
      } else if (isVideoRequest) {
        // Text to video
        res = await fetch('/api/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: currentInput })
        });
        data = await res.json();
      } else if (memeRequest) {
        res = await fetch('/api/meme', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template: memeRequest.template, text: memeRequest.text })
        });
        data = await res.json();
        
        if (data.status === 'success') {
          setMessages(prev => [...prev, { role: 'assistant', image: data.url, status: 'complete' }]);
          setLoading(false);
          return;
        }
      } else {
        res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: currentInput })
        });
        data = await res.json();
      }
      
      if (data.status === 'generating' && data.prompt_id) {
        const idx = messages.length + (currentInput ? 1 : 0);
        setMessages(prev => [...prev, { role: 'assistant', status: 'loading', operation: data.operation }]);
        setLoading(false);
        pollForImage(data.prompt_id, idx);
        return;
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + error.message, status: 'error' }]);
    }
    setLoading(false);
  };

  return (
    <div className="app" onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>
      <Head>
        <title>Lumen Creative Studio - Luna Labs</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      </Head>

      {/* Drag overlay */}
      {dragOver && (
        <div className="drag-overlay">
          <div className="drag-content">
            <span className="drag-icon">📁</span>
            <p>Drop your image or video here</p>
          </div>
        </div>
      )}

      {/* Marketing Ad Creator Modal */}
      {showAdCreator && (
        <div className="modal-overlay" onClick={() => setShowAdCreator(false)}>
          <div className="ad-creator-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎬 Create Marketing Ad</h2>
              <button className="close-btn" onClick={() => setShowAdCreator(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Product Name *</label>
                  <input 
                    type="text" 
                    placeholder="iPhone 17 Pro Max Case"
                    value={adForm.productName}
                    onChange={e => setAdForm({...adForm, productName: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Style</label>
                  <select value={adForm.style} onChange={e => setAdForm({...adForm, style: e.target.value})}>
                    <option value="apple">Apple (Minimalist)</option>
                    <option value="nike">Nike (Dynamic)</option>
                    <option value="tech">Tech Startup</option>
                    <option value="luxury">Luxury Brand</option>
                    <option value="social">Social Media</option>
                    <option value="corporate">Corporate</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tagline</label>
                  <input 
                    type="text" 
                    placeholder="Protect Your Investment"
                    value={adForm.tagline}
                    onChange={e => setAdForm({...adForm, tagline: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Duration</label>
                  <select value={adForm.duration} onChange={e => setAdForm({...adForm, duration: e.target.value})}>
                    <option value="6s">6 seconds (Story)</option>
                    <option value="15s">15 seconds (Reel)</option>
                    <option value="30s">30 seconds (Standard)</option>
                    <option value="60s">60 seconds (Full)</option>
                  </select>
                </div>
              </div>

              <div className="form-section">
                <h3>📝 Custom Text</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Headline</label>
                    <input 
                      type="text" 
                      placeholder="The Future of Protection"
                      value={adForm.headline}
                      onChange={e => setAdForm({...adForm, headline: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>CTA Button Text</label>
                    <input 
                      type="text" 
                      placeholder="Shop Now"
                      value={adForm.ctaText}
                      onChange={e => setAdForm({...adForm, ctaText: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>🎵 Audio</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Music Style</label>
                    <select value={adForm.musicStyle} onChange={e => setAdForm({...adForm, musicStyle: e.target.value})}>
                      <option value="upbeat">Upbeat Electronic</option>
                      <option value="dramatic">Dramatic Cinematic</option>
                      <option value="chill">Chill Ambient</option>
                      <option value="corporate">Corporate Inspirational</option>
                      <option value="hiphop">Hip-Hop Energy</option>
                      <option value="none">No Music</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Voiceover</label>
                    <select value={adForm.voiceover} onChange={e => setAdForm({...adForm, voiceover: e.target.value})}>
                      <option value="none">No Voiceover</option>
                      <option value="tts-male">AI Voice (Male)</option>
                      <option value="tts-female">AI Voice (Female)</option>
                      <option value="upload">Upload Audio</option>
                    </select>
                  </div>
                </div>
                {adForm.voiceover.startsWith('tts') && (
                  <div className="form-group full-width">
                    <label>Voiceover Script</label>
                    <textarea 
                      placeholder="Enter the script for AI voiceover..."
                      value={adForm.voiceoverText}
                      onChange={e => setAdForm({...adForm, voiceoverText: e.target.value})}
                      rows={3}
                    />
                  </div>
                )}
              </div>

              <div className="form-section">
                <h3>📸 Assets</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Logo</label>
                    <input type="file" ref={logoInputRef} style={{display: 'none'}} accept="image/*" 
                      onChange={e => e.target.files[0] && setAdLogo(URL.createObjectURL(e.target.files[0]))} />
                    <button className="upload-asset-btn" onClick={() => logoInputRef.current?.click()}>
                      {adLogo ? '✅ Logo Added' : '📎 Upload Logo'}
                    </button>
                  </div>
                  <div className="form-group">
                    <label>Product Images</label>
                    <input type="file" ref={productImagesRef} style={{display: 'none'}} accept="image/*" multiple
                      onChange={e => setAdProductImages([...e.target.files].map(f => URL.createObjectURL(f)))} />
                    <button className="upload-asset-btn" onClick={() => productImagesRef.current?.click()}>
                      {adProductImages.length > 0 ? `✅ ${adProductImages.length} Images` : '📎 Upload Images'}
                    </button>
                  </div>
                </div>
                {(adLogo || adProductImages.length > 0) && (
                  <div className="asset-preview">
                    {adLogo && <img src={adLogo} alt="Logo" className="preview-thumb" />}
                    {adProductImages.map((img, i) => <img key={i} src={img} alt={`Product ${i+1}`} className="preview-thumb" />)}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowAdCreator(false)}>Cancel</button>
              <button 
                className="create-btn" 
                disabled={!adForm.productName || loading}
                onClick={async () => {
                  if (!adForm.productName) return;
                  setShowAdCreator(false);
                  setMessages(prev => [...prev, { 
                    role: 'user', 
                    content: `🎬 Create ${adForm.duration} ${adForm.style} style marketing ad for "${adForm.productName}"${adForm.tagline ? ` - "${adForm.tagline}"` : ''}`
                  }]);
                  setLoading(true);
                  
                  try {
                    const res = await fetch('/api/ad-video', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        prompt: `${adForm.duration} ${adForm.style} style ad for ${adForm.productName}`,
                        style: adForm.style,
                        duration: adForm.duration,
                        product: adForm.productName,
                        tagline: adForm.tagline,
                        headline: adForm.headline,
                        ctaText: adForm.ctaText,
                        musicStyle: adForm.musicStyle,
                        voiceover: adForm.voiceover,
                        voiceoverText: adForm.voiceoverText,
                      })
                    });
                    const data = await res.json();
                    
                    if (data.status === 'generating' && data.sceneJobs) {
                      const idx = messages.length + 1;
                      setMessages(prev => [...prev, { 
                        role: 'assistant', 
                        status: 'loading', 
                        operation: 'ad-video',
                        scenes: data.scenes,
                        content: `🎬 Creating ${data.duration}s Hollywood-grade ${data.template} ad...\n\n${data.scenes.map((s, i) => `Scene ${i+1}: ${s.type} (${s.duration}s)`).join('\n')}\n\nGenerating ${data.sceneJobs.length} scenes with Remotion...`
                      }]);
                      setLoading(false);
                      pollForAdVideo(data.sceneJobs, idx);
                    }
                  } catch (error) {
                    setMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + error.message, status: 'error' }]);
                    setLoading(false);
                  }
                }}
              >
                {loading ? '⏳ Creating...' : '🎬 Create Ad'}
              </button>
            </div>
          </div>
        </div>
      )}

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

        <button className="new-chat-btn" onClick={() => { setMessages([]); setActiveMode(null); setUploadedFile(null); setUploadedFilename(null); }}>
          <span>+</span> New Creation
        </button>

        <div className="sidebar-section">
          <span className="section-label">CAPABILITIES</span>
          {Object.entries(CAPABILITIES).map(([key, cap]) => (
            <button key={key} className={'nav-item' + (activeMode === key ? ' active' : '')} onClick={() => setActiveMode(activeMode === key ? null : key)}>
              <span>{cap.icon}</span>
              <span>{cap.title}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <p className="powered-by">Powered by Luna Labs AI</p>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        {messages.length === 0 && !uploadedFile ? (
          <div className="welcome">
            <div className="welcome-content">
              <h1>Lumen Creative Studio</h1>
              <p className="welcome-subtitle">Generate images, videos, 3D models, and more. Powered by Luna Labs - AI Supercomputer.</p>

              <div className="capabilities-grid">
                {Object.entries(CAPABILITIES).map(([key, cap]) => (
                  <button key={key} className={'capability-card' + (activeMode === key ? ' active' : '')} onClick={() => {
                    if (key === 'ads') {
                      setShowAdCreator(true);
                    } else {
                      setActiveMode(activeMode === key ? null : key);
                    }
                  }}>
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
                      <button key={i} className="template-pill" onClick={() => {
                        if (t.needsUpload) fileInputRef.current?.click();
                        setInput(t.prompt + ' ');
                      }}>
                        {t.needsUpload && '📎 '}{t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload zone */}
              <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                <span className="upload-icon">📁</span>
                <p>Drop files here or click to upload</p>
                <span className="upload-hint">Images, videos up to 50MB</span>
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
                        <span>Processing{m.operation ? ' (' + m.operation + ')' : ''}...</span>
                      </div>
                    )}
                    {m.content && <p>{m.content}</p>}
                    {m.image && (
                      <div className="image-result">
                        <img src={m.image} alt="Result" />
                        {!m.isUpload && (
                          <div className="image-buttons">
                            <a href={m.image} target="_blank" rel="noopener noreferrer">Open</a>
                            <a href={m.image} download className="primary">Download</a>
                          </div>
                        )}
                      </div>
                    )}
                    {m.video && (
                      <div className="video-result">
                        <video src={m.video} controls autoPlay loop style={{maxWidth: '100%', borderRadius: '12px'}} />
                        <div className="image-buttons">
                          <a href={m.video} download="ad-video.mp4" className="primary">Download MP4</a>
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

        {/* Uploaded file preview */}
        {uploadedFile && (
          <div className="upload-preview">
            <img src={uploadedFile} alt="Upload" />
            <button onClick={() => { setUploadedFile(null); setUploadedFilename(null); }}>✕</button>
          </div>
        )}

        {/* Input */}
        <div className="input-area">
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*,video/*" onChange={(e) => handleFileUpload(e.target.files[0])} />
          
          <div className="input-box">
            <button className="upload-btn" onClick={() => fileInputRef.current?.click()}>📎</button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && sendMessage()}
              placeholder={uploadedFilename ? 'Describe what to do with your image...' : 'Describe what you want to create...'}
              disabled={loading}
            />
            <button onClick={sendMessage} disabled={loading || (!input.trim() && !uploadedFilename)} className="send-btn">
              {loading ? <span className="spinner small"></span> : '→'}
            </button>
          </div>
        </div>
      </main>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, sans-serif; background: #0d0d0d; color: #e5e5e5; }
        
        .app { display: flex; height: 100vh; position: relative; }
        
        .drag-overlay { position: fixed; inset: 0; background: rgba(34, 197, 94, 0.1); border: 3px dashed #22c55e; z-index: 100; display: flex; align-items: center; justify-content: center; }
        .drag-content { text-align: center; }
        .drag-icon { font-size: 48px; display: block; margin-bottom: 16px; }
        
        .sidebar { width: 260px; background: #111; border-right: 1px solid #1a1a1a; display: flex; flex-direction: column; }
        .sidebar-header { padding: 16px; border-bottom: 1px solid #1a1a1a; }
        .logo { display: flex; align-items: center; gap: 12px; }
        .logo-icon { width: 32px; height: 32px; background: #22c55e; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 600; color: #000; }
        .logo-title { display: block; font-weight: 600; font-size: 14px; }
        .logo-subtitle { display: block; font-size: 11px; color: #666; }
        
        .new-chat-btn { margin: 16px; padding: 12px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; color: #fff; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.15s; }
        .new-chat-btn:hover { background: #222; border-color: #22c55e; }
        .new-chat-btn span { color: #22c55e; font-size: 18px; }
        
        .sidebar-section { flex: 1; padding: 0 12px; overflow-y: auto; }
        .section-label { display: block; font-size: 11px; font-weight: 600; color: #555; letter-spacing: 0.5px; margin: 16px 4px 8px; }
        .nav-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px; background: transparent; border: none; color: #888; font-size: 14px; border-radius: 8px; cursor: pointer; margin-bottom: 4px; text-align: left; }
        .nav-item:hover { background: #1a1a1a; color: #fff; }
        .nav-item.active { background: #22c55e20; color: #22c55e; }
        
        .sidebar-footer { padding: 16px; border-top: 1px solid #1a1a1a; }
        .powered-by { font-size: 11px; color: #444; }
        
        .main { flex: 1; display: flex; flex-direction: column; }
        
        .welcome { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px; overflow-y: auto; }
        .welcome-content { max-width: 900px; text-align: center; }
        .welcome-content h1 { font-size: 32px; font-weight: 600; margin-bottom: 12px; }
        .welcome-subtitle { color: #666; font-size: 16px; margin-bottom: 40px; }
        
        .capabilities-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 32px; }
        .capability-card { display: flex; align-items: center; gap: 12px; padding: 16px; background: #151515; border: 1px solid #222; border-radius: 12px; cursor: pointer; text-align: left; transition: all 0.15s; }
        .capability-card:hover { background: #1a1a1a; border-color: #333; }
        .capability-card.active { border-color: #22c55e; background: #22c55e10; }
        .cap-icon { font-size: 24px; }
        .cap-title { display: block; font-weight: 500; font-size: 14px; }
        .cap-desc { display: block; font-size: 12px; color: #666; }
        
        .templates-section { margin-bottom: 32px; }
        .templates-row { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 12px; }
        .template-pill { padding: 8px 16px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 20px; color: #ccc; font-size: 13px; cursor: pointer; transition: all 0.15s; }
        .template-pill:hover { background: #222; border-color: #22c55e; color: #fff; }
        
        .upload-zone { margin-top: 32px; padding: 40px; border: 2px dashed #333; border-radius: 16px; cursor: pointer; transition: all 0.15s; }
        .upload-zone:hover { border-color: #22c55e; background: #22c55e08; }
        .upload-icon { font-size: 32px; display: block; margin-bottom: 12px; }
        .upload-zone p { color: #888; margin-bottom: 8px; }
        .upload-hint { font-size: 12px; color: #555; }
        
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
        .image-buttons a { padding: 8px 16px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; color: #ccc; text-decoration: none; font-size: 13px; }
        .image-buttons a:hover { background: #222; }
        .image-buttons a.primary { background: #22c55e; border-color: #22c55e; color: #000; }
        
        .upload-preview { position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); background: #151515; border: 1px solid #333; border-radius: 12px; padding: 8px; display: flex; gap: 8px; align-items: center; z-index: 10; }
        .upload-preview img { height: 60px; border-radius: 8px; }
        .upload-preview button { background: #333; border: none; color: #fff; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; }
        
        .input-area { padding: 20px 40px; border-top: 1px solid #1a1a1a; }
        .input-box { display: flex; gap: 8px; max-width: 800px; margin: 0 auto; background: #151515; border: 1px solid #222; border-radius: 12px; padding: 4px; }
        .upload-btn { width: 44px; height: 44px; background: transparent; border: none; font-size: 20px; cursor: pointer; border-radius: 10px; }
        .upload-btn:hover { background: #222; }
        .input-box input { flex: 1; padding: 14px 8px; background: transparent; border: none; color: #fff; font-size: 15px; outline: none; }
        .input-box input::placeholder { color: #555; }
        .send-btn { width: 44px; height: 44px; background: #22c55e; border: none; border-radius: 10px; color: #000; font-size: 20px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        
        @media (max-width: 900px) { .capabilities-grid { grid-template-columns: repeat(2, 1fr); } }
        
        @media (max-width: 768px) { 
          .sidebar { display: none; } 
          .app { flex-direction: column; }
          .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
          .welcome { padding: 20px; overflow-y: auto; }
          .welcome-content h1 { font-size: 24px; margin-bottom: 8px; }
          .welcome-subtitle { font-size: 14px; margin-bottom: 24px; }
          .capabilities-grid { grid-template-columns: 1fr; gap: 8px; margin-bottom: 20px; } 
          .capability-card { padding: 12px; }
          .cap-icon { font-size: 20px; }
          .upload-zone { margin-top: 20px; padding: 24px; }
          .chat-area { padding: 16px; flex: 1; overflow-y: auto; }
          .input-area { padding: 12px 16px; position: sticky; bottom: 0; background: #0d0d0d; }
          .input-box { padding: 2px; }
          .upload-btn, .send-btn { width: 40px; height: 40px; }
          .input-box input { padding: 10px 8px; font-size: 14px; }
          .ad-creator-modal { width: 95%; max-height: 90vh; }
          .form-row { flex-direction: column; }
        }
        
        /* Marketing Ad Creator Modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .ad-creator-modal { background: #151515; border: 1px solid #333; border-radius: 16px; width: 100%; max-width: 700px; max-height: 85vh; overflow: hidden; display: flex; flex-direction: column; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #222; }
        .modal-header h2 { margin: 0; font-size: 20px; color: #fff; }
        .close-btn { background: none; border: none; color: #666; font-size: 28px; cursor: pointer; padding: 0; line-height: 1; }
        .close-btn:hover { color: #fff; }
        .modal-body { flex: 1; overflow-y: auto; padding: 24px; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid #222; }
        
        .form-row { display: flex; gap: 16px; margin-bottom: 16px; }
        .form-group { flex: 1; }
        .form-group.full-width { flex: none; width: 100%; }
        .form-group label { display: block; font-size: 13px; color: #888; margin-bottom: 6px; font-weight: 500; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 12px 14px; background: #1a1a1a; border: 1px solid #333; border-radius: 8px; color: #fff; font-size: 14px; outline: none; font-family: inherit; }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: #22c55e; }
        .form-group input::placeholder, .form-group textarea::placeholder { color: #555; }
        .form-group select { cursor: pointer; }
        .form-group textarea { resize: vertical; min-height: 80px; }
        
        .form-section { margin-top: 24px; padding-top: 20px; border-top: 1px solid #222; }
        .form-section h3 { font-size: 14px; color: #22c55e; margin: 0 0 16px 0; font-weight: 600; }
        
        .upload-asset-btn { width: 100%; padding: 12px; background: #1a1a1a; border: 1px dashed #444; border-radius: 8px; color: #888; cursor: pointer; font-size: 14px; transition: all 0.15s; }
        .upload-asset-btn:hover { border-color: #22c55e; color: #fff; background: #222; }
        
        .asset-preview { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
        .preview-thumb { width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 1px solid #333; }
        
        .cancel-btn { padding: 12px 24px; background: #333; border: none; border-radius: 8px; color: #fff; cursor: pointer; font-size: 14px; }
        .cancel-btn:hover { background: #444; }
        .create-btn { padding: 12px 32px; background: #22c55e; border: none; border-radius: 8px; color: #000; font-weight: 600; cursor: pointer; font-size: 14px; }
        .create-btn:hover { background: #1ea34b; }
        .create-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
