
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
  content = content.replace(/#FF7A18/gi, 'var(--primary-color)');
  content = content.replace(/#ff7a18/gi, 'var(--primary-color)');
  content = content.replace(/#FF9100/gi, 'var(--primary-accent)');
  content = content.replace(/#ff9100/gi, 'var(--primary-accent)');

  // Replace RGB values (ignore spaces)
  content = content.replace(/255,\s*122,\s*24/g, 'var(--primary-rgb)');
  
  if (content !== original) {
     fs.writeFileSync(filePath, content, 'utf8');
     console.log('Updated', filePath);
  }
});
