/* HUMANOVA · live board.
   Read-only chain reads over public BSC RPCs (first answer wins).
   Pulses seal at 00:00 UTC; claim phases open every 6 hours.
   The hero ECG is drawn from live counts: more Heartbeats today,
   denser rhythm; more humans, taller spikes. */
(function () {
  "use strict";
  var cfg = window.HUMANOVA_CONFIG || {};
  var C = cfg.contracts || {};
  var SEL = {
    currentPulse: "0x640c1e47", totalBeats: "0xde92dbd7",
    beatsInPulse: "0xdddab480", participantsOf: "0xe200c857",
    verdictOf: "0xbcaa6cf7", pulseOf: "0x22a6f20d",
    isGolden: "0x35606f25", totalClaimed: "0xd54ad2a1",
    claimable: "0xd1d58b25", claimAmount: "0x23b221a0",
    feeFor: "0xad6f49a3", balanceOf: "0x70a08231"
  };
  var state = { pulse: 0, beatsToday: 0, humansToday: 0, totalBeats: 0, claimed: 0, live: false };

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmtClock(ms) {
    if (ms < 0) ms = 0;
    var s = Math.floor(ms / 1000);
    return pad(Math.floor(s / 3600)) + ":" + pad(Math.floor((s % 3600) / 60)) + ":" + pad(s % 60);
  }
  function fmtNum(n) { return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function setText(id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; }
  function encUint(n) { return n.toString(16).padStart(64, "0"); }
  function encAddr(a) { return a.toLowerCase().replace("0x", "").padStart(64, "0"); }

  function rpcCall(to, data) {
    var body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: to, data: data }, "latest"] });
    var tries = (cfg.rpcs || []).map(function (url) {
      var ctl = ("AbortController" in window) ? new AbortController() : null;
      var timer = ctl ? setTimeout(function () { ctl.abort(); }, 4500) : null;
      return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body, signal: ctl ? ctl.signal : undefined })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (timer) clearTimeout(timer);
          if (!j || !j.result || j.result === "0x") throw new Error("empty");
          return BigInt(j.result);
        });
    });
    return Promise.any ? Promise.any(tries) : tries[0];
  }

  function verdictName(v) { return ["Pending", "Flatline", "Steady", "Racing"][v] || "Pending"; }

  function refresh() {
    if (!C.beats) return;
    rpcCall(C.beats, SEL.currentPulse).then(function (pulse) {
      state.pulse = Number(pulse);
      var jobs = [
        rpcCall(C.beats, SEL.totalBeats).then(function (v) { state.totalBeats = Number(v); }),
        rpcCall(C.claim, SEL.totalClaimed).then(function (v) { state.claimed = Number(v); }),
        rpcCall(C.token, SEL.balanceOf + encAddr(C.claim)).then(function (v) {
          setText("claim-pool", fmtNum(Math.floor(Number(v / (10n ** 18n)))) + " HUMAN");
        })
      ];
      if (state.pulse >= 1) {
        jobs.push(rpcCall(C.beats, SEL.beatsInPulse + encUint(BigInt(state.pulse))).then(function (v) { state.beatsToday = Number(v); }));
        jobs.push(rpcCall(C.beats, SEL.participantsOf + encUint(BigInt(state.pulse))).then(function (v) { state.humansToday = Number(v); }));
      }
      return Promise.all(jobs).then(function () {
        state.live = true;
        paint();
      });
    }).catch(function () { /* keep last paint */ });
  }

  function paint() {
    var now = Date.now();
    var started = now >= (cfg.genesis || 0) * 1000;
    setText("h-status", started ? "Pulse Nº " + Math.max(1, state.pulse) + " · Live" : "Pulse 1 · Opens 00:00 UTC");
    setText("board-status", started ? "Live on BNB Chain" : "Genesis · Pulse 1 opens 17 Nov, 00:00 UTC");
    setText("b-pulse", started ? "Nº " + Math.max(1, state.pulse) + " · LIVE" : "Nº 1 · SOON");
    setText("p-pulse", started ? "Pulse Nº " + Math.max(1, state.pulse) : "Pulse Nº 1");
    setText("b-beats", fmtNum(state.beatsToday));
    setText("b-humans", fmtNum(state.humansToday));
    setText("p-beats", fmtNum(state.beatsToday));
    setText("p-humans", fmtNum(state.humansToday));
    setText("p-total", fmtNum(state.totalBeats));
    setText("claim-total", fmtNum(state.claimed));
    var gauge = document.getElementById("p-gauge-fill");
    if (gauge) gauge.style.width = Math.min(100, (state.humansToday / 101) * 100) + "%";
    var live1 = state.humansToday < 25 ? "Flatline pace" : (state.humansToday <= 100 ? "Steady pace" : "Racing pace");
    setText("p-verdict", started ? live1 : "Unwritten");
    setText("ecg-state", started ? (state.humansToday <= 100 ? (state.humansToday < 25 ? "FLATLINE PACE" : "STEADY") : "RACING") : "STANDBY");
  }

  /* ---------- clocks ---------- */
  function nextUtcMidnight(now) {
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  }
  function nextPhase(now) {
    var step = 6 * 3600 * 1000;
    var dayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return dayStart + (Math.floor((now.getTime() - dayStart) / step) + 1) * step;
  }
  function paintPhases(now) {
    var idx = Math.floor(now.getUTCHours() / 6);
    document.querySelectorAll(".phase-chip").forEach(function (chip, i) {
      chip.classList.toggle("on", i === idx);
    });
    setText("phase-now-label", "Phase " + ["00:00", "06:00", "12:00", "18:00"][idx] + " UTC is open now");
  }
  function tick() {
    var now = new Date();
    var started = now.getTime() >= (cfg.genesis || 0) * 1000;
    var target = started ? nextUtcMidnight(now) : (cfg.genesis || 0) * 1000;
    setText("seal-count", fmtClock(target - now.getTime()));
    setText("b-seal", fmtClock(target - now.getTime()));
    setText("phase-count", fmtClock(nextPhase(now) - now.getTime()));
    paintPhases(now);
  }

  /* ---------- hero ECG ---------- */
  var canvas = document.getElementById("ecg");
  if (canvas) {
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, t0 = performance.now();
    function size() {
      var r = canvas.getBoundingClientRect();
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(300, r.width); H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    window.addEventListener("resize", size);
    function waveY(x, spikes, amp, phase) {
      var seg = W / spikes;
      var pos = ((x + phase) % seg) / seg;
      var base = H * 0.58;
      var shape = [[0, 0], [0.30, 0], [0.38, -0.12], [0.46, 0], [0.52, 0.10], [0.58, -1], [0.64, 0.28], [0.70, 0], [0.80, -0.18], [0.88, 0], [1, 0]];
      for (var i = 0; i < shape.length - 1; i++) {
        if (pos >= shape[i][0] && pos <= shape[i + 1][0]) {
          var f = (pos - shape[i][0]) / Math.max(0.0001, shape[i + 1][0] - shape[i][0]);
          return base + (shape[i][1] + (shape[i + 1][1] - shape[i][1]) * f) * amp;
        }
      }
      return base;
    }
    function draw(now) {
      var elapsed = (now - t0) / 1000;
      var spikes = 6 + Math.min(22, Math.floor(state.beatsToday / 6));
      var amp = H * (0.20 + Math.min(0.22, state.humansToday / 460));
      var phase = (elapsed * 46) % (W / spikes);
      ctx.clearRect(0, 0, W, H);
      ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.beginPath();
      for (var x = 0; x <= W; x += 3) {
        var y = waveY(x, spikes, amp, phase);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(255,77,61,.28)"; ctx.lineWidth = 7; ctx.stroke();
      ctx.strokeStyle = "#ff4d3d"; ctx.lineWidth = 2.4; ctx.stroke();
      var hx = W * 0.82, hy = waveY(hx, spikes, amp, phase);
      ctx.beginPath(); ctx.arc(hx, hy, 4, 0, Math.PI * 2); ctx.fillStyle = "#faf3ea"; ctx.fill();
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  /* ---------- claim checker ---------- */
  var form = document.getElementById("checker-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = document.getElementById("checker-id").value.trim();
      var out = document.getElementById("checker-out");
      if (!/^\d+$/.test(v) || Number(v) < 1) { out.textContent = "Type a Heartbeat number first."; return; }
      var id = BigInt(v);
      out.textContent = "Reading chain…";
      rpcCall(C.beats, SEL.pulseOf + encUint(id)).then(function (pulse) {
        if (pulse === 0n) { out.innerHTML = "Heartbeat <b>#" + v + "</b> has not been minted yet."; return null; }
        return Promise.all([
          rpcCall(C.beats, SEL.verdictOf + encUint(pulse)),
          rpcCall(C.beats, SEL.isGolden + encUint(id)),
          rpcCall(C.claim, SEL.claimable + encUint(id)),
          rpcCall(C.claim, SEL.claimAmount + encUint(id)),
          rpcCall(C.claim, SEL.feeFor + encUint(id))
        ]).then(function (rs) {
          var amount = fmtNum(Math.floor(Number(rs[3] / (10n ** 18n))));
          var fee = (Number(rs[4]) / 1e18).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
          var cls = rs[1] === 1n ? "Golden Heart" : verdictName(Number(rs[0])) + " verdict";
          if (rs[2] === 1n) {
            out.innerHTML = "Heartbeat <b>#" + v + "</b> · Pulse " + pulse.toString() + " · " + cls + " · claimable now for <b>" + amount + " HUMAN</b> (fee " + fee + " BNB). Claim it through your agent.";
          } else {
            out.innerHTML = "Heartbeat <b>#" + v + "</b> · Pulse " + pulse.toString() + " · " + cls + " · worth <b>" + amount + " HUMAN</b>, not claimable yet. A Pulse seals at 00:00 UTC and matures one claim phase later.";
          }
        });
      }).catch(function () { out.textContent = "Chain read failed. Try again in a moment."; });
    });
  }

  paint();
  tick();
  setInterval(tick, 1000);
  refresh();
  setInterval(refresh, 30000);
})();
