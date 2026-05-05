const fs = require('fs');
const path = require('path');

function processFile(filePath, isIndian) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Add imports if missing
    if (!content.includes('const ApiError')) {
        content = content.replace(/(const .*? = require\(.*?\);)/, `$1\nconst ApiError = require("../utils/ApiError");\nconst { asyncHandler } = require("../middleware/errorHandler");`);
    }

    if (isIndian) {
        // Fix userQuery
        content = content.replace(
            /const userQuery = \(req\) => \{\s*const instrumentType = \(req\.query\.instrumentType \|\| "OPTION"\)\.toUpperCase\(\);\s*return \{ user: req\.user\._id, instrumentType \};\s*\};/g,
            `const userQuery = (req) => {\n  const instrumentType = (req.query.instrumentType || "OPTION").toUpperCase();\n  if (!["OPTION", "EQUITY"].includes(instrumentType)) {\n    throw new ApiError(400, "Invalid instrumentType");\n  }\n  return { user: req.user._id, instrumentType };\n};`
        );
    } else {
        // Fix analyticsController.js validations in its main exports if needed, or in userQuery if it exists
        // Wait, analyticsController doesn't have a single userQuery, it has `req.query.range` etc.
    }

    // Add .lean() to Trade.find(...) or IndianTrade.find(...)
    // Regex: /(Trade|IndianTrade)\.find\((.*?)\)(?!\.lean\(\))/g but it might have .sort()
    // Better to just do `.find(userQuery(req))` -> `.find(userQuery(req)).lean()`
    // Or `.find({ user: req.user._id, ... })`
    content = content.replace(/(IndianTrade|Trade)\.find\(([^)]+)\)(?!\.lean\(\))/g, '$1.find($2).lean()');

    // Replace `exports.fn = async (req, res) => { try { ... } catch (error) { res.status(500)... } };`
    // with `exports.fn = asyncHandler(async (req, res) => { ... });`
    // This is hard to do safely with pure regex because of nested braces.
    // However, since we know the structure is:
    // exports.name = async (req, res) => {
    //   try {
    //     ...
    //   } catch (error) {
    //     res.status(500).json({ message: error.message });
    //   }
    // };
    // Let's use a simpler approach: replace `try {` with ` `, replace `catch (error) { res.status(500)... }` with ` `
    // Wait, let's just do it cleanly by keeping try/catch but changing res.status(500) to throw ApiError(500), and wrapping exports.

    let regex = /exports\.(\w+) = async\s*\((req, res)\)\s*=>\s*\{([\s\S]*?)\};/g;
    
    content = content.replace(regex, (match, fnName, args, body) => {
        // Change res.status(500).json({ message: error.message }) to throw new ApiError(500, error.message)
        let newBody = body.replace(/res\.status\(500\)\.json\(\{ message: error\.message \}\);/g, 'throw new ApiError(500, error.message);');
        newBody = newBody.replace(/res\.status\((500|400|404)\)\.json\(\{.*?message:\s*(.+?)\s*\}\);/g, (m, code, msg) => {
             return `throw new ApiError(${code}, ${msg});`;
        });

        // If it still has `try { ... } catch(error) { throw new ApiError... }`, we can just leave the try/catch, 
        // the asyncHandler will catch the thrown ApiError.
        
        return `exports.${fnName} = asyncHandler(async (${args}) => {${newBody}});`;
    });

    fs.writeFileSync(filePath, content);
    console.log(`Processed ${filePath}`);
}

const dir = 'c:\\Users\\souta\\Desktop\\new\\stratedge\\backend\\controllers';
processFile(path.join(dir, 'indianAnalyticsController.js'), true);
processFile(path.join(dir, 'analyticsController.js'), false);
