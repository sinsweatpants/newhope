import * as functions from 'firebase-functions';
import admin from 'firebase-admin';
import * as diff from 'json-diff';

export const remoteConfigListener = functions.remoteConfig.onUpdate(async (versionMetadata) => {
  const { versionNumber } = versionMetadata;

  try {
    const project = admin.instanceId().app.options.projectId;
    const currentTemplate = await admin.remoteConfig().getTemplate();
    const previousTemplate = await admin.remoteConfig().getTemplateAtVersion(versionNumber - 1);

    console.log(`[${project}] New Remote Config template version: ${versionNumber}`);
    console.log(`[${project}] Current template ETag: ${currentTemplate.etag}`);
    console.log(`[${project}] Previous template ETag: ${previousTemplate.etag}`);

    const templateDiff = diff.diffString(previousTemplate, currentTemplate);
    console.log(`[${project}] Template diff: ${templateDiff}`);

  } catch (error) {
    console.error('Error fetching or comparing Remote Config templates:', error);
  }
});
