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
  const packageConfig = getPackageConfig();
  let subscriberPackageVersionIdsWithNames = [];
  for (let dependency of packageConfig.dependencies) {
    console.log(
      `\n------------------------------------------------------------\n------------------------------------------------------------`
    );
    //console.log(dependency);
    if (dependency.package === "sample-package-name") {
      continue;
    }
    if (dependency.versionNumber) {
      var packageVersionRexExp = new RegExp(
        "(\\d|LATEST|LATESTRELEASED)(?:\\.(\\d|LATEST|LATESTRELEASED))?(?:\\.(\\d|LATEST|LATESTRELEASED))?(?:\\.(\\d|LATEST|LATESTRELEASED))?",
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
      const dependentSubscriberPackageVersionIdsWithNames =
        await getPackageDependencies(
          subscriberPackageVersionId,
          dependency.package,
          dependency.password,
          dependency.useSamePasswordForDependencies,
          packageConfig
        );
      console.log(
        `------------------------------------------------------------`
      );
      console.log(
        "dependentSubscriberPackageVersionIdsWithNames",
        dependentSubscriberPackageVersionIdsWithNames
      );
      subscriberPackageVersionIdsWithNames = [
        ...subscriberPackageVersionIdsWithNames,
        ...dependentSubscriberPackageVersionIdsWithNames
      ];
    }
    console.log(
      `------------------------------------------------------------\n------------------------------------------------------------\n`
    );
  }
  let packageVersions = await getSortedPackageVersions(
    subscriberPackageVersionIdsWithNames
  );
  console.log(`------------------------------------------------------------`);
  console.log("packageVersions", packageVersions);
  console.log(
    `------------------------------------------------------------\n------------------------------------------------------------\n`
  );
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
      versionCriterias.push(`MajorVersion = ${majorVersion}`);
      if (minorVersion && minorVersion !== "LATEST") {
        versionCriterias.push(`MinorVersion = ${minorVersion}`);
        if (patchVersion && patchVersion !== "LATEST") {
          versionCriterias.push(`pPatchVersion = ${patchVersion}`);
          if (buildNumber && buildNumber !== "LATEST") {
            versionCriterias.push(`BuildNumber = ${buildNumber}`);
          } else if (buildNumber !== "LATESTRELEASED") {
            versionCriterias.push(`IsReleased = true`);
          }
        } else if (patchVersion !== "LATESTRELEASED") {
          versionCriterias.push(`IsReleased = true`);
        }
      } else if (minorVersion !== "LATESTRELEASED") {
        versionCriterias.push(`IsReleased = true`);
      }
    } else if (majorVersion !== "LATESTRELEASED") {
      versionCriterias.push(`IsReleased = true`);
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
  packageName,
  password,
  useSamePasswordForDependencies,
  packageConfig,
  depth = 0
) {
  console.log(
    `${" ".repeat(
      depth
    )}- getPackageDependencies(${subscriberPackageVersionId})`
  );
  let subscriberPackageVersionIdsWithNamesToReturn = [];
  let installationKeyCriteria = "";
  if (depth === 0) {
    installationKeyCriteria = ` AND (InstallationKey='${password}')`;
  }
  if (depth > 0 && useSamePasswordForDependencies) {
    installationKeyCriteria = ` AND (InstallationKey='${password}')`;
  }
  if (
    packageConfig?.packageVersionPasswords &&
    packageConfig?.packageVersionPasswords[packageName]
  ) {
    installationKeyCriteria = ` AND (InstallationKey='${packageConfig.packageVersionPasswords[packageName]}')`;
  }
  const command = `sfdx force:data:soql:query --targetusername=devhub.op@hundw.com --usetoolingapi --query="SELECT Dependencies FROM SubscriberPackageVersion WHERE (Id='${subscriberPackageVersionId}') ${installationKeyCriteria}" --json`;
  //console.log("command", command);
  try {
    const subscriberPackageVersion = await execCommand(command);
    let dependencies = subscriberPackageVersion.result.records[0].Dependencies;
    console.log(`${" ".repeat(depth)} => Dependencies`, dependencies || " - ");
    if (dependencies?.ids) {
      let subscriberPackageVersionIds = dependencies.ids.map(
        (dependency) => dependency.subscriberPackageVersionId
      );
      let subscriberPackageVersionId2PackageName =
        await getPackageNamesForPackageSubscriberPackageVersionIds(
          subscriberPackageVersionIds
        );
      console.log(
        `${" ".repeat(depth)} => subscriberPackageVersionId2PackageName`,
        subscriberPackageVersionId2PackageName
      );
      const subscriberpackageVersionIdsWithName =
        subscriberPackageVersionIds.map((subscriberPackageVersionId) => ({
          subscriberPackageVersionId: subscriberPackageVersionId,
          packageName: subscriberPackageVersionId2PackageName.get(
            subscriberPackageVersionId
          )
        }));
      for (let dependencySubscriberPackageVersionIdWithName of subscriberpackageVersionIdsWithName) {
        subscriberPackageVersionIdsWithNamesToReturn.push(
          dependencySubscriberPackageVersionIdWithName
        );
        let packageName =
          dependencySubscriberPackageVersionIdWithName.packageName;
        const subscriberPackageVersionIdsWithNamesToAdd =
          await getPackageDependencies(
            dependencySubscriberPackageVersionIdWithName.subscriberPackageVersionId,
            packageName,
            password,
            useSamePasswordForDependencies,
            packageConfig,
            depth + 1
          );
        subscriberPackageVersionIdsWithNamesToReturn = [
          ...subscriberPackageVersionIdsWithNamesToAdd,
          ...subscriberPackageVersionIdsWithNamesToReturn
        ];
      }
    }
    subscriberPackageVersionIdsWithNamesToReturn = [
      ...subscriberPackageVersionIdsWithNamesToReturn,
      { subscriberPackageVersionId, packageName }
    ];
  } catch (e) {
    console.log(`${" ".repeat(depth)} - Error: ${e.message}`);
  }
  return subscriberPackageVersionIdsWithNamesToReturn;
}

