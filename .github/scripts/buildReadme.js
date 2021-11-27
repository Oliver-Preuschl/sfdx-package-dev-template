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
const {
  getScratchOrgs,
  getPackageVersions
} = require("../libs/configProvider.js");

(async function () {
  const scratchOrgs = getScratchOrgs();
  const packageVersions = getPackageVersions();

  let readme = fs.readFileSync("./README.md", "utf8");
  readme = readme
    .replace(
      /<!-- scratch-orgs:start -->\s*.*\s*<!-- scratch-orgs:end -->/i,
      `<!-- scratch-orgs:start --></br><pre><code>${JSON.stringify(
        scratchOrgs,
        null,
        2
      )}</code></pre></br><!-- scratch-orgs:end -->`
    )
    .replace(
      /<!-- package-versions:start -->\s*.*\s*<!-- package-versions:end -->/i,
      `<!-- package-versions:start --></br><pre><code>${JSON.stringify(
        packageVersions,
        null,
        2
      )}</code></pre></br><!-- package-versions:end -->`
    );

  fs.writeFile("./README.md", readme, (error) => {
    if (error) {
      console.error(error);
    }
  });
})();
