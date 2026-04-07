const fs = require('fs');

const path = 'app/trades/edit/page.js';
let content = fs.readFileSync(path, 'utf8');

// Replace imports
content = content.replace(
  'import { getTrade, updateTrade } from "@/services/tradeApi";',
  'import { getTrade, updateTrade } from "@/services/tradeApi";\nimport { uploadTradeImage } from "@/services/uploadApi";'
);

// Replace the upload logic block
const oldUploadBlock = `                      try {
                        const formDataUpload = new FormData();
                        formDataUpload.append("image", file);

                        const res = await fetch("http://localhost:5000/api/upload", {
                          method: "POST",
                          body: formDataUpload
                        });

                        if (res.ok) {
                          const data = await res.json();
                          setFormData(prev => ({ ...prev, screenshot: data.url }));
                        }
                      } catch (err) {
                        console.error("Upload error:", err);
                      }`;
                      
const newUploadBlock = `                      try {
                        const data = await uploadTradeImage({ file, marketType: "Forex" });
                        setFormData(prev => ({ ...prev, screenshot: data.screenshotUrl || data.url }));
                      } catch (err) {
                        console.error("Upload error:", err);
                      }`;

// Use regex or string matching. Sometimes whitespace differs, let's just do a big replace or string matching
content = content.replace(
  /const formDataUpload = new FormData\(\);[\s\S]*?if \(res\.ok\) \{[\s\S]*?setFormData\(prev => \(\{ \.\.\.prev, screenshot: data\.url \}\)\);[\s\S]*?\}/,
  `const data = await uploadTradeImage({ file, marketType: "Forex" });\n                        setFormData(prev => ({ ...prev, screenshot: data.screenshotUrl || data.url }));`
);

fs.writeFileSync(path, content);
console.log('Done refactoring upload logic in edit page');
