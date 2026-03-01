#!/usr/bin/env python3
"""
Download high-quality datasets for Lumen Studio training
Using publicly available, high-quality image sources
"""

import os
import json
import requests
import subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import time

# Configuration
BASE_DIR = Path.home() / "training"
DATASETS_DIR = BASE_DIR / "datasets"

# High-quality dataset sources (using img2dataset format)
DATASET_SOURCES = {
    "food": {
        "name": "Food Photography Dataset",
        "urls": [
            # Using LAION food images via img2dataset
            "https://huggingface.co/datasets/laion/laion2B-en/resolve/main/part-00000-5b54c5d5-bbcf-484d-a2ce-0d6f73df1a36-c000.snappy.parquet",
        ],
        "search_terms": ["professional food photography", "michelin star dish", "gourmet food"],
        "civitai_loras": [
            "https://civitai.com/api/download/models/135867",  # Food photography LoRA
        ],
        "target_count": 500,
    },
    "portrait": {
        "name": "Portrait Photography Dataset", 
        "civitai_loras": [
            "https://civitai.com/api/download/models/130072",  # Portrait LoRA
        ],
        "search_terms": ["professional portrait", "studio headshot", "fashion photography"],
        "target_count": 500,
    },
    "product": {
        "name": "Product Photography Dataset",
        "civitai_loras": [
            "https://civitai.com/api/download/models/126688",  # Product photography LoRA
        ],
        "search_terms": ["product photography", "commercial photography", "e-commerce"],
        "target_count": 500,
    },
    "automotive": {
        "name": "Automotive Photography Dataset",
        "civitai_loras": [
            "https://civitai.com/api/download/models/141832",  # Car photography LoRA
        ],
        "search_terms": ["luxury car photography", "automotive photography"],
        "target_count": 500,
    },
    "architecture": {
        "name": "Architecture Photography Dataset",
        "civitai_loras": [
            "https://civitai.com/api/download/models/128654",  # Architecture LoRA
        ],
        "search_terms": ["architectural photography", "interior design", "modern architecture"],
        "target_count": 500,
    },
    "landscape": {
        "name": "Landscape Photography Dataset",
        "civitai_loras": [
            "https://civitai.com/api/download/models/127432",  # Landscape LoRA
        ],
        "search_terms": ["landscape photography", "nature photography", "scenic view"],
        "target_count": 500,
    },
}

def download_civitai_lora(url, output_dir, name):
    """Download a LoRA from CivitAI"""
    try:
        print(f"📥 Downloading {name} LoRA from CivitAI...")
        output_path = output_dir / f"{name}_lora.safetensors"
        
        response = requests.get(url, stream=True, timeout=120)
        response.raise_for_status()
        
        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print(f"✅ Downloaded {name} LoRA: {output_path}")
        return str(output_path)
    except Exception as e:
        print(f"❌ Failed to download {name} LoRA: {e}")
        return None

def download_sample_images(category, output_dir, count=100):
    """Download sample images for a category using various methods"""
    print(f"📥 Gathering {category} images...")
    
    # Create category directory
    img_dir = output_dir / "images"
    img_dir.mkdir(parents=True, exist_ok=True)
    
    # Method 1: Use picsum.photos for placeholder high-quality images
    # In production, you'd use actual curated datasets
    downloaded = 0
    
    # Method 2: Download from Unsplash Source (free, high-quality)
    search_term = DATASET_SOURCES[category]["search_terms"][0].replace(" ", ",")
    
    for i in range(min(count, 50)):  # Limit to 50 per category for now
        try:
            url = f"https://source.unsplash.com/1024x1024/?{search_term}"
            response = requests.get(url, timeout=30)
            if response.status_code == 200:
                img_path = img_dir / f"{category}_{i:04d}.jpg"
                with open(img_path, 'wb') as f:
                    f.write(response.content)
                downloaded += 1
                if downloaded % 10 == 0:
                    print(f"  Downloaded {downloaded} images...")
                time.sleep(0.5)  # Rate limiting
        except Exception as e:
            continue
    
    print(f"✅ Downloaded {downloaded} images for {category}")
    return downloaded

def create_captions(category, img_dir):
    """Create caption files for each image (required for training)"""
    print(f"📝 Creating captions for {category}...")
    
    caption_template = DATASET_SOURCES[category]["search_terms"][0]
    
    captions_created = 0
    for img_path in (img_dir / "images").glob("*.jpg"):
        caption_path = img_path.with_suffix(".txt")
        with open(caption_path, "w") as f:
            # Create detailed caption for better training
            f.write(f"{caption_template}, professional photography, high quality, masterpiece, 8k uhd, photorealistic, RAW photo, natural lighting")
        captions_created += 1
    
    print(f"✅ Created {captions_created} captions for {category}")
    return captions_created

def main():
    """Main dataset download function"""
    print("=" * 60)
    print("🚀 AUTONOMOUS DATASET GATHERING")
    print("=" * 60)
    
    # Setup directories
    DATASETS_DIR.mkdir(parents=True, exist_ok=True)
    lora_dir = Path.home() / "ComfyUI" / "models" / "loras"
    
    results = {}
    
    for category, config in DATASET_SOURCES.items():
        print(f"\n{'=' * 40}")
        print(f"📂 Processing: {category.upper()}")
        print("=" * 40)
        
        cat_dir = DATASETS_DIR / category
        cat_dir.mkdir(parents=True, exist_ok=True)
        
        # Download LoRAs from CivitAI (pre-trained, saves training time)
        loras_downloaded = []
        if "civitai_loras" in config:
            for lora_url in config["civitai_loras"]:
                lora_path = download_civitai_lora(lora_url, lora_dir, category)
                if lora_path:
                    loras_downloaded.append(lora_path)
        
        # Download training images
        img_count = download_sample_images(category, cat_dir, count=100)
        
        # Create captions
        if img_count > 0:
            caption_count = create_captions(category, cat_dir)
        else:
            caption_count = 0
        
        results[category] = {
            "images": img_count,
            "captions": caption_count,
            "loras": loras_downloaded,
            "status": "ready" if img_count > 0 else "needs_images"
        }
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 DATASET GATHERING SUMMARY")
    print("=" * 60)
    
    for category, info in results.items():
        status = "✅" if info["status"] == "ready" else "⚠️"
        lora_count = len(info.get("loras", []))
        print(f"{status} {category}: {info['images']} images, {info['captions']} captions, {lora_count} LoRAs")
    
    # Save results
    with open(BASE_DIR / "dataset_status.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📄 Status saved to: {BASE_DIR / 'dataset_status.json'}")
    
    return results

if __name__ == "__main__":
    main()
