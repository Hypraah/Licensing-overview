const https = require('https');
const fs = require('fs');

const SHEETS = {
  USA: '1Mtu5CtrnYY-ukQ9n_h17Ber0md6w12cY6DXpF6y41e4',
  CANADA: '19sN3Yx2bQMZ4Piq8O7dGdH6qeY81Og4odVSzx1imNLw',
  INTL_AF: '1UmULNbE_q3Ga1Gmw8bMybkVJ60O8XAFlf8IgKM0FIPQ',
  INTL_GN: '1pPJo4GV3Uht2LdOoefVkWOD613332gJvp5SDIwcCwvw',
  INTL_OZ: '153NN8U5-OzkZKV7zP4zzujvdhRY1nvfJd1qDVlS7bkk'
};

const USA_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
];

const CANADA_PROVINCES = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland & Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'
];

const INTL_AF = [
  'Afghanistan','Albania','Algeria','Angola','Argentina','Armenia','Australia','Azerbaijan','Bahrain','Bangladesh','Belarus','Belgium','Belize','Benin','Bolivia','Bosnia','Botswana','Brazil','Bulgaria','Burkina Faso','Burundi','Cambodia','Cameroon','Central African Republic','Chad','Chile','China','Colombia','Comoros','Congo','Costa Rica',"Cote d'Ivoire",'Croatia','Cuba','Cyprus','Czech Republic','Denmark','Djibouti','Dominican Republic','DRC','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia','Fiji','Finland','France'
];

const INTL_GN = [
  'Gabon','Gambia','Georgia','Germany','Ghana','Greece','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti','Honduras','Hong Kong','Hungary','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kosovo','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Lithuania','Luxembourg','Madagascar','Malawi','Malaysia','Mali','Mauritania','Mauritius','Mexico','Moldova','Mongolia','Montenegro','Morocco','Mozambique','Myanmar','Namibia','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Macedonia'
];

const INTL_OZ = [
  'Oman','Pakistan','Palestine','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda','Saudi Arabia','Senegal','Serbia','Sierra Leone','Singapore','Slovakia','Slovenia','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand','Togo','Trinidad','Tunisia','Turkey','Turkmenistan','UAE','Uganda','Ukraine','United Kingdom','Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe'
];

function fetchURL(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchURL(res.headers.location).then(resolve);
        return;
      }
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(null));
  });
}

function parseCSV(text) {
  const rows = [];
  let current = [];
  let field = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        current.push(field.trim());
        field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') i++;
        current.push(field.trim());
        if (current.some(c => c !== '')) rows.push(current);
        current = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }
  if (field || current.length) {
    current.push(field.trim());
    if (current.some(c => c !== '')) rows.push(current);
  }
  return rows;
}

function cleanChecklistItem(str) {
  if (!str) return '';
  return str
    .replace(/^q\s*/i, '') // remove leading 'q' or 'q '
    .replace(/^\[\s*\]\s*/, '') // remove leading '[ ]'
    .replace(/^•\s*/, '') // remove bullets
    .trim();
}

function cleanTitleItem(str) {
  if (!str) return '';
  return str
    .replace(/^\*\s*/, '') // remove leading asterisk
    .trim();
}

function isHeading(col0, col1, col2) {
  if (!col0) return false;
  if (col1 || col2) return false;
  
  const s = col0.toLowerCase();
  
  // Exclude specific list item formats
  if (/^[a-z]\)/i.test(s)) return false; // Exclude A), B), C)...
  if (s.includes('multi-state') || s.includes('affidavit')) return false; // Exclude forms
  
  if (s.includes('operational license') || 
      s.includes('sales tax license') || 
      s.includes('sales tax exemption') || 
      s.includes('corporate taxable filing') ||
      s.includes('additional filing') ||
      s.includes('supplemental documents') ||
      s.includes('sales tax form') ||
      /^\d+[\.\s]/.test(col0)) {
    return true;
  }
  return false;
}

