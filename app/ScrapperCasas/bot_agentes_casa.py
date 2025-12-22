#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json, re, time, random
from collections import Counter, defaultdict
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

from bs4 import BeautifulSoup
from tqdm import tqdm
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
import pandas as pd
import spacy
from rapidfuzz import process, fuzz

# ---------------- CONFIG ----------------
# 🔥 21 AGENCIAS DE MÓSTOLES
AGENCY_URLS = [
    "https://www.google.com/maps/place/Inmobiliaria-Unna-Mostoles/data=!4m7!3m6!1s0xd418dd13bc7a635:0xb0687b11d08723b0!8m2!3d40.3201535!4d-3.8713313!16s%2Fg%2F1thd7zvf!19sChIJNabHO9GNQQ0RsCOH0BF7aLA",
    "https://www.google.com/maps/place/Inmobiliaria+M%C3%B3stoles+Sur+Redpiso/data=!4m7!3m6!1s0xd418dd1fc49751b:0x7622fbff6b62a6e2!8m2!3d40.3160003!4d-3.8719598!16s%2Fg%2F11bv3mn_cc!19sChIJG3VJ_NGNQQ0R4qZia__7InY",
    "https://www.google.com/maps/place/Inmobiliarias+Encuentro/data=!4m7!3m6!1s0xd418dd1d061d515:0x3ddb6b2d7b01595d!8m2!3d40.3161459!4d-3.8725797!16s%2Fg%2F11c6pp3dj9!19sChIJFdVh0NGNQQ0RXVkBey1r2z0",
    "https://www.google.com/maps/place/Inmobiliarias+Encuentro/data=!4m7!3m6!1s0xd418f50ca7a1c95:0xd196ed005974ee24!8m2!3d40.3319057!4d-3.8710166!16s%2Fg%2F11pb2b8c9l!19sChIJlRx6ylCPQQ0RJO50WQDtltE",
    "https://www.google.com/maps/place/Hogares+Inmobiliaria+-+M%C3%B3stoles+Dos+de+Mayo/data=!4m7!3m6!1s0xd418d4e65e22d75:0x9596abe278d4f2a6!8m2!3d40.3195354!4d-3.8733642!16s%2Fg%2F11xm_xh_g7!19sChIJdS3iZU6NQQ0RpvLUeOKrlpU",
    "https://www.google.com/maps/place/Inmobiliaria+Mendesalles/data=!4m7!3m6!1s0xd418e8a2aa4285d:0x51b0a33b58b6675c!8m2!3d40.3418639!4d-3.8633339!16s%2Fg%2F1hhwd_kc9!19sChIJXSikKoqOQQ0RXGe2WDujsFE",
    "https://www.google.com/maps/place/Inmobiliaria+Novogar/data=!4m7!3m6!1s0xd418e7e38dd6533:0x52848c08bc17608a!8m2!3d40.3292673!4d-3.866574!16s%2Fg%2F1tnpgrbx!19sChIJM2XdOH6OQQ0RimAXvAiMhFI",
    "https://www.google.com/maps/place/Inmobiliaria+Unhogar+M%C3%B3stoles/data=!4m7!3m6!1s0xd418d57f03abad3:0xef3a8540176c7a6d!8m2!3d40.3249932!4d-3.8606896!16s%2Fg%2F11vyqt8b0d!19sChIJ07o68FeNQQ0RbXpsF0CFOu8",
    "https://www.google.com/maps/place/Inmobiliaria+Hogares+en+M%C3%B3stoles+Centro/data=!4m7!3m6!1s0xd418d59cea7e7d9:0x68c316d488aa1a2d!8m2!3d40.3248372!4d-3.860005!16s%2Fg%2F11y9ns6tfy!19sChIJ2eenzlmNQQ0RLRqqiNQWw2g",
    "https://www.google.com/maps/place/Trader+inmobiliario/data=!4m7!3m6!1s0xd418dd6ccc7cf35:0x428f63ceccdbce69!8m2!3d40.3208162!4d-3.8722991!16s%2Fg%2F1yg93q3j5!19sChIJNc_HzNaNQQ0Rac7bzM5jj0I",
    "https://www.google.com/maps/place/INMOBILIARIA+VISUAL+HOGAR/data=!4m7!3m6!1s0xd418c283d7d70bb:0x13ab63a14d23579e!8m2!3d40.3255795!4d-3.8566575!16s%2Fg%2F11c4qlrfkb!19sChIJu3B9PSiMQQ0RnlcjTaFjqxM",
    "https://www.google.com/maps/place/F%26M+Real+Estate+Inmobiliaria+M%C3%B3stoles/data=!4m7!3m6!1s0xd418d6f168539cb:0x6078e42d9dd86739!8m2!3d40.3201077!4d-3.8741793!16s%2Fg%2F11vq09tddz!19sChIJyzmFFm-NQQ0ROWfYnS3keGA",
    "https://www.google.com/maps/place/Vivenda+Grupo+Inmobiliario/data=!4m7!3m6!1s0xd418d85927be837:0x217f881dc4aea84f!8m2!3d40.3197893!4d-3.8742483!16s%2Fg%2F11pdvywjj7!19sChIJN-h7koWNQQ0RT6iuxB2IfyE",
    "https://www.google.com/maps/place/Novalok+Inmobiliaria/data=!4m7!3m6!1s0xd418e801201d81d:0xe6ca874b0c6299af!8m2!3d40.3271121!4d-3.8649021!16s%2Fg%2F1tdybc8v!19sChIJHdgBEoCOQQ0Rr5liDEuHyuY",
    "https://www.google.com/maps/place/Alquiler+Plus/data=!4m7!3m6!1s0xd422707127b7599:0x55699eb44d309c71!8m2!3d40.3241692!4d-3.8604687!16s%2Fg%2F11hf8fg97z!19sChIJmXV7EgcnQg0RcZwwTbSeaVU",
    "https://www.google.com/maps/place/Inmobiliaria+Tecnocasa+Estoril+II+Mostoles/data=!4m7!3m6!1s0xd418f73c5153db1:0x349bf389e126a899!8m2!3d40.3325852!4d-3.8647396!16s%2Fg%2F11hdjgljpg!19sChIJsT0VxXOPQQ0Rmagm4YnzmzQ",
    "https://www.google.com/maps/place/INMOBILIARIA+LOS+ROSALES/data=!4m7!3m6!1s0xd418e88507330e3:0x4859f7d6972045ec!8m2!3d40.3382266!4d-3.8636441!16s%2Fg%2F11b6q6t1l_!19sChIJ4zBzUIiOQQ0R7EUgl9b3WUg",
    "https://www.google.com/maps/place/Tecnorete+agencia+inmobiliaria/data=!4m7!3m6!1s0xd418dafb833c525:0x86e05b7b2a002863!8m2!3d40.3235692!4d-3.8672236!16s%2Fg%2F11x964zgwq!19sChIJJcUzuK-NQQ0RYygAKntb4IY",
]

