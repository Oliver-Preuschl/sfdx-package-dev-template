/*
 * Copyright 2022 Oliver Preuschl
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

const { execCommand } = require("../libs/sfdxExecutor.js");
const fs = require("fs");
const {
  getPackageConfig,
  getInstallationPipelinesConfig,
  getPackageVersions,
  getPackageVersionInstallations
} = require("../libs/configProvider.js");

(async function () {
  //console.log(process.argv[2]);
  const secrets = JSON.parse(process.argv[2]);
  const pipelineName = process.argv[3];
  const packageConfig = getPackageConfig();
  const installationPipelinesConfig = getInstallationPipelinesConfig();
  const packageVersions = getPackageVersions();
  const latestPackageVersion = packageVersions[getPackageVersions.length];
  const packageVersionInstallations = getPackageVersionInstallations();
  //console.log(installationPipelinesConfig);

  console.log(`########## Pipeline ${pipelineName}`);
  const pipelineToExecute = installationPipelinesConfig.pipelines.find(
    (pipeline) => pipeline.name === pipelineName
  );
  if (pipelineToExecute) {
    const today = new Date().toISOString().slice(0, 10);
    for (let org of pipelineToExecute.orgs) {
      console.log(`##### Org - ${org.name}`);
      const authUrl = secrets[org.sfdxAuthUrlSecret];
      console.log(`# AuthUrl ${authUrl ? "found" : "not found"}`);
      fs.writeFile("./TARGET_ORG_AUTH_URL.txt", authUrl, (error) => {
        if (error) {
          console.error(`# ${error}`);
        }
      });
      const orgConnectCommand = `sfdx auth:sfdxurl:store -f ./TARGET_ORG_AUTH_URL.txt --setalias targetorg --setdefaultusername --json`;
      console.log(`# Connecting to Target Org - ${orgConnectCommand}`);
      const orgConnectResponse = await execCommand(orgConnectCommand);
      console.log(`# ${JSON.stringify(orgConnectResponse)}`);
      const installationKey = packageConfig.password;
      const packageInstallCommand = `sfdx force:package:install --package ${latestPackageVersion.SubscriberPackageVersionId} --installationkey ${installationKey} --securitytype ${org.securityType} --upgradetype ${org.upgradeType} --apexcompile ${org.apexCompile} --noprompt --wait 10 --json`;
      console.log(`# ${packageInstallCommand}`);
      const packageInstallResponse = await execCommand(packageInstallCommand);
      console.log(`# ${JSON.stringify(packageInstallResponse)}`);
      const packageVersionInstallation = {
        success: true,
        date: today,
        subscriberPackageVersionId:
          latestPackageVersion.SubscriberPackageVersionId,
        packageVersionName: latestPackageVersion.Name,
        pakageVersion: latestPackageVersion.Version
      };
      packageVersionInstallations.orgs = packageVersionInstallations.orgs || {};
      packageVersionInstallations.orgs[org.name] = packageVersionInstallations
        .orgs[org.name] || { installations: [] };
      packageVersionInstallations.orgs[org.name].installations.push(
        packageVersionInstallation
      );
      fs.writeFile(
        "./sfdx-package-version-installations.json",
        JSON.stringify(packageVersionInstallations, null, 4),
        (error) => {
          if (error) {
            console.error(error);
          }
        }
      );
      console.log(`#####`);
    }
  } else {
    console.error(
      `# Error - Pipeline "${pipelineName}" could not be found in sfdx-installation-pipelines.json`
    );
  }
  console.log(`##########\n`);
})();