function parseSheetRows(rows, expectedName, type) {
  if (!rows || !rows.length) return null;

  // Row 1 Col 0: Country/State name
  const name = (rows[0] && rows[0][0]) ? rows[0][0].trim() : expectedName;
  // Row 2 Col 0: General requirement statement
  const generalReq = (rows.length > 1 && rows[1][0]) ? rows[1][0].trim() : '';

  // 1. Parse Checklist columns (columns 12+ / index 12+)
  let checklist = {
    existing: [],
    dealers: [],
    nonDealers: []
  };

  let colMap = {
    existingIdx: -1,
    dealersIdx: -1,
    nonDealersIdx: -1
  };

  // Scan all rows to find checklist headers in columns 12+
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 12; c < row.length; c++) {
      const val = (row[c] || '').trim();
      if (!val) continue;
      if (val.includes('Existing')) colMap.existingIdx = c;
      if (val.includes('New Dealers') || (val.includes('Dealers') && !val.includes('Non-Dealers') && colMap.dealersIdx === -1)) colMap.dealersIdx = c;
      if (val.includes('New Non-Dealers') || (val.includes('Non-Dealers') && colMap.nonDealersIdx === -1)) colMap.nonDealersIdx = c;
    }
  }

  // If we found checklist headers, extract checkbox items under them
  if (colMap.existingIdx !== -1 || colMap.dealersIdx !== -1 || colMap.nonDealersIdx !== -1) {
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      
      if (colMap.existingIdx !== -1 && row[colMap.existingIdx]) {
        const val = row[colMap.existingIdx].trim();
        if (val.startsWith('q') || val.startsWith('[') || val.startsWith('•')) {
          checklist.existing.push(cleanChecklistItem(val));
        }
      }
      if (colMap.dealersIdx !== -1 && row[colMap.dealersIdx]) {
        const val = row[colMap.dealersIdx].trim();
        if (val.startsWith('q') || val.startsWith('[') || val.startsWith('•')) {
          checklist.dealers.push(cleanChecklistItem(val));
        }
      }
      if (colMap.nonDealersIdx !== -1 && row[colMap.nonDealersIdx]) {
        const val = row[colMap.nonDealersIdx].trim();
        if (val.startsWith('q') || val.startsWith('[') || val.startsWith('•')) {
          checklist.nonDealers.push(cleanChecklistItem(val));
        }
      }
    }
  }

  // 2. Parse Requirements Sections
  const requirements = [];
  let currentSection = null;
  let currentItem = null;
  let hitRoles = false;
  let rolesStartRow = -1;

  for (let r = 2; r < rows.length; r++) {
    const row = rows[r];
    const col0 = (row[0] || '').trim();
    const col1 = (row[1] || '').trim();
    const col2 = (row[2] || '').trim();

    if (!col0 && !col1 && !col2) continue;

    // Detect acceptable/unacceptable titles section
    if (col0.includes('ACCEPTABLE TITLES') || col0.includes('UNACCEPTABLE TITLES') || col1.includes('ACCEPTABLE TITLES')) {
      hitRoles = true;
      rolesStartRow = r;
      break;
    }

    if (col0.startsWith('Revised') || col0.startsWith('Updated') || col0.startsWith('VAT/VIES') || col0.startsWith('Commercial Register')) continue;
    if (col0 === 'All English translations must be notarized.') continue;

    if (isHeading(col0, col1, col2)) {
      currentSection = { section: col0, items: [] };
      requirements.push(currentSection);
      currentItem = null;
    } else {
      // Ensure we have an active section
      if (!currentSection) {
        currentSection = { section: "General Requirements", items: [] };
        requirements.push(currentSection);
      }

      if (col0) {
        // Starts a new item
        currentItem = { name: col0, description: col1, issuedBy: col2 };
        currentSection.items.push(currentItem);
      } else {
        // col0 is empty, details are in col1 or col2
        if (currentItem) {
          if (col1) {
            if (currentItem.description) currentItem.description += ' ' + col1;
            else currentItem.description = col1;
          }
          if (col2) {
            if (currentItem.issuedBy) currentItem.issuedBy += ' ' + col2;
            else currentItem.issuedBy = col2;
          }
        } else {
          // No current item, create one
          currentItem = { name: col1 || col2, description: '', issuedBy: col1 ? col2 : '' };
          currentSection.items.push(currentItem);
        }
      }
    }
  }

  // 3. Parse Permitted/Unacceptable Roles
  let permittedRoles = {
    acceptable: [],
    unacceptable: []
  };

  if (hitRoles && rolesStartRow !== -1) {
    // Find columns for acceptable/unacceptable
    let accCol = 0;
    let unaccCol = 5; // Default fallback is col 5
    
    const headerRow = rows[rolesStartRow];
    for (let c = 0; c < headerRow.length; c++) {
      const cell = (headerRow[c] || '').trim();
      if (cell.includes('UNACCEPTABLE')) unaccCol = c;
      else if (cell.includes('ACCEPTABLE')) accCol = c;
    }

    for (let r = rolesStartRow + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;
      
      const accCell = row[accCol] ? row[accCol].trim() : '';
      const unaccCell = row[unaccCol] ? row[unaccCol].trim() : '';

      if (accCell && accCell.startsWith('*')) {
        permittedRoles.acceptable.push(cleanTitleItem(accCell));
      }
      if (unaccCell && unaccCell.startsWith('*')) {
        permittedRoles.unacceptable.push(cleanTitleItem(unaccCell));
      }
    }
  }

  // Clean items and filter out empty entries
  requirements.forEach(sec => {
    sec.items.forEach(item => {
      if (item.name) item.name = item.name.trim();
      if (item.description) item.description = item.description.trim();
      if (item.issuedBy) item.issuedBy = item.issuedBy.trim();
    });
    sec.items = sec.items.filter(item => item.name || item.description || item.issuedBy);
  });

  // Deduplicate and filter checklists & roles
  const filterList = (arr) => [...new Set(arr)].filter(Boolean);
  checklist.existing = filterList(checklist.existing);
  checklist.dealers = filterList(checklist.dealers);
  checklist.nonDealers = filterList(checklist.nonDealers);
  
  permittedRoles.acceptable = filterList(permittedRoles.acceptable);
  permittedRoles.unacceptable = filterList(permittedRoles.unacceptable);

  return {
    name,
    code: expectedName,
    type,
    generalReq,
    requirements,
    checklist,
    permittedRoles
  };
}

