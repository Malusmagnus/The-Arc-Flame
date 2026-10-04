/* Forever-Karte: eigene Zeichnung der Kontinente. Keine Blizzard- oder Mobalytics-Grafik. */
(function () {
  "use strict";

  const SCHWARZFELS = [
    { name: "Schwarzfelstiefen", min: 52, max: 60 },
    { name: "Untere Schwarzfelsspitze", min: 55, max: 60 },
    { name: "Obere Schwarzfelsspitze", min: 55, max: 60 },
    { name: "Geschmolzener Kern", min: 60, max: 60, raid: true },
    { name: "Pechschwingenhort", min: 60, max: 60, raid: true },
  ];

  const TERRAIN = {
    forest: "#7d995c",
    mountain: "#b09a80",
    swamp: "#6f865f",
    desert: "#d2b072",
    snow: "#d7e2e6",
    plague: "#9aa56c",
    lava: "#c17a52",
    grass: "#c6b07a",
    dark: "#6a624f",
  };

  function zone(id, name, lines, min, max, faction, extra) {
    const item = {
      id: id,
      name: name,
      lines: lines,
      min: min,
      max: max,
      faction: faction,
      instances: [],
      mark: "grass",
      note: "",
      instanceNote: "",
    };
    if (extra) {
      Object.keys(extra).forEach(function (key) {
        item[key] = extra[key];
      });
    }
    item.band = bandOf(item);
    item.pts = item.points;
    if (signedArea(item.pts) > 0) item.pts.reverse();
    return item;
  }

  function bandOf(item) {
    if (item.min == null || item.max == null) return "unknown";
    if (item.min <= 1 && item.max >= 60) return "all";
    if (item.max <= 20) return "green";
    if (item.max <= 40) return "yellow";
    if (item.min >= 50) return "red";
    return "orange";
  }

  function ring(id, parts) {
    const pts = [];
    for (let p = 0; p < parts.length; p++) {
      const part = parts[p];
      for (let i = 0; i < part.length; i++) {
        if (pts.length && i === 0) {
          const last = pts[pts.length - 1];
          if (last[0] !== part[0][0] || last[1] !== part[0][1]) {
            throw new Error(id + " join " + p + ": " + last.join(",") + " != " + part[0].join(","));
          }
          continue;
        }
        pts.push(part[i]);
      }
    }
    const a = pts[0];
    const b = pts[pts.length - 1];
    if (!a || a[0] !== b[0] || a[1] !== b[1]) {
      throw new Error(id + " open " + (a ? a.join(",") : "?") + " .. " + (b ? b.join(",") : "?"));
    }
    pts.pop();
    return pts;
  }

  const TIR_WPL = [[248, 58], [256, 116], [242, 174], [228, 214]];
  const TIR_SIL = [[228, 214], [156, 222], [86, 216], [50, 180]];
  const WPL_EPL = [[512, 46], [518, 116], [506, 176], [496, 218]];
  const WPL_ALT = [[228, 214], [332, 206], [424, 200], [496, 218]];
  const EPL_HIN = [[496, 218], [614, 208], [724, 222]];
  const SIL_ALT = [[228, 214], [240, 274], [248, 336]];
  const SIL_HIL = [[248, 336], [168, 350], [92, 364]];
  const ALT_HIL = [[248, 336], [328, 368], [396, 408]];
  const ALT_HIN = [[496, 218], [488, 294], [476, 368], [458, 418]];
  const ALT_ARA = [[396, 408], [458, 418]];
  const HIN_ARA = [[458, 418], [590, 404], [706, 426]];
  const HIL_ARA = [[396, 408], [346, 464], [300, 510]];
  const ARA_WET = [[300, 510], [442, 518], [572, 530], [702, 548]];
  const WET_DUN = [[214, 710], [320, 698], [404, 686]];
  const WET_LOCH = [[404, 686], [498, 672], [566, 690]];
  const WET_BAD = [[750, 732], [662, 712], [566, 690]];
  const DUN_LOCH = [[404, 686], [390, 762], [366, 838]];
  const DUN_SEAR = [[46, 860], [180, 844], [280, 854], [366, 838]];
  const LOCH_BAD = [[566, 690], [578, 764], [556, 846]];
  const LOCH_BURN = [[366, 838], [470, 852], [556, 846]];
  const SEAR_NE = [[366, 838], [328, 938]];
  const SEAR_BURN = [[40, 938], [190, 920], [328, 938]];
  const BURN_RIV = [[556, 846], [528, 942], [498, 1022], [488, 1032]];
  const BURN_RED = [[488, 1032], [378, 1014], [286, 1026]];
  const BURN_ELW = [[286, 1026], [158, 1008], [36, 1030]];
  const BAD_RIV = [[688, 912], [622, 892], [556, 846]];
  const BAD_SWP = [[792, 902], [742, 932], [688, 912]];
  const RIV_SWP = [[688, 912], [712, 982], [690, 1056]];
  const RIV_DEAD = [[690, 1056], [620, 1062]];
  const RIV_RED = [[620, 1062], [542, 1046], [488, 1032]];
  const RED_DEAD = [[620, 1062], [600, 1122], [560, 1182]];
  const RED_DUSK = [[560, 1182], [420, 1170], [300, 1166]];
  const RED_ELW = [[300, 1166], [292, 1102], [286, 1026]];
  const ELW_WF = [[300, 1166], [198, 1180], [48, 1192]];
  const WF_DUSK = [[300, 1166], [312, 1242], [300, 1322]];
  const WF_STV = [[300, 1322], [178, 1338], [70, 1326]];
  const DUSK_STV = [[300, 1322], [422, 1342], [520, 1330]];
  const DEAD_DUSK = [[600, 1202], [560, 1182]];
  const DEAD_BLA = [[690, 1056], [712, 1122], [682, 1190], [600, 1202]];
  const SWP_BLA = [[690, 1056], [762, 1072], [822, 1042], [842, 982]];

  const EK = [
    zone("tirisfal", "Tirisfal", ["Tirisfal"], 1, 10, "Horde", {
      mark: "forest", land: "#6f8f52",
      labelAt: [172, 148],
      points: ring("tirisfal", [
        [[50, 180], [34, 132], [28, 88], [52, 52], [108, 30], [170, 24], [226, 40], [248, 58]],
        TIR_WPL,
        TIR_SIL,
      ]),
      instances: [{ name: "Scharlachrotes Kloster", min: 30, max: 45 }],
    }),
    zone("wpl", "Westliche Pestländer", ["Westliche", "Pestländer"], 51, 58, "umkämpft", {
      mark: "plague",
      points: ring("wpl", [
        TIR_WPL.slice().reverse(),
        [[248, 58], [318, 34], [400, 22], [468, 30], [512, 46]],
        WPL_EPL,
        WPL_ALT.slice().reverse(),
      ]),
      instances: [{ name: "Scholomance", min: 58, max: 60 }],
    }),
    zone("epl", "Östliche Pestländer", ["Östliche", "Pestländer"], 53, 60, "umkämpft", {
      mark: "plague",
      points: ring("epl", [
        WPL_EPL.slice().reverse(),
        [[512, 46], [574, 24], [656, 28], [734, 56], [794, 102], [814, 160], [790, 208], [724, 222]],
        EPL_HIN.slice().reverse(),
      ]),
      instances: [
        { name: "Stratholme", min: 58, max: 60 },
        { name: "Naxxramas", min: 60, max: 60, raid: true, where: "über der Zone" },
      ],
    }),
    zone("silberwald", "Silberwald", ["Silberwald"], 10, 20, "Horde", {
      mark: "forest", land: "#5f7548",
      points: ring("silberwald", [
        SIL_ALT,
        SIL_HIL,
        [[92, 364], [70, 330], [40, 280], [32, 230], [50, 180]],
        TIR_SIL.slice().reverse(),
      ]),
      instances: [{ name: "Burg Schattenfang", min: 22, max: 30 }],
    }),
    zone("alterac", "Alteracgebirge", ["Alterac"], 30, 40, "umkämpft", {
      mark: "mountain",
      points: ring("alterac", [
        WPL_ALT,
        ALT_HIN,
        ALT_ARA.slice().reverse(),
        ALT_HIL.slice().reverse(),
        SIL_ALT.slice().reverse(),
      ]),
    }),
    zone("hinterland", "Hinterland", ["Hinterland"], 40, 50, "umkämpft", {
      mark: "forest",
      points: ring("hinterland", [
        ALT_HIN.slice().reverse(),
        EPL_HIN,
        [[724, 222], [752, 278], [774, 338], [756, 392], [706, 426]],
        HIN_ARA.slice().reverse(),
      ]),
    }),
    zone("hillsbrad", "Vorgebirge des Hügellands", ["Hügelland"], 20, 30, "umkämpft", {
      mark: "grass",
      points: ring("hillsbrad", [
        ALT_HIL,
        HIL_ARA,
        [[300, 510], [220, 528], [140, 520], [78, 486], [40, 430], [46, 384], [92, 364]],
        SIL_HIL.slice().reverse(),
      ]),
    }),
    zone("arathi", "Arathihochland", ["Arathi"], 30, 40, "umkämpft", {
      mark: "grass", land: "#b7a36e",
      points: ring("arathi", [
        ALT_ARA,
        HIN_ARA,
        [[706, 426], [728, 470], [716, 516], [702, 548]],
        ARA_WET.slice().reverse(),
        HIL_ARA.slice().reverse(),
      ]),
    }),
    zone("dunmorogh", "Dun Morogh", ["Dun Morogh"], 1, 10, "Allianz", {
      mark: "snow",
      labelAt: [250, 800],
      points: ring("dunmorogh", [
        DUN_SEAR.slice().reverse(),
        [[46, 860], [36, 858], [22, 808], [42, 746], [86, 698], [148, 686], [214, 710]],
        WET_DUN,
        DUN_LOCH,
      ]),
      instances: [{ name: "Gnomeregan", min: 29, max: 38 }],
    }),
    zone("wetlands", "Sumpfland", ["Sumpfland"], 20, 30, "Allianz", {
      mark: "swamp",
      points: ring("wetlands", [
        ARA_WET,
        [[702, 548], [738, 602], [766, 662], [750, 732]],
        WET_BAD,
        WET_LOCH.slice().reverse(),
        WET_DUN.slice().reverse(),
        [[214, 710], [186, 648], [208, 588], [258, 552], [300, 510]],
      ]),
    }),
    zone("loch", "Loch Modan", ["Loch Modan"], 10, 20, "Allianz", {
      mark: "mountain", land: "#a89478",
      points: ring("loch", [
        WET_LOCH,
        LOCH_BAD,
        LOCH_BURN.slice().reverse(),
        DUN_LOCH.slice().reverse(),
      ]),
    }),
    zone("badlands", "Ödland", ["Ödland"], 35, 45, "umkämpft", {
      mark: "desert", land: "#c9a15e",
      points: ring("badlands", [
        WET_BAD.slice().reverse(),
        [[750, 732], [788, 782], [812, 842], [792, 902]],
        BAD_SWP,
        BAD_RIV,
        LOCH_BAD.slice().reverse(),
      ]),
      instances: [{ name: "Uldaman", min: 41, max: 51 }],
    }),
    zone("searing", "Sengende Schlucht", ["Sengende", "Schlucht"], 43, 50, "umkämpft", {
      mark: "lava",
      points: ring("searing", [
        SEAR_NE,
        SEAR_BURN.slice().reverse(),
        [[40, 938], [28, 898], [46, 860]],
        DUN_SEAR,
      ]),
      instances: SCHWARZFELS,
      instanceNote: "Im Schwarzfels. Der Berg hat auch einen Zugang von der Brennenden Steppe.",
    }),
    zone("burning", "Brennende Steppe", ["Brennende", "Steppe"], 50, 60, "umkämpft", {
      mark: "lava", land: "#a85a3e",
      points: ring("burning", [
        LOCH_BURN,
        BURN_RIV,
        BURN_RED,
        BURN_ELW,
        [[36, 1030], [18, 992], [22, 948], [40, 938]],
        SEAR_BURN,
        SEAR_NE.slice().reverse(),
      ]),
      instances: SCHWARZFELS,
      instanceNote: "Im Schwarzfels. Der Berg hat auch einen Zugang von der Sengenden Schlucht.",
    }),
    zone("riverglades", "Flusslande", ["Flusslande"], 35, 45, "umkämpft", {
      mark: "forest", land: "#8aaa68", neu: true,
      points: ring("riverglades", [
        BAD_RIV.slice().reverse(),
        RIV_SWP,
        RIV_DEAD,
        RIV_RED,
        BURN_RIV.slice().reverse(),
      ]),
    }),
    zone("swamp", "Sümpfe des Elends", ["Sümpfe", "des Elends"], 35, 45, "umkämpft", {
      mark: "swamp",
      points: ring("swamp", [
        BAD_SWP.slice().reverse(),
        [[792, 902], [838, 858], [862, 922], [842, 982]],
        SWP_BLA.slice().reverse(),
        RIV_SWP.slice().reverse(),
      ]),
      instances: [{ name: "Tempel von Atal'Hakkar", min: 50, max: 60 }],
    }),
    zone("elwynn", "Wald von Elwynn", ["Elwynn"], 1, 10, "Allianz", {
      mark: "forest", land: "#8aaa58",
      labelAt: [200, 1135],
      points: ring("elwynn", [
        RED_ELW.slice().reverse(),
        ELW_WF,
        [[48, 1192], [28, 1124], [20, 1064], [36, 1030]],
        BURN_ELW.slice().reverse(),
      ]),
      instances: [{ name: "Das Verlies", min: 24, max: 32, where: "in Sturmwind" }],
    }),
    zone("redridge", "Rotkammgebirge", ["Rotkamm"], 15, 25, "Allianz", {
      mark: "mountain", land: "#a67a62",
      points: ring("redridge", [
        RED_ELW,
        BURN_RED.slice().reverse(),
        RIV_RED.slice().reverse(),
        RED_DEAD,
        RED_DUSK,
      ]),
    }),
    zone("deadwind", "Gebirgspass der Totenwinde", ["Totenwinde"], 55, 60, "umkämpft", {
      mark: "dark",
      labelAt: [612, 1096],
      points: ring("deadwind", [
        RED_DEAD.slice().reverse(),
        RIV_DEAD.slice().reverse(),
        DEAD_BLA,
        DEAD_DUSK,
      ]),
    }),
    zone("blasted", "Verwüstete Lande", ["Verwüstete", "Lande"], 45, 55, "umkämpft", {
      mark: "desert", land: "#b7a48c",
      labelAt: [792, 1204],
      points: ring("blasted", [
        SWP_BLA,
        [[842, 982], [868, 1104], [856, 1184], [802, 1262], [724, 1304], [638, 1264], [600, 1202]],
        DEAD_BLA.slice().reverse(),
      ]),
    }),
    zone("westfall", "Westfall", ["Westfall"], 10, 20, "Allianz", {
      mark: "grass", land: "#cbb56a",
      points: ring("westfall", [
        ELW_WF.slice().reverse(),
        WF_DUSK,
        WF_STV,
        [[70, 1326], [36, 1288], [26, 1236], [48, 1192]],
      ]),
      instances: [{ name: "Todesminen", min: 17, max: 26 }],
    }),
    zone("duskwood", "Dämmerwald", ["Dämmerwald"], 18, 30, "Allianz", {
      mark: "forest", land: "#5c6a46",
      points: ring("duskwood", [
        DEAD_DUSK.slice().reverse(),
        [[600, 1202], [580, 1240], [548, 1288], [520, 1330]],
        DUSK_STV.slice().reverse(),
        WF_DUSK.slice().reverse(),
        RED_DUSK.slice().reverse(),
      ]),
    }),
    zone("stv", "Schlingendorntal", ["Schlingendorn"], 30, 45, "umkämpft", {
      mark: "forest", land: "#4e7a42",
      points: ring("stv", [
        DUSK_STV,
        [[520, 1330], [500, 1368], [450, 1436], [360, 1510], [250, 1552], [150, 1516], [78, 1448], [46, 1372], [70, 1326]],
        WF_STV.slice().reverse(),
      ]),
      instances: [{ name: "Zul'Gurub", min: 60, max: 60, raid: true }],
    }),
  ];

  const HY_DK = [[196, 164], [232, 214]];
  const HY_MO = [[232, 214], [320, 196], [408, 204]];
  const HY_WI = [[408, 204], [560, 188], [700, 208], [796, 246]];
  const DK_MO = [[232, 214], [216, 276]];
  const MO_WI = [[408, 204], [396, 286]];
  const MO_FE = [[216, 276], [310, 304], [396, 286]];
  const DK_FE = [[216, 276], [198, 370], [188, 462]];
  const FE_WI = [[396, 286], [414, 380], [400, 478]];
  const FE_AS = [[188, 462], [300, 498], [400, 478]];
  const DK_AS = [[188, 462], [156, 570], [140, 680], [186, 734]];
  const AS_ST = [[186, 734], [248, 718], [300, 690]];
  const AS_BA = [[300, 690], [430, 668], [548, 700]];
  const AS_AZ = [[400, 478], [490, 560], [548, 700]];
  const WI_AZ = [[400, 478], [540, 456], [690, 448], [790, 490]];
  const ST_BA = [[300, 690], [280, 800], [260, 900]];
  const ST_DE = [[150, 960], [200, 940], [260, 900]];
  const BA_DU = [[640, 760], [666, 840], [640, 930], [610, 1010]];
  const BA_DW = [[610, 1010], [560, 1060], [500, 1110]];
  const BA_MU = [[360, 900], [440, 980], [500, 1110]];
  const BA_SN = [[260, 900], [360, 900]];
  const DE_SH = [[260, 900], [248, 1000], [236, 1100]];
  const SH_MU = [[360, 900], [360, 1100]];
  const SH_FE = [[236, 1100], [300, 1120], [360, 1100]];
  const MU_ND = [[360, 1100], [430, 1124], [500, 1110]];
  const DW_ND = [[500, 1110], [600, 1140], [700, 1160]];
  const ND_TA = [[700, 1160], [660, 1240], [560, 1280]];
  const ND_UN = [[320, 1260], [430, 1288], [560, 1280]];
  const ND_FE = [[360, 1100], [330, 1180], [320, 1260]];
  const FE_UN = [[320, 1260], [280, 1340], [210, 1400]];
  const FE_SI = [[210, 1400], [160, 1380], [120, 1320]];
  const UN_TA = [[560, 1280], [540, 1360], [480, 1420]];
  const UN_SI = [[210, 1400], [340, 1440], [480, 1420]];
  const DE_FE = [[236, 1100], [180, 1160], [150, 1220]];

  const KAL = [
    zone("teldrassil", "Teldrassil", ["Teldrassil"], 1, 10, "Allianz", {
      mark: "forest", land: "#6a9456",
      labelAt: [132, 128],
      points: [[62, 46], [104, 16], [158, 14], [204, 42], [226, 92], [210, 140], [164, 170], [104, 176], [52, 146], [32, 96]],
    }),
    zone("hyjal", "Hyjal", ["Hyjal"], 60, 60, "umkämpft", {
      mark: "mountain", land: "#8aa06a", neu: true,
      note: "Endgame-Gebiet im Norden von Kalimdor.",
      points: ring("hyjal", [
        [[196, 164], [236, 108], [330, 64], [460, 40], [590, 34], [700, 56], [778, 112], [824, 176], [796, 246]],
        HY_WI.slice().reverse(),
        HY_MO.slice().reverse(),
        HY_DK.slice().reverse(),
      ]),
    }),
    zone("darkshore", "Dunkelküste", ["Dunkelküste"], 10, 20, "Allianz", {
      mark: "forest", land: "#5f7848",
      points: ring("darkshore", [
        HY_DK,
        DK_MO,
        DK_FE,
        DK_AS,
        [[186, 734], [120, 690], [78, 600], [62, 490], [70, 380], [96, 280], [140, 200], [196, 164]],
      ]),
    }),
    zone("moonglade", "Mondlichtung", ["Mondlichtung"], 1, 60, "Neutral", {
      mark: "forest", land: "#8fb56a",
      note: "Neutraler Treffpunkt für Druiden. In jedem Level.",
      points: ring("moonglade", [
        HY_MO,
        MO_WI,
        MO_FE.slice().reverse(),
        DK_MO.slice().reverse(),
      ]),
    }),
    zone("felwood", "Teufelswald", ["Teufelswald"], 48, 55, "umkämpft", {
      mark: "forest", land: "#5a7244",
      points: ring("felwood", [
        DK_FE.slice().reverse(),
        MO_FE,
        FE_WI,
        FE_AS.slice().reverse(),
      ]),
    }),
    zone("winterspring", "Winterquell", ["Winterquell"], 55, 60, "umkämpft", {
      mark: "snow",
      points: ring("winterspring", [
        HY_WI,
        [[796, 246], [834, 310], [846, 390], [820, 460], [790, 490]],
        WI_AZ.slice().reverse(),
        FE_WI.slice().reverse(),
        MO_WI.slice().reverse(),
      ]),
    }),
    zone("ashenvale", "Eschental", ["Eschental"], 18, 30, "umkämpft", {
      mark: "forest", land: "#6e8f50",
      points: ring("ashenvale", [
        FE_AS,
        AS_AZ,
        AS_BA.slice().reverse(),
        AS_ST.slice().reverse(),
        DK_AS.slice().reverse(),
      ]),
      instances: [{ name: "Tiefschwarze Grotte", min: 24, max: 32 }],
    }),
    zone("azshara", "Azshara", ["Azshara"], 45, 55, "umkämpft", {
      mark: "grass", land: "#7d9a78",
      points: ring("azshara", [
        WI_AZ,
        [[790, 490], [852, 530], [878, 610], [846, 690], [760, 650], [660, 600], [548, 700]],
        AS_AZ.slice().reverse(),
      ]),
    }),
    zone("stonetalon", "Steinkrallengebirge", ["Steinkrallen"], 15, 27, "umkämpft", {
      mark: "mountain",
      points: ring("stonetalon", [
        AS_ST,
        ST_BA,
        ST_DE.slice().reverse(),
        [[150, 960], [96, 900], [78, 820], [110, 750], [186, 734]],
      ]),
    }),
    zone("barrens", "Brachland", ["Brachland"], 10, 25, "Horde", {
      mark: "desert", land: "#d2b06a",
      points: ring("barrens", [
        ST_BA.slice().reverse(),
        AS_BA,
        [[548, 700], [600, 710], [640, 760]],
        BA_DU,
        BA_DW,
        BA_MU.slice().reverse(),
        BA_SN.slice().reverse(),
      ]),
      instances: [
        { name: "Höhlen des Wehklagens", min: 17, max: 24 },
        { name: "Kral der Klingenhauer", min: 29, max: 38 },
        { name: "Hügel der Klingenhauer", min: 37, max: 46 },
      ],
    }),
    zone("durotar", "Durotar", ["Durotar"], 1, 10, "Horde", {
      mark: "desert", land: "#c4845c",
      labelAt: [800, 900],
      points: ring("durotar", [
        [[640, 760], [700, 700], [790, 690], [860, 740], [870, 840], [820, 930], [740, 980], [610, 1010]],
        BA_DU.slice().reverse(),
      ]),
      instances: [{ name: "Flammenschlund", min: 13, max: 18, where: "in Orgrimmar" }],
    }),
    zone("desolace", "Desolace", ["Desolace"], 30, 40, "umkämpft", {
      mark: "desert", land: "#a39a72",
      points: ring("desolace", [
        ST_DE,
        DE_SH,
        DE_FE,
        [[150, 1220], [90, 1160], [68, 1060], [88, 980], [150, 960]],
      ]),
      instances: [{ name: "Maraudon", min: 46, max: 55 }],
    }),
    zone("shendralas", "Shen'dralas", ["Shen'dralas"], null, null, "umkämpft", {
      mark: "mountain", land: "#a89878", neu: true, labelSize: 12,
      points: ring("shendralas", [
        BA_SN,
        SH_MU,
        SH_FE.slice().reverse(),
        DE_SH.slice().reverse(),
      ]),
    }),
    zone("mulgore", "Mulgore", ["Mulgore"], 1, 10, "Horde", {
      mark: "grass", land: "#7f9a58",
      labelAt: [430, 1068],
      points: ring("mulgore", [
        BA_MU,
        MU_ND.slice().reverse(),
        SH_MU.slice().reverse(),
      ]),
    }),
    zone("dustwallow", "Düstermarschen", ["Düster-", "marschen"], 35, 45, "umkämpft", {
      mark: "swamp",
      points: ring("dustwallow", [
        BA_DW.slice().reverse(),
        [[610, 1010], [730, 1040], [820, 1120], [800, 1200], [720, 1180], [700, 1160]],
        DW_ND.slice().reverse(),
      ]),
      instances: [{ name: "Onyxias Hort", min: 60, max: 60, raid: true }],
    }),
    zone("thousand", "Tausend Nadeln", ["Tausend", "Nadeln"], 25, 35, "Horde", {
      mark: "desert", land: "#d7c090",
      points: ring("thousand", [
        ND_FE,
        ND_UN,
        ND_TA.slice().reverse(),
        DW_ND.slice().reverse(),
        MU_ND.slice().reverse(),
      ]),
    }),
    zone("feralas", "Feralas", ["Feralas"], 40, 50, "umkämpft", {
      mark: "forest", land: "#5e8448",
      points: ring("feralas", [
        DE_FE.slice().reverse(),
        SH_FE,
        ND_FE,
        FE_UN,
        FE_SI,
        [[120, 1320], [70, 1260], [60, 1180], [100, 1120], [150, 1220]],
      ]),
      instances: [{ name: "Düsterbruch", min: 55, max: 60 }],
    }),
    zone("ungoro", "Krater von Un'Goro", ["Un'Goro"], 48, 55, "umkämpft", {
      mark: "forest", land: "#6a8f48",
      points: ring("ungoro", [
        ND_UN,
        UN_TA,
        UN_SI.slice().reverse(),
        FE_UN.slice().reverse(),
      ]),
    }),
    zone("tanaris", "Tanaris", ["Tanaris"], 40, 50, "umkämpft", {
      mark: "desert", land: "#e0c48a",
      points: ring("tanaris", [
        ND_TA,
        UN_TA,
        [[480, 1420], [560, 1480], [700, 1520], [840, 1460], [890, 1340], [860, 1220], [780, 1160], [700, 1160]],
      ]),
      instances: [{ name: "Zul'Farrak", min: 44, max: 54 }],
    }),
    zone("silithus", "Silithus", ["Silithus"], 55, 60, "umkämpft", {
      mark: "desert", land: "#c2b48a",
      points: ring("silithus", [
        FE_SI.slice().reverse(),
        UN_SI,
        [[480, 1420], [420, 1500], [260, 1540], [120, 1500], [70, 1420], [86, 1340], [120, 1320]],
      ]),
      instances: [
        { name: "Ruinen von Ahn'Qiraj", min: 60, max: 60, raid: true },
        { name: "Tempel von Ahn'Qiraj", min: 60, max: 60, raid: true },
      ],
    }),
  ];

  const CITIES = {
    ek: [
      { name: "Unterstadt", at: [108, 96], faction: "Horde", lx: -46 },
      { name: "Eisenschmiede", at: [110, 790], faction: "Allianz", lx: -58 },
      { name: "Sturmwind", at: [96, 1072], faction: "Allianz", lx: -46 },
    ],
    kal: [
      { name: "Darnassus", at: [118, 72], faction: "Allianz", ly: -14 },
      { name: "Orgrimmar", at: [748, 760], faction: "Horde", lx: 46 },
      { name: "Donnerfels", at: [408, 1004], faction: "Horde", lx: 48 },
    ],
  };

  const PINS = {
    ek: [
      { name: "Scharlachrotes Kloster", short: "Kloster", at: [196, 78] },
      { name: "Scholomance", short: "Scholomance", at: [340, 78] },
      { name: "Stratholme", short: "Stratholme", at: [700, 86] },
      { name: "Naxxramas", short: "Naxxramas", at: [760, 168], raid: true },
      { name: "Burg Schattenfang", short: "Schattenfang", at: [62, 214] },
      { name: "Gnomeregan", short: "Gnomeregan", at: [70, 820] },
      { name: "Schwarzfels", short: "Schwarzfels", at: [120, 910] },
      { name: "Uldaman", short: "Uldaman", at: [740, 780] },
      { name: "Tempel von Atal'Hakkar", short: "Atal'Hakkar", at: [820, 980] },
      { name: "Das Verlies", short: "Verlies", at: [150, 1060] },
      { name: "Todesminen", short: "Todesminen", at: [86, 1260] },
      { name: "Zul'Gurub", short: "Zul'Gurub", at: [320, 1470], raid: true },
    ],
    kal: [
      { name: "Tiefschwarze Grotte", short: "Grotte", at: [250, 560] },
      { name: "Flammenschlund", short: "Flammenschlund", at: [800, 800] },
      { name: "Höhlen des Wehklagens", short: "Wehklagen", at: [400, 800] },
      { name: "Kral der Klingenhauer", short: "Kral", at: [460, 920] },
      { name: "Hügel der Klingenhauer", short: "Hügel", at: [530, 1000] },
      { name: "Maraudon", short: "Maraudon", at: [120, 1040] },
      { name: "Onyxias Hort", short: "Onyxia", at: [760, 1140], raid: true },
      { name: "Düsterbruch", short: "Düsterbruch", at: [160, 1240] },
      { name: "Zul'Farrak", short: "Zul'Farrak", at: [760, 1320] },
      { name: "Ruinen von Ahn'Qiraj", short: "AQ Ruinen", at: [180, 1460], raid: true },
      { name: "Tempel von Ahn'Qiraj", short: "AQ Tempel", at: [280, 1470], raid: true },
    ],
  };

  const ZEPHRAS = zone("zephras", "Die Insel Zephras", ["Die Insel", "Zephras"], 1, 12, "beide", {
    neu: true,
    note: "Startgebiet der Skyborne. Horde und Allianz starten hier.",
    labelSize: 18,
    points: [[18, 48], [46, 16], [98, 8], [146, 22], [172, 58], [164, 98], [112, 122], [54, 116], [16, 84]],
  });

  const MAPS = {
    ek: { name: "Östliche Königreiche", zones: EK },
    kal: { name: "Kalimdor", zones: KAL },
  };

  const BANDS = [
    { id: "green", label: "Türkis: Level 1–20" },
    { id: "yellow", label: "Blau: Level 20–40" },
    { id: "orange", label: "Violett: Level 40–55" },
    { id: "red", label: "Lila: Level 50–60" },
    { id: "all", label: "Hellblau: alle Level" },
    { id: "unknown", label: "Grau: Level folgt" },
  ];

  const pinned = { ek: "", kal: "" };

  function rangeText(min, max) {
    return min === max ? String(min) : min + "–" + max;
  }

  function levelText(item) {
    if (item.min == null || item.max == null) return "Level folgt";
    return "Level " + rangeText(item.min, item.max);
  }

  function rangeCell(item) {
    if (item.min == null || item.max == null) return "Level folgt";
    return rangeText(item.min, item.max);
  }

  function neuBadge() {
    return '<span class="karte-neu-badge">NEU in Forever</span>';
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

  function signedArea(pts) {
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % pts.length];
      area += p[0] * q[1] - q[0] * p[1];
    }
    return area / 2;
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

  function ptKey(p) {
    return p[0] + "," + p[1];
  }

  function edgeKey(a, b) {
    const ka = ptKey(a);
    const kb = ptKey(b);
    return ka < kb ? ka + "|" + kb : kb + "|" + ka;
  }

  function boundaries(zones) {
    const bag = new Map();
    zones.forEach(function (item) {
      const pts = item.pts;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        const key = edgeKey(a, b);
        if (!bag.has(key)) bag.set(key, { a: a, b: b, n: 0, dirs: [] });
        const edge = bag.get(key);
        edge.n += 1;
        edge.dirs.push(ptKey(a) + ">" + ptKey(b));
      }
    });
    return bag;
  }

  function coastLoops(zones) {
    const bag = boundaries(zones);
    const boundary = [];
    bag.forEach(function (edge) {
      if (edge.n === 1) boundary.push(edge);
    });
    const out = new Map();
    boundary.forEach(function (edge) {
      const key = ptKey(edge.a);
      if (!out.has(key)) out.set(key, []);
      out.get(key).push(edge);
    });
    const used = new Set();
    const loops = [];
    boundary.forEach(function (start) {
      const startKey = edgeKey(start.a, start.b);
      if (used.has(startKey)) return;
      const loop = [start.a];
      let cur = start;
      let guard = 0;
      while (guard < 2000) {
        guard += 1;
        used.add(edgeKey(cur.a, cur.b));
        loop.push(cur.b);
        if (ptKey(cur.b) === ptKey(start.a)) break;
        const nexts = (out.get(ptKey(cur.b)) || []).filter(function (edge) {
          return !used.has(edgeKey(edge.a, edge.b));
        });
        if (!nexts.length) break;
        cur = nexts[0];
      }
      if (loop.length > 3 && ptKey(loop[0]) === ptKey(loop[loop.length - 1])) loops.push(loop);
    });
    return loops;
  }

  function factionLine(item) {
    if (item.faction === "Horde") return "Fraktion: Horde.";
    if (item.faction === "Allianz") return "Fraktion: Allianz.";
    if (item.faction === "Neutral") return "Fraktion: Neutral.";
    if (item.faction === "beide") return "Fraktion: Horde und Allianz.";
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
    if (id === "zephras") return ZEPHRAS;
    const data = MAPS[key];
    if (!data) return null;
    const zones = data.zones;
    for (let i = 0; i < zones.length; i++) {
      if (zones[i].id === id) return zones[i];
    }
    return null;
  }

  function infoHtml(item) {
    const parts = [
      '<h3 class="karte-info-title">' + esc(item.name) + (item.neu ? neuBadge() : "") + "</h3>",
      '<p class="karte-info-level">' + esc(levelText(item)) + "</p>",
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
    const pad = 56;
    return {
      x: minX - pad,
      y: minY - pad,
      w: maxX - minX + pad * 2,
      h: maxY - minY + pad * 2,
    };
  }

  function defs(key, coast) {
    return (
      "<defs>" +
      '<clipPath id="clip-' + key + '"><path d="' + coast + '"></path></clipPath>' +
      '<linearGradient id="sea-' + key + '" x1="0" y1="0" x2="0.2" y2="1">' +
      '<stop offset="0%" stop-color="#1f6d86"/>' +
      '<stop offset="55%" stop-color="#16556c"/>' +
      '<stop offset="100%" stop-color="#0c3140"/>' +
      "</linearGradient>" +
      '<linearGradient id="age-' + key + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#f4e6c4" stop-opacity="0.22"/>' +
      '<stop offset="100%" stop-color="#6b4e2e" stop-opacity="0.14"/>' +
      "</linearGradient>" +
      '<filter id="grain-' + key + '" x="-5%" y="-5%" width="110%" height="110%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="' + (key === "ek" ? 4 : 9) + '" result="n"/>' +
      '<feColorMatrix type="matrix" values="0 0 0 0 0.32  0 0 0 0 0.24  0 0 0 0 0.12  0 0 0 0.28 0" in="n"/>' +
      "</filter>" +
      '<filter id="hill-' + key + '" x="-5%" y="-5%" width="110%" height="110%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="' + (key === "ek" ? 2 : 6) + '"/>' +
      '<feColorMatrix type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.16  0 0 0 0 0.08  0 0 0 0.16 0"/>' +
      "</filter>" +
      '<filter id="shade-' + key + '" x="-15%" y="-15%" width="130%" height="130%">' +
      '<feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#041018" flood-opacity="0.55"/>' +
      "</filter>" +
      "</defs>"
    );
  }

  function waves(vb) {
    let html = "";
    for (let i = 0; i < 9; i++) {
      const y = Math.round(vb.y + 24 + i * (vb.h / 10));
      const x = Math.round(vb.x + 12);
      html += '<path class="karte-wave" d="M' + x + " " + y + " q 18 -7 36 0 t 36 0 t 36 0\"></path>";
    }
    return html;
  }

  function labelSvg(item) {
    const box = bbox(item.pts);
    const spot = item.labelAt || centroid(item.pts);
    const names = item.lines.slice();
    const longest = names.reduce(function (max, line) {
      return Math.max(max, line.length);
    }, 1);
    let size = item.labelSize || 24;
    if (box.w < 180 || box.h < 120) size = Math.min(size, 16);
    if (box.h < 90) size = Math.min(size, 13);
    const maxByW = Math.floor((box.w * 0.86) / (longest * 0.62));
    size = Math.max(8, Math.min(size, maxByW));
    const x = Math.round(spot[0]);
    let y = Math.round(spot[1]);
    const levelSize = Math.max(8, size - 2);
    const block = names.length * (size + 1) + levelSize + (item.neu ? 16 : 0);
    y = Math.round(y - block / 2 + size * 0.75);
    let html = "";
    names.forEach(function (line, index) {
      html += '<text class="karte-label" x="' + x + '" y="' + (y + index * (size + 1)) + '" font-size="' + size + '">' + esc(line.toUpperCase()) + "</text>";
    });
    const levelY = y + names.length * (size + 1) + 1;
    html += '<text class="karte-level" x="' + x + '" y="' + levelY + '" font-size="' + levelSize + '">' + esc(rangeCell(item).toUpperCase()) + "</text>";
    if (item.neu) {
      const by = levelY + 12;
      html += '<g class="karte-neu-mark" transform="translate(' + x + " " + by + ')">' +
        '<rect x="-22" y="-10" width="44" height="16" rx="3"></rect>' +
        '<text y="3">NEU</text></g>';
    }
    return html;
  }

  function citySvg(city) {
    const x = city.at[0];
    const y = city.at[1];
    const lx = city.lx || 0;
    const ly = city.ly == null ? 18 : city.ly;
    return (
      '<g class="karte-marker" transform="translate(' + x + " " + y + ')">' +
      '<circle class="karte-city-dot" r="8"/>' +
      '<path class="karte-city-tower" data-faction="' + city.faction + '" d="M-3.4 3.4 V-0.5 L0 -3.6 L3.4 -0.5 V3.4 Z"/>' +
      '<text class="karte-city-label" x="' + lx + '" y="' + ly + '">' + esc(city.name) + "</text>" +
      "</g>"
    );
  }

  const PIN_ZONE = {
    "Scharlachrotes Kloster": "tirisfal",
    "Scholomance": "wpl",
    "Stratholme": "epl",
    "Naxxramas": "epl",
    "Burg Schattenfang": "silberwald",
    "Gnomeregan": "dunmorogh",
    "Schwarzfels": "searing",
    "Uldaman": "badlands",
    "Tempel von Atal'Hakkar": "swamp",
    "Das Verlies": "elwynn",
    "Todesminen": "westfall",
    "Zul'Gurub": "stv",
    "Tiefschwarze Grotte": "ashenvale",
    "Flammenschlund": "durotar",
    "Höhlen des Wehklagens": "barrens",
    "Kral der Klingenhauer": "barrens",
    "Hügel der Klingenhauer": "barrens",
    "Maraudon": "desolace",
    "Onyxias Hort": "dustwallow",
    "Düsterbruch": "feralas",
    "Zul'Farrak": "tanaris",
    "Ruinen von Ahn'Qiraj": "silithus",
    "Tempel von Ahn'Qiraj": "silithus",
  };

  function pinSvg(pin, continent) {
    const zone = PIN_ZONE[pin.name] || "";
    return (
      '<g class="karte-dungeon" data-zone="' + zone + '" data-continent="' + continent + '" transform="translate(' + pin.at[0] + " " + pin.at[1] + ')" tabindex="0" role="button" aria-label="' + esc(pin.name) + '">' +
      '<path class="karte-dung-gem' + (pin.raid ? " is-raid" : "") + '" d="M0 -7 L6 0 L0 7 L-6 0 Z"/>' +
      "<title>" + esc(pin.name) + "</title>" +
      "</g>"
    );
  }

  function shiftItem(item, dx, dy, continent) {
    const copy = {
      id: item.id,
      name: item.name,
      lines: item.lines,
      min: item.min,
      max: item.max,
      faction: item.faction,
      neu: item.neu,
      note: item.note,
      band: item.band,
      labelSize: item.labelSize,
      cont: continent,
      pts: item.pts.map(function (pt) { return [pt[0] + dx, pt[1] + dy]; }),
    };
    if (item.labelAt) copy.labelAt = [item.labelAt[0] + dx, item.labelAt[1] + dy];
    return copy;
  }

  function shiftAt(list, dx, dy) {
    return (list || []).map(function (item) {
      return {
        name: item.name,
        short: item.short,
        faction: item.faction,
        raid: item.raid,
        lx: item.lx,
        ly: item.ly,
        at: [item.at[0] + dx, item.at[1] + dy],
      };
    });
  }

  function zoneSvg(item) {
    const d = pathFrom(item.pts);
    const aria = item.name + ", " + levelText(item) + ", " + item.faction + (item.neu ? ", NEU" : "");
    return (
      '<g class="karte-zone" data-zone="' + item.id + '" data-continent="' + item.cont + '" tabindex="0" role="button" aria-pressed="false" aria-label="' + esc(aria) + '">' +
      '<path class="karte-glow" d="' + d + '"></path>' +
      '<path class="karte-fill" data-band="' + item.band + '" d="' + d + '"><title>' + esc(item.name + ", " + levelText(item)) + "</title></path>" +
      "</g>"
    );
  }

  function continentParts(zones, dx, dy, continent) {
    const moved = zones.map(function (item) { return shiftItem(item, dx, dy, continent); });
    const loops = coastLoops(moved);
    const coast = loops.map(pathFrom).join("");
    const borders = [];
    boundaries(moved).forEach(function (edge) {
      if (edge.n === 2) borders.push("M" + edge.a[0] + " " + edge.a[1] + " L" + edge.b[0] + " " + edge.b[1]);
    });
    return {
      zones: moved,
      coast: coast,
      borders: borders.join(" "),
    };
  }

  const world = { full: null, kal: null, ek: null, cam: null, svg: null };

  function frameOf(box, pad) {
    return { x: box.x - pad, y: box.y - pad, w: box.w + pad * 2, h: box.h + pad * 2 };
  }

  function applyCam(box) {
    world.cam = box;
    if (world.svg) world.svg.setAttribute("viewBox", [box.x, box.y, box.w, box.h].join(" "));
    document.querySelectorAll("[data-focus]").forEach(function (btn) {
      const on = (btn.getAttribute("data-focus") === "kal" && box === world.kal) || (btn.getAttribute("data-focus") === "ek" && box === world.ek);
      btn.classList.toggle("is-on", on);
    });
  }

  function zoomBy(factor) {
    const box = world.cam || world.full;
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const w = Math.max(world.full.w * 0.28, Math.min(world.full.w * 1.05, box.w * factor));
    const h = box.h * (w / box.w);
    applyCam({ x: cx - w / 2, y: cy - h / 2, w: w, h: h });
  }

  function renderWorld() {
    const kalBox = bbox([].concat.apply([], KAL.map(function (item) { return item.pts; })));
    const ekBox = bbox([].concat.apply([], EK.map(function (item) { return item.pts; })));
    const left = 150;
    const gap = 420;
    const top = 70;
    const kalDx = left - kalBox.x;
    const kalDy = top - kalBox.y;
    const ekDx = left + kalBox.w + gap - ekBox.x;
    const ekDy = top - ekBox.y;
    const kal = continentParts(KAL, kalDx, kalDy, "kal");
    const ek = continentParts(EK, ekDx, ekDy, "ek");
    const zBox = bbox(ZEPHRAS.pts);
    const zx = left + kalBox.w + gap / 2 - zBox.w / 2 - zBox.x;
    const zy = top + 8 - zBox.y;
    const isle = shiftItem(ZEPHRAS, zx, zy, "kal");
    const right = ekDx + ekBox.x + ekBox.w;
    const bottom = Math.max(kalDy + kalBox.y + kalBox.h, ekDy + ekBox.y + ekBox.h);
    const full = { x: 0, y: -40, w: right + 150, h: bottom + 360 };
    world.full = full;
    world.kal = frameOf({ x: kalDx + kalBox.x, y: kalDy + kalBox.y, w: kalBox.w, h: kalBox.h }, 50);
    world.ek = frameOf({ x: ekDx + ekBox.x, y: ekDy + ekBox.y, w: ekBox.w, h: ekBox.h }, 50);
    const cities = shiftAt(CITIES.kal, kalDx, kalDy).map(citySvg).join("") + shiftAt(CITIES.ek, ekDx, ekDy).map(citySvg).join("");
    const pins = shiftAt(PINS.kal, kalDx, kalDy).map(function (pin) { return pinSvg(pin, "kal"); }).join("") +
      shiftAt(PINS.ek, ekDx, ekDy).map(function (pin) { return pinSvg(pin, "ek"); }).join("");
    const zones = kal.zones.concat(ek.zones, [isle]);
    const midX = Math.round(left + kalBox.w + gap / 2);
    const midY = Math.round(top + Math.max(kalBox.h, ekBox.h) * 0.48);
    const sea =
      '<text class="karte-sea" x="78" y="' + midY + '" transform="rotate(-90 78 ' + midY + ')">' + esc("Das Verhüllte Meer") + "</text>" +
      '<text class="karte-sea" x="' + midX + '" y="' + midY + '">' + esc("Das Große Meer") + "</text>" +
      '<text class="karte-sea" x="' + Math.round(right + 78) + '" y="' + midY + '" transform="rotate(90 ' + Math.round(right + 78) + " " + midY + ')">' + esc("Das Verbotene Meer") + "</text>" +
      '<text class="karte-sea" x="' + midX + '" y="' + Math.round(bottom + 78) + '">' + esc("Die Südlichen Meere") + "</text>";
    const svg =
      '<svg viewBox="' + [full.x, full.y, full.w, full.h].join(" ") + '" role="group" aria-label="Weltkarte von Kalimdor und den Östlichen Königreichen">' +
      "<defs>" +
      '<pattern id="karte-grid" width="56" height="56" patternUnits="userSpaceOnUse">' +
      '<path class="karte-grid-line" d="M56 0 H0 V56"></path>' +
      "</pattern>" +
      "</defs>" +
      '<rect class="karte-ocean" x="' + full.x + '" y="' + full.y + '" width="' + full.w + '" height="' + full.h + '"></rect>' +
      '<rect class="karte-grid" x="' + full.x + '" y="' + full.y + '" width="' + full.w + '" height="' + full.h + '"></rect>' +
      zones.map(zoneSvg).join("") +
      '<path class="karte-coast" d="' + kal.coast + ek.coast + pathFrom(isle.pts) + '"></path>' +
      '<path class="karte-border" d="' + kal.borders + " " + ek.borders + '"></path>' +
      sea +
      '<g class="karte-deco">' + cities + "</g>" +
      zones.map(labelSvg).join("") +
      pins +
      "</svg>";
    document.getElementById("karte-map").innerHTML = '<div class="karte-stage">' + svg + "</div>";
    world.svg = document.querySelector("#karte-map svg");
    applyCam(full);
  }

  function sortedZones(zones) {
    return zones.slice().sort(function (a, b) {
      const amin = a.min == null ? 999 : a.min;
      const amax = a.max == null ? 999 : a.max;
      const bmin = b.min == null ? 999 : b.min;
      const bmax = b.max == null ? 999 : b.max;
      return amin - bmin || amax - bmax || a.name.localeCompare(b.name, "de");
    });
  }

  function renderList(key) {
    const data = MAPS[key];
    const zones = data.zones.slice();
    if (key === "kal") zones.push(ZEPHRAS);
    const rows = sortedZones(zones).map(function (item) {
      const instances = item.instances.length
        ? item.instances.map(function (inst) { return esc(instanceShort(inst)); }).join("<br>")
        : "keine";
      return (
        '<tr class="karte-row" data-zone="' + item.id + '">' +
        '<th scope="row"><button type="button" class="karte-name" data-zone="' + item.id + '">' + esc(item.name) + (item.neu ? neuBadge() : "") + "</button></th>" +
        "<td>" + esc(rangeCell(item)) + "</td>" +
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
    const bands = BANDS.map(function (band) {
      return '<li><span class="karte-swatch" data-band="' + band.id + '" aria-hidden="true"></span>' + esc(band.label) + "</li>";
    }).join("");
    list.innerHTML = bands +
      '<li><span class="karte-swatch karte-swatch-city" aria-hidden="true"></span>Stadt</li>' +
      '<li><span class="karte-swatch karte-swatch-dung" aria-hidden="true"></span>Dungeon oder Raid</li>';
  }

  function showInfo(key, id) {
    const item = findZone(key, id);
    const box = document.getElementById("karte-info");
    if (!box) return;
    box.innerHTML = item ? infoHtml(item) : hintHtml();
  }

  function markSelected(id) {
    const map = document.getElementById("karte-map");
    if (map) {
      map.querySelectorAll(".karte-zone").forEach(function (el) {
        const on = el.getAttribute("data-zone") === id;
        el.classList.toggle("is-on", on);
        el.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }
    ["ek", "kal"].forEach(function (key) {
      const list = document.getElementById("karte-list-" + key);
      if (!list) return;
      list.querySelectorAll(".karte-row").forEach(function (el) {
        el.classList.toggle("is-on", el.getAttribute("data-zone") === id);
      });
    });
  }

  function pinZone(key, id, scroll) {
    pinned.world = id;
    markSelected(id);
    showInfo(key, id);
    if (!scroll) return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    const info = document.getElementById("karte-info");
    if (info && info.scrollIntoView) info.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function continentOf(node) {
    const own = node.getAttribute && node.getAttribute("data-continent");
    if (own && own !== "world") return own;
    const host = node.closest("[data-continent]");
    return host ? host.getAttribute("data-continent") : "";
  }

  function toggleFull() {
    const frame = document.getElementById("karte-frame");
    if (!frame) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }
    if (frame.requestFullscreen) frame.requestFullscreen();
  }

  function boot() {
    const root = document.getElementById("forever-karte");
    if (!root) return;
    renderLegend();
    renderWorld();
    Object.keys(MAPS).forEach(renderList);
    const info = document.getElementById("karte-info");
    if (info) info.innerHTML = hintHtml();

    root.addEventListener("click", function (event) {
      const focus = event.target.closest("[data-focus]");
      if (focus && root.contains(focus)) {
        applyCam(focus.getAttribute("data-focus") === "ek" ? world.ek : world.kal);
        return;
      }
      const zoom = event.target.closest("[data-zoom]");
      if (zoom && root.contains(zoom)) {
        const kind = zoom.getAttribute("data-zoom");
        if (kind === "in") zoomBy(0.72);
        else if (kind === "out") zoomBy(1.38);
        else toggleFull();
        return;
      }
      const hit = event.target.closest("[data-zone]");
      if (!hit || !root.contains(hit)) return;
      const key = continentOf(hit) === "ek" ? "ek" : "kal";
      pinZone(key, hit.getAttribute("data-zone"), true);
    });

    root.addEventListener("keydown", function (event) {
      const zone = event.target.classList && (event.target.classList.contains("karte-zone") || event.target.classList.contains("karte-dungeon"));
      if ((event.key === "Enter" || event.key === " ") && zone) {
        event.preventDefault();
        event.target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      }
    });

    root.addEventListener("mouseover", function (event) {
      const hit = event.target.closest(".karte-zone, .karte-dungeon");
      if (!hit || !root.contains(hit)) return;
      if (pinned.world) return;
      const key = continentOf(hit) === "ek" ? "ek" : "kal";
      showInfo(key, hit.getAttribute("data-zone"));
    });

    root.addEventListener("mouseout", function (event) {
      const next = event.relatedTarget;
      if (next && root.contains(next) && next.closest && next.closest(".karte-zone, .karte-dungeon, #karte-info")) return;
      if (pinned.world) return;
      const infoBox = document.getElementById("karte-info");
      if (infoBox && event.target.closest && event.target.closest("#karte-map")) infoBox.innerHTML = hintHtml();
    });

    document.addEventListener("fullscreenchange", function () {
      const btn = root.querySelector("[data-zoom='full'] i");
      if (btn) btn.className = document.fullscreenElement ? "fa-solid fa-compress" : "fa-solid fa-expand";
    });
  }

  function deepInside(p, pts) {
    return inside(p, pts) && inside([p[0] + 5, p[1]], pts) && inside([p[0] - 5, p[1]], pts) && inside([p[0], p[1] + 5], pts) && inside([p[0], p[1] - 5], pts);
  }

  function audit(zones, label) {
    const problems = [];
    const seen = new Map();
    const bag = boundaries(zones);
    bag.forEach(function (edge) {
      if (edge.n !== 1 && edge.n !== 2) problems.push(label + " edge x" + edge.n + " " + ptKey(edge.a));
      if (edge.n === 2 && edge.dirs[0] === edge.dirs[1]) problems.push(label + " same-dir " + edge.dirs[0]);
    });
    const loops = coastLoops(zones);
    const expect = label === "kal" ? 2 : 1;
    if (loops.length !== expect) {
      problems.push(label + " coasts " + loops.length + " " + loops.map(function (loop) {
        const b = bbox(loop);
        return Math.round(b.x) + "," + Math.round(b.y) + " " + Math.round(b.w) + "x" + Math.round(b.h);
      }).join(" | "));
    }
    zones.forEach(function (item) {
      const box = bbox(item.pts);
      if (box.w < 70 || box.h < 55) problems.push(label + " small " + item.id + " " + Math.round(box.w) + "x" + Math.round(box.h));
      const step = 6;
      for (let y = box.y; y <= box.y + box.h; y += step) {
        for (let x = box.x; x <= box.x + box.w; x += step) {
          if (!deepInside([x, y], item.pts)) continue;
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
      console.error(problems.slice(0, 40).join("\n"));
      process.exitCode = 1;
    } else {
      console.log("karte geometry ok", EK.length, KAL.length);
    }
  } else {
    document.addEventListener("DOMContentLoaded", boot);
  }
})();
