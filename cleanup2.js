const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Replace any occurrence of word followed by " - " followed by word  with "word-word"
// We need to be careful not to break actual JS/TS subtractions, but since this is 
// mostly in the CSS block at the bottom, we can target between <style jsx global> and <\style>

const styleStartIdx = content.indexOf('<style jsx global>');
const styleEndIdx = content.indexOf('</style>');

if (styleStartIdx !== -1 && styleEndIdx !== -1) {
    let beforeStyle = content.substring(0, styleStartIdx);
    let styleBlock = content.substring(styleStartIdx, styleEndIdx);
    let afterStyle = content.substring(styleEndIdx);

    // Fix the weird " - " that formatting caused in CSS class names and properties
    // like `.glass - input` or `align - items`
    styleBlock = styleBlock.replace(/([a-zA-Z0-9_])\s+-\s+([a-zA-Z0-9_])/g, '$1-$2');

    // It also broke class names strings inside JSX like `tab - btn ${ activeTab === ...`
    // So let's also fix the beforeStyle specifically for class names we know got broken
    beforeStyle = beforeStyle.replace(/tab \- btn/g, 'tab-btn');
    beforeStyle = beforeStyle.replace(/tab \- active/g, 'tab-active');
    beforeStyle = beforeStyle.replace(/!\s*py\s*-\s*1\.5/g, '!py-1.5');
    beforeStyle = beforeStyle.replace(/glass \- card/g, 'glass-card');

    content = beforeStyle + styleBlock + afterStyle;
}

fs.writeFileSync(targetFile, content);
console.log('Fixed CSS spaces comprehensively');
