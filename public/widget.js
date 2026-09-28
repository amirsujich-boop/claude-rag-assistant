/* Drop-in chat widget. Add to any page:
   <script src="https://your-host/widget.js" data-endpoint="https://your-host/api/chat" data-title="Ask us"></script>
*/
(function () {
  const script = document.currentScript;
  const endpoint = script.getAttribute("data-endpoint") || "/api/chat";
  const title = script.getAttribute("data-title") || "Ask us";
  const accent = script.getAttribute("data-accent") || "#1d1a14";

  const css = `
  .ra-btn{position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:50%;border:0;background:${accent};color:#fff;font-size:22px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.2);z-index:9998}
  .ra-box{position:fixed;right:20px;bottom:88px;width:360px;max-width:calc(100vw - 40px);height:480px;max-height:calc(100vh - 120px);background:#fff;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.22);display:none;flex-direction:column;overflow:hidden;font:15px/1.4 system-ui,sans-serif;z-index:9999}
  .ra-box.open{display:flex}
  .ra-head{padding:14px 16px;background:${accent};color:#fff;font-weight:600}
  .ra-log{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
  .ra-m{max-width:85%;padding:10px 12px;border-radius:12px;white-space:pre-wrap}
  .ra-u{align-self:flex-end;background:#eef0f3}
  .ra-a{align-self:flex-start;background:#f7f4ec}
  .ra-src{font-size:12px;color:#777;margin-top:6px}
  .ra-form{display:flex;border-top:1px solid #eee}
  .ra-form input{flex:1;border:0;padding:12px 14px;font:inherit;outline:none}
  .ra-form button{border:0;background:${accent};color:#fff;padding:0 16px;cursor:pointer}
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const btn = document.createElement("button");
  btn.className = "ra-btn";
  btn.setAttribute("aria-label", title);
  btn.textContent = "?";

  const box = document.createElement("div");
  box.className = "ra-box";
  box.innerHTML = `<div class="ra-head">${title}</div><div class="ra-log"></div>
    <form class="ra-form"><input placeholder="Type your question…" autocomplete="off" maxlength="2000"><button type="submit">Send</button></form>`;

  document.body.append(btn, box);
  const log = box.querySelector(".ra-log");
  const form = box.querySelector("form");
  const input = form.querySelector("input");
  const history = [];

  btn.onclick = () => { box.classList.toggle("open"); if (box.classList.contains("open")) input.focus(); };

  function add(role, text, sources) {
    const el = document.createElement("div");
    el.className = "ra-m " + (role === "user" ? "ra-u" : "ra-a");
    el.textContent = text;
    if (sources && sources.length) {
      const s = document.createElement("div");
      s.className = "ra-src";
      s.textContent = "Source: " + [...new Set(sources.map((x) => x.source))].join(", ");
      el.appendChild(s);
    }
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  form.onsubmit = async (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    input.value = "";
    add("user", q);
    history.push({ role: "user", content: q });
    const pending = add("assistant", "…");
    try {
      const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q, history: history.slice(0, -1) }) });
      const data = await r.json();
      pending.remove();
      add("assistant", data.answer || data.error || "Something went wrong.", data.sources);
      if (data.answer) history.push({ role: "assistant", content: data.answer });
    } catch {
      pending.textContent = "Connection problem. Please try again.";
    }
  };
})();