MAX_REVIEWS_PER_AGENCY = 200
MAX_MONTHS_OLD = 12
MAX_WORKERS = 3  # Procesamiento paralelo (1-5 según tu CPU)

OUTPUT_JSON = "agentes_inmobiliarios.json"
OUTPUT_HTML = "agentes_inmobiliarios.html"
OUTPUT_EXCEL = "agentes_inmobiliarios.xlsx"

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
]
HEADLESS = True  # Cambia a False para ver el navegador
# ----------------------------------------

nlp = spacy.load("es_core_news_sm")

def rnd_sleep(a=0.8, b=1.5): 
    time.sleep(random.uniform(a, b))

# -------- Diccionario de nombres españoles --------
NOMBRES_COMUNES_ESPANOL = {
    "miguel", "ángel", "angel", "josé", "jose", "antonio", "francisco", "javier", "manuel", 
    "david", "daniel", "carlos", "alejandro", "pablo", "pedro", "jesús", "jesus", "fernando",
    "rafael", "sergio", "juan", "diego", "alvaro", "álvaro", "jorge", "rubén", "ruben",
    "marcos", "adrián", "adrian", "raúl", "raul", "mario", "roberto", "ivan", "iván",
    "alberto", "enrique", "luis", "andrés", "andres", "santiago", "gonzalo", "víctor", "victor",
    "oscar", "óscar", "jaime", "guillermo", "ignacio", "nacho", "ricardo", "ramón", "ramon",
    "maría", "maria", "carmen", "ana", "isabel", "dolores", "pilar", "teresa", "rosa",
    "francisca", "cristina", "laura", "marta", "elena", "sara", "paula", "beatriz",
    "lucía", "lucia", "silvia", "patricia", "raquel", "mónica", "monica", "natalia",
    "claudia", "alicia", "irene", "sandra", "rocío", "rocio", "nuria", "andrea",
    "eva", "julia", "diana", "victoria", "carolina", "sonia", "esther", "alba",
    "verónica", "veronica", "mercedes", "gloria", "montserrat", "montse", "amparo",
    "nazaret", "yolanda", "margarita", "susana", "noelia", "lorena", "miriam", "rebeca",
    "sofía", "sofia", "valentina", "emma", "martina", "valeria", "carla", "jimena"
}

