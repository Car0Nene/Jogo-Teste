extends SceneTree
## Benchmark dos impactos (Fase 1/3/7 da auditoria de desempenho).
## Mede, para cada evento, o pior frame logo após o golpe, o custo de CPU da chamada,
## pipelines compilados, nós/objetos/recursos criados e memória.
##
##   xvfb-run godot --path . [--rendering-method gl_compatibility] --script tools/bench_hits.gd -- <rótulo> [p1] [p2] [arena]
##
## Cenários: 10 golpes normais, 10 especiais, 3x dois especiais simultâneos,
## forma (Modo Fé/Monstrão) por 4 s, e combate CPU x CPU prolongado (20 s).
## Resultado: /tmp/bench_<rótulo>.json + resumo no console.

const WINDOW := 10          # frames observados após cada evento
const NORMAL_GAP := 45
const SPECIAL_GAP := 150

var label := "run"
var fight: Node
var frame := 0
var last_us := 0
var queue: Array = []        # [frame, kind, callable]
var watching: Array = []     # eventos em observação
var results: Array = []
var frame_ms: Array = []
var started := false
var start_frame := 0
var long_from := -1
var long_nodes0 := 0
var long_objs0 := 0


func _initialize() -> void:
	var a := OS.get_cmdline_user_args()
	label = a[0] if a.size() > 0 else "run"
	var game = root.get_node("Game")
	game.mode = 1   # VERSUS_CPU
	game.p1_fighter = StringName(a[1]) if a.size() > 1 else &"carlos"
	game.p2_fighter = StringName(a[2]) if a.size() > 2 else &"pedro"
	game.stage = StringName(a[3]) if a.size() > 3 else &"padaria"
	var st = root.get_node("Settings")
	st.data["touch"]["mode"] = 2
	st.data["game"]["timer"] = 9999
	if a.size() > 4:
		st.data["video"]["quality"] = int(a[4])
		st.apply()
	fight = load("res://scenes/fight.tscn").instantiate()
	root.add_child(fight)
	last_us = Time.get_ticks_usec()


func _pipelines() -> int:
	return int(Performance.get_monitor(Performance.PIPELINE_COMPILATIONS_CANVAS) + Performance.get_monitor(Performance.PIPELINE_COMPILATIONS_MESH) \
		+ Performance.get_monitor(Performance.PIPELINE_COMPILATIONS_SURFACE) + Performance.get_monitor(Performance.PIPELINE_COMPILATIONS_DRAW) \
		+ Performance.get_monitor(Performance.PIPELINE_COMPILATIONS_SPECIALIZATION))


func _snap() -> Dictionary:
	return {
		"nodes": int(Performance.get_monitor(Performance.OBJECT_NODE_COUNT)),
		"objs": int(Performance.get_monitor(Performance.OBJECT_COUNT)),
		"res": int(Performance.get_monitor(Performance.OBJECT_RESOURCE_COUNT)),
		"pipes": _pipelines(),
		"mem": int(Performance.get_monitor(Performance.MEMORY_STATIC)),
	}


func _schedule() -> void:
	var p1: Fighter = fight.p1
	var p2: Fighter = fight.p2
	var t := frame + 30
	var normals := [&"jab", &"cross", &"kick", &"hook", &"uppercut", &"jab", &"low_kick", &"high_kick", &"cross", &"sweep"]
	for i in normals.size():
		var mv: StringName = normals[i]
		queue.append([t, "normal_%02d_%s" % [i + 1, mv], func():
			_reset()
			var m := p1.data.move(mv)
			p2.take_hit(p1, m, p2.global_position + Vector3(0, 1.2, 0))])
		t += NORMAL_GAP
	for i in 10:
		var mv: StringName = &"special" if i % 2 == 0 else &"sub_special"
		queue.append([t, "special_%02d_%s" % [i + 1, mv], func():
			_reset()
			p1.meter = 100.0
			p1._start_move(mv)])
		t += SPECIAL_GAP
	for i in 3:
		queue.append([t, "duplo_%02d" % (i + 1), func():
			_reset()
			p1.meter = 100.0
			p2.meter = 100.0
			p1._start_move(&"special")
			p2._start_move(&"special")])
		t += SPECIAL_GAP
	queue.append([t, "forma_4s", func():
		_reset()
		if not p1.data.forms.is_empty():
			p1._set_form(p1.data.forms.keys()[0])])
	t += 240
	queue.append([t, "combate_longo_inicio", func():
		_reset()
		p1.controller = CpuController.new(2)
		p2.controller = CpuController.new(2)
		p1.controls_enabled = true
		p2.controls_enabled = true
		long_from = frame
		long_nodes0 = int(Performance.get_monitor(Performance.OBJECT_NODE_COUNT))
		long_objs0 = int(Performance.get_monitor(Performance.OBJECT_COUNT))])
	t += 1200
	queue.append([t, "fim", func(): _finish()])


