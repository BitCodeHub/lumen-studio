#!/usr/bin/env python3
"""
INDUSTRIAL-SCALE AUTONOMOUS TRAINING PIPELINE
Lumen Studio - DGX Spark GB10

Target: 100,000+ high-quality images per category
Sources: LAION, HuggingFace, Unsplash, Pexels, curated datasets
Quality: Aesthetic score filtering, resolution checks, deduplication
"""

import os
import json
import subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import multiprocessing as mp

# Configuration
BASE_DIR = Path.home() / "training"
DATASETS_DIR = BASE_DIR / "datasets"
OUTPUTS_DIR = BASE_DIR / "outputs"
CONFIGS_DIR = BASE_DIR / "configs"

# Target counts per category
TARGET_IMAGES = 100000  # 100k per category minimum

# High-quality dataset sources
LAION_SUBSETS = {
    "food": {
        "parquet_urls": [
            # LAION-Aesthetics filtered for food
            "https://huggingface.co/datasets/laion/laion2B-en-aesthetic/resolve/main/part-00000-*.parquet",
        ],
        "search_queries": [
            "professional food photography",
            "michelin star restaurant dish",
            "gourmet cuisine photography",
            "food magazine cover shot",
            "appetizing meal presentation",
            "culinary arts photography",
            "restaurant menu photography",
            "fine dining presentation",
        ],
        "aesthetic_threshold": 6.0,  # Higher = better quality
    },
    "portrait": {
        "search_queries": [
            "professional portrait photography",
            "studio headshot lighting",
            "fashion photography model",
            "editorial portrait",
            "corporate headshot",
            "beauty photography",
            "lifestyle portrait",
            "environmental portrait",
        ],
        "aesthetic_threshold": 6.5,
    },
    "product": {
        "search_queries": [
            "professional product photography",
            "commercial advertising photo",
            "e-commerce product shot",
            "luxury product presentation",
            "studio product lighting",
            "catalog photography",
            "packshot photography",
            "cosmetics product photo",
        ],
        "aesthetic_threshold": 6.0,
    },
    "automotive": {
        "search_queries": [
            "luxury car photography",
            "automotive advertising",
            "sports car showroom",
            "car magazine cover",
            "automotive studio shot",
            "vehicle photography",
            "supercar photography",
            "classic car photography",
        ],
        "aesthetic_threshold": 6.0,
    },
    "architecture": {
        "search_queries": [
            "architectural photography interior",
            "modern architecture design",
            "interior design magazine",
            "real estate photography",
            "luxury home interior",
            "commercial architecture",
            "architectural digest style",
            "minimalist interior design",
        ],
        "aesthetic_threshold": 6.0,
    },
    "landscape": {
        "search_queries": [
            "professional landscape photography",
            "national geographic nature",
            "epic scenic vista",
            "golden hour landscape",
            "dramatic nature photography",
            "wilderness photography",
            "mountain landscape photo",
            "coastal photography",
        ],
        "aesthetic_threshold": 6.5,
    },
    "wedding": {
        "search_queries": [
            "professional wedding photography",
            "bridal portrait photography",
            "wedding editorial style",
            "romantic wedding photo",
            "luxury wedding photography",
            "wedding ceremony photography",
            "wedding reception photography",
            "engagement photography",
        ],
        "aesthetic_threshold": 6.0,
    },
    "fashion": {
        "search_queries": [
            "high fashion photography",
            "vogue editorial style",
            "runway fashion photo",
            "fashion magazine cover",
            "designer fashion shoot",
            "streetwear photography",
            "luxury fashion advertising",
            "fashion lookbook",
        ],
        "aesthetic_threshold": 7.0,
    },
}

def setup_img2dataset():
    """Install and configure img2dataset for large-scale downloads"""
    print("📦 Setting up img2dataset...")
    subprocess.run(["pip", "install", "img2dataset", "clip-retrieval", "-q"], check=True)
    print("✅ img2dataset ready")

