![Code Scan & Apex Test Results](../../actions/workflows/system-test-code-scan.yaml/badge.svg)
![Code Scan & Apex Test Results](../../actions/workflows/system-test-apex-tests.yaml/badge.svg)
![Code Scan & Apex Test Results](../../actions/workflows/system-test-lwc-tests.yaml/badge.svg)

## Scratch Orgs

<!-- scratch-orgs:start -->
<!-- scratch-orgs:end -->

## Package Versions

<!-- package-versions:start -->
<!-- package-versions:end -->

## About

This repository supports the development of sfdx second-generation packages by leveraging the power of Github workflows (automated tasks & self service tasks). It supports unlocked packages (optional org dependent) as well as managed packages.

## Getting started

All you have to do to get started is to create a new repository by using this repository as a template.
However, since the workflows used in the repository need access to your Salesforce Dev Hub you will need to set up the following secret.

|   Secret Name   | Secret Value                                                                                                                                                |
| :-------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEVHUB_AUTH_URL | The Sfdx Auth Url. You can get this from the SFDX CLI with the following command: sfdx force:org:display --targetusername=<your dev hub username> --verbose |

## Features

Once the repository is created and the secrets are set up the following functionalities are available.

| Name                                                |       Type       | Description                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------- | :--------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scratch org generation                              | Automatic/Manual | A new scratch org gets automatically generated whenever a branch is created (workflow "system:scratch-org:create [create:feature]"). Additionally, the workflow "system:scratch-org:create [create:feature]" can be used to display the scratch org login URL. If the scratch org is not available or has already expired, a new one will be automatically generated. |
| Pulling from / pushing to a scratch org             |      Manual      | The source can be pushed to / pulled from the scratch org by manually executing the workflows "user:source:push [feature]" and "user:source:pull [feature]"                                                                                                                                                                                                           |
| Apex / LWC test runs & Apex / Javascript code scans |    Automatic     | Depending on your configuration (sfdx-package.json) all Apex tests and LWC tests will be automatically run in a freshly created scratch org whenever a pull request is opened (workflows: "system:test:apex-tests", "system:test:lwc-tests"). Additionally, if configured, the sfdx-scanner will be executed.                                                         |
| Package version generation                          |    Automatic     | After a pull request is merged in the master branch a new package version gets automatically generated (workflow: `"system:package:version:create [push:master]"`).                                                                                                                                                                                                   |
| Package version promotion                           |      Manual      | The latest package version can be promoted by manually executing the workflow `"user:package:version:promote [master]"`                                                                                                                                                                                                                                               |

## Package Configuration

Before you start with the actual package development you should configure your package details in sfdx-package.json.

|   Attribute    | Description                                                                                                                                                                                    |
| :------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|      name      | The name which will be used for the package creation.                                                                                                                                          |
|    password    | The password which will be used for the package creation.                                                                                                                                      |
|  dependencies  | These packages will be automatically installed in the newly created scratch org. The sample package, which is already configured in the file, is just for reference and will not be installed. |
| runSfdxScanner | Specifies if the sfdx-scanner should be executed, whenever a pull request is merged.                                                                                                           |
|  runApexTests  | Specifies if all Apex tests should be executed, whenever a pull request is merged.                                                                                                             |
|  runLwcTests   | Specifies if all LWC tests should be executed, whenever a pull request is merged.                                                                                                              |

Please note, that the dependencies in the sfdx-package.json will just be used to install these packages in the automatically generated scratch orgs and are not relevant for package creation. Dependencies for package creation have to be configured in the sfdx-project.json like described [here](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev2gp_config_file.htm). Alternatively you can create an org-dependent package.
The template is structured in a way, that allows for additional ways of dependency installation. The following table describes the sequence of actions, which are executed, whenever a new scratch-org is created.

| Order |                    Name                    |             Configuration              | Description                                                                                                                                                                                                                                                                                                                                                                     |
| :---: | :----------------------------------------: | :------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1   |         Org-Dependency Deployment          |   0-force-org-dependency (Directory)   | The source of this directory will be deployed (not pushed) to the scratch org. This can be necessary, if any org-dependent packages, which rely on additional metadata, are installed in the next step (mailny used for org-dependent packages).                                                                                                                                |
|   2   |   Inter-Package-Dependency Installation    |    sfdx-package.json (config-file)     | The configured package versions will be installed in the given order in the scratch org.                                                                                                                                                                                                                                                                                        |
|   3   | Intra-Package-Dependency Push (Unpackaged) | 1-force-package-dependency (Directory) | The source of this package will be pushed to the scratch org. However, it will not be packaged. It is typically used to specify dependencies, which should not be included in the package, but are necessary for the correct function of the package (mailny used for org-dependent packages).                                                                                  |
|   4   |            Package-Source Push             |        2-force-app (Directory)         | The source of this package will be pushed to the scratch org and will also be used for package creation.                                                                                                                                                                                                                                                                        |
|   5   |    Apex-Tests-Source Push (Unpackaged)     |     3-force-apex-test (Directory)      | The source of this package will be pushed to the scratch org and can also be made available during package creation. However, it will not be packaged. It is typically used to make sure, Apex tests can access additionally metadata, which is not part of the package. To use this feature you have to make modifications to the file sfdx-project.json like explained below. |
|   6   |   Manual-Tests-Source Push (Unpackaged)    |    4-force-manual-test (Directory)     | The source of this package will be pushed to the scratch org. However, it will not be packaged. It is typically used for metadata, which are used for manual test in the Salesforce org.                                                                                                                                                                                        |

## Activate the unpackaged metadata feature

To activate this feature you will have to add the following lines to the sfdx-project.json in the packageDirectory with the apth "3-force-apex-test".

```
"unpackagedMetadata": {
  "path": "my-unpackaged-directory"
}
```

Sample of complete sfdx-project.json file:

```json
{
  "packageDirectories": [
    {
      "path": "0-force-org-dependency",
      "default": false
    },
    {
      "path": "1-force-package-dependency",
      "default": false
    },
    {
      "path": "2-force-app",
      "default": true,
      "unpackagedMetadata": {
        "path": "3-force-apex-test"
      }
    },
    {
      "path": "3-force-apex-test",
      "default": false
    },
    {
      "path": "4-force-manual-test",
      "default": false
    }
  ],
  "namespace": "",
  "sfdcLoginUrl": "https://login.salesforce.com",
  "sourceApiVersion": "51.0"
}
```

## Workflow

The following BPMN diagram explains the typical workflow
![Workflow](./images/sfdx-github-wf.png)
