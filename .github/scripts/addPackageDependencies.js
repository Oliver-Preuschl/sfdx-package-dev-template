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
  const projectConfig = getProjectConfig();
  const packageConfig = getPackageConfig();
  let subscriberPackageVersionIdsWithNames = [];
  for (let dependency of packageConfig.dependencies) {
    if (dependency.package === "sample-package-name") {
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
      subscriberPackageVersionIdsWithNames = [
        ...subscriberPackageVersionIdsWithNames,
        ...dependencySubscriberPackageVersionIdsWithNames
      ];
    } else {
      subscriberPackageVersionIdsWithNames = [
        ...subscriberPackageVersionIdsWithNames,
        {
          SubscriberPackageVersionId: dependency.packageVersion,
          packageName: dependency.package,
          password: dependency.password
        }
      ];
    }
  }
  let packageVersions = await getSortedPackageVersions(
    subscriberPackageVersionIdsWithNames
  );
  console.log(
    "\n|------------------------------------------------------------"
  );
  console.log("| packageVersions", packageVersions);
  console.log("|------------------------------------------------------------");

  packageConfig.calculatedDependencies = packageVersions.map(
    (packageVersion) => ({
      "package-name": packageVersion.packageName,
      versionId: packageVersion.SubscriberPackageVersionId,
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
})();

async function getSortedPackageVersions(subscriberPackageVersionIdsWithNames) {
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
  const packageVersionsResponse = await execCommand(command);
  let subscriberPakageVersionId2Name = new Map(
    subscriberPackageVersionIdsWithNames.map(
      (subscriberPackageVersionIdWithName) => [
        subscriberPackageVersionIdWithName.subscriberPackageVersionId,
        subscriberPackageVersionIdWithName
      ]
    )
  );
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
      packageId2PackageVersion.set(package2Version1.Package2Id, {
        packageId: package2Version1.Package2Id,
        packageName: package2Version1.Package2.Name,
        subscriberPackageVersionId: package2Version1.SubscriberPackageVersionId,
        Version: `${package2Version1.MajorVersion}.${package2Version1.MinorVersion}.${package2Version1.PatchVersion}.${package2Version1.BuildVersion}.`,
        password: subscriberPakageVersionId2Name.get(
          package2Version1.SubscriberPackageVersionId
        ).password
      });
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
  let packageVersions = Array.from(packageId2PackageVersion.values());
  packageVersions.sort((packageVersion1, packageVersion2) => {
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