async function fetchAndParseCountry(sheetId, countryName, type) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(countryName)}`;
  const csv = await fetchURL(url);
  if (!csv) return null;
  const rows = parseCSV(csv);
  return parseSheetRows(rows, countryName, type);
}

async function fetchBatch(sheetId, list, type, batchSize = 6) {
  const results = [];
  for (let i = 0; i < list.length; i += batchSize) {
    const chunk = list.slice(i, i + batchSize);
    const promises = chunk.map(item => fetchAndParseCountry(sheetId, item, type));
    const batch = await Promise.all(promises);
    
    for (let j = 0; j < chunk.length; j++) {
      if (batch[j]) {
        results.push(batch[j]);
        const checklistCount = batch[j].checklist.existing.length + batch[j].checklist.dealers.length + batch[j].checklist.nonDealers.length;
        console.log(`  [${type.toUpperCase()}] OK: ${chunk[j]} (${batch[j].requirements.length} sections, ${checklistCount} checklist items, ${batch[j].permittedRoles.acceptable.length} permitted roles)`);
      } else {
        console.log(`  [${type.toUpperCase()}] SKIP: ${chunk[j]}`);
      }
    }
    
    // Tiny delay between chunks to be nice to Google
    if (i + batchSize < list.length) {
      await new Promise(r => setTimeout(r, 400));
    }
  }
  return results;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Copart Unified Licensing Database Fetcher');
  console.log('='.repeat(60));

  const allData = [];

  // 1. Fetch USA States (51 tabs)
  console.log(`\n[1/3] Fetching USA states & territories (${USA_STATES.length} tabs)...`);
  const usaData = await fetchBatch(SHEETS.USA, USA_STATES, 'usa', 8);
  allData.push(...usaData);
  console.log(`  => Finished USA. Got ${usaData.length} active locations.\n`);

  // 2. Fetch Canada Provinces (13 tabs)
  console.log(`[2/3] Fetching Canadian provinces & territories (${CANADA_PROVINCES.length} tabs)...`);
  const canadaData = await fetchBatch(SHEETS.CANADA, CANADA_PROVINCES, 'canada', 6);
  allData.push(...canadaData);
  console.log(`  => Finished Canada. Got ${canadaData.length} active locations.\n`);

  // 3. Fetch International Countries (split A-F, G-N, O-Z)
  console.log(`[3/3] Fetching International Countries (A-F, G-N, O-Z sheets)...`);
  
  console.log(`  -> Fetching A-F countries (${INTL_AF.length} tabs)...`);
  const intlAF = await fetchBatch(SHEETS.INTL_AF, INTL_AF, 'intl', 8);
  allData.push(...intlAF);
  
  console.log(`  -> Fetching G-N countries (${INTL_GN.length} tabs)...`);
  const intlGN = await fetchBatch(SHEETS.INTL_GN, INTL_GN, 'intl', 8);
  allData.push(...intlGN);

  console.log(`  -> Fetching O-Z countries (${INTL_OZ.length} tabs)...`);
  const intlOZ = await fetchBatch(SHEETS.INTL_OZ, INTL_OZ, 'intl', 8);
  allData.push(...intlOZ);
  
  console.log(`  => Finished International. Got ${intlAF.length + intlGN.length + intlOZ.length} tabs scanned.\n`);

  // Sort alphabetically by name
  allData.sort((a, b) => a.name.localeCompare(b.name));

  console.log('='.repeat(60));
  console.log(`Total database entries successfully processed: ${allData.length}`);
  console.log('='.repeat(60));

  // Write the clean, complete JSON to output
  fs.writeFileSync('country_data_clean.json', JSON.stringify(allData, null, 2), 'utf-8');
  console.log('\nConsolidated compliance database written to: country_data_clean.json');
}

main().catch(console.error);
