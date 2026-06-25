
const fs = require('fs');
const path = require('path');

const dirPath = path.join(__dirname, 'frontend', 'src');

const traverseDir = (dir, callback) => {
  fs.readdirSync(dir).forEach(file => {
    let fullPath = path.join(dir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
       traverseDir(fullPath, callback);
    } else {
       if (fullPath.match(/\.(css|jsx|js)$/)) callback(fullPath);
    }
  });
};

traverseDir(dirPath, filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace Hex Codes (case insensitive)
  content = content.replace(/#f97316/gi, 'var(--primary-color)');

  // Replace RGB values (ignore spaces)
  content = content.replace(/249,\s*115,\s*22/g, 'var(--primary-rgb)');
  
  if (content !== original) {
     fs.writeFileSync(filePath, content, 'utf8');
     console.log('Updated', filePath);
  }
});
