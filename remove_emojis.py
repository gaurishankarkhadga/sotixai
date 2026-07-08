import os
import re

directories = ['frontend/src/components', 'frontend/src']
emoji_pattern = re.compile(r'[🚀✨🔥⚠️⚡🤖📈💡🚨💬🎉✅❌🛡️💰💎⭐🎁🔗🖼️📦📋📝🏆⛔💀]')

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if emoji_pattern.search(content):
        # Also let's fix the "chatty" message in ChatHub.jsx
        content = content.replace("Good morning! Ready to work 🚀", "System initialized.")
        content = content.replace("⚠️ Abuse Intercepted", "Abuse Intercepted")
        content = content.replace("🚨 WARNING 🚨", "WARNING")
        
        # Now remove all remaining emojis
        new_content = emoji_pattern.sub('', content)
        
        # Clean up some common leftover weird spaces like "  " -> " " where emojis used to be,
        # but safely. We'll just trust the regex replacement.
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Cleaned {filepath}")

for d in directories:
    for root, _, files in os.walk(d):
        for file in files:
            if file.endswith('.jsx'):
                process_file(os.path.join(root, file))

