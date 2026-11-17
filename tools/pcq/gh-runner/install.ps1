# Installs the self-hosted GitHub runner on the Secondary PC (B7010): two runner instances under D:\WoDX\gh-runner,
# labels self-hosted + wodx-gate, the job-started hook outside the repository, and a Startup entry that runs them at
# below-normal priority (their child processes inherit it), so the book OCR and other work on this PC keep the CPU.
#   powershell -ExecutionPolicy Bypass -File tools\pcq\gh-runner\install.ps1 [-Count 2] [-Zip <runner zip>]
# The registration token is fetched with the owner's Git Credential Manager sign-in and is never printed. No admin
# rights or Windows service: the runners run as the signed-in user, started at sign-in like the PC job runner.
param([int]$Count = 2, [string]$Zip = "D:\WoDX\gh-runner\actions-runner-win-x64-2.338.2.zip")
$ErrorActionPreference = "Stop"
$root = "D:\WoDX\gh-runner"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Copy-Item -Force (Join-Path $here "job-started.ps1") (Join-Path $root "job-started.ps1")

$tok = node -e "const r=require('child_process').spawnSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',env:{...process.env,GCM_INTERACTIVE:'never'}});process.stdout.write((r.stdout.match(/^password=(.*)$/m)||[])[1]||'')"
if (-not $tok) { throw "no GitHub sign-in in Git Credential Manager" }
$h = @{Authorization = "Bearer $tok"; Accept = "application/vnd.github+json"; "User-Agent" = "wodx-setup"}

$startup = [Environment]::GetFolderPath("Startup")
$lines = @("@echo off", "rem WoDX self-hosted GitHub runners (B7010), below-normal priority")
for ($i = 1; $i -le $Count; $i++) {
  $dir = Join-Path $root "$i"
  $name = "benjamin-pc-gate-$i"
  if (-not (Test-Path (Join-Path $dir "config.cmd"))) {
    New-Item -ItemType Directory -Force $dir | Out-Null
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($Zip, $dir)
  }
  if (-not (Test-Path (Join-Path $dir ".runner"))) {
    $reg = Invoke-RestMethod -Method Post -Uri "https://api.github.com/repos/thebadman7824/wodx/actions/runners/registration-token" -Headers $h
    & (Join-Path $dir "config.cmd") --unattended --url https://github.com/thebadman7824/wodx --token $reg.token --name $name --labels wodx-gate --work _work --replace | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "config.cmd failed for $name" }
  }
  # The hook runs before every job; PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD keeps Edge as the gates' browser
  Set-Content -Encoding ascii -Path (Join-Path $dir ".env") -Value @(
    "ACTIONS_RUNNER_HOOK_JOB_STARTED=$root\job-started.ps1",
    "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1")
  $lines += "start `"WoDX gh runner $i`" /belownormal /min `"$dir\run.cmd`""
  Write-Output "runner $name ready in $dir"
}
Set-Content -Encoding ascii -Path (Join-Path $startup "WoDX-gh-runner.cmd") -Value $lines
Write-Output "Startup entry: $(Join-Path $startup 'WoDX-gh-runner.cmd')"
