# Security settings for Live and the PC testbeds

From the Security Desk, approved by Ben on 13 November 2026. Live is wodx.online (DigitalOcean droplet, Ubuntu 24.04, Foundry 14 behind Caddy).

| File | Goes to (on Live) | What it does |
|---|---|---|
| `../perf/Caddyfile.wodx` | `/etc/caddy/Caddyfile` | Security headers, blocks `/setup` and `/api/status`, JSON access log for fail2ban |
| `fail2ban/wodx-foundry.conf` | `/etc/fail2ban/filter.d/wodx-foundry.conf` | Counts blocked Setup and status requests and failed `/join` logins |
| `fail2ban/wodx.local` | `/etc/fail2ban/jail.d/wodx.local` | One-hour bans that grow for repeat offenders, for SSH and the site |
| `sshd-wodx.conf` | `/etc/ssh/sshd_config.d/10-wodx.conf` | Keys only, no X11 or agent forwarding, local port forwarding only, 3 tries |
| `foundry-hardening.conf` | `/etc/systemd/system/foundry.service.d/hardening.conf` | Read-only file system for Foundry except its data folder |
| `outside-check.ps1` | Ben's PC | Weekly read-only check of ports, headers, blocked paths and the certificate |

## Reaching the Setup screen

Caddy refuses `/setup` to the internet. To use it, open a tunnel from the PC and use the local address:

    ssh -L 30000:localhost:30000 root@wodx.online
    (then, in the browser on the PC) http://localhost:30000/setup

Close the tunnel window when done. Foundry starts rothenstein-live by itself after a reboot, so the tunnel is only needed to change worlds or after a crash.

## Applying a change on Live

Claude cannot SSH to Live (the PC's safety check refuses it), so Ben runs the commands. Each change backs up first: a droplet snapshot in the DigitalOcean panel, the world backup (`/usr/local/bin/wodx-backup`), and a tar of the config folders it touches. The dated command blocks are in the project files (`security-desk/`), each with an undo line per step.

To undo everything at once, restore the config tar and restart the services:

    tar xzf /opt/foundry/backups/pre-hardening-config-<date>.tar.gz -C /
    rm -f /etc/ssh/sshd_config.d/10-wodx.conf /etc/systemd/system/foundry.service.d/hardening.conf
    systemctl daemon-reload && systemctl restart ssh caddy fail2ban foundry

## Routine

- Before each game night (see `docs/LIVE-RELEASE-CHECKLIST.md`): look over Live's Users list, reboot if `/var/run/reboot-required` exists, snapshot before a release.
- Monthly, the day before a game night: patch day (`apt-get update && apt-get upgrade`, which covers Node and Caddy), reboot, check the site. A newer Foundry build goes on Live only after it passes on a testbed lane.
- Weekly: `outside-check.ps1` on the PC.
- Monthly: a restore drill of the newest Live backup on testbed lane 3.
