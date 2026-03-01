// File upload endpoint - forwards to ComfyUI
import formidable from 'formidable';
import fs from 'fs';
import FormData from 'form-data';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const COMFYUI_URL = process.env.COMFYUI_URL || 'https://spark-comfyui.ngrok.app';
const AUTH = Buffer.from(process.env.COMFYUI_AUTH || 'lumen:studio2026').toString('base64');

export const config = {
  api: {
    bodyParser: false,
  },
};

// Upload to ComfyUI using native http/https
function uploadToComfyUI(formData, filename) {
  return new Promise((resolve, reject) => {
    const url = new URL(COMFYUI_URL + '/upload/image');
    const protocol = url.protocol === 'https:' ? https : http;
    
    const options = {
      method: 'POST',
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      headers: {
        'Authorization': 'Basic ' + AUTH,
        ...formData.getHeaders(),
      },
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON response: ' + data));
          }
        } else {
          reject(new Error(`ComfyUI upload failed: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    formData.pipe(req);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({ maxFileSize: 50 * 1024 * 1024 }); // 50MB max
    
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const file = files.file?.[0] || files.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Create form data for ComfyUI
    const formData = new FormData();
    formData.append('image', fs.createReadStream(file.filepath), {
      filename: file.originalFilename || 'upload.png',
      contentType: file.mimetype || 'image/png',
    });

    // Upload to ComfyUI
    const data = await uploadToComfyUI(formData, file.originalFilename);
    
    // Clean up temp file
    try {
      fs.unlinkSync(file.filepath);
    } catch (e) {
      // Ignore cleanup errors
    }

    return res.status(200).json({
      status: 'success',
      filename: data.name,
      subfolder: data.subfolder || '',
      type: data.type || 'input',
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: error.message });
  }
}
