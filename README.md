# Upload and check BoM

This action takes an existing BoM, checks it on the remote dependency-track and returns results

## Inputs

### `server-hostname`

**Required** Dependency-Track hostname

### `api-key`

**Required** Dependency-Track API key

### `project`

**Required, unless projectname and projectversion are provided** Project uuid in Dependency-Track

### `bom-filename`

Path and filename of the BOM, default `bom.xml`

### `bom-output-filename`

Path and filename of the output BOM, default `out-bom.xml`

## Outputs

### `risk-score`

The computed risk score

## Outputs

### `vulnerabilities`

The number of vulnerabilities

## Outputs

### `violations-total`

The total number of violations

## Example usage

```
uses: Rosslight/DependencyTrackChecker@v1.2
with:
  server-hostname: 'example.com'
  api-key: ${{ secrets.DEPENDENCYTRACK_APIKEY }}
  project: 'dadec8ad-7053-4e8c-8044-7b6ef698e08d'
  bom-filename: 'bom.json'
  bom-output-filename: 'out-bom.json'
```