#!/usr/bin/env python3
"""
Normalize the supplied Fabrication_Product_Import data into a canonical seed file
(data/catalogue.json) used by both the DB import script and as a committed record.

SOURCE FIDELITY RULES (see task spec sections 47 & 4):
- Never invent prices, dimensions, materials, specs or product names.
- If price is missing -> price=null, product_type=QUOTE_ONLY.
- If a field is not present in the source -> leave it null.
- Ambiguous specs are preserved verbatim and flagged needs_review=true.
Derived (non-source) fields are clearly marked and are merchandising/UX only:
- slug, sku (generated, sensible + unique)
- product_type / is_customizable (derived from price presence + 'adjustable' in spec)
- is_featured (a small merchandising selection; fully admin-editable later)
- short_description/description (factual sentences built ONLY from known fields)
"""
import json, re, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "data", "import", "products.json")
OUT = os.path.join(ROOT, "data", "catalogue.json")

# Map source leaf category -> (parent group name, leaf display name)
CATEGORY_MAP = {
    "Fabrication / Rings":          ("Fabrication", "Rings"),
    "Fabrication / Backdrop Stands":("Fabrication", "Backdrop Stands"),
    "Fabrication / Frames":         ("Fabrication", "Frames"),
    "Fabrication / Canopies":       ("Fabrication", "Canopies"),
    "Fabrication / Event Setups":   ("Fabrication", "Event Setups"),
    "Fabrication / Backdrops":      ("Fabrication", "Backdrops"),
    "Fabrication / Arches":         ("Fabrication", "Arches"),
    "Tables / Cake Tables":         ("Tables", "Cake Tables"),
    "Stands":                       ("Stands", "Stands"),
    "Jali / Stands":                ("Jali", "Jali Stands"),
}

# A small, source-agnostic featured selection (merchandising only, admin-editable).
FEATURED = {
    "Balloon Ring", "Moon Ring", "Square Canopy", "Heart Shape Ring",
    "Light Ring", "Peta Frame", "Haldi Setup", "Double Heart Shape Ring",
}

SKU_PREFIX = {
    "Rings": "RNG", "Frames": "FRM", "Backdrop Stands": "BDS", "Canopies": "CNP",
    "Event Setups": "EVT", "Backdrops": "BKD", "Arches": "ARC", "Cake Tables": "TBL",
    "Stands": "STD", "Jali Stands": "JAL",
}

def slugify(s):
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return re.sub(r"-+", "-", s).strip("-")

def pages_of(rec):
    return [int(p.strip()) for p in str(rec["gallery_pages"]).split(",") if p.strip()]

def img_name(page):
    return f"page-{page:02d}.png"

def build_description(rec, spec, needs_review):
    name = rec["name"]
    leaf = CATEGORY_MAP[rec["category"]][1]
    parts = [f"{name} — {leaf.lower()} for event, wedding, birthday and party decoration."]
    if spec and not needs_review:
        parts.append(f"Size / specification as per catalogue: {spec}.")
    elif spec and needs_review:
        parts.append(f"Specification as printed in the source catalogue (pending review): {spec}.")
    parts.append("Fabricated to order. Custom sizes and finishes available on request.")
    return " ".join(parts)

