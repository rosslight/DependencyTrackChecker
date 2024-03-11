# Upload and check BoM

This action assumes that you have an existing [Dependency Track](https://github.com/DependencyTrack/dependency-track) project and a CycloneDX SBOM. Using these pre-requisites it does multiple steps:

1. Upload the SBOM to the specified project
2. Analyze the project for vulnerabilities and policy violations
3. Get metric information and offers them for later steps of the pipeline
4. Download the CycloneDX SBOM from Dependency Track, now with vulnerability information and the additional licenses attached.

This action was inspired from [action-owasp-dependecy-track-check](https://github.com/Quobis/action-owasp-dependecy-track-check) and [gh-upload-sbom](https://github.com/DependencyTrack/gh-upload-sbom).

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

### `vulnerabilities`

The number of vulnerabilities

### `violations-total`

The total number of violations

## Example usage

```
uses: Rosslight/DependencyTrackChecker@v1.3
with:
  server-hostname: 'example.com'
  api-key: ${{ secrets.DEPENDENCYTRACK_APIKEY }}
  project: 'dadec8ad-7053-4e8c-8044-7b6ef698e08d'
  bom-filename: 'bom.json'
  bom-output-filename: 'out-bom.json'
```