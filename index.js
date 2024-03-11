const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// axios.interceptors.request.use(request => {
//     console.log('Starting Request', JSON.stringify(request, null, 2))
//     return request
// })

async function upload_file(server_hostname, api_key, project_uuid, bom_filename) {
    const form_data = new FormData();
    form_data.append('project', project_uuid);
    form_data.append('bom', fs.createReadStream(bom_filename));
    const response = await axios.post(`${server_hostname}/api/v1/bom`, form_data, {
        headers: {
            'X-Api-Key': api_key,
            ...form_data.getHeaders()
        }
    })
    return response.data
}

async function analyze_project(server_hostname, api_key, project_uuid) {
    const response = await axios.post(`${server_hostname}/api/v1/finding/project/${project_uuid}/analyze`, null, {
        headers: { 'X-Api-Key': api_key, "accept": "application/json" }
    })
    return response.data
}


async function check_token_status(server_hostname, api_key, token) {
    const response = await axios.get(`${server_hostname}/api/v1/bom/token/${token}`, {
        headers: { 'X-Api-Key': api_key }
    })
    return response.data
}

async function get_project_information(server_hostname, api_key, project_uuid) {
    const response = await axios.get(`${server_hostname}/api/v1/project/${project_uuid}`, {
        headers: { 'X-Api-Key': api_key }
    })
    return response.data
}

async function get_cyclonedx_bom(server_hostname, api_key, project_uuid, format, variant) {
    const response = await axios.get(`${server_hostname}/api/v1/bom/cyclonedx/project/${project_uuid}?format=${format}&variant=${variant}`, {
        headers: { 'X-Api-Key': api_key }
    })
    return response.data
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

(async () => {
    try {
        const server_hostname = core.getInput('server-hostname');
        const api_key = core.getInput('api-key');
        const project_uuid = core.getInput('project');
        const bom_filename = core.getInput('bom-filename');
        const bom_output_filename = core.getInput('bom-output-filename');
		const poll_delay = 500;

        // Upload the BoM
        console.log(`[*] Starting upload of ${bom_filename} to ${server_hostname} (project=${project_uuid})`);
        const upload_result = await upload_file(server_hostname, api_key, project_uuid, bom_filename)
        const upload_token = upload_result.token;
        console.log(`[-] Successfully uploaded ${bom_filename}. Token to track: ${upload_token}`)

        // Wait until processing the new BoM has been completed
        console.log(`[*] Check upload token status`)
        var is_processing = true
        while(is_processing) {
            await sleep(poll_delay)
            const check_result = await check_token_status(server_hostname, api_key, upload_token)
            is_processing = check_result.processing
            console.log(`[-] BoM token status is ${is_processing}`)
        }
        console.log(`[-] BoM processing has been successful`)

        // Start project analysis (done in a separate step due to upload_token being finished before analysis)
        console.log(`[*] Starting analysis`);
        const analysis_result = await analyze_project(server_hostname, api_key, project_uuid)
        const analysis_token = analysis_result.token;
        console.log(`[-] Successfully started analysis. Token to track: ${analysis_token}`)

        // Wait until processing the analysis has been completed
        console.log(`[*] Check analysis token status`)
        is_processing = true
        while(is_processing) {
            await sleep(poll_delay)
            const check_result = await check_token_status(server_hostname, api_key, analysis_token)
            is_processing = check_result.processing
            console.log(`[-] Analysis token status is ${is_processing}`)
        }
        console.log(`[-] Analysis processing has been successful`)


        console.log(`[*] Get project information`)
        const project_information = await get_project_information(server_hostname, api_key, project_uuid)
        const risk_score = project_information.lastInheritedRiskScore
        const total_violations = project_information.metrics.policyViolationsTotal
        const vulnerabilities = project_information.metrics.vulnerabilities
        console.log(`[-] Retreived project information (rs=${risk_score}, v=${vulnerabilities}, pvt=${total_violations})`)

        // Extract whether output should be xml or json
        console.log(`[*] Extracting information from output`)
        const extensions = path.extname(bom_output_filename).split('.')
        const bom_output_type = extensions[extensions.length - 1]
        if (!(bom_output_type === 'json' || bom_output_type === 'xml'))
            throw new Error(`Invalid bom output type ${bom_output_type} extracted from ${bom_output_filename}`)
        console.log(`[*] Using ${bom_output_type} as output type`)

        // Download BoM
        console.log(`[*] Get cycloneDX BoM`)
        const new_bom = await get_cyclonedx_bom(server_hostname, api_key, project_uuid, bom_output_type, "withVulnerabilities")
        const bom_output_directory = path.dirname(bom_output_filename)
        console.log(`[-] Received new BoM saving output to ${bom_output_directory}`)
        await fs.promises.mkdir(bom_output_directory, { recursive: true });
        if (bom_output_type === "json")
            await fs.promises.writeFile(bom_output_filename, JSON.stringify(new_bom, null, 2))
        else
            await fs.promises.writeFile(bom_output_filename, String(new_bom))
        console.log(`[-] Wrote BoM to ${bom_output_filename}`)

        console.log(`[*] Write results for github action`)
        core.setOutput('risk-score', risk_score)
        core.setOutput('vulnerabilities', vulnerabilities)
        core.setOutput('violations-total', total_violations)
      } catch (error) {
        core.setFailed(error.message);
      }
})();