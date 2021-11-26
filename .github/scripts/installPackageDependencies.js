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

const { getPackageConfig } = require("../libs/configProvider.js");
const { execCommand } = require("../libs/sfdxExecutor.js");

(async function () {
  const userName = process.argv[2];

  const packageConfig = getPackageConfig();
  const dependencies = packageConfig.dependencies || [];

  let numberOfPackages = 0;
  for (let dependency of dependencies) {
    if (dependency.package === "sample-package-name") {
      console.log(
        'Skipping installation of sample package ("sample-package-name")'
      );
      continue;
    }
    numberOfPackages++;
    console.log(
      "--------------------------------------------------------------------"
    );
    console.log(
      `${numberOfPackages} - Installing package - "${dependency.package}" - VersionId: "${dependency.versionId}"`
    );
    let installationResponse;
    try {
      if (dependency.password) {
        installationResponse = await execCommand(
          `sfdx force:package:install -u ${userName} --package ${dependency.versionId} --installationkey ${dependency.password} --json --wait 10 --publishwait 10`
        );
      } else {
        installationResponse = await execCommand(
          `sfdx force:package:install -u ${userName} --package ${dependency.versionId} --json --wait 10 --publishwait 10`
        );
      }
      console.log(
        `${numberOfPackages} - Package installed - "${dependency.package}"  - VersionId: "${dependency.versionId}"`
      );
    } catch (e) {
      console.log(e);
    }
  }
  if (numberOfPackages === 0) {
    console.log("-----------------------------");
    console.log("No package dependencies found");
  }
})();
