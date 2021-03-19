![Code Scan & Apex Test Results]("../../workflows/system:ci:scan-code-and-run-apex-tests [pull-request:open:feature]/badge.svg")

## About

This repository can be used as a template to develop a sfdx second-generation package. It supports unlocked packages (optional org dependent) and managed packages.

## Features

- Support of the development process with Github workflows (automated tasks & self service tasks)
- Manually triggered package generation (unlocked, unlocked-org-dependent, managed)
- Automatic scratch-org generation whenever on branch creation
- Manually triggered pushes / pulls
- Automatic Apex test runs & Apex, Javascript code scans, whenever a pull request is opened
- Automatic package version generation after a pull request was merged
- Manually triggered package version promotion

## Working Process

The following BPMN diagram explains a typical workflow
![Workflow](./images/sfdx-github-wf.png)
