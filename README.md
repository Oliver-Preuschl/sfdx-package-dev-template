<!-- badges:start -->
<!-- badges:end -->

## Scratch Orgs

<!-- scratch-orgs:start -->
<!-- scratch-orgs:end -->

## Package Versions

<!-- package-versions:start -->
<!-- package-versions:end -->

## ERD

<!-- objects-erd:start -->
<!-- objects-erd:end -->

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

| Name                                                              |   Trigger Type   | Description                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------- | :--------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Advanced dependency management                                    |    Automatic     | Dependencies to other packages will be configured in sfdx-package.json instead of sfdx-project.json. sfdx-project.json will be automatically updated with the direct and indirect dependent packages (recursively) whenever the sfdx-package.json is updated. Additionally, LATEST and LATESTRELEASED keywords can be used to specify the latest major, minor, patch or build version. |
| Scratch org generation                                            | Automatic/Manual | A new scratch org gets automatically generated whenever a branch is created (workflow "system:scratch-org:create [create:feature]"). Additionally, the workflow "system:scratch-org:create [create:feature]" can be used to display the scratch org login URL. If the scratch org is not available or has already expired, a new one will be automatically generated.                  |
| Pulling from / pushing to a scratch org                           |      Manual      | The source can be pushed to / pulled from the scratch org by manually executing the workflows "user:source:push [feature]" and "user:source:pull [feature]"                                                                                                                                                                                                                            |
| Exporting test data from / importing test data into a scratch org | Automatic/Manual | The test data can be exported from / imported into the scratch org by manually executing the workflows "user:data:export [feature]" and "user:data:import [feature]". Besides that, existing test data will be imported automatically into newly created scratch orgs.                                                                                                                 |
| Apex / LWC test runs & Apex / Javascript code scans               |    Automatic     | Depending on your configuration (sfdx-package.json) all Apex tests and LWC tests will be automatically run in a freshly created scratch org whenever a pull request is opened (workflows: "system:test:apex-tests", "system:test:lwc-tests"). Additionally, if configured, the sfdx-scanner will be executed.                                                                          |
| Package version generation                                        |    Automatic     | After a pull request is merged in the master branch a new package version gets automatically generated (workflow: `"system:package:version:create [push:master]"`).                                                                                                                                                                                                                    |
| Package version promotion                                         |      Manual      | The latest package version can be promoted by manually executing the workflow `"user:package:version:promote [master]"`                                                                                                                                                                                                                                                                |
| Documentation                                                     |    Automatic     | New scratch orgs, package versions and an SObject ER diagram will be automatically documented in the README                                                                                                                                                                                                                                                                            |

## Package Configuration

Before you start with the actual package development you should configure your package details in sfdx-package.json.

|   Attribute    | Description                                                                                                                                                                                                                                                                   |
| :------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|      name      | The name which will be used for the package creation.                                                                                                                                                                                                                         |
|    password    | The password which will be used for the package creation.                                                                                                                                                                                                                     |
|  dependencies  | These informations will be used to recursively calculate the dependencies, which will be used for scratch org creation as well as for package version creation. The sample package, which is already configured in the file, is just for reference and will not be installed. |
| runSfdxScanner | Specifies if the sfdx-scanner should be executed, whenever a pull request is merged.                                                                                                                                                                                          |
|  runApexTests  | Specifies if all Apex tests should be executed, whenever a pull request is merged.                                                                                                                                                                                            |
|  runLwcTests   | Specifies if all LWC tests should be executed, whenever a pull request is merged.                                                                                                                                                                                             |

### Dependency Management

The following attributes can be used for each package dependency.

|           Attribute            | Description                                                                                                                                                                                                                     | Restrictions                                                                                                                   | Required?                                      |
| :----------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
|          packageName           | The name of the package.                                                                                                                                                                                                        |                                                                                                                                | Yes                                            |
|         versionNumber          | The version number of the package. The keywords _LATEST_ and _LATESTRELEASED_ can be used as placeholders for major, minor, patch and build version numbers.                                                                    | Just working for packages, which are assigned to the connected DevHub. For external pakages the versionId has to be specified. | Version number or version id has to specified. |
|           versionId            | The version id of the package. Is usually used for external packages.                                                                                                                                                           |                                                                                                                                | Version number or version id has to specified. |
|            password            | Specifies the password for the package version.                                                                                                                                                                                 |                                                                                                                                | No                                             |
| useSamePasswordForDependencies | Specifies if the password should also be used for all dependencies, which are found for this package. If passwords are different for these dependencies, they have to be configured in the _packageVersionPasswords_ attribute. | Just working for packages, which are assigned to the connected DevHub.                                                         | No                                             |

