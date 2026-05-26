// Compiler script: reads country_data_clean.json + index_template.html and generates final index.html
const fs = require('fs');

if (!fs.existsSync('country_data_clean.json')) {
  console.error('Error: country_data_clean.json not found! Please run node fetch_data.js first.');
  process.exit(1);
}

if (!fs.existsSync('index_template.html')) {
  console.error('Error: index_template.html not found! Please make sure the template file exists.');
  process.exit(1);
}

console.log('Reading country_data_clean.json...');
const data = JSON.parse(fs.readFileSync('country_data_clean.json', 'utf-8'));

// Spatial coordinates dictionary for all jurisdictions
const USA_COORDS = {
  AL: { lat: 32.806671, lng: -86.791130 }, AK: { lat: 61.370716, lng: -152.404419 }, AZ: { lat: 33.729759, lng: -111.431221 },
  AR: { lat: 34.969704, lng: -92.373123 }, CA: { lat: 36.116203, lng: -119.681564 }, CO: { lat: 39.059811, lng: -105.311104 },
  CT: { lat: 41.597782, lng: -72.755371 }, DE: { lat: 39.318523, lng: -75.507141 }, FL: { lat: 27.766279, lng: -81.686783 },
  GA: { lat: 33.040619, lng: -83.643074 }, HI: { lat: 21.094318, lng: -157.498337 }, ID: { lat: 44.240459, lng: -114.478828 },
  IL: { lat: 40.349457, lng: -88.986137 }, IN: { lat: 39.849426, lng: -86.258278 }, IA: { lat: 42.011539, lng: -93.210526 },
  KS: { lat: 38.526600, lng: -96.726486 }, KY: { lat: 37.668140, lng: -84.670067 }, LA: { lat: 31.169546, lng: -91.867805 },
  ME: { lat: 44.693947, lng: -69.381927 }, MD: { lat: 39.063946, lng: -76.802101 }, MA: { lat: 42.230171, lng: -71.530106 },
  MI: { lat: 43.326618, lng: -84.536095 }, MN: { lat: 45.694454, lng: -93.900192 }, MS: { lat: 32.741646, lng: -89.678696 },
  MO: { lat: 38.456085, lng: -92.288368 }, MT: { lat: 46.921925, lng: -110.454353 }, NE: { lat: 41.125370, lng: -98.268082 },
  NV: { lat: 38.313515, lng: -117.055374 }, NH: { lat: 43.452492, lng: -71.563896 }, NJ: { lat: 40.298904, lng: -74.521011 },
  NM: { lat: 34.840515, lng: -106.248482 }, NY: { lat: 42.165726, lng: -74.948051 }, NC: { lat: 35.630066, lng: -79.806419 },
  ND: { lat: 47.528912, lng: -99.784012 }, OH: { lat: 40.388783, lng: -82.764915 }, OK: { lat: 35.565342, lng: -96.928917 },
  OR: { lat: 44.572021, lng: -122.070938 }, PA: { lat: 40.590752, lng: -77.209755 }, RI: { lat: 41.680893, lng: -71.511780 },
  SC: { lat: 33.856892, lng: -80.945007 }, SD: { lat: 44.299782, lng: -99.438828 }, TN: { lat: 35.747845, lng: -86.692345 },
  TX: { lat: 31.054487, lng: -97.563461 }, UT: { lat: 39.305536, lng: -111.670334 }, VT: { lat: 44.045876, lng: -72.710686 },
  VA: { lat: 37.769337, lng: -78.169968 }, WA: { lat: 47.400902, lng: -121.490494 }, WV: { lat: 38.491227, lng: -80.954453 },
  WI: { lat: 44.268543, lng: -89.616508 }, WY: { lat: 42.755966, lng: -107.302490 }, DC: { lat: 38.89511, lng: -77.03637 }
};

