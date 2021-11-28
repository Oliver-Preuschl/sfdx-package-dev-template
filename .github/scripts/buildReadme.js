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

  console.log("-------ScratchOrgs--------");
  console.log(JSON.stringify(scratchOrgs, null, 2));
  console.log("-------PackageVersions--------");
  console.log(JSON.stringify(packageVersions, null, 2));

  let readme = fs.readFileSync("./README.md", "utf8");
  readme = readme
    .replace(
      /<!-- scratch-orgs:start -->[\s\S]*<!-- scratch-orgs:end -->/g,
      `<!-- scratch-orgs:start -->
</br>
<div style="height: 500px; overflow: scroll !important;">
  <pre>
    <code>
${JSON.stringify(scratchOrgs, null, 2)}
    </code>
  </pre>
</div>
</br>
<!-- scratch-orgs:end -->`
    )
    .replace(
      /<!-- package-versions:start -->[\s\S]*<!-- package-versions:end -->/g,
      `<!-- package-versions:start -->
</br>
<div style="height: 500px; overflow: scroll !important;">
  <pre>
    <code>
${JSON.stringify(packageVersions, null, 2)}
    </code>
  </pre>
</div>
</br>
<!-- package-versions:end -->`
    );

  console.log("-------README--------");
  console.log(readme);

  fs.writeFile("./README.md", readme, (error) => {
    if (error) {
      console.error(error);
    }
  });
})();
