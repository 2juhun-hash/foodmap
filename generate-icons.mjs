import { writeFileSync } from 'fs';

function makeSVG(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size*0.2}" fill="#1A1A1A"/>
  <text x="${size/2}" y="${size*0.62}" font-size="${size*0.52}" text-anchor="middle" fill="#E8B86D" font-family="serif" font-weight="bold">F</text>
</svg>`;
}

writeFileSync('/Users/june/foodmap/public/icon-192.svg', makeSVG(192));
writeFileSync('/Users/june/foodmap/public/icon-512.svg', makeSVG(512));
console.log('SVG icons generated');