const CANADA_COORDS = {
  AB: { lat: 53.9333, lng: -116.5765 }, BC: { lat: 53.7267, lng: -127.6476 }, MB: { lat: 53.7609, lng: -98.8139 },
  NB: { lat: 46.5653, lng: -66.4619 }, NL: { lat: 53.1355, lng: -57.6604 }, NT: { lat: 64.8255, lng: -124.8457 },
  NS: { lat: 44.6820, lng: -63.7443 }, NU: { lat: 70.2998, lng: -83.1076 }, ON: { lat: 51.2538, lng: -85.3232 },
  PE: { lat: 46.5107, lng: -63.4168 }, QC: { lat: 52.9399, lng: -73.5491 }, SK: { lat: 52.9399, lng: -106.4509 },
  YT: { lat: 64.2823, lng: -135.0000 }
};

const INTL_COORDS = {
  'Afghanistan': { lat: 33.9391, lng: 67.7100 }, 'Albania': { lat: 41.1533, lng: 20.1683 }, 'Algeria': { lat: 28.0339, lng: 1.6596 },
  'Angola': { lat: -11.2027, lng: 17.8739 }, 'Argentina': { lat: -38.4161, lng: -63.6167 }, 'Australia': { lat: -25.2744, lng: 133.7751 },
  'Azerbaijan': { lat: 40.1431, lng: 47.5769 }, 'Bahrain': { lat: 26.0667, lng: 50.5577 }, 'Bangladesh': { lat: 23.6850, lng: 90.3563 },
  'Belarus': { lat: 53.7098, lng: 27.9534 }, 'Belgium': { lat: 50.5039, lng: 4.4699 }, 'Belize': { lat: 17.1899, lng: -88.4976 },
  'Benin': { lat: 9.3077, lng: 2.3158 }, 'Bolivia': { lat: -16.2902, lng: -63.5493 }, 'Bosnia': { lat: 43.9159, lng: 17.6791 },
  'Brazil': { lat: -14.2350, lng: -51.9253 }, 'Bulgaria': { lat: 42.7339, lng: 25.4858 }, 'Burkina Faso': { lat: 12.2383, lng: -1.5616 },
  'Burundi': { lat: -3.3731, lng: 29.9189 }, 'Cambodia': { lat: 12.5657, lng: 104.9910 }, 'Cameroon': { lat: 7.3697, lng: 12.3547 },
  'Central African Republic': { lat: 6.6111, lng: 20.9394 }, 'Chad': { lat: 15.4542, lng: 18.7322 }, 'Chile': { lat: -35.6751, lng: -71.5430 },
  'China': { lat: 35.8617, lng: 104.1954 }, 'Colombia': { lat: 4.5709, lng: -74.2973 }, 'Comoros': { lat: -11.8750, lng: 43.8722 },
  'Costa Rica': { lat: 9.7489, lng: -83.7534 }, 'Croatia': { lat: 45.1000, lng: 15.2000 }, 'Cyprus': { lat: 35.1264, lng: 33.4299 },
  'Czech Republic': { lat: 49.8175, lng: 15.4730 }, 'Denmark': { lat: 56.2639, lng: 9.5018 }, 'Dominican Republic': { lat: 18.7357, lng: -70.1627 },
  'Ecuador': { lat: -1.8312, lng: -78.1834 }, 'Egypt': { lat: 26.8206, lng: 30.8025 }, 'El Salvador': { lat: 13.7942, lng: -88.8965 },
  'Eritrea': { lat: 15.1794, lng: 39.7823 }, 'Estonia': { lat: 58.5953, lng: 25.0136 }, 'Ethiopia': { lat: 9.1450, lng: 40.4897 },
  'Fiji': { lat: -17.7134, lng: 178.0650 }, 'Finland': { lat: 61.9241, lng: 25.7482 }, 'France': { lat: 46.2276, lng: 2.2137 },
  'Gabon': { lat: -0.8037, lng: 11.6094 }, 'Gambia': { lat: 13.4432, lng: -15.3101 }, 'Germany': { lat: 51.1657, lng: 10.4515 },
  'Ghana': { lat: 7.9465, lng: -1.0232 }, 'Greece': { lat: 39.0742, lng: 21.8243 }, 'Guatemala': { lat: 15.7835, lng: -90.2308 },
  'Guinea': { lat: 9.9456, lng: -9.6966 }, 'Guinea-Bissau': { lat: 11.8037, lng: -15.1804 }, 'Guyana': { lat: 4.8604, lng: -58.9302 },
  'Haiti': { lat: 18.9712, lng: -72.2852 }, 'Honduras': { lat: 15.2000, lng: -86.2419 }, 'Hong Kong': { lat: 22.3193, lng: 114.1694 },
  'Hungary': { lat: 47.1625, lng: 19.5033 }, 'India': { lat: 20.5937, lng: 78.9629 }, 'Indonesia': { lat: -0.7893, lng: 113.9213 },
  'Iraq': { lat: 33.2232, lng: 43.6793 }, 'Israel': { lat: 31.0461, lng: 34.8516 }, 'Italy': { lat: 41.8719, lng: 12.5674 },
  'Jamaica': { lat: 18.1096, lng: -77.2975 }, 'Japan': { lat: 36.2048, lng: 138.2529 }, 'Jordan': { lat: 30.5852, lng: 36.2384 },
  'Kazakhstan': { lat: 48.0196, lng: 66.9237 }, 'Kenya': { lat: -0.0236, lng: 37.9062 }, 'Kosovo': { lat: 42.6026, lng: 20.9030 },
  'Kuwait': { lat: 29.3759, lng: 47.9774 }, 'Kyrgyzstan': { lat: 41.2044, lng: 74.7661 }, 'Latvia': { lat: 56.8796, lng: 24.6032 },
  'Lebanon': { lat: 33.8547, lng: 35.8623 }, 'Lesotho': { lat: -29.6100, lng: 28.2336 }, 'Liberia': { lat: 6.4281, lng: -9.4295 },
  'Libya': { lat: 26.3351, lng: 17.2283 }, 'Lithuania': { lat: 55.1694, lng: 23.8813 }, 'Luxembourg': { lat: 49.8153, lng: 6.1296 },
  'Madagascar': { lat: -18.7669, lng: 46.8691 }, 'Malawi': { lat: -13.2543, lng: 34.3015 }, 'Malaysia': { lat: 4.2105, lng: 101.9758 },
  'Mali': { lat: 17.5707, lng: -3.9962 }, 'Mauritania': { lat: 21.0079, lng: -10.9408 }, 'Mauritius': { lat: -20.3484, lng: 57.5522 },
  'Mexico': { lat: 23.6345, lng: -102.5528 }, 'Mongolia': { lat: 46.8625, lng: 103.8467 }, 'Montenegro': { lat: 42.7087, lng: 19.3744 },
  'Morocco': { lat: 31.7917, lng: -7.0926 }, 'Mozambique': { lat: -18.6657, lng: 35.5296 }, 'Namibia': { lat: -22.9576, lng: 18.4904 },
  'Nepal': { lat: 28.3949, lng: 84.1240 }, 'Netherlands': { lat: 52.1326, lng: 5.2913 }, 'New Zealand': { lat: -40.9006, lng: 174.8860 },
  'Nicaragua': { lat: 12.8654, lng: -85.2072 }, 'Niger': { lat: 17.6078, lng: 8.0817 }, 'Nigeria': { lat: 9.0820, lng: 8.6753 },
  'Oman': { lat: 21.5126, lng: 55.9233 }, 'Pakistan': { lat: 30.3753, lng: 69.3451 }, 'Panama': { lat: 8.5380, lng: -80.7821 },
  'Papua New Guinea': { lat: -6.3150, lng: 143.9555 }, 'Paraguay': { lat: -23.4425, lng: -58.4438 }, 'Peru': { lat: -9.1900, lng: -75.0152 },
  'Poland': { lat: 51.9194, lng: 19.1451 }, 'Portugal': { lat: 39.3999, lng: -8.2245 }, 'Qatar': { lat: 25.3548, lng: 51.1839 },
  'Republic of Djibouti': { lat: 11.8251, lng: 42.5903 }, 'Republic of Moldova': { lat: 47.4116, lng: 28.3699 },
  'Romania': { lat: 45.9432, lng: 24.9668 }, 'Russia': { lat: 61.5240, lng: 105.3188 }, 'Rwanda': { lat: -1.9403, lng: 29.8739 },
  'Saudi Arabia': { lat: 23.8859, lng: 45.0792 }, 'Senegal': { lat: 14.4974, lng: -14.4524 }, 'Serbia': { lat: 44.0165, lng: 21.0059 },
  'Sierra Leone': { lat: 8.4606, lng: -11.7799 }, 'Singapore': { lat: 1.3521, lng: 103.8198 }, 'Slovakia': { lat: 48.6690, lng: 19.6990 },
  'Slovenia': { lat: 46.1512, lng: 14.9955 }, 'Somalia': { lat: 5.1521, lng: 46.1996 }, 'South Africa': { lat: -30.5595, lng: 22.9375 },
  'South Korea': { lat: 35.9078, lng: 127.7669 }, 'Spain': { lat: 40.4637, lng: -3.7492 }, 'Sri Lanka': { lat: 7.8731, lng: 80.7718 },
  'Suriname': { lat: 3.9193, lng: -56.0278 }, 'Sweden': { lat: 60.1282, lng: 18.6435 }, 'Switzerland': { lat: 46.8182, lng: 8.2275 },
  'Taiwan': { lat: 23.6978, lng: 120.9605 }, 'Tajikistan': { lat: 38.8610, lng: 71.2761 }, 'Tanzania': { lat: -6.3690, lng: 34.8888 },
  'Thailand': { lat: 15.8700, lng: 100.9925 }, 'Togo': { lat: 8.6195, lng: 0.8248 }, 'Tunisia': { lat: 33.8869, lng: 9.5375 },
  'Turkey': { lat: 38.9637, lng: 35.2433 }, 'Turkmenistan': { lat: 38.9697, lng: 59.5563 }, 'Uganda': { lat: 1.3733, lng: 32.2903 },
  'Ukraine': { lat: 48.3794, lng: 31.1656 }, 'Uruguay': { lat: -32.5228, lng: -55.7658 }, 'Uzbekistan': { lat: 41.3775, lng: 64.5853 },
  'Venezuela': { lat: 6.4238, lng: -66.5897 }, 'Vietnam': { lat: 14.0583, lng: 108.2772 }, 'Yemen': { lat: 15.5527, lng: 48.5164 },
  'Zambia': { lat: -13.1339, lng: 27.8493 }, 'Zimbabwe': { lat: -19.0154, lng: 29.1549 },
  
  // Coordinates for the 24 previously missing countries
  'Armenia': { lat: 40.0691, lng: 45.0382 },
  'Botswana': { lat: -22.3285, lng: 24.6849 },
  'Congo': { lat: -0.2280, lng: 15.8277 },
  "Cote d'Ivoire": { lat: 7.5400, lng: -5.5471 },
  'Cuba': { lat: 21.5218, lng: -77.7812 },
  'DRC': { lat: -4.0383, lng: 21.7587 },
  'Equatorial Guinea': { lat: 1.6508, lng: 10.2679 },
  'Eswatini': { lat: -26.5225, lng: 31.4659 },
  'Georgia': { lat: 42.3154, lng: 43.3569 },
  'Iran': { lat: 32.4279, lng: 53.6880 },
  'Ireland': { lat: 53.4129, lng: -8.2439 },
  'Laos': { lat: 19.8563, lng: 102.4955 },
  'Myanmar': { lat: 21.9162, lng: 95.9560 },
  'North Macedonia': { lat: 41.6086, lng: 21.7453 },
  'Palestine': { lat: 31.9522, lng: 35.2332 },
  'Philippines': { lat: 12.8797, lng: 121.7740 },
  'South Sudan': { lat: 6.8770, lng: 31.3070 },
  'Sudan': { lat: 12.8628, lng: 30.2176 },
  'Syria': { lat: 34.8021, lng: 38.9968 },
  'Trinidad': { lat: 10.6918, lng: -61.2225 },
  'UAE': { lat: 23.4241, lng: 53.8478 },
  'United Kingdom': { lat: 55.3781, lng: -3.4360 },
  'Djibouti': { lat: 11.8251, lng: 42.5903 },
  'Moldova': { lat: 47.4116, lng: 28.3699 }
};

