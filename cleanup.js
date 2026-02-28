const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// The replacement tool bugged out and wrote ``` on line 1
if (content.startsWith('```\n')) {
    content = content.replace('```\n', '');
}

// And added weird spaces inside CSS selectors
content = content.replace(/box-\s*sizing/g, 'box-sizing');
content = content.replace(/\* { box-sizing: border-box; margin: 0; padding: 0; }/g, '* { box-sizing: border-box; margin: 0; padding: 0; }');

content = content.replace(/page\s*-\s*bg/g, 'page-bg');
content = content.replace(/min\s*-\s*height/g, 'min-height');
content = content.replace(/linear\s*-\s*gradient/g, 'linear-gradient');
content = content.replace(/font\s*-\s*family/g, 'font-family');
content = content.replace(/sans\s*-\s*serif/g, 'sans-serif');
content = content.replace(/overflow\s*-\s*x/g, 'overflow-x');

content = content.replace(/border\s*-\s*radius/g, 'border-radius');
content = content.replace(/pointer\s*-\s*events/g, 'pointer-events');
content = content.replace(/z\s*-\s*index/g, 'z-index');
content = content.replace(/radial\s*-\s*gradient/g, 'radial-gradient');
content = content.replace(/ease\s*-\s*in\s*-\s*out/g, 'ease-in-out');

content = content.replace(/backdrop\s*-\s*filter/g, 'backdrop-filter');
content = content.replace(/-webkit\s*-\s*backdrop\s*-\s*filter/g, '-webkit-backdrop-filter');
content = content.replace(/border\s*-\s*color/g, 'border-color');
content = content.replace(/font\s*-\s*size/g, 'font-size');
content = content.replace(/font\s*-\s*weight/g, 'font-weight');
content = content.replace(/margin\s*-\s*bottom/g, 'margin-bottom');
content = content.replace(/align\s*-\s*items/g, 'align-items');
content = content.replace(/letter\s*-\s*spacing/g, 'letter-spacing');

content = content.replace(/glass\s*-\s*card/g, 'glass-card');
content = content.replace(/glass\s*-\s*card\s*-\s*highlight/g, 'glass-card-highlight');
content = content.replace(/section\s*-\s*title/g, 'section-title');
content = content.replace(/glass\s*-\s*input/g, 'glass-input');
content = content.replace(/glass\s*-\s*tab\s*-\s*bar/g, 'glass-tab-bar');
content = content.replace(/tab\s*-\s*btn/g, 'tab-btn');
content = content.replace(/tab\s*-\s*active/g, 'tab-active');
content = content.replace(/cert\s*-\s*upload\s*-\s*btn/g, 'cert-upload-btn');
content = content.replace(/save\s*-\s*btn/g, 'save-btn');
content = content.replace(/justify\s*-\s*content/g, 'justify-content');
content = content.replace(/white\s*-\s*space/g, 'white-space');
content = content.replace(/box\s*-\s*shadow/g, 'box-shadow');
content = content.replace(/not\s*-\s*allowed/g, 'not-allowed');

content = content.replace(/orb\s*-\s*1/g, 'orb-1');
content = content.replace(/orb\s*-\s*2/g, 'orb-2');
content = content.replace(/orb\s*-\s*3/g, 'orb-3');

fs.writeFileSync(targetFile, content);
console.log('Cleaned up page.tsx whitespace bugs');
