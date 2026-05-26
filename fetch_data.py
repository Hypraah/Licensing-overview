import urllib.request
import urllib.parse
import csv
import io
import json
import concurrent.futures
import time
import sys

SHEETS = {
    'AF': '1UmULNbE_q3Ga1Gmw8bMybkVJ60O8XAFlf8IgKM0FIPQ',
    'GN': '1pPJo4GV3Uht2LdOoefVkWOD613332gJvp5SDIwcCwvw',
    'OZ': '153NN8U5-OzkZKV7zP4zzujvdhRY1nvfJd1qDVlS7bkk'
}

COUNTRIES_AF = [
    'Afghanistan','Albania','Algeria','Angola','Argentina','Armenia','Australia',
    'Azerbaijan','Bahrain','Bangladesh','Belarus','Belgium','Belize','Benin',
    'Bolivia','Bosnia','Botswana','Brazil','Bulgaria','Burkina Faso','Burundi',
    'Cambodia','Cameroon','Central African Republic','Chad','Chile','China',
    'Colombia','Comoros','Congo','Costa Rica',"Cote d'Ivoire",'Croatia','Cuba',
    'Cyprus','Czech Republic','Denmark','Djibouti','Dominican Republic','DRC',
    'Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia',
    'Eswatini','Ethiopia','Fiji','Finland','France'
]

COUNTRIES_GN = [
    'Gabon','Gambia','Georgia','Germany','Ghana','Greece','Guatemala','Guinea',
    'Guinea-Bissau','Guyana','Haiti','Honduras','Hong Kong','Hungary','India',
    'Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan',
    'Jordan','Kazakhstan','Kenya','Kosovo','Kuwait','Kyrgyzstan','Laos','Latvia',
    'Lebanon','Lesotho','Liberia','Libya','Lithuania','Luxembourg','Madagascar',
    'Malawi','Malaysia','Mali','Mauritania','Mauritius','Mexico','Moldova',
    'Mongolia','Montenegro','Morocco','Mozambique','Myanmar','Namibia','Nepal',
    'Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Macedonia'
]

COUNTRIES_OZ = [
    'Oman','Pakistan','Palestine','Panama','Papua New Guinea','Paraguay','Peru',
    'Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda',
    'Saudi Arabia','Senegal','Serbia','Sierra Leone','Singapore','Slovakia',
    'Slovenia','Somalia','South Africa','South Korea','South Sudan','Spain',
    'Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria','Taiwan',
    'Tajikistan','Tanzania','Thailand','Togo','Trinidad','Tunisia','Turkey',
    'Turkmenistan','UAE','Uganda','Ukraine','United Kingdom','Uruguay',
    'Uzbekistan','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe'
]

def fetch_country(sheet_id, country_name):
    url = f'https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&sheet={urllib.parse.quote(country_name)}'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=20) as response:
            data = response.read().decode('utf-8-sig')
            return parse_country_csv(data, country_name)
    except Exception as e:
        return None

def parse_country_csv(csv_text, expected_name):
    try:
        reader = csv.reader(io.StringIO(csv_text))
        rows = list(reader)
    except:
        return None

    if not rows:
        return None

    country = rows[0][0].strip() if rows[0] and rows[0][0].strip() else expected_name
    general_req = ''
    if len(rows) > 1 and rows[1][0].strip():
        general_req = rows[1][0].strip()

    requirements = []
    current_section = None
    hit_titles = False

    for row in rows[2:]:
        if not row:
            continue
        col0 = row[0].strip() if len(row) > 0 else ''
        col1 = row[1].strip() if len(row) > 1 else ''
        col2 = row[2].strip() if len(row) > 2 else ''

        if not col0 and not col1 and not col2:
            continue

        if 'ACCEPTABLE TITLES' in col0 or 'UNACCEPTABLE TITLES' in col0:
            hit_titles = True
            break
        if col0.startswith('Revised') or col0.startswith('Updated') or col0.startswith('VAT/VIES') or col0.startswith('Commercial Register query'):
            continue
        if col0 == 'All English translations must be notarized.':
            continue

        # Section header: starts with digit like "1." or "2." etc.
        import re
        if col0 and re.match(r'^\d+[\.\s]', col0):
            current_section = {'section': col0.strip(), 'items': []}
            requirements.append(current_section)
        elif col1 and current_section is not None:
            item = {'name': col1.strip()}
            if col2:
                item['issuedBy'] = col2.strip()
            current_section['items'].append(item)
        elif col0 and current_section is not None and not col0[0].isdigit():
            # Sometimes content is in col0 as a continuation
            pass

    if not requirements and not general_req:
        return None

    return {
        'country': country,
        'generalReq': general_req,
        'requirements': requirements
    }

def fetch_batch(sheet_id, countries, batch_label):
    results = []
    total = len(countries)
    
    def fetch_one(name):
        r = fetch_country(sheet_id, name)
        return (name, r)
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(fetch_one, c): c for c in countries}
        done_count = 0
        for future in concurrent.futures.as_completed(futures):
            done_count += 1
            name, result = future.result()
            if result:
                results.append(result)
                print(f"  [{batch_label}] {done_count}/{total} OK: {name}")
            else:
                print(f"  [{batch_label}] {done_count}/{total} SKIP: {name}")
    
    return results

def escape_js_string(s):
    return s.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n').replace('\r', '')

def format_requirement_as_text(data):
    """Convert structured requirements into a readable multi-line text"""
    lines = []
    if data.get('generalReq'):
        lines.append(data['generalReq'])
        lines.append('')
    
    for req in data.get('requirements', []):
        lines.append(req['section'])
        for item in req.get('items', []):
            name = item['name']
            issued_by = item.get('issuedBy', '')
            lines.append(f"  • {name}")
            if issued_by:
                lines.append(f"    → {issued_by}")
        lines.append('')
    
    return '\\n'.join(lines).strip()

def main():
    print("=" * 60)
    print("Copart Licensing Data Fetcher")
    print("=" * 60)
    
    all_data = []
    
    print(f"\n[1/3] Fetching A-F countries ({len(COUNTRIES_AF)} tabs)...")
    af_data = fetch_batch(SHEETS['AF'], COUNTRIES_AF, 'A-F')
    all_data.extend(af_data)
    print(f"  Got {len(af_data)} countries")
    
    time.sleep(1)
    
    print(f"\n[2/3] Fetching G-N countries ({len(COUNTRIES_GN)} tabs)...")
    gn_data = fetch_batch(SHEETS['GN'], COUNTRIES_GN, 'G-N')
    all_data.extend(gn_data)
    print(f"  Got {len(gn_data)} countries")
    
    time.sleep(1)
    
    print(f"\n[3/3] Fetching O-Z countries ({len(COUNTRIES_OZ)} tabs)...")
    oz_data = fetch_batch(SHEETS['OZ'], COUNTRIES_OZ, 'O-Z')
    all_data.extend(oz_data)
    print(f"  Got {len(oz_data)} countries")
    
    # Sort by country name
    all_data.sort(key=lambda x: x['country'])
    
    print(f"\n{'=' * 60}")
    print(f"Total countries fetched: {len(all_data)}")
    print(f"{'=' * 60}")
    
    # Write as JSON for the HTML to consume
    output_path = 'country_data.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, indent=2, ensure_ascii=False)
    
    print(f"\nData written to {output_path}")
    
    # Also print a summary
    for d in all_data:
        req_count = sum(len(r.get('items',[])) for r in d.get('requirements',[]))
        print(f"  {d['country']}: {len(d['requirements'])} sections, {req_count} documents")

if __name__ == '__main__':
    main()
