# WoDX Export: one click to save this map, or every map in its folder, as a Universal VTT file next to the map
# (100 px a square, grid and lighting off). The WoDX map watcher on this PC picks the files up and makes the scenes
# in Foundry. A tool under Settings in the left-hand tool bar.
var script_class = "tool"

const PPI = 100
const QUEUE = "user://wodx-export-queue.json"
const TICK = 0.5
const OPEN_TIMEOUT = 180.0
const EXPORT_TIMEOUT = 600.0

var timer = null
var status = null
var state = ""          # "", "open", "settle", "wait"
var batch = false
var queue = {}
var target = ""
var out = ""
var old_time = 0
var last_size = -1
var since = 0.0
var opened = false
var grid_was = true
var light_was = true

func start():
	var icon = Global.Root + "icon.png"
	var panel = Global.Editor.Toolset.CreateModTool(self, "Settings", "WoDXExport", "WoDX Export", icon)
	panel.CreateNote("Saves a Universal VTT file next to the map, 100 px a square, grid and lighting off. The WoDX map watcher takes it into Foundry.")
	var one = panel.CreateButton("Export this map", icon)
	one.connect("pressed", self, "_export_this")
	var all = panel.CreateButton("Export every map in this folder", icon)
	all.connect("pressed", self, "_export_folder")
	var stop = panel.CreateButton("Stop", "")
	stop.connect("pressed", self, "_stop")
	status = panel.CreateButton("Ready", "")
	status.disabled = true
	var host = Global.Editor
	if not (host is Node):
		host = Global.World
	# Dungeondraft may load this script again when a map opens: retire the older copy's timer
	var old = host.get_node_or_null("WoDXExportTimer")
	if old != null:
		old.stop()
		old.name = "WoDXExportTimerOld"
		old.queue_free()
	timer = Timer.new()
	timer.name = "WoDXExportTimer"
	timer.wait_time = TICK
	host.add_child(timer)
	timer.connect("timeout", self, "_tick")
	timer.start()
	_resume()

func _say(s):
	if status != null:
		status.text = s

func _norm(p):
	return str(p).replace("\\", "/").to_lower()

func _current():
	return str(Global.Editor.CurrentMapFile)

# ---------- the queue, kept in a file so a batch carries on if the script is loaded again ----------

func _save_queue():
	var f = File.new()
	if f.open(QUEUE, File.WRITE) == OK:
		f.store_string(JSON.print(queue))
		f.close()

func _clear_queue():
	queue = {}
	var d = Directory.new()
	if d.file_exists(QUEUE):
		d.remove(QUEUE)

func _resume():
	var f = File.new()
	if not f.file_exists(QUEUE):
		return
	if f.open(QUEUE, File.READ) != OK:
		return
	var got = JSON.parse(f.get_as_text())
	f.close()
	if got.error == OK and typeof(got.result) == TYPE_DICTIONARY and got.result.has("maps"):
		queue = got.result
		batch = true
		_next()

# ---------- buttons ----------

func _export_this():
	var path = _current()
	if path == "":
		_say("Save the map first")
		return
	batch = false
	target = path
	_begin_export()

func _export_folder():
	var path = _current()
	if path == "":
		_say("Open a map in the folder first")
		return
	var dir = path.get_base_dir()
	var maps = []
	var d = Directory.new()
	if d.open(dir) != OK:
		_say("That folder could not be read")
		return
	d.list_dir_begin(true, true)
	var n = d.get_next()
	while n != "":
		if not d.current_is_dir() and n.to_lower().ends_with(".dungeondraft_map"):
			var m = dir + "/" + n
			if _needs_export(m):
				maps.append(m)
		n = d.get_next()
	d.list_dir_end()
	maps.sort()
	if maps.empty():
		_say("Every map here is already exported")
		return
	queue = {"maps": maps, "i": 0, "done": 0, "failed": []}
	batch = true
	_save_queue()
	_next()

func _stop():
	_clear_queue()
	batch = false
	state = ""
	_restore()
	_say("Stopped")

# A map needs exporting when it has no Universal VTT file yet, or the map was saved after it
func _needs_export(m):
	var f = File.new()
	var v = m.get_basename() + ".dd2vtt"
	if not f.file_exists(v):
		return true
	return f.get_modified_time(m) > f.get_modified_time(v)

# ---------- the steps, one each tick ----------

func _next():
	var i = int(queue.get("i", 0))
	var maps = queue.get("maps", [])
	if i >= maps.size():
		var failed = queue.get("failed", [])
		_say("Done: %d exported%s" % [int(queue.get("done", 0)), "" if failed.empty() else ", %d failed" % failed.size()])
		_clear_queue()
		batch = false
		state = ""
		return
	target = maps[i]
	_say("Map %d of %d: opening %s" % [i + 1, maps.size(), target.get_file()])
	state = "open"
	opened = false
	since = 0.0

func _advance(ok):
	if ok:
		queue["done"] = int(queue.get("done", 0)) + 1
	else:
		var failed = queue.get("failed", [])
		failed.append(target)
		queue["failed"] = failed
	queue["i"] = int(queue.get("i", 0)) + 1
	_save_queue()
	_next()

func _begin_export():
	state = "settle"
	since = 0.0

func _tick():
	since += TICK
	if state == "open":
		if _norm(_current()) == _norm(target):
			_begin_export()
		elif not opened:
			opened = true
			Global.Editor.ForceOpenMap(target)
		elif since > OPEN_TIMEOUT:
			_advance(false)
	elif state == "settle":
		# give the canvas a moment to finish drawing before the export starts
		if since >= 3.0:
			_start_export()
	elif state == "wait":
		_check_export()

func _start_export():
	out = target.get_basename() + ".dd2vtt"
	var f = File.new()
	old_time = f.get_modified_time(out) if f.file_exists(out) else 0
	last_size = -1
	grid_was = Global.Editor.GridToggle.pressed if Global.Editor.GridToggle != null else true
	light_was = Global.Editor.LightingToggle.pressed if Global.Editor.LightingToggle != null else true
	Global.Editor.ToggleGrid(false)
	Global.Editor.ToggleLighting(false)
	_say("Exporting %s" % out.get_file())
	Global.Exporter.Start(3, PPI, out)
	state = "wait"
	since = 0.0

func _restore():
	Global.Editor.ToggleGrid(grid_was)
	Global.Editor.ToggleLighting(light_was)

# The export runs on its own thread: it is finished when the file is new and its size stops changing
func _check_export():
	var f = File.new()
	var path = out
	if not f.file_exists(path) and f.file_exists(out + ".dd2vtt"):
		path = out + ".dd2vtt"
	if f.file_exists(path) and f.get_modified_time(path) > old_time:
		var size = 0
		if f.open(path, File.READ) == OK:
			size = f.get_len()
			f.close()
		if size > 0 and size == last_size:
			_restore()
			if batch:
				_advance(true)
			else:
				state = ""
				_say("Saved %s" % path.get_file())
			return
		last_size = size
	if since > EXPORT_TIMEOUT:
		_restore()
		if batch:
			_advance(false)
		else:
			state = ""
			_say("The export did not finish")
