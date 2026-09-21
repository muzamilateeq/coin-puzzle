export class AssetLoader {
  static async loadAll(assets, progressCallback) {
    let loadedCount = 0;
    const totalAssets = assets.length;

    if (totalAssets === 0) {
      if (progressCallback) progressCallback(100);
      return Promise.resolve();
    }

    const promises = assets.map(src => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          loadedCount++;
          if (progressCallback) {
            progressCallback(Math.floor((loadedCount / totalAssets) * 100));
          }
          resolve(img);
        };
        img.onerror = () => {
          console.error(`Failed to load asset: ${src}`);
          // Still resolve so one missing asset doesn't break the whole game
          loadedCount++;
          if (progressCallback) {
            progressCallback(Math.floor((loadedCount / totalAssets) * 100));
          }
          resolve(null);
        };
        img.src = src;
      });
    });

    await Promise.all(promises);
  }
}
