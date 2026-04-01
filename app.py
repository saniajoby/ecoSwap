from flask import Flask, render_template, jsonify, request
import json
import os

app = Flask(__name__)

# Load mock datasets
DATA_FILE = os.path.join(os.path.dirname(__file__), 'data', 'products.json')
CRAFTS_FILE = os.path.join(os.path.dirname(__file__), 'data', 'crafts.json')

SYNONYMS = {
    "thermos": "bottle", "flask": "bottle", "tumbler": "bottle", "water": "bottle",
    "clock": "watch", "time": "watch",
    "sack": "bag", "tote": "bag", "purse": "bag", "backpack": "bag", "carrier": "bag",
    "mug": "cup", "glass": "cup", "tumbler": "cup",
    "brush": "toothbrush", "teeth": "toothbrush", "toothpaste": "toothbrush",
    "soap": "shampoo", "conditioner": "shampoo", "body wash": "shampoo", "hair": "shampoo",
    "film": "wrap", "foil": "wrap", "saran": "wrap", "ziploc": "wrap", "tupperware": "wrap",
    "loofah": "sponge", "scrubber": "sponge", "washcloth": "sponge", "rag": "sponge",
    "shaver": "razor", "blade": "razor", "shave": "razor",
    "pencil": "pen", "marker": "pen", "highlighter": "pen",
    "case": "phone case", "cover": "phone case", "iphone": "phone case", "android": "phone case"
}

def load_data():
    if not os.path.exists(DATA_FILE): return {}
    with open(DATA_FILE, 'r') as file: return json.load(file)

def load_crafts():
    if not os.path.exists(CRAFTS_FILE): return {}
    with open(CRAFTS_FILE, 'r') as file: return json.load(file)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/upload', methods=['POST'])
def upload_image():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
        
    filename = file.filename.lower()
    
    # Try to detect known classes
    if "watch" in filename or "clock" in filename:
        detected = "watch"
    elif "brush" in filename or "teeth" in filename:
        detected = "toothbrush"
    elif "paper" in filename or "cardboard" in filename:
        detected = "paper"
    elif "plastic" in filename:
        detected = "plastic"
    else:
        detected = "bottle"
        
    return jsonify({"detected_product": detected})

@app.route('/api/search', methods=['GET'])
def search_product():
    query = request.args.get('q', '').lower().strip()
    data = load_data()
    
    if not query or query == 'all':
        return jsonify({"query": "all", "results": {"is_all": True, "categories": data}})

    # Exact match
    if query in data:
        return jsonify({"query": query, "results": data[query]})
    
    # Partial match logic
    for key, info in data.items():
        if query in key or key in query:
            return jsonify({"query": key, "results": info})
            
    # Synonym matching
    for syn, base_key in SYNONYMS.items():
        if syn in query and base_key in data:
            return jsonify({"query": base_key, "results": data[base_key]})
    # Dynamic Fallback Generator for literally ANY product
    fallback = {
        "original_product": f"Conventional {query.title()}",
        "why_not_buy": f"Mass-produced {query}s often rely on virgin plastics and create severe landfill waste. Consider if you truly need a new one!",
        "alternatives": [
            {
                "name": f"Sustainable {query.title()}",
                "type": "Eco Swap",
                "price_range": "Market Price",
                "base_price": 0,
                "availability": [
                    {"store": "Amazon", "url": f"https://www.amazon.com/s?k=sustainable+{query.replace(' ', '+')}", "type": "online"},
                    {"store": "Eco-Friendly Brands", "url": f"https://www.google.com/search?q=sustainable+{query.replace(' ', '+')}", "type": "online"},
                    {"store": "Local Stores", "url": "#", "type": "local"}
                ],
                "eco_score": 85,
                "eco_breakdown": { "Material": 25, "Reusability": 20, "Lifespan": 25, "Carbon Impact": 15 },
                "why_eco": f"Designed using eco-friendly, biodegradable, or highly recyclable materials instead of standard toxic plastics.",
                "impact": { "plastic_saved": "Significant amounts", "co2_reduction": "High", "money_saved": "Varies" },
                "image": f"https://image.pollinations.ai/prompt/eco%20friendly%20{query.replace(' ', '%20')}?width=400&height=300&nologo=true"
            },
            {
                "name": f"Second-hand/Upcycled {query.title()}",
                "type": "Budget Eco Swap",
                "price_range": "Budget",
                "base_price": 0,
                "availability": [
                    {"store": "eBay", "url": f"https://www.ebay.com/sch/i.html?_nkw=used+{query.replace(' ', '+')}", "type": "online"},
                    {"store": "Local Thrift Stores", "url": "#", "type": "local"}
                ],
                "eco_score": 98,
                "eco_breakdown": { "Material": 30, "Reusability": 30, "Lifespan": 20, "Carbon Impact": 18 },
                "why_eco": "Buying second-hand prevents the carbon footprint of manufacturing entirely.",
                "impact": { "plastic_saved": "100%", "co2_reduction": "100%", "money_saved": "High" },
                "image": f"https://image.pollinations.ai/prompt/used%20vintage%20{query.replace(' ', '%20')}?width=400&height=300&nologo=true"
            }
        ]
    }
    return jsonify({"query": query, "results": fallback})

@app.route('/api/crafts', methods=['GET'])
def search_craft():
    query = request.args.get('q', '').lower().strip()
    data = load_crafts()
    
    if not query or query == 'all':
        return jsonify({"query": "all", "results": {"is_all": True, "categories": data}})

    # Exact match
    if query in data:
        return jsonify({"query": query, "results": data[query]})
    
    # Partial match logic
    for key, info in data.items():
        if query in key or key in query:
            return jsonify({"query": key, "results": info})

    # Synonym matching
    for syn, base_key in SYNONYMS.items():
        if syn in query and base_key in data:
            return jsonify({"query": base_key, "results": data[base_key]})
    # Dynamic fallback for crafts
    craft_fallback = {
        "material": query.title(),
        "crafts": [
            {
                "title": f"Upcycled {query.title()} Art",
                "image": f"https://image.pollinations.ai/prompt/DIY%20craft%20project%20made%20from%20{query.replace(' ', '%20')}?width=400&height=300&nologo=true",
                "difficulty": "Medium",
                "time": "30 mins",
                "steps": [
                    f"Clean and prepare your old {query}.",
                    "Use non-toxic paints or natural dyes to recolor the surface.",
                    "Repurpose the structural components into a unique decorative sculpture or functional household item.",
                    "Display your zero-waste creation!"
                ]
            }
        ]
    }
    return jsonify({"query": query, "results": craft_fallback})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