def is_valid_spanish_name(name):
    """Verifica si es un nombre válido español."""
    if not name or len(name) < 2:
        return False
    
    name_lower = name.lower().strip()
    words = name_lower.split()
    
    # Excluir palabras claramente no nombres
    excluded = {
        "nos", "muy", "todo", "ello", "por", "dos", "tres", "disposición", "inmobiliaria", 
        "redpiso", "empresa", "equipo", "agencia", "gracias", "atención", "servicio",
        "oficina", "personal", "gente", "ellos", "ellas", "vosotros", "pueden"
    }
    
    if name_lower in excluded or any(word in excluded for word in words):
        return False
    
    # Si tiene 1 palabra, debe estar en el diccionario
    if len(words) == 1:
        return words[0] in NOMBRES_COMUNES_ESPANOL
    
    # Si tiene 2 palabras, al menos una debe estar
    if len(words) == 2:
        return (words[0] in NOMBRES_COMUNES_ESPANOL or 
                words[1] in NOMBRES_COMUNES_ESPANOL)
    
    # Si tiene 3+ palabras, al menos 2 deben estar
    if len(words) >= 3:
        valid_count = sum(1 for w in words if w in NOMBRES_COMUNES_ESPANOL)
        return valid_count >= 2
    
    return False

# -------- Extracción de nombres MEJORADA --------
def extract_names_from_text(text):
    """Extrae nombres de agentes inmobiliarios."""
    candidates = []
    
    # 1. spaCy NER
    try:
        doc = nlp(text[:2000])
        for ent in doc.ents:
            if ent.label_ == "PER":
                name = ent.text.strip()
                name = re.sub(r'^(el|la|los|las|un|una|de|del)\s+', '', name, flags=re.IGNORECASE)
                if is_valid_spanish_name(name):
                    candidates.append(name)
    except:
        pass
    
    # 2. Patrones específicos
    patterns = [
        r"gracias a ([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+){0,2})",
        r"muchas gracias a ([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+){0,2})",
        r"(?:nos|me)\s+(?:atendió|ayudó|asesoró|gestionó)\s+([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+){0,2})",
        r"atendió\s+([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+){0,2})",
        r"(?:el|la)\s+agente\s+([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+){0,2})",
        r"(?:con|contacté con|hablé con|trabajé con)\s+([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+){0,2})",
        r"recomiendo a ([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+){0,2})",
        r"([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+){0,2}),?\s+que\s+(?:fue|es|era)",
        r"([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+){0,2})\s+ha\s+sido",
        r"en especial (?:a\s+)?([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+){0,2})",
        r"especialmente (?:a\s+)?([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+){0,2})",
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, text, flags=re.IGNORECASE)
        for match in matches:
            name = match.strip() if isinstance(match, str) else match[0].strip()
            name = re.sub(r'^(el|la|los|las|de|del|a)\s+', '', name, flags=re.IGNORECASE)
            if is_valid_spanish_name(name):
                candidates.append(name)
    
    # 3. Normalización
    cleaned = []
    seen = set()
    
    for name in candidates:
        name = re.sub(r"^[\W_]+|[\W_]+$", "", name).strip()
        name = re.sub(r"\s+", " ", name)
        name = " ".join(word.capitalize() for word in name.split())
        
        name_lower = name.lower()
        
        if len(name) >= 2 and name_lower not in seen and is_valid_spanish_name(name):
            seen.add(name_lower)
            cleaned.append(name)
    
    return cleaned

