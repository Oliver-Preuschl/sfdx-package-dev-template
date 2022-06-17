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

const { execCommand } = require("../libs/sfdxExecutor");

class DependencyResolver {
  constructor({ dependency = null, packageConfig = null } = {}) {
    this.dependency = dependency;
    this.packageConfig = packageConfig;
  }

  async getDependencies() {
    console.log(
      "\n|------------------------------------------------------------"
    );
    console.log(`| Resolve Dependencies for ${this.dependency.packageName}`);
    const versionNumbers = this.getPackageVersionNumbersFromVersionString(
      this.dependency.versionNumber
    );
    const subscriberPackageVersionId = await this.getSubscriberPackageVersionId(
      {
        packageName: this.dependency.packageName,
        majorVersion: versionNumbers.majorVersion,
        minorVersion: versionNumbers.minorVersion,
        buildVersion: versionNumbers.buildVersion,
        patchVersion: versionNumbers.patchVersion
      }
    );
    let dependencySubscriberPackageVersionIdsWithNames =
      await this.getPackageDependencies(
        subscriberPackageVersionId,
        this.dependency.packageName
      );
    /*console.log(
      "| dependencySubscriberPackageVersionIdsWithNames",
      dependencySubscriberPackageVersionIdsWithNames
    );*/
    console.log(
      "|------------------------------------------------------------"
    );
    return dependencySubscriberPackageVersionIdsWithNames;
  }

  getPackageVersionNumbersFromVersionString(versionNumber) {
    var packageVersionRexExp = new RegExp(
      "(\\d|LATEST|LATESTRELEASED)(?:\\.(\\d|LATEST|LATESTRELEASED))?(?:\\.(\\d|LATEST|LATESTRELEASED))?(?:\\.(\\d|LATEST|LATESTRELEASED))?",
      "g"
    );
    const match = packageVersionRexExp.exec(versionNumber);
    return {
      majorVersion: match[1],
      minorVersion: match[2],
      patchVersion: match[3],
      buildVersion: match[4]
    };
  }

  async getSubscriberPackageVersionId({
    packageName = null,
    majorVersion = null,
    minorVersion = null,
    patchVersion = null,
    buildNumber = null
  } = {}) {
    if (!majorVersion) {
      return {};
    }
    let versionCriteriaString = this.getVersionCriteria(
      majorVersion,
      minorVersion,
      patchVersion,
      buildNumber
    );
    try {
      const command = `sfdx force:data:soql:query --targetusername=devhub.op@hundw.com --usetoolingapi --query="SELECT SubscriberPackageVersionId, MajorVersion, MinorVersion, PatchVersion, BuildNumber FROM Package2Version WHERE Package2.Name = '${packageName}' ${versionCriteriaString} ORDER BY MajorVersion DESC, MinorVersion DESC, PatchVersion DESC, BuildNumber DESC LIMIT 1" --json`;
      const packageVersion = await execCommand(command);
      return packageVersion?.result?.records?.[0]?.SubscriberPackageVersionId;
    } catch (e) {
      throw new Error(e.message);
    }
  }

  getVersionCriteria(majorVersion, minorVersion, patchVersion, buildNumber) {
    let versionCriterias = [];
    if (majorVersion && majorVersion !== "LATEST") {
      versionCriterias.push(`MajorVersion = ${majorVersion}`);
      if (minorVersion && minorVersion !== "LATEST") {
        versionCriterias.push(`MinorVersion = ${minorVersion}`);
        if (patchVersion && patchVersion !== "LATEST") {
          versionCriterias.push(`PatchVersion = ${patchVersion}`);
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
    return versionCriteriaString;
  }

  async getPackageDependencies(
    subscriberPackageVersionId,
    packageName,
    depth = 0
  ) {
    console.log(`|${"--".repeat(depth)} ${packageName}`);
    if (
      subscriberPackageVersionId === null ||
      subscriberPackageVersionId === undefined
    ) {
      console.log(`|${"--".repeat(depth)} Package not found in DevHub`);
      return [];
    }
    let subscriberPackageVersionsToReturn = [];
    const installationKey = this.getInstallationKey(packageName, depth);
    const installationKeyCriteria = installationKey
      ? ` AND (InstallationKey='${installationKey}')`
      : "";
    const command = `sfdx force:data:soql:query --targetusername=devhub.op@hundw.com --usetoolingapi --query="SELECT Dependencies FROM SubscriberPackageVersion WHERE (Id='${subscriberPackageVersionId}') ${installationKeyCriteria}" --json`;
    try {
      const directDependencySubscriberPackageVersions = await execCommand(
        command
      );
      const dependencies =
        directDependencySubscriberPackageVersions.result.records?.[0]
          ?.Dependencies;
      if (dependencies?.ids) {
        const directDependencySubscriberpackageVersions =
          await this.getDirectDependencySubscriberPackageVersionIdsWithNames(
            dependencies,
            depth + 1
          );
        for (let directDependencySubscriberPackageVersion of directDependencySubscriberpackageVersions) {
          let directDependencyPackageName =
            directDependencySubscriberPackageVersion.packageName;
          const recursiveDependencyubscriberPackageVersions =
            await this.getPackageDependencies(
              directDependencySubscriberPackageVersion.subscriberPackageVersionId,
              directDependencyPackageName,
              depth + 1
            );
          subscriberPackageVersionsToReturn = [
            ...recursiveDependencyubscriberPackageVersions,
            ...subscriberPackageVersionsToReturn
          ];
        }
      }
      subscriberPackageVersionsToReturn = [
        ...subscriberPackageVersionsToReturn,
        { subscriberPackageVersionId, packageName, password: installationKey }
      ];
    } catch (e) {
      console.log(`|${"--".repeat(depth)} > Error: ${JSON.stringify(e)}`);
    }
    return subscriberPackageVersionsToReturn;
  }

  async getDirectDependencySubscriberPackageVersionIdsWithNames(
    dependencies,
    depth = 0
  ) {
    try {
      let directDependencySubscriberPackageVersionIds = dependencies.ids.map(
        (dependency) => dependency.subscriberPackageVersionId
      );
      let directDependencySubscriberPackageVersionId2PackageName =
        await this.getPackageNamesForPackageSubscriberPackageVersionIds(
          directDependencySubscriberPackageVersionIds
        );
      let directDependencySubscriberPackageVersionIdsWithNames =
        directDependencySubscriberPackageVersionIds.map(
          (subscriberPackageVersionId) => ({
            subscriberPackageVersionId: subscriberPackageVersionId,
            packageName:
              directDependencySubscriberPackageVersionId2PackageName.get(
                subscriberPackageVersionId
              )
          })
        );
      return directDependencySubscriberPackageVersionIdsWithNames;
    } catch (e) {
      console.log(
        "getDirectDependencySubscriberPackageVersionIdsWithNames",
        JSON.stringify(e)
      );
      throw new Error(e.message);
    }
  }

  getInstallationKey(packageName, depth) {
    let installationKey = null;
    if (
      depth === 0 ||
      (depth > 0 && this.dependency.useSamePasswordForDependencies)
    ) {
      installationKey = this.dependency.password;
    }
    if (this.packageConfig?.packageVersionPasswords?.[packageName]) {
      installationKey = this.packageConfig.packageVersionPasswords[packageName];
    }
    return installationKey;
  }

  async getPackageNamesForPackageSubscriberPackageVersionIds(
    subscriberPackageVersionIds
  ) {
    try {
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
    } catch (e) {
      throw new Error(e.message);
    }
  }
}

exports.DependencyResolver = DependencyResolver;
