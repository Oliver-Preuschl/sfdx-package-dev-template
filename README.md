![Code Scan & Apex Test Results](../../workflows/system:ci:scan-code-and-run-apex-tests/badge.svg)

## About

This repository supports the development of sfdx second-generation packages by leveraging the power of Github workflows (automated tasks & self service tasks). It supports unlocked packages (optional org dependent) as well as managed packages.

## Getting started

All you have to do to get started is to create a new repository by using this repository as a template.
However, since the workflows used in the repository need access to your Salesforce Dev Hub and your Github Secrets, you will need to set up the following secrets.

| Secret Name     |                                                                                                                                                                                            Secret Value                                                                                                                                                                                            |
| --------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
| DEVHUB_AUTH_URL |                                                                                                                    The Sfdx Auth Url. You can get this from the SFDX CLI with the following command: sfdx force:org:display --targetusername=<your dev hub username> --verbose                                                                                                                     |
| PA_TOKEN        | Your personal access token with the repo scope. This is necessary to save sfdx related data like the package name in Github secrets for later usage. For more information on how to create a personal access token please refere to the following Github article: [Creating a personal access token](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token). |

## Features

Once the repository is created and the secrets are set up the following functionalities are available.

| Name                                         |       Type       | Description                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------- | :--------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scratch org generation                       | Automatic/Manual | A new scratch org gets automatically generated whenever a branch is created (workflow "system:scratch-org:create [create:feature]"). Additionally, the workflow "system:scratch-org:create [create:feature]" can be used to display the scratch org login URL. If the scratch org is not available or has already expired, a new one will be automatically generated. |
| Pulling from / pushing to a scratch org      |      Manual      | The source can be pushed to / pulled from the scratch org by manually executing the workflows "user:source:push [feature]" and "user:source:pull [feature]"                                                                                                                                                                                                           |
| Apex test runs & Apex, Javascript code scans |    Automatic     | All Apex tests will be automatically run in a freshly created scratch org whenever a pull request is opened (workflow: "system:ci:scan-code-and-run-apex-tests").                                                                                                                                                                                                     |
| Package version generation                   |    Automatic     | After a pull request is merged in the master branch a new package version gets automatically generated (workflow: "system:package:version:create [push:master]").                                                                                                                                                                                                     |
| Package version promotion                    |      Manual      | The latest package version can be promoted by manually executing the workflow "user:package:version:promote [master]"                                                                                                                                                                                                                                                 |

## Workflow

The following BPMN diagram explains the typical workflow
![Workflow](./images/sfdx-github-wf.png)