def is_likely_agent_name(name, review_text):
    """Validación contextual."""
    name_lower = name.lower()
    review_lower = review_text.lower()
    
    if not is_valid_spanish_name(name):
        return False
    
    patterns = [
        f"gracias a {name_lower}",
        f"atendió {name_lower}",
        f"{name_lower} atendió",
        f"agente {name_lower}",
        f"con {name_lower}",
        f"especial {name_lower}",
        f"recomiendo {name_lower}",
        f"{name_lower} ha sido",
        f"{name_lower}, que",
    ]
    
    return any(p in review_lower for p in patterns)

# -------- Helpers --------
def accept_consent(page):
    for sel in ["button:has-text('Aceptar todo')", "button:has-text('Aceptar')"]:
        try:
            btn = page.locator(sel)
            if btn.first.is_visible(timeout=1000):
                btn.first.click()
                time.sleep(0.5)
                return
        except: pass

def wait_network_quiet(page, t=3000):
    try:
        page.wait_for_load_state("networkidle", timeout=t)
    except: pass

def parse_review_age_months(text):
    patterns = [
        (r"hace\s+(\d+)\s+día(?:s)?", lambda x: int(x) / 30),
        (r"hace\s+(\d+)\s+semana(?:s)?", lambda x: int(x) / 4),
        (r"hace\s+(\d+)\s+mes(?:es)?", lambda x: int(x)),
        (r"hace\s+(\d+)\s+año(?:s)?", lambda x: int(x) * 12),
    ]
    
    for pattern, converter in patterns:
        match = re.search(pattern, text.lower())
        if match:
            return converter(match.group(1))
    return 0

# -------- Scraping de reseñas --------
def goto_reviews_tab(tab):
    accept_consent(tab)
    rnd_sleep(1.0, 1.5)
    
    for sel in ["button[role='tab']:has-text('Reseñas')", "button:has-text('Reseñas')"]:
        try:
            el = tab.locator(sel)
            if el.first.is_visible(timeout=3000):
                el.first.click()
                rnd_sleep(2.0, 2.5)
                return True
        except: 
            continue
    return False

def scrape_reviews(tab, max_reviews=200, max_months=12):
    """Extrae reseñas con scroll agresivo."""
    if not goto_reviews_tab(tab):
        return []
    
    # Contenedor
    container = None
    for sel in ["div[aria-label*='reseñ']", "div[role='main']"]:
        try:
            loc = tab.locator(sel)
            if loc.first.is_visible(timeout=2000):
                container = loc.first
                break
        except: 
            continue
    
    if not container:
        container = tab.locator("body")
    
    seen = set()
    reviews = []
    stale_scrolls = 0
    scroll_count = 0
    max_scrolls = 50
    
    while len(reviews) < max_reviews and stale_scrolls < 10 and scroll_count < max_scrolls:
        scroll_count += 1
        
        # Scroll
        try:
            tab.evaluate("(el)=>{el.scrollBy(0, el.scrollHeight)}", container.element_handle())
        except:
            tab.evaluate("window.scrollBy(0, window.innerHeight * 3)")
        
        rnd_sleep(1.5, 2.0)
        
        # Expandir "Ver más"
        if scroll_count % 3 == 0:
            try:
                ver_mas = tab.locator("button:has-text('Ver más'), button:has-text('Más')")
                for i in range(min(ver_mas.count(), 10)):
                    try:
                        ver_mas.nth(i).click(timeout=300)
                        time.sleep(0.2)
                    except: pass
            except: pass
        
        # Parsear
        html = tab.content()
        soup = BeautifulSoup(html, "html.parser")
        
        cards = soup.select("div[data-review-id]")
        if not cards:
            cards = soup.select("div[jsaction*='review']")
        if not cards:
            all_divs = soup.find_all("div")
            cards = [d for d in all_divs if 50 < len(d.get_text(strip=True)) < 5000]
        
        before = len(reviews)
        old_count = 0
        
        for card in cards:
            txt = card.get_text(" ", strip=True)
            
            if not txt or len(txt) < 30 or txt in seen:
                continue
            
            # Antigüedad
            age = parse_review_age_months(txt)
            if age > max_months:
                old_count += 1
                if old_count >= 5:
                    return reviews
                continue
            
            # Filtros
            txt_lower = txt.lower()
            
            good = ["inmobiliaria", "agente", "casa", "piso", "vivienda", "alquiler", "venta", "compra"]
            bad = ["coche", "auto", "vehículo", "moto", "taller", "gasolina"]
            
            if any(kw in txt_lower for kw in good) and not any(kw in txt_lower for kw in bad):
                seen.add(txt)
                reviews.append(txt)
        
        if len(reviews) == before:
            stale_scrolls += 1
        else:
            stale_scrolls = 0
    
    return reviews[:max_reviews]

