import {Rule, Tree, SchematicsException} from '@angular-devkit/schematics';

import {Schema} from '../schema';
import * as messages from '../messages';
import {getProjectTargetOptions} from '../../utils/project';
import {getWorkspace, updateWorkspace} from '@schematics/angular/utility/workspace';
import {workspaces, JsonArray} from '@angular-devkit/core';
const SB_STYLE_CSS_FILEPATH = [
  './node_modules/videojs-http-source-selector/dist/videojs-http-source-selector.css',
  './node_modules/@project-sunbird/sunbird-video-player-v9/lib/assets/videojs.markers.min.css',
  './node_modules/video.js/dist/video-js.min.css',
  './node_modules/@project-sunbird/sb-styles/assets/_styles.scss',
];

const SB_SCRIPT_FILEPATH = [
  'node_modules/videojs-http-source-selector/dist/videojs-http-source-selector.min.js',
  'node_modules/videojs-contrib-quality-levels/dist/videojs-contrib-quality-levels.min.js',
  'node_modules/@project-sunbird/sunbird-video-player-v9/lib/assets/videojs-markers.js',
  'node_modules/video.js/dist/video.js',
  'node_modules/jquery/dist/jquery.min.js',

];
const SB_STYLE_ASSETS = {
  glob: '**/*.*',
  input: './node_modules/@project-sunbird/sunbird-video-player-v9/lib/assets/',
  output: '/assets/'
};
/**
 * we're simply adding '_styles.scss' to the 'angular.json'
 */
export function addSunbirdVideoPlayerStyles(options: Schema): Rule {
  return async (host: Tree) => {
    const workspace: any = await getWorkspace(host);

    const projectName = options.project || (workspace.extensions.defaultProject as string);
    const project = workspace.projects.get(projectName);
    if (!project) {
      throw new SchematicsException(messages.noProject(projectName));
    }
    // just patching 'angular.json'
    return addStyleToAngularJson(workspace, project, host);
  };
}

/**
 * Patches 'angular.json' to add '_styles.scss' styles
 */
function addStyleToAngularJson(
    workspace: any, project: workspaces.ProjectDefinition, host: Tree): Rule {
  const targetOptions = getProjectTargetOptions(project, 'build');
  const styles = (targetOptions.styles as JsonArray | undefined);
  for (const PATH of SB_STYLE_CSS_FILEPATH) {
    if (!styles) {
      targetOptions.styles = [PATH];
    } else {
      const existingStyles: any = styles.map((s: any) => typeof s === 'string' ? s : s.input);
      for (const[, stylePath] of existingStyles.entries()) {
        // If the given asset is already specified in the styles, we don't need to do anything.
        if (stylePath === PATH) {
          return () => host;
        }
      }
      styles.unshift(PATH);
    }
  }

  const scripts = (targetOptions.scripts as JsonArray | undefined);

  for (const PATH of SB_SCRIPT_FILEPATH) {
    if (!scripts) {
      targetOptions.scripts = [PATH];
    } else {
      const existingSripts: any = scripts.map((s: any) => typeof s === 'string' ? s : s.input);
      for (const[, scriptPath] of existingSripts.entries()) {
        // If the given asset is already specified in the scripts, we don't need to do anything.
        if (scriptPath === PATH) {
          return () => host;
        }
      }
      scripts.unshift(PATH);
    }
  }

  const assets = (targetOptions.assets as JsonArray | undefined);
  if (!assets) {
    targetOptions.assets = [SB_STYLE_ASSETS];
  } else {
    const existingAssets: any = assets.map((a: any) => typeof a === 'string' ? a : a.input);
    for (const[, assestPath] of existingAssets.entries()) {
      // If the given asset is already specified in the assets, we don't need to do anything.
      if (assestPath === SB_STYLE_ASSETS.input) {
        return () => host;
      }
    }
    assets.unshift(SB_STYLE_ASSETS);
  }

  return updateWorkspace(workspace) as unknown as Rule;
}
