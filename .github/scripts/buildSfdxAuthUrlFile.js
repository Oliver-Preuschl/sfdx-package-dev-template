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

(async function () {
  const branchName = process.argv[2];
  const scratchOrgName = process.argv[3];

  let scratchOrgDetails = await getScratchOrgDetails(
    branchName,
    scratchOrgName
  );

  console.log(scratchOrgDetails.sfdxAuthUrl);
})();

async function getScratchOrgDetails(branchName, scratchOrgName) {
  const scratchOrgDetailResponse = await execCommand(
    `sf org display --target-org="${scratchOrgName}" --verbose --json`
  );
  const scratchOrgData = {
    branchName: branchName,
    orgName: scratchOrgDetailResponse.result.orgName,
    userName: scratchOrgDetailResponse.result.username,
    id: scratchOrgDetailResponse.result.id,
    instanceUrl: scratchOrgDetailResponse.result.instanceUrl,
    createdDate: scratchOrgDetailResponse.result.createdDate,
    expirationDate: scratchOrgDetailResponse.result.expirationDate
  };

  const scratchOrgAuthUrlResponse = await execCommand(
      `sf org auth show-sfdx-auth-url --target-org="${scratchOrgName}" --json`
  );
  scratchOrgData.sfdxAuthUrl = scratchOrgAuthUrlResponse.result.sfdxAuthUrl;

  return scratchOrgData;
}
