import os
from PIL import Image

src_path = "/home/gaurishankar/.gemini/antigravity/brain/4cf1ecc4-3b60-456a-b4a6-b6512e0ccb55/sotix_logo_viral_spark_original_no_glow_no_text_v2_1783920124324.png"
base_dir = "/home/gaurishankar/Desktop/SotixAi/sotixAI/frontend/public"
assets_dir = os.path.join(base_dir, "assets")
prod_dir = os.path.join(base_dir, "production_assets")

os.makedirs(assets_dir, exist_ok=True)
os.makedirs(prod_dir, exist_ok=True)

img = Image.open(src_path)
if img.mode != 'RGBA':
    img = img.convert('RGBA')

# 1024x1024 Meta Developer
img_1024 = img.resize((1024, 1024), Image.Resampling.LANCZOS)
img_1024.save(os.path.join(prod_dir, "meta-developer-1024x1024.png"))

# 512x512 Google Play Console
img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
img_512.save(os.path.join(prod_dir, "google-play-console-512x512.png"))

# 512x512 assets
img_512.save(os.path.join(assets_dir, "logo-icon.png"))
img_512.save(os.path.join(assets_dir, "logo-icon-transparent.png"))
img_512.save(os.path.join(assets_dir, "logo-full.png")) # Just overwrite full logo with icon for now since we removed text

# Favicon.ico
icon_sizes = [(16, 16), (32, 32), (64, 64)]
img.save(os.path.join(base_dir, "favicon.ico"), format="ICO", sizes=icon_sizes)

print("Asset generation complete!")
