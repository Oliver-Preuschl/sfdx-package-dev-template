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
const { DependencyResolver } = require("../libs/packageDependencyResolver.js");
const {
  getProjectConfig,
  getPackageConfig
} = require("../libs/configProvider.js");

(async function () {
  try {
    const projectConfig = getProjectConfig();
    const packageConfig = getPackageConfig();
    let subscriberPackageVersions = [];
    for (let dependency of packageConfig.dependencies) {
      dependency = normalizeDependency(dependency);
      if (dependency.packageName === "sample-package-name") {
        console.log("Skipping sample-package");
        continue;
      }
      if (dependency.versionNumber) {
        const dependencyResolver = new DependencyResolver({
          dependency,
          packageConfig
        });
        const dependencySubscriberPackageVersionIdsWithNames =
          await dependencyResolver.getDependencies();
        subscriberPackageVersions = [
          ...subscriberPackageVersions,
          ...dependencySubscriberPackageVersionIdsWithNames
        ];
      } else {
        console.log(
          "Adding ",
          dependency.packageName,
          dependency.subscriberPackageVersionId
        );
        subscriberPackageVersions = [
          ...subscriberPackageVersions,
          {
            packageName: dependency.packageName,
            subscriberPackageVersionId: dependency.subscriberPackageVersionId,
            password: dependency.password
          }
        ];
      }
    }
    let packageVersions = await getSortedPackageVersions(
      subscriberPackageVersions
    );
    console.log(
      "\n|------------------------------------------------------------"
    );
    console.log("| Package Versions + Dependencies", packageVersions);
    console.log(
      "|------------------------------------------------------------"
    );

    packageConfig.calculatedDependencies = packageVersions.map(
      (packageVersion) => ({
        packageName: packageVersion.packageName,
        versionNumber: packageVersion.versionNumber,
        versionId: packageVersion.subscriberPackageVersionId,
        password: packageVersion.password
      })
    );
    fs.writeFile(
      "./sfdx-package.json",
      JSON.stringify(packageConfig, null, 4),
      (error) => {
        if (error) {
          console.error(error);
        }
      }
    );

    projectConfig.packageAliases = {};
    packageVersions.forEach((packageVersion) => {
      projectConfig.packageAliases[packageVersion.packageName] =
        packageVersion.subscriberPackageVersionId;
    });
    let defaultDirectory = projectConfig.packageDirectories.find(
      (packageDirectory) => packageDirectory.default
    );
    defaultDirectory.dependencies = packageVersions.map((packageVersion) => ({
      package: packageVersion.packageName
    }));
    fs.writeFile(
      "./sfdx-project.json",
      JSON.stringify(projectConfig, null, 4),
      (error) => {
        if (error) {
          console.error(error);
        }
      }
    );
  } catch (e) {
    console.error(e.message, e.stack);
  }
})();

function normalizeDependency(dependency) {
  return {
    packageName: dependency.packageName || dependency.package,
    versionNumber: dependency.versionNumber,
    subscriberPackageVersionId:
      dependency.subscriberPackageVersionId ||
      dependency.versionId ||
      dependency.packageVersionId ||
      dependency.packageVersion ||
      dependency.version,
    password: dependency.password,
    useSamePasswordForDependencies: dependency.useSamePasswordForDependencies
  };
}