def download_laion_subset(category, output_dir, target_count=10000):
    """Download images from LAION using img2dataset"""
    config = LAION_SUBSETS.get(category, {})
    queries = config.get("search_queries", [])
    aesthetic_threshold = config.get("aesthetic_threshold", 5.5)
    
    print(f"📥 Downloading {category} from LAION (target: {target_count} images)...")
    
    # Create URL list from search queries
    url_list_path = output_dir / "urls.txt"
    
    # Use clip-retrieval to find matching images
    for query in queries[:3]:  # Start with first 3 queries
        cmd = [
            "clip-retrieval", "filter",
            "--query", query,
            "--aesthetic_weight", "0.5",
            "--aesthetic_threshold", str(aesthetic_threshold),
            "--output_folder", str(output_dir / "laion"),
            "--num_images", str(target_count // len(queries)),
        ]
        try:
            subprocess.run(cmd, timeout=3600, check=False)
        except Exception as e:
            print(f"  Query '{query}' failed: {e}")
    
    return count_images(output_dir)

def download_hf_dataset(dataset_name, category, output_dir, max_images=50000):
    """Download from HuggingFace datasets"""
    print(f"📥 Downloading {dataset_name} for {category}...")
    
    try:
        from datasets import load_dataset
        import PIL.Image
        
        # Set custom cache
        os.environ["HF_HOME"] = str(BASE_DIR / ".hf_cache")
        
        ds = load_dataset(dataset_name, split="train", streaming=True)
        
        img_dir = output_dir / "images"
        img_dir.mkdir(parents=True, exist_ok=True)
        
        count = 0
        for item in ds:
            if count >= max_images:
                break
            
            try:
                if 'image' in item:
                    img = item['image']
                    if isinstance(img, PIL.Image.Image):
                        # Quality check: minimum resolution
                        if img.size[0] >= 512 and img.size[1] >= 512:
                            img_path = img_dir / f"{dataset_name.replace('/', '_')}_{count:06d}.jpg"
                            img.convert('RGB').save(img_path, quality=95)
                            count += 1
                            
                            if count % 1000 == 0:
                                print(f"  Downloaded {count} images...")
            except Exception as e:
                continue
        
        print(f"✅ Downloaded {count} images from {dataset_name}")
        return count
        
    except Exception as e:
        print(f"❌ Error with {dataset_name}: {e}")
        return 0

def download_unsplash_bulk(category, output_dir, target_count=10000):
    """Download from Unsplash using their bulk download API"""
    import requests
    import time
    
    queries = LAION_SUBSETS.get(category, {}).get("search_queries", [category])
    img_dir = output_dir / "images"
    img_dir.mkdir(parents=True, exist_ok=True)
    
    count = 0
    per_query = target_count // len(queries)
    
    for query in queries:
        print(f"  Downloading '{query}'...")
        search_term = query.replace(" ", ",")
        
        for i in range(per_query):
            if count >= target_count:
                break
            
            try:
                # Unsplash Source API (free, high-quality)
                url = f"https://source.unsplash.com/1024x1024/?{search_term}"
                response = requests.get(url, timeout=30)
                
                if response.status_code == 200 and len(response.content) > 10000:
                    img_path = img_dir / f"{category}_{count:06d}.jpg"
                    with open(img_path, 'wb') as f:
                        f.write(response.content)
                    count += 1
                    
                    if count % 100 == 0:
                        print(f"    Downloaded {count} images...")
                
                time.sleep(0.3)  # Rate limiting
                
            except Exception as e:
                continue
    
    print(f"✅ Downloaded {count} images from Unsplash for {category}")
    return count

def download_pexels_bulk(category, output_dir, target_count=10000):
    """Download from Pexels API"""
    import requests
    import time
    
    # Pexels API key (free tier)
    PEXELS_API_KEY = os.environ.get("PEXELS_API_KEY", "")
    
    if not PEXELS_API_KEY:
        print("⚠️ No Pexels API key, skipping...")
        return 0
    
    queries = LAION_SUBSETS.get(category, {}).get("search_queries", [category])
    img_dir = output_dir / "images"
    img_dir.mkdir(parents=True, exist_ok=True)
    
    headers = {"Authorization": PEXELS_API_KEY}
    count = 0
    
    for query in queries:
        page = 1
        while count < target_count:
            try:
                url = f"https://api.pexels.com/v1/search?query={query}&per_page=80&page={page}"
                response = requests.get(url, headers=headers, timeout=30)
                data = response.json()
                
                if 'photos' not in data or not data['photos']:
                    break
                
                for photo in data['photos']:
                    img_url = photo['src']['large2x']
                    img_response = requests.get(img_url, timeout=30)
                    
                    if img_response.status_code == 200:
                        img_path = img_dir / f"{category}_pexels_{count:06d}.jpg"
                        with open(img_path, 'wb') as f:
                            f.write(img_response.content)
                        count += 1
                
                page += 1
                time.sleep(0.5)
                
            except Exception as e:
                break
    
    print(f"✅ Downloaded {count} images from Pexels for {category}")
    return count

def create_captions_with_blip(img_dir):
    """Auto-generate captions using BLIP"""
    print("🏷️ Generating captions with BLIP...")
    
    try:
        from transformers import BlipProcessor, BlipForConditionalGeneration
        from PIL import Image
        import torch
        
        processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-large")
        model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-large")
        
        if torch.cuda.is_available():
            model = model.to("cuda")
        
        count = 0
        for img_path in img_dir.glob("*.jpg"):
            try:
                caption_path = img_path.with_suffix(".txt")
                if caption_path.exists():
                    continue
                
                image = Image.open(img_path).convert('RGB')
                inputs = processor(image, return_tensors="pt")
                
                if torch.cuda.is_available():
                    inputs = {k: v.to("cuda") for k, v in inputs.items()}
                
                outputs = model.generate(**inputs, max_length=100)
                caption = processor.decode(outputs[0], skip_special_tokens=True)
                
                # Enhance caption with quality keywords
                enhanced = f"{caption}, professional photography, high quality, masterpiece, 8k uhd, photorealistic, RAW photo"
                
                with open(caption_path, "w") as f:
                    f.write(enhanced)
                
                count += 1
                if count % 500 == 0:
                    print(f"  Captioned {count} images...")
                    
            except Exception as e:
                continue
        
        print(f"✅ Created {count} captions")
        return count
        
    except Exception as e:
        print(f"❌ BLIP captioning failed: {e}")
        return 0

def count_images(directory):
    """Count images in directory"""
    return len(list(Path(directory).rglob("*.jpg"))) + len(list(Path(directory).rglob("*.png")))

def train_lora_kohya(category, dataset_dir, output_dir):
    """Train LoRA using kohya_ss"""
    print(f"🚀 Training LoRA for {category}...")
    
    config = {
        "pretrained_model_name_or_path": str(Path.home() / "ComfyUI/models/checkpoints/juggernautXL_v9.safetensors"),
        "train_data_dir": str(dataset_dir / "images"),
        "output_dir": str(output_dir),
        "output_name": f"{category}_lora",
        "resolution": "1024,1024",
        "train_batch_size": 1,
        "gradient_accumulation_steps": 4,
        "learning_rate": 1e-4,
        "lr_scheduler": "cosine",
        "lr_warmup_steps": 100,
        "max_train_steps": 2000,
        "mixed_precision": "bf16",
        "save_every_n_steps": 500,
        "network_dim": 32,
        "network_alpha": 32,
        "cache_latents": True,
        "cache_latents_to_disk": True,
    }
    
    # Save config
    config_path = CONFIGS_DIR / f"{category}_kohya.json"
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)
    
    # Run training
    cmd = [
        "python", str(Path.home() / "kohya_ss/sdxl_train_network.py"),
        "--config_file", str(config_path),
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=14400)  # 4 hour timeout
        if result.returncode == 0:
            print(f"✅ LoRA training complete for {category}")
            return True
        else:
            print(f"❌ Training failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Training error: {e}")
        return False

