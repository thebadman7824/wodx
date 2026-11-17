# Job-started hook for the self-hosted GitHub runner on the Secondary PC (B7010). The runner runs this before every
# job (ACTIONS_RUNNER_HOOK_JOB_STARTED in the runner's .env) and fails the job when it exits non-zero, before any step
# of the workflow runs. The installed copy is D:\WoDX\gh-runner\job-started.ps1, outside the repository, so a branch
# or a fork cannot change it; this file in the repository is the record of it (install.ps1 copies it there).
#
# It allows only: repository thebadman7824/wodx, the workflow .github/workflows/pc-gates.yml, and either a
# pull_request whose head is a claude/ branch of this repository opened by the owner, or a workflow_dispatch started
# by the owner. Everything else (forks, pull_request_target, other workflows, other events) is refused.
$ErrorActionPreference = "Stop"
function Refuse($why) { Write-Output "WoDX runner hook: refused: $why"; exit 1 }
try {
  $repo = $env:GITHUB_REPOSITORY
  if ($repo -ne "thebadman7824/wodx") { Refuse "repository $repo" }
  $wf = "$env:GITHUB_WORKFLOW_REF"
  if (-not $wf.StartsWith("thebadman7824/wodx/.github/workflows/pc-gates.yml@")) { Refuse "workflow $wf" }
  $ev = Get-Content -Raw -LiteralPath $env:GITHUB_EVENT_PATH | ConvertFrom-Json
  switch ($env:GITHUB_EVENT_NAME) {
    "pull_request" {
      $pr = $ev.pull_request
      if ($pr.head.repo.full_name -ne "thebadman7824/wodx") { Refuse "pull request head.repo.full_name $($pr.head.repo.full_name)" }
      if ($pr.base.repo.full_name -ne "thebadman7824/wodx") { Refuse "base repository $($pr.base.repo.full_name)" }
      if ($pr.user.login -ne "thebadman7824") { Refuse "pull request author $($pr.user.login)" }
      if (-not "$($pr.head.ref)".StartsWith("claude/")) { Refuse "branch $($pr.head.ref)" }
    }
    "workflow_dispatch" {
      if ($ev.sender.login -ne "thebadman7824") { Refuse "started by $($ev.sender.login)" }
    }
    default { Refuse "event $env:GITHUB_EVENT_NAME" }
  }
  Write-Output "WoDX runner hook: allowed $env:GITHUB_EVENT_NAME for $repo"
  exit 0
} catch {
  Refuse "check failed: $($_.Exception.Message)"
}
