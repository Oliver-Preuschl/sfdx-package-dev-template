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

const { execCommand } = require("../libs/sfdxExecutor.js");

(async function () {
  const branchName = process.argv[2];
  const userName = process.argv[3];
  const scratchOrgDetailsString = await execCommand(
    `sf org open --target-org "${userName}" --json`
  );
  let scratchOrgDetails = JSON.parse(scratchOrgDetailsString);
  let scratchOrgData = {
    branch: branchName,
    orgName: scratchOrgDetails.orgName,
    userName: scratchOrgDetails.userName,
    id: scratchOrgDetails.id,
    accessToken: scratchOrgDetails.accessToken,
    instanceUrl: scratchOrgDetails.instanceUrl,
    sfdxAuthUrl: scratchOrgDetails.sfdxAuthUrl,
    createdDate: scratchOrgDetails.createdDate,
    expirationDate: scratchOrgDetails.expirationDate
  };

  const scratchOrgLoginString = await execCommand(
    `sf org open --target-org "${userName}" --json`
  );
  let scratchOrgLogin = JSON.parse(scratchOrgLoginString);
  scratchOrgData.loginUrl = scratchOrgLogin.result.url;

  const scratchOrgPasswordString = await execCommand(
    `sf org generate password --target-org "${userName}" --json`
  );
  let scratchOrgPassword = JSON.parse(scratchOrgPasswordString);
  scratchOrgData.password = scratchOrgPassword.result.password;

  console.log(JSON.stringify(scratchOrgData));
})();
