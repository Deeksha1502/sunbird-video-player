const fs = require("fs-extra");
const concat = require("concat");
const path = require("path");

const build = async () => {
  const files = [
    "./dist/video-player-wc/runtime.js",
    "./dist/video-player-wc/polyfills.js",
    "./dist/video-player-wc/scripts.js",
    "./dist/video-player-wc/vendor.js",
    "./dist/video-player-wc/main.js",
    "projects/sunbird-video-player/src/lib/assets/videojs-markers.js",
    "projects/sunbird-video-player/src/lib/assets/videojs-transcript-click.min.js"
  ];

  const cssFiles = [
    "./dist/video-player-wc/styles.css",
    "projects/sunbird-video-player/src/lib/assets/videojs.markers.min.css",
  ];

  const outputDir = "web-component/assets/video-player";
  const packageJsonSource = "web-component/package.json";

  // Backup package.json if it exists
  let packageJsonContent = null;
  if (await fs.pathExists(packageJsonSource)) {
    packageJsonContent = await fs.readJson(packageJsonSource);
  }

  // Clean and create directory
  await fs.remove("web-component");
  await fs.ensureDir(outputDir);

  // Copy all web component files to assets/video-player/
  await concat(files, `${outputDir}/sunbird-video-player.js`);
  await concat(cssFiles, `${outputDir}/styles.css`);

  // Ensure dist assets directory exists and copy from source
  await fs.ensureDir("./dist/video-player-wc/assets");
  await fs.copy("projects/sunbird-video-player/src/lib/assets", "./dist/video-player-wc/assets");

  // Copy assets contents to assets/video-player/
  if (await fs.pathExists("./dist/video-player-wc/assets")) {
    await fs.copy("./dist/video-player-wc/assets", outputDir);
  }

  // Remove the bundled asset files that were already concatenated
  const assetFilesToBeDeleted = [
    "videojs-markers.js",
    "videojs-transcript-click.min.js",
    "videojs.markers.min.css"
  ];

  for (const file of assetFilesToBeDeleted) {
    await fs.remove(`${outputDir}/${file}`);
  }

  // Copy README to web-component root
  await fs.copy("README.md", "web-component/README.md");

  // Restore package.json to both locations
  if (packageJsonContent) {
    // Keep package.json at web-component root
    await fs.writeJson(packageJsonSource, packageJsonContent, { spaces: 2 });
    console.log("✅ package.json restored to web-component/");

    // Also copy to assets/video-player directory
    await fs.writeJson(`${outputDir}/package.json`, packageJsonContent, { spaces: 2 });
    console.log("✅ package.json copied to web-component/assets/video-player/");
  }

  // Also copy to demo folder with same structure
  const demoDir = "web-component-demo/assets/video-player";
  await fs.remove("web-component-demo/assets");
  await fs.ensureDir(demoDir);
  await concat(files, `${demoDir}/sunbird-video-player.js`);
  await concat(cssFiles, `${demoDir}/styles.css`);

  // Copy assets to demo directory
  if (await fs.pathExists("./dist/video-player-wc/assets")) {
    await fs.copy("./dist/video-player-wc/assets", demoDir);
  }

  // Remove the bundled asset files from demo as well
  for (const file of assetFilesToBeDeleted) {
    await fs.remove(`${demoDir}/${file}`);
  }

  // Clean up old files from previous build structure (if they exist)
  await fs.remove("web-component-demo/sunbird-video-player.js");
  await fs.remove("web-component-demo/styles.css");

  console.log("✅ Files organized successfully!");
  console.log(`📁 Output: ${outputDir}/`);
};
build();
