const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'out');

// Verificar que out existe
if (!fs.existsSync(outDir)) {
  console.error('❌ out directory not found. Run npm run build first.');
  process.exit(1);
}

// Verificar .nojekyll
const nojekyll = path.join(outDir, '.nojekyll');
if (!fs.existsSync(nojekyll)) {
  console.log('📝 Creating .nojekyll...');
  fs.writeFileSync(nojekyll, '');
}

console.log('📦 Deploying to GitHub Pages...');

try {
  // Guardar directorio actual
  const originalDir = process.cwd();
  
  // Ir a out
  process.chdir(outDir);
  
  // Git commands
  console.log('Initializing git...');
  execSync('git init', { stdio: 'inherit' });
  
  console.log('Adding files...');
  execSync('git add -A', { stdio: 'inherit' });
  
  console.log('Committing...');
  execSync('git commit -m "Deploy to GitHub Pages"', { stdio: 'inherit' });
  
  console.log('Creating gh-pages branch...');
  execSync('git branch -M gh-pages', { stdio: 'inherit' });
  
  console.log('Setting remote...');
  try {
    execSync('git remote add origin https://github.com/leandro456/finanzes.git', { stdio: 'inherit' });
  } catch (e) {
    execSync('git remote set-url origin https://github.com/leandro456/finanzes.git', { stdio: 'inherit' });
  }
  
  console.log('Pushing to GitHub...');
  execSync('git push -f origin gh-pages', { stdio: 'inherit' });
  
  // Volver al directorio original
  process.chdir(originalDir);
  
  console.log('✅ Deployed successfully!');
  console.log('🌐 https://leandro456.github.io/finanzes');
  console.log('⏳ Wait 1-2 minutes for GitHub Pages to update');
  
} catch (error) {
  console.error('❌ Deploy failed:', error.message);
  process.exit(1);
}