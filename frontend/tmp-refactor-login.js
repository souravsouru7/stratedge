const fs = require('fs');

const path = 'app/login/page.js';
let content = fs.readFileSync(path, 'utf8');

// Replace imports
content = content.replace(
  'import { googleLogin, loginUser } from "@/services/api";',
  'import { googleLogin, loginUser, testConnection as apiTestConnection } from "@/services/api";'
);

// Replace the test connection logic
content = content.replace(
  /const testConnection = async \(\) => \{[\s\S]*?try \{[\s\S]*?const res = await fetch\(process\.env\.NEXT_PUBLIC_API_URL \|\| "no-url"\);[\s\S]*?alert\("Connection test to " \+ process\.env\.NEXT_PUBLIC_API_URL \+ " : " \+ \(res\.ok \? "SUCCESS" : "FAILED \(" \+ res\.status \+ "\)"\)\);[\s\S]*?\} catch \(err\) \{[\s\S]*?alert\("Connection test ERROR: " \+ err\.message\);[\s\S]*?\}[\s\S]*?\};/,
  `const testConnection = async () => {\n    try {\n      await apiTestConnection();\n      alert("Connection test to " + process.env.NEXT_PUBLIC_API_URL + " : SUCCESS");\n    } catch (err) {\n      alert("Connection test ERROR: " + err.message);\n    }\n  };`
);

fs.writeFileSync(path, content);
console.log('Done refactoring login fetch');