# -------- Procesamiento --------
def process_reviews_for_agents(reviews):
    processed_reviews = []
    agent_mentions = defaultdict(list)
    
    for review in reviews:
        clean_review = re.sub(r'\s+', ' ', review.strip())
        agent_names = extract_names_from_text(clean_review)
        
        validated_agents = [a for a in agent_names if is_likely_agent_name(a, clean_review)]
        
        if validated_agents:
            processed_reviews.append({
                "text": clean_review,
                "agents_mentioned": validated_agents,
            })
            
            for agent in validated_agents:
                agent_mentions[agent].append(clean_review)
    
    return processed_reviews, agent_mentions

def group_similar(name_counts, cutoff=85):
    names = list(name_counts.keys())
    counts = dict(name_counts)
    used = set()
    groups = []
    
    for name in names:
        if name in used:
            continue
        
        matches = process.extract(
            name, 
            [n for n in names if n not in used],
            scorer=fuzz.token_sort_ratio, 
            score_cutoff=cutoff, 
            limit=100
        )
        
        group_names = [m[0] for m in matches]
        for gn in group_names:
            used.add(gn)
        
        total = sum(counts.get(g, 0) for g in group_names)
        canonical = max(group_names, key=len)
        
        groups.append({
            "canonical": canonical,
            "variants": group_names,
            "count": total
        })
    
    return sorted(groups, key=lambda x: x["count"], reverse=True)

# -------- Scraping de agencia --------
def scrape_single_agency(url, max_reviews, max_months):
    """Scrapea una agencia desde su URL."""
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=HEADLESS)
            ctx = browser.new_context(user_agent=random.choice(USER_AGENTS))
            tab = ctx.new_page()
            
            tab.goto(url, timeout=60000)
            accept_consent(tab)
            wait_network_quiet(tab)
            rnd_sleep(1.0, 1.5)
            
            # Nombre
            soup = BeautifulSoup(tab.content(), "html.parser")
            name_el = soup.select_one("h1") or soup.select_one("h2")
            agency = name_el.get_text(strip=True) if name_el else "SinNombre"
            
            # Reseñas
            reviews = scrape_reviews(tab, max_reviews, max_months)
            
            browser.close()
            
            return {
                "agency_name": agency,
                "agency_url": url,
                "reviews": reviews
            }
    except Exception as e:
        print(f"✗ Error en {url}: {e}")
        return None

# -------- Reportes --------
def generate_html(data):
    html = [
        "<!doctype html><html><head><meta charset='utf-8'>",
        "<title>Agentes Inmobiliarios</title>",
        "<style>",
        "body{font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;line-height:1.6}",
        ".header{background:#2c3e50;color:white;padding:20px;border-radius:8px;margin-bottom:20px}",
        ".agency{background:white;border:1px solid #ddd;border-radius:8px;margin:15px 0;padding:20px}",
        ".agent-card{background:#f8f9fa;border-left:4px solid #3498db;padding:15px;margin:10px 0}",
        ".testimonial{background:white;border:1px solid #e0e0e0;padding:10px;margin:5px 0;font-size:13px}",
        "</style></head><body>",
        "<div class='header'><h1>📊 Agentes Inmobiliarios</h1></div>"
    ]
    
    for a in data:
        html.append(f"<div class='agency'>")
        html.append(f"<h2>{a['agency_name']}</h2>")
        html.append(f"<p>📊 {a['total_reviews']} reseñas | 👥 {a['reviews_with_agents']} con agentes</p>")
        html.append(f"<p><a href='{a['agency_url']}' target='_blank'>Ver en Google Maps</a></p>")
        
        for agent in a.get('agentes_inmobiliarios', [])[:10]:
            html.append(f"<div class='agent-card'>")
            html.append(f"<h3>🏆 {agent['nombre_agente']} ({agent['total_menciones']} menciones)</h3>")
            for t in agent['testimonios_clientes'][:3]:
                html.append(f"<div class='testimonial'>{t['testimonio'][:300]}...</div>")
            html.append("</div>")
        
        html.append("</div>")
    
    return "\n".join(html) + "</body></html>"