async function getPackageNamesForPackageSubscriberPackageVersionIds(
  subscriberPackageVersionIds
) {
  console.log(
    `- getPackageNamesForPackageSubscriberPackageVersionIds(${subscriberPackageVersionIds})`
  );
  const subscriberPackageVersionIdsString =
    "('" + subscriberPackageVersionIds.join("','") + "')";
  const command = `sfdx force:data:soql:query --targetusername=devhub.op@hundw.com --usetoolingapi --query="SELECT SubscriberPackageVersionId, Package2Id, Package2.Name FROM Package2Version WHERE SubscriberPackageVersionId IN ${subscriberPackageVersionIdsString} ORDER BY Package2.Name DESC" --json`;
  const packageVersionsResponse = await execCommand(command);
  return new Map(
    packageVersionsResponse.result.records.map((package2Version) => [
      package2Version.SubscriberPackageVersionId,
      package2Version.Package2.Name
    ])
  );
}

async function getSortedPackageVersions(subscriberPackageVersionIdsWithNames) {
  console.log(
    `- getSortedPackageVersions(${subscriberPackageVersionIdsWithNames})`
  );
  const subscriberPackageVersionIdsString =
    "('" +
    subscriberPackageVersionIdsWithNames
      .map(
        (subscriberPackageVersionIdWithName) =>
          subscriberPackageVersionIdWithName.subscriberPackageVersionId
      )
      .join("','") +
    "')";
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
  const sortedPackageNames = subscriberPackageVersionIdsWithNames.reduce(
    (sortedPackageNames, subscriberPackageVersionIdWithName) => {
      if (
        !sortedPackageNames.includes(
          subscriberPackageVersionIdWithName.packageName
        )
      ) {
        return [
          ...sortedPackageNames,
          subscriberPackageVersionIdWithName.packageName
        ];
      } else {
        return sortedPackageNames;
      }
    },
    []
  );
  console.log(`-  sortedPackageNames`, sortedPackageNames);
  let packageVersions = Array.from(packageId2PackageVersion.values());
  packageVersions.sort((packageVersion1, packageVersion2) => {
    if (
      sortedPackageNames.indexOf(packageVersion1.Package2.Name) <
      sortedPackageNames.indexOf(packageVersion2.Package2.Name)
    ) {
      return -1;
    } else if (
      sortedPackageNames.indexOf(packageVersion1.Package2.Name) >
      sortedPackageNames.indexOf(packageVersion2.Package2.Name)
    ) {
      return 1;
    } else {
      return 0;
    }
  });
  return packageVersions;
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
