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

(async function () {
  const branchName = process.argv[2];
  const scratchOrgName = process.argv[3];

  let scratchOrgDetails = await getScratchOrgDetails(
    branchName,
    scratchOrgName
  );

  let scratchOrgs = JSON.parse(
    fs.readFileSync("./sfdx-scratch-orgs.json", "utf8")
  );
  let removeScratchOrg = true;
  while (removeScratchOrg) {
    let scratchOrgIndexToRemove = scratchOrgs.findIndex(
      (org) => org.branchName === branchName
    );
    if (scratchOrgIndexToRemove !== -1) {
      scratchOrgs = scratchOrgs.filter(
        (value, index) => index !== scratchOrgIndexToRemove
      );
    } else {
      removeScratchOrg = false;
    }
  }
  scratchOrgs.push(scratchOrgDetails);
  console.log(JSON.stringify(scratchOrgs));
})();

async function getScratchOrgDetails(branchName, scratchOrgName) {
  const scratchOrgDetailsResponse = await execCommand(
    `sf org display --target-org "${scratchOrgName}" --verbose --json`
  );
  let scratchOrgData = {
    branchName: branchName,
    orgName: scratchOrgDetailsResponse.result.orgName,
    userName: scratchOrgDetailsResponse.result.username,
    id: scratchOrgDetailsResponse.result.id,
    instanceUrl: scratchOrgDetailsResponse.result.instanceUrl,
    createdDate: scratchOrgDetailsResponse.result.createdDate,
    expirationDate: scratchOrgDetailsResponse.result.expirationDate
  };

  const scratchOrgAuthUrlResponse = await execCommand(
      `sf org auth show-sfdx-auth-url --target-org="${scratchOrgName}" --json`
  );
  scratchOrgData.sfdxAuthUrl = scratchOrgAuthUrlResponse.result.sfdxAuthUrl;

  const scratchOrgLoginResponse = await execCommand(
    `sf org open --target-org "${scratchOrgName}" --json`
  );
  scratchOrgData.loginUrl = scratchOrgLoginResponse.result.url;

  const scratchOrgPasswordResponse = await execCommand(
    `sf org generate password --target-org "${scratchOrgName}" --json`
  );
  scratchOrgData.password = scratchOrgPasswordResponse.result.password;

  return scratchOrgData;
}
