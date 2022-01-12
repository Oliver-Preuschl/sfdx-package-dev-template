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
  while(removeScratchOrg){
    let scratchOrgIndexToRemove = scratchOrgs.findIndex(
      (org) => org.branchName === branchName
    );
    if (scratchOrgIndexToRemove !== -1) {
      scratchOrgs = scratchOrgs.filter(
        (value, index) => index !== scratchOrgIndexToRemove
      );
    }else{
      removeScratchOrg = false;
    }
  }
  scratchOrgs.push(scratchOrgDetails);
  console.log(JSON.stringify(scratchOrgs));
})();

async function getScratchOrgDetails(branchName, scratchOrgName) {
  const scratchOrgDetails = await execCommand(
    `sfdx force:org:display --targetusername="${scratchOrgName}" --verbose --json`
  );
  let scratchOrgData = {
    branchName: branchName,
    orgName: scratchOrgDetails.result.orgName,
    userName: scratchOrgDetails.result.username,
    id: scratchOrgDetails.result.id,
    accessToken: scratchOrgDetails.result.accessToken,
    instanceUrl: scratchOrgDetails.result.instanceUrl,
    sfdxAuthUrl: scratchOrgDetails.result.sfdxAuthUrl,
    createdDate: scratchOrgDetails.result.createdDate,
    expirationDate: scratchOrgDetails.result.expirationDate
  };

  const scratchOrgLogin = await execCommand(
    `sfdx force:org:open -u="${scratchOrgName}" --json`
  );
  scratchOrgData.loginUrl = scratchOrgLogin.result.url;

  const scratchOrgPassword = await execCommand(
    `sfdx force:user:password:generate --targetusername "${scratchOrgName}" --json`
  );
  scratchOrgData.password = scratchOrgPassword.result.password;

  return scratchOrgData;
}