async function getSortedPackageVersions(subscriberPackageVersions) {
  try {
    const subscriberPackageVersionIdsString =
      getSubscriberPackageVersionIdsString(subscriberPackageVersions);
    const command = `sfdx force:data:soql:query --targetusername=devhub --usetoolingapi --query="SELECT SubscriberPackageVersionId, Package2Id, Package2.Name, Name, MajorVersion, MinorVersion, PatchVersion, BuildNumber FROM Package2Version WHERE SubscriberPackageVersionId IN ${subscriberPackageVersionIdsString} ORDER BY Package2.Name DESC" --json`;
    const devHubAvailablePackageVersionsResponse = await execCommand(command);
    let subscriberPackageVersionId2Name = getSubsriberPackageVersionId2NameMap(
      subscriberPackageVersions
    );
    let packageId2PackageVersion = new Map();
    devHubAvailablePackageVersionsResponse.result.records.forEach(
      (devHubPackage2Version) => {
        if (
          isPackageRelevant(devHubPackage2Version, packageId2PackageVersion)
        ) {
          packageId2PackageVersion.set(devHubPackage2Version.Package2Id, {
            packageId: devHubPackage2Version.Package2Id,
            packageName: devHubPackage2Version.Package2.Name,
            subscriberPackageVersionId:
              devHubPackage2Version.SubscriberPackageVersionId,
            versionNumber: `${devHubPackage2Version.MajorVersion}.${devHubPackage2Version.MinorVersion}.${devHubPackage2Version.PatchVersion}.${devHubPackage2Version.BuildNumber}`,
            password: subscriberPackageVersionId2Name.get(
              devHubPackage2Version.SubscriberPackageVersionId
            ).password
          });
        }
      }
    );
    const sortedPackageNames = getSortedPackageNameList(
      subscriberPackageVersions
    );
    let packageVersionsToReturn = Array.from(packageId2PackageVersion.values());
    packageVersionsToReturn.sort(comparePackageVersions(sortedPackageNames));
    const devHubUnavailablePackageVersions =
      getDevHubUnavailablePackageVersions(
        subscriberPackageVersions,
        packageVersionsToReturn
      );
    packageVersionsToReturn = [
      ...packageVersionsToReturn,
      ...devHubUnavailablePackageVersions
    ];

    return packageVersionsToReturn;
  } catch (e) {
    throw new Error(`Error while sorting packages - ${e.message}`);
  }
}

function getSubscriberPackageVersionIdsString(
  subscriberPackageVersionIdsWithNames
) {
  return (
    "('" +
    subscriberPackageVersionIdsWithNames
      .map(
        (subscriberPackageVersionIdWithName) =>
          subscriberPackageVersionIdWithName.subscriberPackageVersionId
      )
      .join("','") +
    "')"
  );
}

function getSubsriberPackageVersionId2NameMap(
  subscriberPackageVersionIdsWithNames
) {
  return new Map(
    subscriberPackageVersionIdsWithNames.map(
      (subscriberPackageVersionIdWithName) => [
        subscriberPackageVersionIdWithName.subscriberPackageVersionId,
        subscriberPackageVersionIdWithName
      ]
    )
  );
}

function isPackageRelevant(package2Version, packageId2PackageVersion) {
  return (
    !packageId2PackageVersion.has(package2Version.Package2Id) ||
    (packageId2PackageVersion.has(package2Version.Package2Id) &&
      isVersionGreater(
        package2Version,
        packageId2PackageVersion.get(package2Version.Package2Id)
      ))
  );
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

function getSortedPackageNameList(subscriberPackageVersionIdsWithNames) {
  return subscriberPackageVersionIdsWithNames.reduce(
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
}

function comparePackageVersions(sortedPackageNames) {
  return (packageVersion1, packageVersion2) => {
    if (
      sortedPackageNames.indexOf(packageVersion1.packageName) <
      sortedPackageNames.indexOf(packageVersion2.packageName)
    ) {
      return -1;
    } else if (
      sortedPackageNames.indexOf(packageVersion1.packageName) >
      sortedPackageNames.indexOf(packageVersion2.packageName)
    ) {
      return 1;
    } else {
      return 0;
    }
  };
}

function getDevHubUnavailablePackageVersions(
  subscriberPackageVersions,
  packageVersionsToReturn
) {
  return subscriberPackageVersions.filter(
    (subscriberPackageVersion) =>
      !packageVersionsToReturn.some(
        (packageVersionToReturn) =>
          packageVersionToReturn.packageName ===
          subscriberPackageVersion.packageName
      )
  );
}
