/*
 * Copyright 2021 Oliver Preuschl
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

const util = require("util");
const exec = util.promisify(require("child_process").exec);

const execCommand = async (command) => {
  return new Promise((resolve, reject) => {
    exec(command, function (error, stdout, stderr) {
      if (!error) {
        resolve(JSON.parse(stdout));
      } else {
        reject(error + ", " + stdout + ", " + stderr);
      }
    });
  });
};

exports.execCommand = execCommand;
