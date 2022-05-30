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
  getPackageConfig,
  getScratchOrgs,
  getPackageVersions
} = require("../libs/configProvider.js");
const parseString = require("xml2js").parseString;
const { execCommand } = require("../libs/sfdxExecutor.js");

(async function () {
  const packageConfig = getPackageConfig();
  const scratchOrgs = getScratchOrgs();
  const packageVersions = getPackageVersions();
  let badges = getBadges(packageConfig, packageVersions);
  let expandableScratchOrgsString = getExpandableScratchOrgsString(scratchOrgs);
  let expandablePackageVersionsString =
    getExpandablePackageVersionsString(packageVersions);
  let objectMermaidMarkup = getObjectMermaidMarkup();

  let readme = fs.readFileSync("./README.md", "utf8");
  readme = readme
    .replace(
      /<!-- badges:start -->[\s\S]*<!-- badges:end -->/g,
      `<!-- badges:start -->
${badges.join("\n")}
<!-- badges:end -->`
    )
    .replace(
      /<!-- scratch-orgs:start -->[\s\S]*<!-- scratch-orgs:end -->/g,
      `<!-- scratch-orgs:start -->
<details>
<summary>${scratchOrgs.length} Scratch Org(s)</summary>

${expandableScratchOrgsString}

</details>
<!-- scratch-orgs:end -->`
    )
    .replace(
      /<!-- package-versions:start -->[\s\S]*<!-- package-versions:end -->/g,
      `<!-- package-versions:start -->
<details>
<summary>${packageVersions.length} Package Version(s)</summary>

${expandablePackageVersionsString}

</details>
<!-- package-versions:end -->`
    )
    .replace(
      /<!-- objects-erd:start -->[\s\S]*<!-- objects-erd:end -->/g,
      `<!-- objects-erd:start -->
\`\`\`mermaid
${objectMermaidMarkup}
\`\`\`
<!-- objects-erd:end -->`
    );

  fs.writeFile("./README.md", readme, (error) => {
    if (error) {
      console.error(error);
    }
  });
})();

function getBadges(packageConfig, packageVersions) {
  let badges = [];
  if (packageConfig.runSfdxScanner) {
    badges.push(
      "![Code Scan](../../actions/workflows/system-test-code-scan.yaml/badge.svg)"
    );
  }
  if (packageConfig.runApexTests) {
    badges.push(
      "![Apex Test Results](../../actions/workflows/system-test-apex-tests.yaml/badge.svg)"
    );
  }
  if (packageConfig.runLwcTests) {
    badges.push(
      "![LWC Test Results](../../actions/workflows/system-test-lwc-tests.yaml/badge.svg)"
    );
  }
  if (packageVersions.length > 0) {
    const codeCoverageString =
      packageVersions[packageVersions.length - 1].CodeCoverage;
    if (codeCoverageString) {
      const codeCoverage = parseFloat(codeCoverageString.replace("%", ""));
      let color;
      if (codeCoverage < 75) {
        color = "red";
      } else if (codeCoverage < 85) {
        color = "orange";
      } else {
        color = "green";
      }
      badges.push(
        `![Code Coverage - Apex](https://img.shields.io/badge/Code%20Coverage%20--%20Apex-${codeCoverage}%25-${color})`
      );
    } else {
      console.log(`No Coverage found`);
    }
  } else {
    console.log(`No PackageVersion found`);
  }
  return badges;
}

function getExpandableScratchOrgsString(scratchOrgs) {
  return scratchOrgs
    .reverse()
    .map(
      (scratchOrg) => `
<details style="margin-left: 1rem; margin-bottom: 0;">
<summary>${scratchOrg.branchName} - ${getFormattedDate(
        scratchOrg.createdDate
      )} - <a href="${scratchOrg.loginUrl}" target="_blank">Open</a></summary>

\`\`\`json
${JSON.stringify(scratchOrg, null, 2)}
\`\`\`

</details>
`
    )
    .join("\n");
}

function getExpandablePackageVersionsString(packageVersions) {
  return packageVersions
    .reverse()
    .map(
      (packageVersion) => `
<details style="margin-left: 1rem; margin-bottom: 0;">
<summary>${packageVersion.Version}</summary>

\`\`\`json
${JSON.stringify(packageVersion, null, 2)}
\`\`\`

</details>
`
    )
    .join("\n");
}

function getFormattedDate(dateString) {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()} - ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
}

function getObjectMermaidMarkup() {
  let mermaidMarkup = "erDiagram";
  if (!fs.readdirSync("./2-force-app/main/default/objects")) {
    return "";
  }
  fs.readdirSync("./2-force-app/main/default/objects").forEach((objectName) => {
    console.log(objectName);
    let sObjectDefinition = `\n${objectName}{
Id Id PK`;
    if (
      !fs.existsSync(`./2-force-app/main/default/objects/${objectName}/fields`)
    ) {
      return;
    }
    fs.readdirSync(
      `./2-force-app/main/default/objects/${objectName}/fields`
    ).forEach((fieldFile) => {
      console.log(`  - ${fieldFile}`);
      const xml = fs.readFileSync(
        `./2-force-app/main/default/objects/${objectName}/fields/${fieldFile}`,
        { encoding: "utf8", flag: "r" }
      );
      parseString(xml, function (err, json) {
        if (json.CustomField.referenceTo?.[0]) {
          console.log(`${objectName} -> ${json.CustomField.referenceTo}`);
          const relationshipString =
            json.CustomField.type?.[0] === "Lookup" ? "|o" : "||";
          mermaidMarkup += `\n${json.CustomField.referenceTo?.[0]} ${relationshipString}--o{ ${objectName} : "${json.CustomField.relationshipName?.[0]}"`;
          sObjectDefinition += `\n${json.CustomField.type?.[0]} ${json.CustomField.fullName?.[0]} FK`;
        }
        if (
          json.CustomField.externalId?.[0] === true ||
          json.CustomField.externalId?.[0] === "true"
        ) {
          sObjectDefinition += `\n${json.CustomField.type?.[0]} ${json.CustomField.fullName?.[0]} FK`;
        }
      });
    });
    mermaidMarkup += `\n${sObjectDefinition}
}`;
  });
  return mermaidMarkup;
}
