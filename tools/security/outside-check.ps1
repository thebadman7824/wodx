# Weekly outside check of wodx.online, run on Ben's PC. Read only: it changes nothing on Live or the PC.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File outside-check.ps1 [-Out D:\WoDX\security]
# Writes outside-check-<date>.txt and prints one PASS or FAIL line per check.
param([string]$Out = "D:\WoDX\security", [string]$HostName = "wodx.online")
$ErrorActionPreference = "Continue"
New-Item -ItemType Directory -Force -Path $Out | Out-Null
$lines = New-Object System.Collections.Generic.List[string]
function Check($name, $ok, $detail) { $lines.Add(("{0}  {1}: {2}" -f ($(if ($ok) {"PASS"} else {"FAIL"}), $name, $detail))) }

# Ports: only 80 and 443 should answer from everywhere; 30000 never. 22 answers only from the home address.
foreach ($p in 80, 443) { $t = Test-NetConnection $HostName -Port $p -WarningAction SilentlyContinue; Check "port $p open" $t.TcpTestSucceeded $t.TcpTestSucceeded }
$t = Test-NetConnection $HostName -Port 30000 -WarningAction SilentlyContinue; Check "port 30000 closed" (-not $t.TcpTestSucceeded) $t.TcpTestSucceeded

# Headers and blocked paths.
function Status($url) { try { (Invoke-WebRequest $url -Method Get -MaximumRedirection 0 -UseBasicParsing -ErrorAction Stop).StatusCode } catch { [int]$_.Exception.Response.StatusCode } }
try { $r = Invoke-WebRequest "https://$HostName/join" -Method Head -MaximumRedirection 0 -UseBasicParsing -ErrorAction Stop } catch { $r = $_.Exception.Response }
foreach ($h in "Strict-Transport-Security", "X-Content-Type-Options", "Referrer-Policy", "X-Frame-Options") {
  $v = $r.Headers[$h]; Check "header $h" ([bool]$v) $(if ($v) {$v} else {"missing"})
}
foreach ($path in "/setup", "/api/status") { $s = Status "https://$HostName$path"; Check "$path blocked" ($s -eq 403) $s }
$s = Status "https://$HostName/join"; Check "/join answers" ($s -eq 200 -or $s -eq 302) $s

# Certificate days left.
try {
  $tcp = New-Object Net.Sockets.TcpClient($HostName, 443)
  $ssl = New-Object Net.Security.SslStream($tcp.GetStream())
  $ssl.AuthenticateAsClient($HostName)
  $cert = New-Object Security.Cryptography.X509Certificates.X509Certificate2($ssl.RemoteCertificate)
  $days = [int]($cert.NotAfter - (Get-Date)).TotalDays
  Check "certificate valid 14+ days" ($days -ge 14) "$days days left"
  $ssl.Dispose(); $tcp.Dispose()
} catch { Check "certificate" $false $_.Exception.Message }

$file = Join-Path $Out ("outside-check-{0}.txt" -f (Get-Date -Format "yyyy-MM-dd"))
$fails = ($lines | Where-Object { $_ -like "FAIL*" }).Count
$lines.Insert(0, ("wodx.online outside check {0}: {1} of {2} passed" -f (Get-Date -Format "u"), ($lines.Count - $fails), $lines.Count))
$lines | Set-Content -Path $file -Encoding UTF8
$lines | ForEach-Object { Write-Output $_ }