def generate_excel(data, filename):
    rows = []
    for agency in data:
        for agent in agency.get('agentes_inmobiliarios', []):
            for t in agent['testimonios_clientes']:
                rows.append({
                    'Agencia': agency['agency_name'],
                    'Agente': agent['nombre_agente'],
                    'Menciones': agent['total_menciones'],
                    'Testimonio': t['testimonio']
                })
    
    if rows:
        df = pd.DataFrame(rows)
        df.to_excel(filename, index=False, engine='openpyxl')
        print(f"✅ Excel: {filename} ({len(rows)} registros)")

# -------- MAIN --------
def run_all():
    print("\n" + "="*70)
    print("🚀 PROCESANDO AGENCIAS INMOBILIARIAS")
    print("="*70)
    print(f"📝 Total de URLs: {len(AGENCY_URLS)}")
    
    start_time = time.time()
    
    # Procesar en paralelo
    all_agencies = []
    
    if MAX_WORKERS > 1:
        print(f"⚡ Procesamiento paralelo ({MAX_WORKERS} workers)")
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {
                executor.submit(scrape_single_agency, url, MAX_REVIEWS_PER_AGENCY, MAX_MONTHS_OLD): url 
                for url in AGENCY_URLS
            }
            
            for future in tqdm(as_completed(futures), total=len(AGENCY_URLS), desc="Agencias"):
                result = future.result()
                if result and result["reviews"]:
                    all_agencies.append(result)
    else:
        print("⏳ Procesamiento secuencial")
        for url in tqdm(AGENCY_URLS, desc="Agencias"):
            result = scrape_single_agency(url, MAX_REVIEWS_PER_AGENCY, MAX_MONTHS_OLD)
            if result and result["reviews"]:
                all_agencies.append(result)
    
    # Procesar agentes
    print("\n📊 EXTRAYENDO AGENTES...")
    
    aggregated = []
    for a in tqdm(all_agencies, desc="Procesando"):
        processed_reviews, agent_mentions = process_reviews_for_agents(a["reviews"])
        
        all_agent_names = []
        for review in processed_reviews:
            all_agent_names.extend(review["agents_mentioned"])
        
        counts = Counter(all_agent_names)
        grouped = group_similar(counts)
        
        agency_data = {
            "agency_name": a["agency_name"],
            "agency_url": a["agency_url"],
            "total_reviews": len(a["reviews"]),
            "reviews_with_agents": len(processed_reviews),
            "agentes_inmobiliarios": [
                {
                    "nombre_agente": agent["canonical"],
                    "total_menciones": agent["count"],
                    "variantes_nombre": agent["variants"],
                    "testimonios_clientes": [
                        {"testimonio": t} 
                        for t in agent_mentions.get(agent["canonical"], [])[:5]
                    ]
                }
                for agent in grouped
            ]
        }
        aggregated.append(agency_data)
    
    # Guardar
    Path(OUTPUT_JSON).write_text(json.dumps(aggregated, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"\n✅ JSON: {OUTPUT_JSON}")
    
    Path(OUTPUT_HTML).write_text(generate_html(aggregated), encoding='utf-8')
    print(f"✅ HTML: {OUTPUT_HTML}")
    
    generate_excel(aggregated, OUTPUT_EXCEL)
    
    elapsed = time.time() - start_time
    total_agents = sum(len(a['agentes_inmobiliarios']) for a in aggregated)
    
    print("\n" + "="*70)
    print("✅ COMPLETADO")
    print("="*70)
    print(f"⏱️  Tiempo: {elapsed/60:.1f} minutos")
    print(f"🏢 Agencias: {len(aggregated)}")
    print(f"👥 Agentes: {total_agents}")
    
    # Top 10
    print("\n🏆 TOP 10 AGENTES:")
    all_agents = []
    for agency in aggregated:
        for agent in agency['agentes_inmobiliarios']:
            all_agents.append((agent['nombre_agente'], agent['total_menciones'], agency['agency_name']))
    
    all_agents.sort(key=lambda x: x[1], reverse=True)
    for i, (name, count, agency) in enumerate(all_agents[:10], 1):
        print(f"{i:2}. {name:20} ({count:2} menciones) - {agency}")

if __name__ == "__main__":
    run_all()