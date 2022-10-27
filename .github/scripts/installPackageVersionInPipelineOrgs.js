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
  const secrets = JSON.parse(process.argv[2]);
  const pipelineName = process.argv[3];
  const packageConfig = getPackageConfig();
  const installationPipelinesConfig = getInstallationPipelinesConfig();
  const packageVersions = getPackageVersions();
  const latestPackageVersion = packageVersions[packageVersions.length - 1];
  const latestReleastPackageVersion = [...packageVersions]
    .reverse()
    .find((packageVersion) => packageVersion.IsReleased);
  const packageVersionInstallations = getPackageVersionInstallations();
  console.log("packageVersionInstallations", packageVersionInstallations);

  const pipelineToExecute = getPipeline(
    pipelineName,
    installationPipelinesConfig
  );

  for (let org of pipelineToExecute.orgs) {
    console.log(`##### Org - ${org.name}`);
    const packageVersionToInstall =
      org.versionToInstall === "LATEST"
        ? latestPackageVersion
        : latestReleastPackageVersion;
    if (!packageVersionToInstall) {
      const errorMessage = `No ${
        org.versionToInstall === "LATESTRELEASED" ? "released" : ""
      }Version could be found - Skipping Installation`;
      console.error(`# Error - ${errorMessage}`);
      documentInstallation({
        packageVersionInstallations,
        installedPackageVersion: packageVersionToInstall,
        org,
        isSuccess: false,
        errorMessage
      });
      console.log(`#####`);
      continue;
    }
    console.log(
      `# Package Version - ${packageVersionToInstall.Version} (${packageVersionToInstall.SubscriberPackageVersionId})`
    );
    const authUrl = getAuthUrl(secrets, org);
    if (!authUrl) {
      const errorMessage = `No Auth URL could be found`;
      console.error(`# Error - ${errorMessage}`);
      documentInstallation({
        packageVersionInstallations,
        installedPackageVersion: packageVersionToInstall,
        org,
        isSuccess: false,
        errorMessage
      });
      console.log(`#####`);
      continue;
    }
    let result = saveAuthUrl(authUrl);
    if (!result.isSuccess) {
      documentInstallation({
        packageVersionInstallations,
        installedPackageVersion: packageVersionToInstall,
        org,
        isSuccess: false,
        errorMessage: result.errorMessage
      });
      console.log(`#####`);
      continue;
    }
    result = await connectToOrg();
    if (!result.isSuccess) {
      documentInstallation({
        packageVersionInstallations,
        installedPackageVersion: packageVersionToInstall,
        org,
        isSuccess: false,
        errorMessage: result.errorMessage
      });
      console.log(`#####`);
      continue;
    }
    result = await installPackageVersion(
      packageConfig,
      packageVersionToInstall,
      org
    );
    if (!result.isSuccess) {
      documentInstallation({
        packageVersionInstallations,
        installedPackageVersion: packageVersionToInstall,
        org,
        isSuccess: false,
        errorMessage: result.errorMessage
      });
      console.log(`#####`);
      continue;
    }
    documentInstallation({
      packageVersionInstallations,
      installedPackageVersion: packageVersionToInstall,
      org,
      isSuccess: true
    });
    console.log(`#####`);
  }
  saveInstallationsFile(packageVersionInstallations);
  console.log(`##########\n`);
})();

function getPipeline(pipelineName, installationPipelinesConfig) {
  console.log(`########## Pipeline - ${pipelineName}`);
  const pipelineToExecute = installationPipelinesConfig.pipelines.find(
    (pipeline) => pipeline.name === pipelineName
  );
  if (!pipelineToExecute) {
    throw new Error(
      `# Error - Pipeline "${pipelineName}" could not be found in sfdx-installation-pipelines.json`
    );
  }
  return pipelineToExecute;
}

function getAuthUrl(secrets, org) {
  const authUrl = secrets[org.sfdxAuthUrlSecret];
  console.log(
    `# AuthUrl ${authUrl ? "found" : "not found - Skipping Installation"}`
  );
  return authUrl;
}

function saveAuthUrl(authUrl) {
  let result = { isSuccess: true };
  fs.writeFile("./TARGET_ORG_AUTH_URL.txt", authUrl, (error) => {
    if (error) {
      result.isSuccess = false;
      result.errorMessage = `AuthUrl could not be saved - ${error} - Skipping Installation`;
      console.error(`# Error - ${result.errorMessage}`);
    }
  });
  return result;
}

async function connectToOrg() {
  let result = { isSuccess: true };
  const orgConnectCommand = `sfdx auth:sfdxurl:store -f ./TARGET_ORG_AUTH_URL.txt --setalias targetorg --setdefaultusername --json`;
  console.log(`# Connecting to Target Org - ${orgConnectCommand}`);
  try {
    const orgConnectResponse = await execCommand(orgConnectCommand);
    console.log(`# ${JSON.stringify(orgConnectResponse)}`);
  } catch (e) {
    result.isSuccess = false;
    result.errorMessage = `Could not connect to Org - ${e.message} - Skipping Installation`;
    console.error(`# Error - ${result.errorMessage}`);
    //console.error("Details:", JSON.stringify(e));
  }
  return result;
}

async function installPackageVersion(
  packageConfig,
  packageVersionToInstall,
  org
) {
  let result = { isSuccess: true };
  const installationKey = packageConfig.password;
  const packageInstallCommand = `sfdx force:package:install --package ${packageVersionToInstall.SubscriberPackageVersionId} --installationkey ${installationKey} --securitytype ${org.securityType} --upgradetype ${org.upgradeType} --apexcompile ${org.apexCompile} --noprompt --wait 10 --json`;
  console.log(`# ${packageInstallCommand}`);
  try {
    const packageInstallResponse = await execCommand(packageInstallCommand);
    console.log(`# ${JSON.stringify(packageInstallResponse)}`);
  } catch (e) {
    result.isSuccess = false;
    result.errorMessage = `Could not install Package - ${e.message}`;
    console.error(`# Error - ${result.errorMessage}`);
    //console.error("Details:", JSON.stringify(e));
  }
  return result;
}

function documentInstallation({
  packageVersionInstallations,
  installedPackageVersion,
  org,
  isSuccess = true,
  errorMessage
}) {
  const today = new Date().toISOString().slice(0, 10);
  const packageVersionInstallation = {
    isSuccess,
    date: today,
    subscriberPackageVersionId:
      installedPackageVersion?.SubscriberPackageVersionId,
    packageVersionName: installedPackageVersion?.Name,
    pakageVersion: installedPackageVersion?.Version,
    errorMessage
  };
  packageVersionInstallations.orgs = packageVersionInstallations.orgs || {};
  packageVersionInstallations.orgs[org.name] = packageVersionInstallations.orgs[
    org.name
  ] || { installations: [] };
  packageVersionInstallations.orgs[org.name].installations.push(
    packageVersionInstallation
  );
}

function saveInstallationsFile(packageVersionInstallations) {
  fs.writeFile(
    "./sfdx-package-version-installations.json",
    JSON.stringify(packageVersionInstallations, null, 4),
    (error) => {
      if (error) {
        console.error(
          `# Error - Installation could not be documented - ${error}`
        );
      }
    }
  );
}
