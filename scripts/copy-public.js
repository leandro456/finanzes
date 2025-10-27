const fs = require('fs');
const path = require('path');

function copyFolderSync(from, to) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  
  // Incluir archivos ocultos
  fs.readdirSync(from, { withFileTypes: true }).forEach(element => {
    const fromPath = path.join(from, element.name);
    const toPath = path.join(to, element.name);
    
    if (element.isFile()) {
      fs.copyFileSync(fromPath, toPath);
      console.log(`Copied: ${element.name}`);
    } else if (element.isDirectory()) {
      copyFolderSync(fromPath, toPath);
    }
  });
}

const publicDir = path.join(__dirname, '..', 'public');
const outDir = path.join(__dirname, '..', 'out');

// Asegurar que .nojekyll existe
const nojekyllPath = path.join(outDir, '.nojekyll');

if (fs.existsSync(publicDir)) {
  console.log('📁 Copying public folder to out...');
  copyFolderSync(publicDir, outDir);
}

// Crear .nojekyll si no existe
if (!fs.existsSync(nojekyllPath)) {
  console.log('📝 Creating .nojekyll file...');
  fs.writeFileSync(nojekyllPath, '');
}

console.log('✓ Build preparation completed');
console.log('✓ .nojekyll file present');