def main():
    data = json.load(open(SRC, encoding="utf-8"))

    # Categories (parent groups + leaves), deterministic order
    cats = {}
    order = 0
    seen_parent = {}
    for rec in data:
        parent, leaf = CATEGORY_MAP[rec["category"]]
        if parent not in seen_parent:
            seen_parent[parent] = {
                "slug": slugify(parent), "name": parent, "parent_slug": None,
                "sort_order": order, "is_event_category": False,
            }
            order += 1
    for rec in data:
        parent, leaf = CATEGORY_MAP[rec["category"]]
        if leaf not in cats:
            cats[leaf] = {
                "slug": slugify(leaf), "name": leaf,
                "parent_slug": slugify(parent) if parent != leaf else None,
                "sort_order": order, "is_event_category": False,
            }
            order += 1
    categories = list(seen_parent.values()) + list(cats.values())

    products = []
    sku_counter = {}
    warnings = []
    slugs = set()
    for rec in data:
        name = rec["name"]
        parent, leaf = CATEGORY_MAP[rec["category"]]
        price = rec.get("price_inr")
        if price in ("", None):
            price = None
        spec = (rec.get("specifications") or "").strip()
        needs_review = "(unclear)" in spec or "as printed" in spec or "(as printed in PDF)" in spec

        slug = slugify(name)
        base = slug; n = 2
        while slug in slugs:
            slug = f"{base}-{n}"; n += 1
        slugs.add(slug)

        pref = SKU_PREFIX.get(leaf, "FAB")
        sku_counter[pref] = sku_counter.get(pref, 0) + 1
        sku = f"ALK-{pref}-{sku_counter[pref]:03d}"

        pages = pages_of(rec)
        primary_page = int(re.sub(r"[^0-9]", "", str(rec["primary_image"])) or pages[0])
        images = []
        for i, pg in enumerate(pages):
            images.append({
                "file": img_name(pg),
                "page": pg,
                "is_primary": (pg == primary_page) or (i == 0 and primary_page not in pages),
                "alt": f"{name} — fabrication product, catalogue page {pg}",
                "sort_order": i,
            })
        # guarantee exactly one primary
        if not any(im["is_primary"] for im in images):
            images[0]["is_primary"] = True

        is_quote_only = price is None
        adjustable = "adjust" in spec.lower()
        if is_quote_only:
            product_type = "QUOTE_ONLY"
        elif adjustable:
            product_type = "READY_MADE_AND_CUSTOM"
        else:
            product_type = "READY_MADE"

        if needs_review:
            warnings.append(f"{name}: specification flagged for admin review -> \"{spec}\"")
        if is_quote_only:
            warnings.append(f"{name}: no price in source -> imported as QUOTE_ONLY (Price on Request)")

        products.append({
            "name": name,
            "slug": slug,
            "sku": sku,
            "category_slug": slugify(leaf),
            "category_group": parent,
            "price": price,                 # INR, null => quote only
            "sale_price": None,
            "currency": "INR",
            "short_description": f"{leaf} · {spec}" if spec and not needs_review else leaf,
            "description": build_description(rec, spec, needs_review),
            "dimensions": spec or None,     # size text exactly as in source
            "material": None,               # not stated in source
            "colour": None,                 # not stated in source
            "finish": None,                 # not stated in source
            "weight": None,                 # not stated in source
            "product_type": product_type,
            "is_customizable": adjustable or is_quote_only,
            "is_quote_only": is_quote_only,
            "is_featured": name in FEATURED,
            "is_active": True,
            "needs_review": needs_review,
            "stock_quantity": 0 if is_quote_only else 25,   # made-to-order default stock
            "low_stock_threshold": 5,
            "source_pdf": rec.get("source_pdf", "Fabrication.pdf"),
            "source_pages": pages,
            "images": images,
            "attributes": [
                {"name": "Specification (as per catalogue)", "value": spec} if spec else None,
                {"name": "Source PDF", "value": f'{rec.get("source_pdf","Fabrication.pdf")} (page {", ".join(map(str,pages))})'},
            ],
        })
        # drop null attributes
        products[-1]["attributes"] = [a for a in products[-1]["attributes"] if a]

    out = {
        "meta": {
            "source": "Fabrication.pdf (49 pages) via Fabrication_Product_Import.zip",
            "generated_by": "scripts/normalize_catalogue.py",
            "product_count": len(products),
            "category_count": len(categories),
            "priced": sum(1 for p in products if p["price"] is not None),
            "quote_only": sum(1 for p in products if p["is_quote_only"]),
            "currency": "INR",
            "warnings": warnings,
        },
        "categories": categories,
        "products": products,
    }
    json.dump(out, open(OUT, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    print(f"Wrote {OUT}")
    print(json.dumps(out["meta"], indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
