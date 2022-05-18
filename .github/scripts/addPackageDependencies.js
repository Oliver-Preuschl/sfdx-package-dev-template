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

const fs = require("fs");
const { execCommand } = require("../libs/sfdxExecutor.js");
const { getPackageConfig } = require("../libs/configProvider.js");

(async function () {
  console.log(`\n------------------------------------------------------------`);
  const packageConfig = getPackageConfig();
  for (let dependency of packageConfig.dependencies) {
    //console.log(dependency);
    if (dependency.package === "sample-package-name") {
      continue;
    }
    if (dependency.versionNumber) {
      var packageVersionRexExp = new RegExp(
        "(\\d|LATEST)(?:\\.(\\d|LATEST))?(?:\\.(\\d|LATEST))?(?:\\.(\\d|LATEST))?",
        "g"
      );
      const match = packageVersionRexExp.exec(dependency.versionNumber);
      const subscriberPackageVersionId = await getSubscriberPackageVersionId(
        dependency.package,
        match[1],
        match[2],
        match[3],
        match[4]
      );
      const dependencyIds = await getPackageDependencies(
        subscriberPackageVersionId,
        dependency.dependencyPassword
      );
      console.log(
        `------------------------------------------------------------`
      );
      console.log("dependencyIds", dependencyIds);
      let packageId2PackageVersion = await getPackageVersionNames(
        dependencyIds
      );
      console.log(
        `------------------------------------------------------------`
      );
      console.log("packageId2PackageVersion", packageId2PackageVersion);
    }
  }
  console.log(`------------------------------------------------------------\n`);
})();

async function getSubscriberPackageVersionId(
  packageName,
  majorVersion,
  minorVersion,
  patchVersion,
  buildNumber
) {
  try {
    console.log(
      `- getSubscriberPackageVersionId(${packageName}, ${majorVersion}, ${minorVersion}, ${patchVersion}, ${buildNumber})`
    );
    if (!majorVersion) {
      return {};
    }
    let versionCriterias = [];
    if (majorVersion && majorVersion !== "LATEST") {
      versionCriterias.push(`majorVersion = ${majorVersion}`);
    }
    if (minorVersion && minorVersion !== "LATEST") {
      versionCriterias.push(`minorVersion = ${minorVersion}`);
    }
    if (patchVersion && patchVersion !== "LATEST") {
      versionCriterias.push(`patchVersion = ${patchVersion}`);
    }
    if (buildNumber && buildNumber !== "LATEST") {
      versionCriterias.push(`buildNumber = ${buildNumber}`);
    }
    let versionCriteriaString = "";
    if (versionCriterias.length > 0) {
      versionCriteriaString = ` AND ${versionCriterias.join(" AND ")}`;
    }
    const command = `sfdx force:data:soql:query --targetusername=devhub.op@hundw.com --usetoolingapi --query="SELECT SubscriberPackageVersionId, MajorVersion, MinorVersion, PatchVersion, BuildNumber FROM Package2Version WHERE Package2.Name = '${packageName}' ${versionCriteriaString} ORDER BY MajorVersion DESC, MinorVersion DESC, PatchVersion DESC, BuildNumber DESC LIMIT 1" --json`;
    //console.log("command", command);
    const packageVersion = await execCommand(command);
    //console.log("packageVersions", JSON.stringify(packageVersion));
    let subscriberPackageVersionId =
      packageVersion.result.records[0].SubscriberPackageVersionId;
    console.log(" => SubscriberPackageVersionId", subscriberPackageVersionId);
    return subscriberPackageVersionId;
  } catch (e) {
    console.log(` - Error: ${e.message}`);
  }
}

async function getPackageDependencies(
  subscriberPackageVersionId,
  dependencyPassword
) {
  console.log(`- getPackageDependencies(${subscriberPackageVersionId})`);
  let subscriberPackageVersionIdsToReturn = [];
  let installationKeyCriteria = "";
  if (dependencyPassword) {
    installationKeyCriteria = ` AND (InstallationKey='${dependencyPassword}')`;
  }
  const command = `sfdx force:data:soql:query --targetusername=devhub.op@hundw.com --usetoolingapi --query="SELECT Dependencies FROM SubscriberPackageVersion WHERE (Id='${subscriberPackageVersionId}') ${installationKeyCriteria}" --json`;
  //console.log("command", command);
  try {
    const subscriberPackageVersion = await execCommand(command);
    let dependencies = subscriberPackageVersion.result.records[0].Dependencies;
    console.log(" => Dependencies", dependencies || " - ");
    if (dependencies?.ids) {
      for (let dependency of dependencies.ids) {
        subscriberPackageVersionIdsToReturn.push(
          dependency.subscriberPackageVersionId
        );
        subscriberPackageVersionIdsToReturn = [
          ...subscriberPackageVersionIdsToReturn,
          ...(await getPackageDependencies(
            dependency.subscriberPackageVersionId,
            dependencyPassword
          ))
        ];
      }
    }
  } catch (e) {
    console.log(` - Error: ${e.message}`);
  }
  return subscriberPackageVersionIdsToReturn;
}

async function getPackageVersionNames(subscriberPackageVersionIds) {
  console.log(`- getPackageVersionNames(${subscriberPackageVersionIds})`);
  const subscriberPackageVersionIdsString =
    "('" + subscriberPackageVersionIds.join("','") + "')";
  const command = `sfdx force:data:soql:query --targetusername=devhub.op@hundw.com --usetoolingapi --query="SELECT SubscriberPackageVersionId, Package2Id, Package2.Name, Name, MajorVersion, MinorVersion, PatchVersion, BuildNumber FROM Package2Version WHERE SubscriberPackageVersionId IN ${subscriberPackageVersionIdsString} ORDER BY Package2.Name DESC" --json`;
  //console.log("command", command);
  const packageVersionsResponse = await execCommand(command);
  let packageId2PackageVersion = new Map();
  packageVersionsResponse.result.records.forEach((package2Version1) => {
    if (
      !packageId2PackageVersion.has(package2Version1.Package2Id) ||
      (packageId2PackageVersion.has(package2Version1.Package2Id) &&
        isVersionGreater(
          package2Version1,
          packageId2PackageVersion.get(package2Version1.Package2Id)
        ))
    ) {
      packageId2PackageVersion.set(
        package2Version1.Package2Id,
        package2Version1
      );
    }
  });
  return packageId2PackageVersion;
}

function isVersionGreater(package2Version1, package2Version2) {
  return (
    package2Version1.MajorVersion > package2Version2.MajorVersion ||
    (package2Version1.MajorVersion === package2Version2.MajorVersion &&
      package2Version1.MinorVersion > package2Version2.MinorVersion) ||
    (package2Version1.MajorVersion === package2Version2.MajorVersion &&
      package2Version1.MinorVersion === package2Version2.MinorVersion &&
      package2Version1.PatchVersion > package2Version2.PatchVersion) ||
    (package2Version1.MajorVersion === package2Version2.MajorVersion &&
      package2Version1.MinorVersion === package2Version2.MinorVersion &&
      package2Version1.PatchVersion === package2Version2.PatchVersion &&
      package2Version1.BuildNumber > package2Version2.BuildNumber)
  );
}