func _reset() -> void:
	for f: Fighter in [fight.p1, fight.p2]:
		f.hp = f.data.max_hp
		f.controls_enabled = false
		if f.form != &"":
			f._set_form(&"")
	fight.p1.reset(-0.9, 1)
	fight.p2.reset(0.9, -1)


func _process(_d: float) -> bool:
	frame += 1
	var now := Time.get_ticks_usec()
	var ms := (now - last_us) / 1000.0
	last_us = now
	if not started:
		if fight.phase == 2 and fight.p1.state == 0 and fight.p2.state == 0:
			started = true
			start_frame = frame
			fight.p1.controls_enabled = false
			fight.p2.controls_enabled = false
			fight.time_left = 99999.0
			_schedule()
		return false
	frame_ms.append(ms)
	for w in watching:
		w.frames.append(ms)
	var done := watching.filter(func(w): return w.frames.size() >= WINDOW)
	for w in done:
		var s := _snap()
		results.append({
			"evento": w.kind, "logica_us": w.cpu_us,
			"pior_frame_ms": snappedf(w.frames.max(), 0.01),
			"media_frame_ms": snappedf(w.frames.reduce(func(x, y): return x + y, 0.0) / w.frames.size(), 0.01),
			"pipelines": s.pipes - w.s0.pipes, "nos": s.nodes - w.s0.nodes,
			"objetos": s.objs - w.s0.objs, "recursos": s.res - w.s0.res,
		})
		watching.erase(w)
	while not queue.is_empty() and queue[0][0] <= frame:
		var ev = queue.pop_front()
		var s0 := _snap()
		var t0 := Time.get_ticks_usec()
		ev[2].call()
		var cpu := Time.get_ticks_usec() - t0
		if ev[1] != "fim":
			watching.append({"kind": ev[1], "cpu_us": cpu, "s0": s0, "frames": []})
	return false


func _finish() -> void:
	var nodes_drift := int(Performance.get_monitor(Performance.OBJECT_NODE_COUNT)) - long_nodes0
	var objs_drift := int(Performance.get_monitor(Performance.OBJECT_COUNT)) - long_objs0
	var long_frames: Array = frame_ms.slice(long_from - start_frame)
	long_frames.sort()
	var p := func(q: float) -> float: return snappedf(long_frames[int(q * (long_frames.size() - 1))], 0.01) if long_frames.size() > 0 else 0.0
	var summary := {
		"rotulo": label, "renderer": RenderingServer.get_current_rendering_method(),
		"gpu": RenderingServer.get_video_adapter_name(),
		"combate_longo": {"frames": long_frames.size(), "p50_ms": p.call(0.5), "p95_ms": p.call(0.95), "p99_ms": p.call(0.99),
			"max_ms": p.call(1.0), "deriva_nos": nodes_drift, "deriva_objetos": objs_drift},
		"memoria_mb": snappedf(Performance.get_monitor(Performance.MEMORY_STATIC) / 1048576.0, 0.1),
		"vram_mb": snappedf(Performance.get_monitor(Performance.RENDER_VIDEO_MEM_USED) / 1048576.0, 0.1),
		"eventos": results,
	}
	var fa := FileAccess.open("/tmp/bench_%s.json" % label, FileAccess.WRITE)
	fa.store_string(JSON.stringify(summary, "  "))
	fa.close()
	print("== BENCH %s | %s | %s" % [label, summary.renderer, summary.gpu])
	print("evento                      logica_us  pior_ms  media_ms  pipes  nos  objs  recursos")
	for r in results:
		print("%-27s %9d %8.2f %9.2f %6d %4d %5d %9d" % [r.evento, r.logica_us, r.pior_frame_ms, r.media_frame_ms, r.pipelines, r.nos, r.objetos, r.recursos])
	print("combate longo: ", summary.combate_longo, " mem=", summary.memoria_mb, "MB vram=", summary.vram_mb, "MB")
	quit()
