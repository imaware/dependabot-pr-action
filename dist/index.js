"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
const semver_1 = require("semver");
const mergeMethods = {
    merge: "merge",
    squash: "squash",
    rebase: "rebase",
};
const getMergeMethod = () => {
    const input = core_1.getInput('merge-method');
    if (!input || !mergeMethods[input]) {
        console.log('merge-method input is ignored because it is malformed, defaulting to `squash`.');
        return mergeMethods.rebase;
    }
    return mergeMethods[input];
};
const token = core_1.getInput("token") || process.env.GH_PAT || process.env.GITHUB_TOKEN;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const run = async () => {
    if (!token)
        throw new Error("GitHub token not found");
    const [owner, repo] = (process.env.GITHUB_REPOSITORY || "").split("/");
    const octokit = github_1.getOctokit(token);
    const ignoreStatusChecks = core_1.getInput("ignore-status-checks");
    const addLabels = async (prNumber, labels) => {
        console.log("addLabels", prNumber, labels);
        if (labels) {
            const addLabels = labels.split(",").map((i) => i.trim());
            await octokit.issues.addLabels({
                owner,
                repo,
                issue_number: prNumber,
                labels: addLabels,
            });
        }
    };
    const autoMerge = async (prNumber, prTitle, tryNumber = 1) => {
        if (tryNumber > 10)
            return;
        console.log("autoMerge", prNumber, tryNumber);
        try {
            await octokit.pulls.merge({
                owner,
                repo,
                pull_number: prNumber,
                merge_method: getMergeMethod(),
            });
        }
        catch (error) {
            console.log(error);
            await wait(tryNumber * 1000);
            await autoMerge(prNumber, prTitle, tryNumber + 1);
        }
    };
    const autoApprove = async (prNumber) => {
        console.log("autoApprove", prNumber);
        try {
            await octokit.pulls.createReview({ owner, repo, pull_number: prNumber, event: "APPROVE" });
        }
        catch (error) { }
    };
    const pullRequests = await octokit.pulls.list({ owner, repo, state: "open" });
    const dependabotPRs = pullRequests.data.filter((pr) => pr.user.login.includes("dependabot"));
    console.log("Found dependabot PRs", dependabotPRs.length);
    for await (const pr of dependabotPRs) {
        console.log("Starting PR", pr.number);
        const lastCommitHash = pr._links.statuses.href.split("/").pop() || "";
        const checkRuns = await octokit.checks.listForRef({ owner, repo, ref: lastCommitHash });
        const allChecksHaveSucceeded = checkRuns.data.check_runs.every((run) => run.conclusion === "success");
        if (!allChecksHaveSucceeded && !ignoreStatusChecks) {
            console.log("All check runs are not success", checkRuns.data);
            continue;
        }
        const statuses = await octokit.repos.listCommitStatusesForRef({
            owner,
            repo,
            ref: lastCommitHash,
        });
        const uniqueStatuses = statuses.data.filter((item, index, self) => self.map((i) => i.context).indexOf(item.context) === index);
        const allStatusesHaveSucceeded = uniqueStatuses.every((run) => run.state === "success");
        if (!allStatusesHaveSucceeded && !ignoreStatusChecks) {
            console.log("All statuses are not success", uniqueStatuses);
            break;
        }
        console.log("All status checks", allChecksHaveSucceeded, allStatusesHaveSucceeded);
        const commits = await octokit.pulls.listCommits({ owner, repo, pull_number: pr.number });
        let version = "";
        commits.data.forEach((commit) => {
            let first = "";
            let last = "";
            console.log(pr.title);
            try {
                first = pr.title
                    .split("from ")[1]
                    .split(" ")[0]
                    .split("\n")[0]
                    .substr(0, 8)
                    .trim();
                last = pr.title
                    .split(" to ")[1]
                    .split(" ")[0]
                    .split("\n")[0]
                    .substr(0, 8)
                    .trim();
                console.log("From version", first, semver_1.valid(first));
                console.log("To version", last, semver_1.valid(last));
                if (first && last)
                    version = semver_1.diff(first, last);
            }
            catch (error) { }
        });
        console.log("Diff version is", version);
        if (version === "major") {
            await addLabels(pr.number, core_1.getInput("labels-major"));
            if (core_1.getInput("auto-label") || core_1.getInput("auto-label-major"))
                await addLabels(pr.number, "major");
            if (core_1.getInput("merge") || core_1.getInput("merge-major"))
                autoMerge(pr.number, pr.title);
            if (core_1.getInput("approve") || core_1.getInput("approve-major"))
                autoApprove(pr.number);
        }
        else if (version === "premajor") {
            await addLabels(pr.number, core_1.getInput("labels-premajor"));
            if (core_1.getInput("auto-label") || core_1.getInput("auto-label-premajor"))
                await addLabels(pr.number, "premajor");
            if (core_1.getInput("merge") || core_1.getInput("merge-premajor"))
                autoMerge(pr.number, pr.title);
            if (core_1.getInput("approve") || core_1.getInput("approve-premajor"))
                autoApprove(pr.number);
        }
        else if (version === "minor") {
            await addLabels(pr.number, core_1.getInput("labels-minor"));
            if (core_1.getInput("auto-label") || core_1.getInput("auto-label-minor"))
                await addLabels(pr.number, "minor");
            if (core_1.getInput("merge") || core_1.getInput("merge-minor"))
                autoMerge(pr.number, pr.title);
            if (core_1.getInput("approve") || core_1.getInput("approve-minor"))
                autoApprove(pr.number);
        }
        else if (version === "preminor") {
            await addLabels(pr.number, core_1.getInput("labels-preminor"));
            if (core_1.getInput("auto-label") || core_1.getInput("auto-label-preminor"))
                await addLabels(pr.number, "preminor");
            if (core_1.getInput("merge") || core_1.getInput("merge-preminor"))
                autoMerge(pr.number, pr.title);
            if (core_1.getInput("approve") || core_1.getInput("approve-preminor"))
                autoApprove(pr.number);
        }
        else if (version === "patch") {
            await addLabels(pr.number, core_1.getInput("labels-patch"));
            if (core_1.getInput("auto-label") || core_1.getInput("auto-label-patch"))
                await addLabels(pr.number, "patch");
            if (core_1.getInput("merge") || core_1.getInput("merge-patch"))
                autoMerge(pr.number, pr.title);
            if (core_1.getInput("approve") || core_1.getInput("approve-patch"))
                autoApprove(pr.number);
        }
        else if (version === "prepatch") {
            await addLabels(pr.number, core_1.getInput("labels-prepatch"));
            if (core_1.getInput("auto-label") || core_1.getInput("auto-label-prepatch"))
                await addLabels(pr.number, "prepatch");
            if (core_1.getInput("merge") || core_1.getInput("merge-prepatch"))
                autoMerge(pr.number, pr.title);
            if (core_1.getInput("approve") || core_1.getInput("approve-prepatch"))
                autoApprove(pr.number);
        }
        else if (version === "prerelease") {
            await addLabels(pr.number, core_1.getInput("labels-prerelease"));
            if (core_1.getInput("auto-label") || core_1.getInput("auto-label-prerelease"))
                await addLabels(pr.number, "prerelease");
            if (core_1.getInput("merge") || core_1.getInput("merge-prerelease"))
                autoMerge(pr.number, pr.title);
            if (core_1.getInput("approve") || core_1.getInput("approve-prerelease"))
                autoApprove(pr.number);
        }
    }
    console.log("All done!");
};
exports.run = run;
exports.run()
    .then(() => { })
    .catch((error) => {
    console.error("ERROR", error);
    core_1.setFailed(error.message);
});
//# sourceMappingURL=index.js.map