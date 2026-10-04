/* Forever-Karte: eigene, stilisierte Gebiete. Keine Blizzard-Grafik. */
(function () {
  "use strict";

  const SCHWARZFELS = [
    { name: "Schwarzfelstiefen", min: 52, max: 60 },
    { name: "Untere Schwarzfelsspitze", min: 55, max: 60 },
    { name: "Obere Schwarzfelsspitze", min: 55, max: 60 },
    { name: "Geschmolzener Kern", min: 60, max: 60, raid: true },
    { name: "Pechschwingenhort", min: 60, max: 60, raid: true },
  ];

  function zone(id, name, lines, min, max, faction, box, seed, extra) {
    const item = {
      id: id,
      name: name,
      lines: lines,
      min: min,
      max: max,
      faction: faction,
      box: box,
      seed: seed,
      instances: [],
      mark: "",
      note: "",
      instanceNote: "",
    };
    if (extra) {
      Object.keys(extra).forEach(function (key) {
        item[key] = extra[key];
      });
    }
    item.band = bandOf(item);
    item.pts = item.points || blob(item.box, item.seed);
    return item;
  }

  const EK = [
    zone("tirisfal", "Tirisfal", ["Tirisfal"], 1, 10, "Horde", [26, 18, 186, 108], 3, {
      mark: "forest",
      instances: [{ name: "Scharlachrotes Kloster", min: 30, max: 45 }],
    }),
    zone("wpl", "Westliche Pestländer", ["Westliche", "Pestländer"], 51, 58, "umkämpft", [230, 14, 176, 106], 8, {
      mark: "plague",
      instances: [{ name: "Scholomance", min: 58, max: 60 }],
    }),
    zone("epl", "Östliche Pestländer", ["Östliche", "Pestländer"], 53, 60, "umkämpft", [420, 16, 194, 116], 5, {
      mark: "plague",
      instances: [
        { name: "Stratholme", min: 58, max: 60 },
        { name: "Naxxramas", min: 60, max: 60, raid: true, where: "über der Zone" },
      ],
    }),
    zone("silberwald", "Silberwald", ["Silberwald"], 10, 20, "Horde", [22, 140, 178, 104], 2, {
      mark: "forest",
      instances: [{ name: "Burg Schattenfang", min: 22, max: 30 }],
    }),
    zone("alterac", "Alteracgebirge", ["Alterac"], 30, 40, "umkämpft", [214, 136, 166, 108], 11, {
      mark: "mountain",
    }),
    zone("hinterland", "Hinterland", ["Hinterland"], 40, 50, "umkämpft", [394, 146, 220, 104], 6, {
      mark: "forest",
    }),
    zone("hillsbrad", "Vorgebirge des Hügellands", ["Hügelland"], 20, 30, "umkämpft", [26, 258, 204, 100], 4, {}),
    zone("arathi", "Arathihochland", ["Arathi"], 30, 40, "umkämpft", [244, 258, 248, 104], 9, {}),
    zone("dunmorogh", "Dun Morogh", ["Dun Morogh"], 1, 10, "Allianz", [18, 376, 196, 114], 7, {
      mark: "mountain",
      instances: [{ name: "Gnomeregan", min: 29, max: 38 }],
    }),
    zone("wetlands", "Sumpfland", ["Sumpfland"], 20, 30, "Allianz", [228, 376, 250, 104], 13, {
      mark: "swamp",
    }),
    zone("searing", "Sengende Schlucht", ["Sengende", "Schlucht"], 43, 50, "umkämpft", [18, 506, 168, 96], 15, {
      mark: "lava",
      instances: SCHWARZFELS,
      instanceNote: "Im Schwarzfels. Der Berg hat auch einen Zugang von der Brennenden Steppe.",
    }),
    zone("loch", "Loch Modan", ["Loch Modan"], 10, 20, "Allianz", [200, 496, 174, 106], 10, {
      mark: "mountain",
    }),
    zone("badlands", "Ödland", ["Ödland"], 35, 45, "umkämpft", [388, 494, 226, 112], 12, {
      mark: "desert",
      instances: [{ name: "Uldaman", min: 41, max: 51 }],
    }),
    zone("burning", "Brennende Steppe", ["Brennende", "Steppe"], 50, 58, "umkämpft", [16, 618, 200, 100], 16, {
      mark: "lava",
      instances: SCHWARZFELS,
      instanceNote: "Im Schwarzfels. Der Berg hat auch einen Zugang von der Sengenden Schlucht.",
    }),
    zone("swamp", "Sümpfe des Elends", ["Sümpfe", "des Elends"], 35, 45, "umkämpft", [340, 622, 150, 104], 18, {
      mark: "swamp",
      instances: [{ name: "Tempel von Atal'Hakkar", min: 50, max: 60 }],
    }),
    zone("blasted", "Verwüstete Lande", ["Verwüstete", "Lande"], 45, 55, "umkämpft", [504, 612, 116, 124], 21, {
      mark: "desert",
    }),
    zone("elwynn", "Wald von Elwynn", ["Elwynn"], 1, 10, "Allianz", [14, 748, 176, 90], 1, {
      mark: "forest",
      instances: [{ name: "Das Verlies", min: 24, max: 32, where: "in Sturmwind" }],
    }),
    zone("redridge", "Rotkammgebirge", ["Rotkamm"], 15, 25, "Allianz", [204, 744, 150, 92], 14, {
      mark: "mountain",
    }),
    zone("deadwind", "Gebirgspass der Totenwinde", ["Totenwinde"], 55, 60, "umkämpft", [368, 752, 124, 86], 19, {}),
    zone("westfall", "Westfall", ["Westfall"], 10, 20, "Allianz", [12, 854, 156, 86], 17, {
      instances: [{ name: "Todesminen", min: 17, max: 26 }],
    }),
    zone("duskwood", "Dämmerwald", ["Dämmerwald"], 18, 30, "Allianz", [182, 852, 198, 88], 20, {
      mark: "forest",
    }),
    zone("stv", "Schlingendorntal", ["Schlingendorn"], 30, 45, "umkämpft", [16, 956, 372, 96], 22, {
      mark: "forest",
      instances: [{ name: "Zul'Gurub", min: 60, max: 60, raid: true }],
    }),
  ];

  const KAL = [
    zone("teldrassil", "Teldrassil", ["Teldrassil"], 1, 10, "Allianz", [18, 16, 150, 96], 2, {
      mark: "forest",
    }),
    zone("moonglade", "Mondlichtung", ["Mondlichtung"], 1, 60, "Neutral", [196, 22, 152, 80], 4, {
      mark: "forest",
      note: "Neutraler Treffpunkt für Druiden. In jedem Level.",
    }),
    zone("winterspring", "Winterquell", ["Winterquell"], 53, 60, "umkämpft", [372, 14, 242, 112], 6, {
      mark: "snow",
    }),
    zone("darkshore", "Dunkelküste", ["Dunkelküste"], 10, 20, "Allianz", [18, 128, 168, 114], 8, {
      mark: "forest",
    }),
    zone("felwood", "Teufelswald", ["Teufelswald"], 48, 55, "umkämpft", [200, 118, 156, 116], 3, {
      mark: "forest",
    }),
    zone("azshara", "Azshara", ["Azshara"], 45, 55, "umkämpft", [384, 142, 230, 112], 9, {}),
    zone("ashenvale", "Eschental", ["Eschental"], 18, 30, "umkämpft", [18, 258, 266, 112], 5, {
      mark: "forest",
      instances: [{ name: "Tiefschwarze Grotte", min: 24, max: 32 }],
    }),
    zone("durotar", "Durotar", ["Durotar"], 1, 10, "Horde", [472, 270, 146, 126], 7, {
      mark: "desert",
      instances: [{ name: "Flammenschlund", min: 13, max: 18, where: "in Orgrimmar" }],
    }),
    zone("stonetalon", "Steinkrallengebirge", ["Steinkrallen"], 15, 27, "umkämpft", [18, 386, 156, 114], 11, {
      mark: "mountain",
    }),
    zone("barrens", "Brachland", ["Brachland"], 10, 25, "Horde", null, 1, {
      mark: "desert",
      points: [[190, 384], [446, 368], [456, 470], [448, 560], [430, 628], [314, 636], [306, 516], [188, 508]],
      instances: [
        { name: "Höhlen des Wehklagens", min: 17, max: 24 },
        { name: "Kral der Klingenhauer", min: 29, max: 38 },
        { name: "Hügel der Klingenhauer", min: 37, max: 46 },
      ],
    }),
    zone("desolace", "Desolace", ["Desolace"], 30, 40, "umkämpft", [18, 516, 126, 120], 13, {
      mark: "desert",
      instances: [{ name: "Maraudon", min: 46, max: 55 }],
    }),
    zone("mulgore", "Mulgore", ["Mulgore"], 1, 10, "Horde", [158, 526, 136, 110], 10, {
      mark: "mountain",
    }),
    zone("dustwallow", "Düstermarschen", ["Düster-", "marschen"], 35, 45, "umkämpft", [474, 414, 146, 138], 12, {
      mark: "swamp",
      instances: [{ name: "Onyxias Hort", min: 60, max: 60, raid: true }],
    }),
    zone("thousand", "Tausend Nadeln", ["Tausend", "Nadeln"], 25, 35, "Horde", [168, 652, 250, 88], 14, {
      mark: "desert",
    }),
    zone("feralas", "Feralas", ["Feralas"], 40, 50, "umkämpft", [16, 652, 140, 124], 16, {
      mark: "forest",
      instances: [{ name: "Düsterbruch", min: 55, max: 60 }],
    }),
    zone("tanaris", "Tanaris", ["Tanaris"], 40, 50, "umkämpft", [460, 568, 160, 164], 18, {
      mark: "desert",
      instances: [{ name: "Zul'Farrak", min: 44, max: 54 }],
    }),
    zone("silithus", "Silithus", ["Silithus"], 55, 60, "umkämpft", [16, 792, 156, 110], 15, {
      mark: "desert",
      instances: [
        { name: "Ruinen von Ahn'Qiraj", min: 60, max: 60, raid: true },
        { name: "Tempel von Ahn'Qiraj", min: 60, max: 60, raid: true },
      ],
    }),
    zone("ungoro", "Krater von Un'Goro", ["Un'Goro"], 48, 55, "umkämpft", [188, 756, 236, 118], 17, {
      mark: "forest",
    }),
  ];

  const MAPS = {
    ek: { name: "Östliche Königreiche", zones: EK },
    kal: { name: "Kalimdor", zones: KAL },
  };

  const BANDS = [
    { id: "green", label: "Grün: Level 1–20" },
    { id: "yellow", label: "Gelb: Level 20–40" },
    { id: "orange", label: "Orange: Level 40–55" },
    { id: "red", label: "Rot: Level 50–60" },
    { id: "all", label: "Lila: alle Level" },
  ];

  const pinned = { ek: "", kal: "" };

  function bandOf(item) {
    if (item.min <= 1 && item.max >= 60) return "all";
    if (item.max <= 20) return "green";
    if (item.max <= 40) return "yellow";
    if (item.min >= 50) return "red";
    return "orange";
  }

  function frac(value) {
    return value - Math.floor(value);
  }

  function blob(box, seed) {
    const x = box[0];
    const y = box[1];
    const w = box[2];
    const h = box[3];
    const n = 7 + (Math.abs(seed) % 3);
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rx = w / 2 - 1;
    const ry = h / 2 - 1;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const wobble = 0.8 + 0.2 * frac(Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453);
      pts.push([
        Math.round(cx + Math.cos(angle) * rx * wobble),
        Math.round(cy + Math.sin(angle) * ry * wobble),
      ]);
    }
    return pts;
  }

  function rangeText(min, max) {
    return min === max ? String(min) : min + "–" + max;
  }

  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function centroid(pts) {
    let x = 0;
    let y = 0;
    pts.forEach(function (pt) {
      x += pt[0];
      y += pt[1];
    });
    return [x / pts.length, y / pts.length];
  }

  function bbox(pts) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    pts.forEach(function (pt) {
      minX = Math.min(minX, pt[0]);
      minY = Math.min(minY, pt[1]);
      maxX = Math.max(maxX, pt[0]);
      maxY = Math.max(maxY, pt[1]);
    });
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  function inside(p, pts) {
    let hit = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i][0];
      const yi = pts[i][1];
      const xj = pts[j][0];
      const yj = pts[j][1];
      if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  }

  function pathFrom(pts) {
    return "M" + pts.map(function (pt) { return pt[0] + " " + pt[1]; }).join(" L") + " Z";
  }

  function factionLine(item) {
    if (item.faction === "Horde") return "Fraktion: Horde.";
    if (item.faction === "Allianz") return "Fraktion: Allianz.";
    if (item.faction === "Neutral") return "Fraktion: Neutral.";
    return "Fraktion: umkämpft.";
  }

  function instanceLine(inst) {
    const kind = inst.raid ? "Raid, " : "";
    const where = inst.where ? ", " + inst.where : "";
    return inst.name + " (" + kind + "Level " + rangeText(inst.min, inst.max) + where + ")";
  }

  function instanceShort(inst) {
    const kind = inst.raid ? "Raid, " : "";
    return inst.name + " (" + kind + rangeText(inst.min, inst.max) + ")";
  }

  function findZone(key, id) {
    const zones = MAPS[key].zones;
    for (let i = 0; i < zones.length; i++) {
      if (zones[i].id === id) return zones[i];
    }
    return null;
  }

  function infoHtml(item) {
    const parts = [
      '<h3 class="karte-info-title">' + esc(item.name) + "</h3>",
      '<p class="karte-info-level">Level ' + rangeText(item.min, item.max) + "</p>",
      "<p>" + esc(factionLine(item)) + "</p>",
    ];
    if (item.note) parts.push("<p>" + esc(item.note) + "</p>");
    if (item.instances.length) {
      parts.push('<h4 class="karte-info-sub">Instanzen</h4><ul class="karte-info-list">');
      item.instances.forEach(function (inst) {
        parts.push("<li>" + esc(instanceLine(inst)) + "</li>");
      });
      parts.push("</ul>");
      if (item.instanceNote) parts.push('<p class="karte-tip">' + esc(item.instanceNote) + "</p>");
    } else {
      parts.push("<p>Keine Instanz in diesem Gebiet.</p>");
    }
    return parts.join("");
  }

  function hintHtml() {
    return '<h3 class="karte-info-title">Gebiet wählen</h3><p>Tippe auf die Karte oder auf einen Namen in der Liste.</p>';
  }

  function viewBox(zones) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    zones.forEach(function (item) {
      item.pts.forEach(function (pt) {
        minX = Math.min(minX, pt[0]);
        minY = Math.min(minY, pt[1]);
        maxX = Math.max(maxX, pt[0]);
        maxY = Math.max(maxY, pt[1]);
      });
    });
    const pad = 46;
    return {
      x: minX - pad,
      y: minY - pad,
      w: maxX - minX + pad * 2,
      h: maxY - minY + pad * 2,
    };
  }

  function defs(key) {
    const stops = {
      green: ["#46b86a", "#1e6a36"],
      yellow: ["#f0c84a", "#c49212"],
      orange: ["#f08a32", "#c25412"],
      red: ["#e15a4e", "#9c2a28"],
      all: ["#b3a0e6", "#5c4a9a"],
    };
    let html = '<defs><linearGradient id="sea-' + key + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1b425c"/><stop offset="100%" stop-color="#0c141c"/></linearGradient>';
    Object.keys(stops).forEach(function (band) {
      html += '<linearGradient id="fill-' + key + "-" + band + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + stops[band][0] + '"/><stop offset="100%" stop-color="' + stops[band][1] + '"/></linearGradient>';
    });
    html += "</defs>";
    return html;
  }

  function waves(vb) {
    let html = "";
    for (let i = 0; i < 6; i++) {
      const y = Math.round(vb.y + 28 + i * (vb.h / 7));
      const x = Math.round(vb.x + 8);
      html += '<path class="karte-wave" d="M' + x + " " + y + " q 8 -5 16 0 t 16 0\"></path>";
    }
    return html;
  }

  function markSvg(item) {
    if (!item.mark) return "";
    const box = bbox(item.pts);
    if (box.w < 110 || box.h < 72) return "";
    const x = Math.round(box.x + 8);
    const y = Math.round(box.y + box.h - 22);
    const icons = {
      forest: '<g fill="rgba(8,36,16,0.5)"><circle cx="4" cy="8" r="5"/><circle cx="12" cy="10" r="4"/><circle cx="8" cy="3" r="4"/></g>',
      mountain: '<path fill="rgba(28,16,10,0.45)" d="M0 16 L8 2 L12 8 L18 0 L28 16 Z"/>',
      swamp: '<path fill="none" stroke="rgba(10,32,24,0.55)" stroke-width="1.6" d="M0 8 q 6 -6 12 0 t 12 0"/>',
      desert: '<g fill="rgba(48,28,8,0.5)"><circle cx="2" cy="8" r="1.5"/><circle cx="9" cy="4" r="1.3"/><circle cx="15" cy="9" r="1.5"/></g>',
      snow: '<g fill="rgba(255,255,255,0.7)"><circle cx="3" cy="4" r="1.6"/><circle cx="10" cy="9" r="1.4"/><circle cx="16" cy="3" r="1.5"/></g>',
      plague: '<path fill="none" stroke="rgba(36,18,12,0.55)" stroke-width="1.5" d="M6 16 L6 2 M6 7 L1 4 M6 6 L12 3 M6 11 L12 9"/>',
      lava: '<path fill="none" stroke="rgba(120,28,8,0.65)" stroke-width="1.7" d="M1 12 L8 6 L13 13 L22 3"/>',
    };
    return '<g transform="translate(' + x + " " + y + ')" aria-hidden="true">' + (icons[item.mark] || "") + "</g>";
  }

  function labelSvg(item) {
    const c = centroid(item.pts);
    const x = Math.round(c[0]);
    const y = Math.round(c[1]);
    const lines = item.lines;
    const size = lines.length > 1 ? 17 : 20;
    const dark = item.band === "yellow" ? " is-dark" : "";
    const gap = size + 3;
    const start = y - ((lines.length - 1) * gap) / 2;
    const tspans = lines.map(function (line, index) {
      return '<tspan x="' + x + '" y="' + (start + index * gap) + '">' + esc(line) + "</tspan>";
    }).join("");
    return '<text class="karte-label' + dark + '" font-size="' + size + '">' + tspans + "</text>";
  }

  function renderMap(key) {
    const data = MAPS[key];
    const vb = viewBox(data.zones);
    const coasts = [];
    const fills = [];
    const labels = [];
    const marks = [];
    data.zones.forEach(function (item) {
      const d = pathFrom(item.pts);
      const aria = item.name + ", Level " + rangeText(item.min, item.max) + ", " + item.faction;
      coasts.push('<path class="karte-coast" d="' + d + '"></path>');
      fills.push(
        '<path class="karte-zone" data-zone="' + item.id + '" data-band="' + item.band + '" d="' + d + '" tabindex="0" role="button" aria-pressed="false" aria-label="' + esc(aria) + '" fill="url(#fill-' + key + "-" + item.band + ')"><title>' + esc(item.name + ", Level " + rangeText(item.min, item.max)) + "</title></path>"
      );
      marks.push(markSvg(item));
      labels.push(labelSvg(item));
    });
    const svg =
      '<svg viewBox="' + [vb.x, vb.y, vb.w, vb.h].join(" ") + '" role="group" aria-label="Karte von ' + esc(data.name) + '">' +
      defs(key) +
      '<rect x="' + vb.x + '" y="' + vb.y + '" width="' + vb.w + '" height="' + vb.h + '" fill="url(#sea-' + key + ')"></rect>' +
      waves(vb) +
      coasts.join("") +
      fills.join("") +
      '<g class="karte-deco">' + marks.join("") + "</g>" +
      labels.join("") +
      "</svg>";
    document.getElementById("karte-map-" + key).innerHTML = '<div class="karte-stage">' + svg + "</div>";
  }

  function sortedZones(zones) {
    return zones.slice().sort(function (a, b) {
      return a.min - b.min || a.max - b.max || a.name.localeCompare(b.name, "de");
    });
  }

  function renderList(key) {
    const data = MAPS[key];
    const rows = sortedZones(data.zones).map(function (item) {
      const instances = item.instances.length
        ? item.instances.map(function (inst) { return esc(instanceShort(inst)); }).join("<br>")
        : "keine";
      return (
        '<tr class="karte-row" data-zone="' + item.id + '">' +
        '<th scope="row"><button type="button" class="karte-name" data-zone="' + item.id + '">' + esc(item.name) + "</button></th>" +
        "<td>" + rangeText(item.min, item.max) + "</td>" +
        "<td>" + esc(item.faction) + "</td>" +
        "<td>" + instances + "</td>" +
        "</tr>"
      );
    }).join("");
    document.getElementById("karte-list-" + key).innerHTML =
      '<h3 class="karte-list-title">Alle Gebiete</h3>' +
      '<p class="mt-1 text-sm text-slate-400">Nach Level sortiert. Ein Tipp zeigt die Details.</p>' +
      '<div class="karte-table-wrap">' +
      '<table class="karte-table">' +
      '<caption class="sr-only">Gebiete in ' + esc(data.name) + ", sortiert nach Level</caption>" +
      "<thead><tr><th scope=\"col\">Gebiet</th><th scope=\"col\">Level</th><th scope=\"col\">Fraktion</th><th scope=\"col\">Instanzen</th></tr></thead>" +
      "<tbody>" + rows + "</tbody></table></div>";
  }

  function renderLegend() {
    const list = document.getElementById("karte-legend");
    if (!list) return;
    list.innerHTML = BANDS.map(function (band) {
      return '<li><span class="karte-swatch" data-band="' + band.id + '" aria-hidden="true"></span>' + esc(band.label) + "</li>";
    }).join("");
  }

  function showInfo(key, id) {
    const item = findZone(key, id);
    const box = document.getElementById("karte-info-" + key);
    if (!box) return;
    box.innerHTML = item ? infoHtml(item) : hintHtml();
  }

  function markSelected(key, id) {
    const map = document.getElementById("karte-map-" + key);
    if (map) {
      map.querySelectorAll(".karte-zone").forEach(function (el) {
        const on = el.getAttribute("data-zone") === id;
        el.classList.toggle("is-on", on);
        el.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }
    const list = document.getElementById("karte-list-" + key);
    if (list) {
      list.querySelectorAll(".karte-row").forEach(function (el) {
        el.classList.toggle("is-on", el.getAttribute("data-zone") === id);
      });
    }
  }

  function pinZone(key, id, scroll) {
    pinned[key] = id;
    markSelected(key, id);
    showInfo(key, id);
    if (!scroll) return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    const info = document.getElementById("karte-info-" + key);
    if (info && info.scrollIntoView) info.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function showContinent(key) {
    ["ek", "kal"].forEach(function (id) {
      const on = id === key;
      const panel = document.getElementById("karte-panel-" + id);
      const tab = document.getElementById("karte-tab-" + id);
      if (panel) panel.hidden = !on;
      if (tab) {
        tab.setAttribute("aria-selected", on ? "true" : "false");
        tab.tabIndex = on ? 0 : -1;
      }
    });
  }

  function continentOf(node) {
    const panel = node.closest("[data-continent]");
    return panel ? panel.getAttribute("data-continent") : "";
  }

  function boot() {
    const root = document.getElementById("forever-karte");
    if (!root) return;
    renderLegend();
    Object.keys(MAPS).forEach(function (key) {
      renderMap(key);
      renderList(key);
      const info = document.getElementById("karte-info-" + key);
      if (info) info.innerHTML = hintHtml();
    });

    root.addEventListener("click", function (event) {
      const tab = event.target.closest("[role='tab']");
      if (tab && root.contains(tab)) {
        showContinent(tab.id === "karte-tab-kal" ? "kal" : "ek");
        return;
      }
      const hit = event.target.closest("[data-zone]");
      if (!hit || !root.contains(hit)) return;
      const key = continentOf(hit);
      if (!key) return;
      pinZone(key, hit.getAttribute("data-zone"), true);
    });

    root.addEventListener("keydown", function (event) {
      const tab = event.target.closest("[role='tab']");
      if (tab && root.contains(tab) && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
        event.preventDefault();
        const next = tab.id === "karte-tab-ek" ? "kal" : "ek";
        showContinent(next);
        const nextTab = document.getElementById("karte-tab-" + next);
        if (nextTab) nextTab.focus();
        return;
      }
      if ((event.key === "Enter" || event.key === " ") && event.target.classList && event.target.classList.contains("karte-zone")) {
        event.preventDefault();
        event.target.click();
      }
    });

    root.addEventListener("mouseover", function (event) {
      const hit = event.target.closest(".karte-zone");
      if (!hit || !root.contains(hit)) return;
      const key = continentOf(hit);
      if (!key || pinned[key]) return;
      showInfo(key, hit.getAttribute("data-zone"));
    });

    root.addEventListener("mouseout", function (event) {
      const panel = event.target.closest("[data-continent]");
      if (!panel || !root.contains(panel)) return;
      const next = event.relatedTarget;
      if (next && panel.contains(next)) return;
      const key = panel.getAttribute("data-continent");
      if (!key || pinned[key]) return;
      const info = document.getElementById("karte-info-" + key);
      if (info) info.innerHTML = hintHtml();
    });
  }

  function audit(zones, label) {
    const problems = [];
    const seen = new Map();
    zones.forEach(function (item) {
      const box = bbox(item.pts);
      if (box.w < 70 || box.h < 60) problems.push(label + " small " + item.id + " " + box.w + "x" + box.h);
      const step = 4;
      for (let y = box.y; y <= box.y + box.h; y += step) {
        for (let x = box.x; x <= box.x + box.w; x += step) {
          if (!inside([x, y], item.pts)) continue;
          const spot = x + "," + y;
          if (seen.has(spot)) {
            const pair = seen.get(spot) + "/" + item.id;
            if (problems.indexOf(label + " overlap " + pair) === -1) problems.push(label + " overlap " + pair);
          } else {
            seen.set(spot, item.id);
          }
        }
      }
    });
    return problems;
  }

  if (typeof document === "undefined") {
    const problems = audit(EK, "ek").concat(audit(KAL, "kal"));
    if (problems.length) {
      console.error(problems.slice(0, 30).join("\n"));
      process.exitCode = 1;
    } else {
      console.log("karte geometry ok", EK.length, KAL.length);
    }
  } else {
    document.addEventListener("DOMContentLoaded", boot);
  }
})();
