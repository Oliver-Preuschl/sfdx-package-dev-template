/*
 * Copyright 2024 Oliver Preuschl
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
  const packageName = process.argv[2];

  let subscriptionPackageVersionId = await getLatestSubscriberPackageVersionId(
    packageName
  );

  console.log(subscriptionPackageVersionId);
})();

async function getLatestSubscriberPackageVersionId(packageName) {
  const packageVersionsResult = await execCommand(
    `sf package version list --packages "${packageName}" --order-by CreatedDate --concise --json`
  );
  const packageVersions = packageVersionsResult?.result;
  if (!packageVersions || packageVersions.length === 0) {
    return;
  }

  return packageVersions[packageVersions.length - 1].SubscriberPackageVersionId;
}
