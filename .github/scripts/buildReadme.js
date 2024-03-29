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
  getPackageVersions,
  getPackageVersionInstallations,
  getInstallationPipelinesConfig
} = require("../libs/configProvider.js");
const parseString = require("xml2js").parseString;

(async function () {
  const branchName = process.argv[2];
  const packageConfig = getPackageConfig();
  const scratchOrgs = getScratchOrgs();
  const packageVersions = getPackageVersions();
  const pipelinesConfig = getInstallationPipelinesConfig();
  let badges = getBadges(packageConfig, packageVersions);
  let expandableScratchOrgsString = getExpandableScratchOrgsString(scratchOrgs);
  let expandablePackageVersionsString =
    getExpandablePackageVersionsString(packageVersions);
  let objectMermaidMarkup = getObjectMermaidMarkup();
  let installationStatusMermaidMarkup = getInstallationStatusMermaidMarkup();
  let expandablePipelinesString = getExpandablePipelinesString(
    pipelinesConfig.pipelines
  );

  let readme = fs.readFileSync("./README.md", "utf8");
  readme = readme
    .replace(
      /<!-- pipelines:start -->[\s\S]*<!-- pipelines:end -->/g,
      `<!-- pipelines:start -->
<details>
<summary>${pipelinesConfig.pipelines.length} Pipeline(s)</summary>

${expandablePipelinesString}

</details>
<!-- pipelines:end -->`
    )
    .replace(
      /<!-- installation-history:start -->[\s\S]*<!-- installation-history:end -->/g,
      `<!-- installation-history:start -->
\`\`\`mermaid
${installationStatusMermaidMarkup}
\`\`\`
<!-- installation-history:end -->`
    )
    .replace(
      /<!-- badges:start -->[\s\S]*<!-- badges:end -->/g,
      `<!-- badges:start -->
${badges.join("\n")}
<!-- badges:end -->`
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

  if (branchName === "master") {
    readme = readme.replace(
      /<!-- scratch-orgs:start -->[\s\S]*<!-- scratch-orgs:end -->/g,
      `<!-- scratch-orgs:start -->
<!-- scratch-orgs:end -->`
    );
  } else {
    readme = readme.replace(
      /<!-- scratch-orgs:start -->[\s\S]*<!-- scratch-orgs:end -->/g,
      `<!-- scratch-orgs:start -->
<details>
<summary>${scratchOrgs.length} Scratch Org(s)</summary>

${expandableScratchOrgsString}

</details>
<!-- scratch-orgs:end -->`
    );
  }

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

function getExpandablePipelinesString(pipelines) {
  return pipelines
    .map(
      (pipeline) => `
<details style="margin-left: 1rem; margin-bottom: 0;">
<summary>${pipeline.name}</summary>

\`\`\`json
${JSON.stringify(pipeline, null, 2)}
\`\`\`

</details>
`
    )
    .join("\n");
}

function getInstallationStatusMermaidMarkup() {
  let mermaidMarkup = `gantt
      title Version History
      dateFormat  YYYY-MM-DD
      todayMarker stroke-width:5px,stroke:#0f0,opacity:0.5
  `;
  const packageVersionInstallations = getPackageVersionInstallations();
  for (let orgName in packageVersionInstallations.orgs) {
    const org = packageVersionInstallations.orgs[orgName];
    mermaidMarkup += `\nsection ${orgName}`;
    let firstInstallation = true;
    org.installations.forEach((installation, installationIndex) => {
      if (installationIndex < org.installations.length - 1) {
        mermaidMarkup += `\n${installation.pakageVersion}: milestone, done,${
          !installation.success ? " crit," : ""
        } ${installation.date},0d`;
      } else {
        mermaidMarkup += `\n${installation.pakageVersion}: milestone, active,${
          !installation.success ? " crit," : ""
        } ${installation.date},0d`;
      }
      firstInstallation = false;
    });
  }
  return mermaidMarkup;
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

function getFormattedDate(dateString) {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${
    date.getMonth() + 1
  }-${date.getDate()} - ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
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

function getObjectMermaidMarkup() {
  let mermaidMarkup = "erDiagram";
  if (!fs.existsSync("./2-force-app/main/default/objects")) {
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
        if (
          json.CustomField.type?.[0] === "MasterDetail" ||
          json.CustomField.type?.[0] === "Lookup"
        ) {
          let referenceTo =
            json.CustomField.referenceTo?.[0] ||
            json.CustomField.fullName?.[0].replace(/(Id)$/, "");
          if (referenceTo === "Product" || referenceTo === "Pricebook") {
            referenceTo += "2";
          }
          console.log(`${objectName} -> ${referenceTo}`);
          const relationshipString =
            json.CustomField.type?.[0] === "Lookup" ? "|o" : "||";
          const relationshipName =
            json.CustomField.relationshipName?.[0] || "-";
          mermaidMarkup += `\n${referenceTo} ${relationshipString}--o{ ${objectName} : "${relationshipName}"`;
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
