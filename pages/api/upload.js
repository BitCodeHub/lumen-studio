// File upload endpoint - forwards to ComfyUI
import formidable from 'formidable';
import fs from 'fs';
import FormData from 'form-data';

const COMFYUI_URL = process.env.COMFYUI_URL || 'https://spark-comfyui.ngrok.app';
const AUTH = Buffer.from(process.env.COMFYUI_AUTH || 'lumen:studio2026').toString('base64');

export const config = {
  api: {
    bodyParser: false,
  },
};

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

    // Read file and upload to ComfyUI
    const fileBuffer = fs.readFileSync(file.filepath);
    const formData = new FormData();
    formData.append('image', fileBuffer, {
      filename: file.originalFilename || 'upload.png',
      contentType: file.mimetype || 'image/png',
    });

    const uploadRes = await fetch(COMFYUI_URL + '/upload/image', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + AUTH,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      throw new Error('ComfyUI upload failed: ' + text);
    }

    const data = await uploadRes.json();
    
    // Clean up temp file
    fs.unlinkSync(file.filepath);

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