Please note that the dependencies in the sfdx-package.json will overwrite existing dependencies in sfdx-project.json. This allows to automatically calculate all necessary dependencies recursively and update the sfdx-project.json accordingly.

However, there is one restriction: This automatism is just working for those packages which are assign to the connected DevHub. For external packages the versionId has to be specified and all dependencies have to be configured manually in the right order.

Examples:

```
  "dependencies": [
    {
      "packageName": "dev-hub-internal-package-1",
      "versionNumber": "LATEST",
      "password": "password",
      "useSamePasswordForDependencies": true
    },
    {
      "packageName": "dev-hub-internal-package-2",
      "versionNumber": "1.LATESTRELEASED",
      "password": "password",
      "useSamePasswordForDependencies": true
    },
    {
      "packageName": "dev-hub-internal-package-3",
      "versionNumber": "1.2.LATEST",
      "password": "password"
    },
    {
      "packageName": "dev-hub-internal-package-4",
      "versionNumber": "1.2.3.LATESTRELEASED"
    },
    {
      "packageName": "dev-hub-external-package-1",
      "versionNumber": "LATEST",
      "password": "password"
    },
    {
      "packageName": "dev-hub-external-package-2",
      "versionId": "04t000000000000000",
      "password": "password"
    }
  ],
```

If there are dependencies for a single package, which require a different password, these need to be speified in the _packageVersionPasswords_ attribute as stated in the following example.

```
  "packageVersionPasswords": {
    "sample-package-name-1": "xxx",
    "sample-package-name-2": "yyy"
  }
```

The template is structured in a way, that allows for additional ways of dependency installation for existing or newly created scratch orgs. The following table describes the sequence of actions, which are executed, whenever a new scratch-org is created or when the workflow is executed manually.

| Order |                      Name                      |             Configuration              | Description                                                                                                                                                                                                                                                                                                                                                                     |
| :---: | :--------------------------------------------: | :------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1   |           Org-Dependency Deployment            |   0-force-org-dependency (Directory)   | The source of this directory will be deployed (not pushed) to the scratch org. This can be necessary, if any org-dependent packages, which rely on additional metadata, are installed in the next step (mainly used for org-dependent packages).                                                                                                                                |
|   2   |   Inter-Org-Package-Dependency Installation    |    sfdx-package.json (config-file)     | The configured package versions will be installed in the given order in the scratch org.                                                                                                                                                                                                                                                                                        |
|   3   | Intra-Org-Package-Dependency Push (Unpackaged) | 1-force-package-dependency (Directory) | The source of this package will be pushed to the scratch org. However, it will not be packaged. It is typically used to specify dependencies, which should not be included in the package, but are necessary for the correct function of the package (mailny used for org-dependent packages).                                                                                  |
|   4   |              Package-Source Push               |        2-force-app (Directory)         | The source of this package will be pushed to the scratch org and will also be used for package creation.                                                                                                                                                                                                                                                                        |
|   5   |      Apex-Tests-Source Push (Unpackaged)       |     3-force-apex-test (Directory)      | The source of this package will be pushed to the scratch org and can also be made available during package creation. However, it will not be packaged. It is typically used to make sure, Apex tests can access additionally metadata, which is not part of the package. To use this feature you have to make modifications to the file sfdx-project.json like explained below. |
|   6   |     Manual-Tests-Source Push (Unpackaged)      |    4-force-manual-test (Directory)     | The source of this package will be pushed to the scratch org. However, it will not be packaged. It is typically used for metadata, which are used for manual test in the Salesforce org.                                                                                                                                                                                        |

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

## Test Data Configuration

The integrated test data functionality makes use of the SFDX plugin [SFDMU](https://help.sfdmu.com/quick-start). To make sure the relevant test data gets exported/imported the required SObjects need to be configured in the file data/export.json.

Sample of the export.json:

```json
{
  "objects": [
    {
      "query": "SELECT Name, Phone FROM Account",
      "operation": "Upsert",
      "externalId": "Name",
      "master": true
    },
    {
      "query": "SELECT updateable_true FROM Contact",
      "operation": "Upsert",
      "externalId": "LastName",
      "master": false
    }
  ]
}
```

A detailed documentation of the complete export.json format can be found [here](https://help.sfdmu.com/full-documentation/configuration-and-running/full-exportjson-format).

## Workflow

The following BPMN diagram explains the typical workflow
![Workflow](./images/sfdx-github-wf.png)
