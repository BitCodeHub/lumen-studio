// Async Video Queue API
// Handles job submission, status polling, and completion notifications

import fs from 'fs/promises';
import path from 'path';

const JOBS_FILE = path.join(process.cwd(), 'data', 'video-jobs.json');
const COMFYUI_URL = process.env.COMFYUI_URL || 'https://spark-comfyui.ngrok.app';
const AUTH = Buffer.from(process.env.COMFYUI_AUTH || 'lumen:studio2026').toString('base64');

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (e) {}
}

// Load jobs from file
async function loadJobs() {
  await ensureDataDir();
  try {
    const data = await fs.readFile(JOBS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return { jobs: {} };
  }
}

// Save jobs to file
async function saveJobs(jobs) {
  await ensureDataDir();
  await fs.writeFile(JOBS_FILE, JSON.stringify(jobs, null, 2));
}

// Generate unique job ID
function generateJobId() {
  return `vid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Check ComfyUI job status
async function checkComfyUIStatus(promptId) {
  try {
    const res = await fetch(`${COMFYUI_URL}/history/${promptId}`, {
      headers: { 'Authorization': `Basic ${AUTH}` }
    });
    
    if (!res.ok) return { status: 'pending' };
    
    const data = await res.json();
    const job = data[promptId];
    
    if (job && job.outputs) {
      // Find video/image outputs
      const outputs = [];
      for (const [nodeId, output] of Object.entries(job.outputs)) {
        if (output.images) {
          outputs.push(...output.images.map(img => ({
            filename: img.filename,
            type: img.type || 'output',
            url: `${COMFYUI_URL}/view?filename=${img.filename}&type=${img.type || 'output'}`
          })));
        }
        if (output.gifs) {
          outputs.push(...output.gifs.map(gif => ({
            filename: gif.filename,
            type: 'output',
            url: `${COMFYUI_URL}/view?filename=${gif.filename}&type=output`
          })));
        }
      }
      return { status: 'complete', outputs };
    }
    
    return { status: 'processing' };
  } catch (e) {
    console.error('ComfyUI check error:', e);
    return { status: 'error', error: e.message };
  }
}

// Send WhatsApp notification
async function sendWhatsAppNotification(jobId, status, outputs) {
  try {
    // Use local clawdbot message API
    const message = status === 'complete' 
      ? `🎬 Video Ready!\n\nJob: ${jobId}\nOutputs: ${outputs?.length || 0} files\n\nCheck Lumen Studio to download.`
      : `⚠️ Video generation failed for job ${jobId}`;
    
    await fetch('http://localhost:3002/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, target: '+19495422279' })
    }).catch(() => {}); // Silent fail if notify endpoint doesn't exist
  } catch (e) {
    console.error('WhatsApp notification failed:', e);
  }
}

export default async function handler(req, res) {
  const { method } = req;
  
  if (method === 'POST') {
    // Submit new video job
    const { prompt, duration, style, comfyPromptId } = req.body;
    
    const jobId = generateJobId();
    const jobs = await loadJobs();
    
    jobs.jobs[jobId] = {
      id: jobId,
      prompt,
      duration: duration || 30,
      style: style || 'apple',
      comfyPromptId: comfyPromptId || null,
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      outputs: []
    };
    
    await saveJobs(jobs);
    
    return res.status(200).json({
      success: true,
      jobId,
      message: 'Video job queued. Poll /api/video-queue?jobId=' + jobId + ' for status.'
    });
  }
  
  if (method === 'GET') {
    const { jobId, action } = req.query;
    
    // List all jobs
    if (action === 'list') {
      const jobs = await loadJobs();
      const jobList = Object.values(jobs.jobs)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 20);
      return res.status(200).json({ jobs: jobList });
    }
    
    // Get specific job status
    if (jobId) {
      const jobs = await loadJobs();
      const job = jobs.jobs[jobId];
      
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      
      // If job has ComfyUI prompt ID, check its status
      if (job.comfyPromptId && job.status !== 'complete' && job.status !== 'failed') {
        const comfyStatus = await checkComfyUIStatus(job.comfyPromptId);
        
        if (comfyStatus.status === 'complete') {
          job.status = 'complete';
          job.outputs = comfyStatus.outputs;
          job.progress = 100;
          job.completedAt = new Date().toISOString();
          job.updatedAt = new Date().toISOString();
          await saveJobs(jobs);
          
          // Send WhatsApp notification
          await sendWhatsAppNotification(jobId, 'complete', comfyStatus.outputs);
        } else if (comfyStatus.status === 'processing') {
          // Estimate progress based on time elapsed
          const elapsed = Date.now() - new Date(job.createdAt).getTime();
          const estimatedTotal = (job.duration || 30) * 20000; // ~20s per second of video
          job.progress = Math.min(95, Math.round((elapsed / estimatedTotal) * 100));
          job.status = 'rendering';
          job.updatedAt = new Date().toISOString();
          await saveJobs(jobs);
        } else if (comfyStatus.status === 'error') {
          job.status = 'failed';
          job.error = comfyStatus.error;
          job.updatedAt = new Date().toISOString();
          await saveJobs(jobs);
          
          await sendWhatsAppNotification(jobId, 'failed', null);
        }
      }
      
      return res.status(200).json({ job });
    }
    
    return res.status(400).json({ error: 'Missing jobId or action parameter' });
  }
  
  if (method === 'PUT') {
    // Update job (link ComfyUI prompt ID)
    const { jobId, comfyPromptId, status, progress } = req.body;
    
    const jobs = await loadJobs();
    const job = jobs.jobs[jobId];
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    if (comfyPromptId) job.comfyPromptId = comfyPromptId;
    if (status) job.status = status;
    if (progress !== undefined) job.progress = progress;
    job.updatedAt = new Date().toISOString();
    
    await saveJobs(jobs);
    
    return res.status(200).json({ success: true, job });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
