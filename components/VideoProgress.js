// Video Progress Component
// Shows real-time rendering progress with polling

import { useState, useEffect } from 'react';

export default function VideoProgress({ jobId, onComplete }) {
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!jobId) return;
    
    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/video-queue?jobId=${jobId}`);
        const data = await res.json();
        
        if (data.job) {
          setJob(data.job);
          
          if (data.job.status === 'complete' && onComplete) {
            onComplete(data.job);
          }
        }
      } catch (e) {
        setError(e.message);
      }
    };
    
    // Initial poll
    pollStatus();
    
    // Poll every 5 seconds
    const interval = setInterval(pollStatus, 5000);
    
    return () => clearInterval(interval);
  }, [jobId, onComplete]);
  
  if (!jobId) return null;
  
  if (error) {
    return (
      <div className="video-progress error">
        <p>❌ Error: {error}</p>
      </div>
    );
  }
  
  if (!job) {
    return (
      <div className="video-progress loading">
        <p>Loading job status...</p>
      </div>
    );
  }
  
  const statusEmoji = {
    queued: '⏳',
    rendering: '🎬',
    processing: '⚙️',
    complete: '✅',
    failed: '❌'
  };
  
  const statusText = {
    queued: 'Queued - Waiting to start',
    rendering: 'Rendering video...',
    processing: 'Processing...',
    complete: 'Complete!',
    failed: 'Failed'
  };
  
  return (
    <div className="video-progress">
      <div className="status-header">
        <span className="emoji">{statusEmoji[job.status] || '❓'}</span>
        <span className="text">{statusText[job.status] || job.status}</span>
      </div>
      
      {(job.status === 'rendering' || job.status === 'processing') && (
        <div className="progress-bar-container">
          <div 
            className="progress-bar" 
            style={{ width: `${job.progress}%` }}
          />
          <span className="progress-text">{job.progress}%</span>
        </div>
      )}
      
      {job.status === 'rendering' && (
        <p className="hint">
          🎬 Generating {job.duration}s video... This takes {Math.ceil(job.duration * 0.5)}-{Math.ceil(job.duration * 0.8)} minutes.
          <br />
          You'll get a WhatsApp notification when it's ready!
        </p>
      )}
      
      {job.status === 'complete' && job.outputs && job.outputs.length > 0 && (
        <div className="outputs">
          <h4>📦 Outputs Ready:</h4>
          <ul>
            {job.outputs.map((output, i) => (
              <li key={i}>
                <a href={output.url} target="_blank" rel="noopener noreferrer">
                  {output.filename}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {job.status === 'failed' && (
        <p className="error-message">
          ❌ {job.error || 'Video generation failed. Please try again.'}
        </p>
      )}
      
      <style jsx>{`
        .video-progress {
          background: #1a1a2e;
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
        }
        
        .status-header {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          margin-bottom: 15px;
        }
        
        .emoji {
          font-size: 24px;
        }
        
        .progress-bar-container {
          background: #2a2a4e;
          border-radius: 8px;
          height: 24px;
          position: relative;
          overflow: hidden;
        }
        
        .progress-bar {
          background: linear-gradient(90deg, #4CAF50, #8BC34A);
          height: 100%;
          border-radius: 8px;
          transition: width 0.5s ease;
        }
        
        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-weight: bold;
          color: white;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }
        
        .hint {
          margin-top: 15px;
          color: #888;
          font-size: 14px;
          line-height: 1.5;
        }
        
        .outputs {
          margin-top: 15px;
        }
        
        .outputs h4 {
          margin-bottom: 10px;
        }
        
        .outputs ul {
          list-style: none;
          padding: 0;
        }
        
        .outputs li {
          margin: 5px 0;
        }
        
        .outputs a {
          color: #4CAF50;
          text-decoration: none;
        }
        
        .outputs a:hover {
          text-decoration: underline;
        }
        
        .error-message {
          color: #ff6b6b;
          margin-top: 10px;
        }
        
        .loading {
          text-align: center;
          color: #888;
        }
        
        .error {
          color: #ff6b6b;
        }
      `}</style>
    </div>
  );
}
