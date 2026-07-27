# ACP Documentation

The ACP documentation uses [Mintlify](https://mintlify.com/).
All files are MDX and can host custom components if there's a need to.

## Running

Run the following command to have the documentation live locally:

```bash
npm run docs
```

## Preview changes locally

To preview the changes locally, run the following command:

```bash
mint dev
```

### Install the CLI

Before running the site locally you need to install Mint's CLI:

```bash
npm i -g mint
```

On Windows, use a drive-backed working directory for npm commands. Running from a
UNC path can cause `cmd.exe` or npm to fail before the repository scripts start.

## Deployment

The documentation site is updated every time changes get to `main`.
