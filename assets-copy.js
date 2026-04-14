const fs = require('fs-extra');
(async () => {
    try {
            var source = "projects/sunbird-video-player/node_modules/@project-sunbird/sunbird-player-sdk-v9/lib/assets";
                const dest = "dist/sunbird-video-player/lib/assets/";
                const isAssetsExists = await fs.pathExists(dest)
                var libsource = "projects/sunbird-video-player/src/lib/assets";
                if (isAssetsExists) {
                        await fs.remove(dest);
                }
                await fs.ensureDir(dest);
                const isSdkAssetsExists = await fs.pathExists(source);
                if (isSdkAssetsExists) {
                    await fs.copy(source, dest);
                }
                await fs.copy(libsource, dest)
        console.log('Assets copied successfully')
    } catch (err) {
        console.error("Error while copying assets", err)
    }
})();