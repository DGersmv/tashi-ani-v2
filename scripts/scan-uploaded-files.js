const fs = require('fs');
const path = require('path');

function scanObjectDirectory(objectId) {
  const objectDir = path.join('/var/www/tashi-ani/public/uploads/objects', objectId.toString());
  
  if (!fs.existsSync(objectDir)) {
    return null;
  }

  const result = {
    objectId: parseInt(objectId),
    photos: [],
    panoramas: [],
    documents: [],
    thumbnails: []
  };

  // Сканируем директорию
  const items = fs.readdirSync(objectDir, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      if (item.name === 'panoramas') {
        // Сканируем панорамы
        const panoramasDir = path.join(objectDir, 'panoramas');
        if (fs.existsSync(panoramasDir)) {
          const files = fs.readdirSync(panoramasDir);
          for (const file of files) {
            if (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png')) {
              const filePath = path.join(panoramasDir, file);
              const stats = fs.statSync(filePath);
              result.panoramas.push({
                filename: file,
                size: stats.size,
                path: `/uploads/objects/${objectId}/panoramas/${file}`,
                modified: stats.mtime
              });
            }
          }
        }
      } else if (item.name === 'thumbnails') {
        // Пропускаем thumbnails
        continue;
      }
    } else if (item.isFile()) {
      // Фото или документы в корне
      const filePath = path.join(objectDir, item.name);
      const stats = fs.statSync(filePath);
      const ext = path.extname(item.name).toLowerCase();
      
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
        result.photos.push({
          filename: item.name,
          size: stats.size,
          path: `/uploads/objects/${objectId}/${item.name}`,
          modified: stats.mtime
        });
      } else if (['.pdf', '.doc', '.docx', '.xls', '.xlsx'].includes(ext)) {
        result.documents.push({
          filename: item.name,
          size: stats.size,
          path: `/uploads/objects/${objectId}/${item.name}`,
          modified: stats.mtime
        });
      }
    }
  }

  return result;
}

function scanAllObjects() {
  const objectsDir = '/var/www/tashi-ani/public/uploads/objects';
  
  if (!fs.existsSync(objectsDir)) {
    console.log('Директория объектов не найдена');
    return [];
  }

  const results = [];
  const items = fs.readdirSync(objectsDir, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory() && /^\d+$/.test(item.name)) {
      const objectId = parseInt(item.name);
      const scanResult = scanObjectDirectory(objectId);
      if (scanResult) {
        results.push(scanResult);
      }
    }
  }

  return results;
}

async function main() {
  console.log('🔍 Сканирование загруженных файлов...\n');
  
  const results = scanAllObjects();
  
  console.log(`Найдено объектов с файлами: ${results.length}\n`);
  
  let totalPhotos = 0;
  let totalPanoramas = 0;
  let totalDocuments = 0;
  let totalSize = 0;

  for (const obj of results) {
    const photosCount = obj.photos.length;
    const panoramasCount = obj.panoramas.length;
    const documentsCount = obj.documents.length;
    
    const objSize = 
      obj.photos.reduce((sum, p) => sum + p.size, 0) +
      obj.panoramas.reduce((sum, p) => sum + p.size, 0) +
      obj.documents.reduce((sum, d) => sum + d.size, 0);

    totalPhotos += photosCount;
    totalPanoramas += panoramasCount;
    totalDocuments += documentsCount;
    totalSize += objSize;

    console.log(`Объект ${obj.objectId}:`);
    console.log(`  📷 Фото: ${photosCount}`);
    console.log(`  🌐 Панорамы: ${panoramasCount}`);
    console.log(`  📄 Документы: ${documentsCount}`);
    console.log(`  💾 Размер: ${(objSize / 1024 / 1024).toFixed(2)} MB`);
    
    if (panoramasCount > 0) {
      console.log(`  Примеры панорам:`);
      obj.panoramas.slice(0, 3).forEach(p => {
        console.log(`    - ${p.filename} (${(p.size / 1024).toFixed(2)} KB)`);
      });
    }
    
    if (photosCount > 0) {
      console.log(`  Примеры фото:`);
      obj.photos.slice(0, 3).forEach(p => {
        console.log(`    - ${p.filename} (${(p.size / 1024).toFixed(2)} KB)`);
      });
    }
    
    console.log('');
  }

  console.log('═══════════════════════════════════════');
  console.log(`Итого:`);
  console.log(`  📷 Фото: ${totalPhotos}`);
  console.log(`  🌐 Панорамы: ${totalPanoramas}`);
  console.log(`  📄 Документы: ${totalDocuments}`);
  console.log(`  💾 Общий размер: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log('═══════════════════════════════════════\n');

  // Сохраняем результаты в JSON для дальнейшего использования
  const outputFile = '/tmp/scanned_files.json';
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`✅ Результаты сохранены в: ${outputFile}`);
  console.log('\n💡 Следующий шаг: создать объекты в БД и привязать файлы');
}

main().catch(console.error);



