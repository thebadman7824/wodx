---
bump: patch
---
The approval queue makes its changes one at a time: a proposal made while another was being queued or decided (a clock hook queueing its own as time passed) could be dropped from the queue; now neither is lost (B5861).