const getProvCode = (name) => {
  const codes = {'Alberta':'AB', 'British Columbia':'BC', 'Manitoba':'MB', 'New Brunswick':'NB', 'Newfoundland & Labrador':'NL', 'Newfoundland and Labrador':'NL', 'Northwest Territories':'NT', 'Nova Scotia':'NS', 'Nunavut':'NU', 'Ontario':'ON', 'Prince Edward Island':'PE', 'Quebec':'QC', 'Saskatchewan':'SK', 'Yukon':'YT'};
  return codes[name] || 'ON';
};

// Clean up items that leaked "ACCEPTABLE TITLES" or formatting marks, and de-duplicate by name
const uniqueData = [];
const seenNames = new Set();

data.forEach(c => {
  if (!c) return;

  // Fix sheet copy-paste corruption (override incorrect A1 names with actual tab names/codes)
  if (c.type === 'intl' && c.code) {
    c.name = c.code;
  }
  
  if (!c.name) return;
  const nameTrim = c.name.trim();
  
  if (c.requirements) {
    c.requirements.forEach(r => {
      if (r.items) {
        r.items = r.items.filter(item => {
          if (!item || !item.name) return false;
          const n = item.name.trim();
          return !n.startsWith('*') && !n.startsWith('ACCEPTABLE') && !n.startsWith('UNACCEPTABLE');
        });
      }
    });
    // Remove empty sections
    c.requirements = c.requirements.filter(r => r.items && r.items.length > 0);
  }

  if (!seenNames.has(nameTrim)) {
    seenNames.add(nameTrim);
    
    // Add pre-computed spatial coordinates to each object
    let lat = 0;
    let lng = 0;
    if (c.type === 'usa') {
      const coords = USA_COORDS[c.code] || { lat: 39.8283, lng: -98.5795 };
      lat = coords.lat;
      lng = coords.lng;
    } else if (c.type === 'canada') {
      const code = getProvCode(c.name);
      const coords = CANADA_COORDS[code] || { lat: 56.1304, lng: -106.3468 };
      lat = coords.lat;
      lng = coords.lng;
    } else {
      const coords = INTL_COORDS[nameTrim] || { lat: 0, lng: 0 };
      lat = coords.lat;
      lng = coords.lng;
    }
    
    c.lat = lat;
    c.lng = lng;
    uniqueData.push(c);
  }
});

// Group data by type
const usaData = uniqueData.filter(c => c.type === 'usa');
const canadaData = uniqueData.filter(c => c.type === 'canada');
const intlData = uniqueData.filter(c => c.type === 'intl');

console.log(`\nConsolidated database details:`);
console.log(`- USA States/Territories: ${usaData.length}`);
console.log(`- Canadian Provinces: ${canadaData.length}`);
console.log(`- International Countries: ${intlData.length}`);
console.log(`Total database entries: ${uniqueData.length}`);

console.log('\nReading index_template.html...');
const template = fs.readFileSync('index_template.html', 'utf-8');

console.log('Compiling final index.html by injecting JSON datasets...');
const compiled = template
  .replace('__USA_DATA__', JSON.stringify(usaData))
  .replace('__CANADA_DATA__', JSON.stringify(canadaData))
  .replace('__INTL_DATA__', JSON.stringify(intlData));

fs.writeFileSync('index.html', compiled, 'utf-8');
console.log(`\nSuccess! Final index.html successfully compiled (${(compiled.length / 1024).toFixed(1)} KB)`);
