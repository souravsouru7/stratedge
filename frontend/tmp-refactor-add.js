const fs = require('fs');

const path = 'app/add-trade/page.js';
let content = fs.readFileSync(path, 'utf8');

// Replace imports
content = content.replace(
  'import { fetchSetups } from "@/services/setupApi";',
  'import { fetchSetups } from "@/services/setupApi";\nimport { uploadTradeImage } from "@/services/uploadApi";'
);

// Replace the upload logic block
content = content.replace(
  /const formData = new FormData\(\);[\s\S]*?if \(res\.ok\) \{[\s\S]*?setTrade\(prev => \(\{ \.\.\.prev, screenshot: data\.url \}\)\);[\s\S]*?\} else \{[\s\S]*?alert\("Failed to upload screenshot"\);[\s\S]*?\}/,
  `const data = await uploadTradeImage({ file, marketType });\n      setTrade(prev => ({ ...prev, screenshot: data.screenshotUrl || data.url }));`
);

fs.writeFileSync(path, content);
console.log('Done refactoring upload logic in add-trade page');