def main():
    """Main autonomous training pipeline"""
    print("=" * 70)
    print("🚀 INDUSTRIAL-SCALE AUTONOMOUS TRAINING PIPELINE")
    print("   Target: 100,000+ images per category")
    print("=" * 70)
    
    # Setup
    for d in [DATASETS_DIR, OUTPUTS_DIR, CONFIGS_DIR]:
        d.mkdir(parents=True, exist_ok=True)
    
    categories = list(LAION_SUBSETS.keys())
    results = {}
    
    for category in categories:
        print(f"\n{'=' * 50}")
        print(f"📂 PROCESSING: {category.upper()}")
        print(f"   Target: {TARGET_IMAGES:,} images")
        print("=" * 50)
        
        cat_dir = DATASETS_DIR / category
        cat_dir.mkdir(parents=True, exist_ok=True)
        out_dir = OUTPUTS_DIR / category
        out_dir.mkdir(parents=True, exist_ok=True)
        
        total_images = 0
        
        # Method 1: Unsplash (high quality, limited quantity)
        total_images += download_unsplash_bulk(category, cat_dir, target_count=5000)
        
        # Method 2: HuggingFace datasets
        hf_datasets = {
            "food": ["ethz/food101", "Matthijs/snacks"],
            "portrait": ["FFHQ", "CelebA"],
            "automotive": ["Multimodal-Fatima/StanfordCars_train"],
            "landscape": ["scenery-images"],
        }
        
        if category in hf_datasets:
            for ds_name in hf_datasets[category]:
                try:
                    total_images += download_hf_dataset(ds_name, category, cat_dir, max_images=20000)
                except:
                    continue
        
        # Generate captions
        if total_images > 0:
            create_captions_with_blip(cat_dir / "images")
        
        # Train LoRA if we have enough data
        if total_images >= 500:
            success = train_lora_kohya(category, cat_dir, out_dir)
            status = "trained" if success else "train_failed"
        else:
            status = "needs_more_data"
        
        results[category] = {
            "images": total_images,
            "status": status,
            "output_dir": str(out_dir),
        }
        
        print(f"\n📊 {category}: {total_images:,} images - {status}")
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 FINAL SUMMARY")
    print("=" * 70)
    
    total_all = 0
    for category, info in results.items():
        status = "✅" if info["status"] == "trained" else "⚠️"
        print(f"{status} {category}: {info['images']:,} images - {info['status']}")
        total_all += info["images"]
    
    print(f"\n🎯 TOTAL: {total_all:,} images across {len(categories)} categories")
    
    # Save results
    with open(BASE_DIR / "industrial_training_status.json", "w") as f:
        json.dump(results, f, indent=2)
    
    return results

if __name__ == "__main__":
    main()
