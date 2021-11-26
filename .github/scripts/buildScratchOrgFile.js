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

(async function () {
  const branchName = process.argv[2];
  const scratchOrgName = process.argv[3];
  const authUrl = process.argv[4];
  let scratchOrgs = JSON.parse(
    fs.readFileSync("./sfdx-scratch-orgs.json", "utf8")
  );
  scratchOrgs[branchName] = {
    branch: branchName,
    scratchOrgName: scratchOrgName,
    authUrl: authUrl
  };
  console.log(JSON.stringify(scratchOrgs, null, 2));
})();
