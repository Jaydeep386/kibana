/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fsp from 'fs/promises';

import { run } from '../../lib/spawn.mjs';
import { isFile } from '../../lib/fs.mjs';

async function isElasticCommitter() {
  try {
    const email = await run('git', ['config', 'user.email']);
    return email.trim().endsWith('@elastic.co');
  } catch {
    return false;
  }
}

/**
 *
 * @param {string} settingsPath
 * @returns
 */
async function upToDate(settingsPath) {
  if (!(await isFile(settingsPath))) {
    return false;
  }

  const readSettingsFile = await Fsp.readFile(settingsPath, 'utf8');
  return readSettingsFile.startsWith('# V2 ');
}

/**
 * @param {import('@kbn/some-dev-log').SomeDevLog} log
 */
export async function setupRemoteCache(log) {
  // The remote cache is only for Elastic employees working locally (CI cache settings are handled elsewhere)
  if (
    process.env.FORCE_BOOTSTRAP_REMOTE_CACHE !== 'true' &&
    (process.env.CI || !(await isElasticCommitter()))
  ) {
    return;
  }

  log.debug(`setting up remote cache settings if necessary`);

  // Checks if we should upgrade or install the config file
  if (await upToDate(settingsPath)) {
    log.debug(`remote cache config already exists and is up-to-date, skipping`);
    return;
  }

  await Fsp.writeFile(settingsPath, contents);
  log.info(`remote cache settings written to ${settingsPath}`);
}
