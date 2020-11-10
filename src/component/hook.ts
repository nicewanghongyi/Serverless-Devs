/** @format */

const fs = require('fs');
const path = require('path');
const util = require('util');
const i18n = require('../utils/i18n');

import {PluginExeCute} from '../plugin';
import * as logger from '../utils/logger';

const exec = util.promisify(require('child_process').exec);

export interface HookConfig {
  Pre: boolean;
  Plugin?: string;
  Hook?: string;
  Path?: string;
}
export class Hook {
  preHooks: HookConfig[] = [];
  afterHooks: HookConfig[] = [];
  constructor(extendsParams: HookConfig[] = []) {
    extendsParams.forEach((_extend: HookConfig) => {
      if (_extend.Pre) {
        this.preHooks.push(_extend);
      } else {
        this.afterHooks.push(_extend);
      }
    });
  }

  async executePreHook() {
    if (this.preHooks.length > 0) {
      logger.info(i18n.__('Start the pre-hook'));
      for (let i = 0; i < this.preHooks.length; i++) {
        logger.info(`[Hook / Plugin] ${this.preHooks[i].Hook || this.preHooks[i].Plugin}`);
        try {
          await this.executeByConfig(this.preHooks[i]);
        } catch (ex) {
          logger.error(`[Hook / Plugin] [Error]: ${ex.stdout || ex.stderr}`);
        }
      }
      logger.info(i18n.__('End the pre-hook'));
    }
  }

  async executeAfterHook() {
    if (this.afterHooks.length > 0) {
      logger.info(i18n.__('Start the after-hook'));

      // 2020-9-23 修复afterHooks无法处理的bug
      for (let i = 0; i < this.afterHooks.length; i++) {
        logger.info(`[Hook / Plugin] ${this.afterHooks[i].Hook || this.afterHooks[i].Plugin}`);
        try {
          await this.executeByConfig(this.afterHooks[i]);
        } catch (ex) {
          logger.error(`[Hook / Plugin] [Error]: ${ex.stdout || ex.stderr}`);
        }
      }
      logger.info(i18n.__('End the after-hook'));
    }
  }
  async commandExecute(command: string, executePath: string | undefined) {
    const currentDir = process.cwd();
    const cwdPath = executePath ? path.resolve(currentDir, executePath) : currentDir;
    if (fs.existsSync(cwdPath) && fs.lstatSync(cwdPath).isDirectory()) {
      process.env['next-command-execute-flag'] = 'true';
      logger.info(i18n.__('Executing ...'));
      const {stdout, stderr} = await exec(command, {cwd: cwdPath});
      if (stderr) {
        logger.error(i18n.__('Execute:'), stderr);
      } else {
        logger.info(i18n.__('Execute:'), stdout);
      }
    }
  }

  async pluginExecute(name: string) {
    const pluginInstance = new PluginExeCute({name});
    await pluginInstance.init();
    const pluginModule = await pluginInstance.loadPlugin();
    pluginModule.apply(null, []);
  }

  async executeByConfig(hookConfig: HookConfig) {
    if (hookConfig.Hook) {
      await this.commandExecute(hookConfig.Hook, hookConfig.Path);
    } else if (hookConfig.Plugin) {
      await this.pluginExecute(hookConfig.Plugin);
    }
  }
}
