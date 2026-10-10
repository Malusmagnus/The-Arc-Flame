(function (root) {
  "use strict";

  var KO_LIMIT = 32;

  function nextPow2(n) {
    var p = 1;
    while (p < n) p *= 2;
    return p;
  }

  function shuffle(items, rng) {
    var copy = items.slice();
    var i;
    for (i = copy.length - 1; i > 0; i -= 1) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function groupLabel(index) {
    var n = index + 1;
    var label = "";
    while (n > 0) {
      var rem = (n - 1) % 26;
      label = String.fromCharCode(65 + rem) + label;
      n = Math.floor((n - 1) / 26);
    }
    return label;
  }

  function groupSizes(count) {
    var groups = Math.floor(count / 4);
    var rem = count % 4;
    var sizes = [];
    var i;
    for (i = 0; i < groups; i += 1) sizes.push(4);
    for (i = 0; i < rem; i += 1) sizes[i] += 1;
    return sizes;
  }

  function bracketOrder(size) {
    var positions = [1, 2];
    var n = 2;
    while (n < size) {
      var next = [];
      var sum = n * 2 + 1;
      var i;
      for (i = 0; i < positions.length; i += 1) {
        next.push(positions[i]);
        next.push(sum - positions[i]);
      }
      positions = next;
      n *= 2;
    }
    return positions;
  }

  function roundRobin(ids) {
    var list = ids.slice();
    if (list.length < 2) return [];
    if (list.length % 2 === 1) list.push(null);
    var count = list.length;
    var rounds = count - 1;
    var half = count / 2;
    var arr = list.slice();
    var matches = [];
    var r;
    var i;
    for (r = 0; r < rounds; r += 1) {
      for (i = 0; i < half; i += 1) {
        var a = arr[i];
        var b = arr[count - 1 - i];
        if (a && b) matches.push([a, b]);
      }
      var fixed = arr[0];
      var rest = arr.slice(1);
      rest.unshift(rest.pop());
      arr = [fixed].concat(rest);
    }
    return matches;
  }

  function roundName(matchCount) {
    if (matchCount <= 1) return "Finale";
    if (matchCount === 2) return "Halbfinale";
    if (matchCount === 4) return "Viertelfinale";
    if (matchCount === 8) return "Achtelfinale";
    return "Runde der " + matchCount * 2;
  }

  function clone(board) {
    return JSON.parse(JSON.stringify(board));
  }

  function findMatch(board, id) {
    var i;
    for (i = 0; i < board.matches.length; i += 1) {
      if (board.matches[i].id === id) return board.matches[i];
    }
    return null;
  }

  function entryById(board, id) {
    var i;
    if (!id) return null;
    for (i = 0; i < board.entries.length; i += 1) {
      if (board.entries[i].id === id) return board.entries[i];
    }
    return null;
  }

  function pushForward(board, match) {
    if (!match.feeds) return;
    var dest = findMatch(board, match.feeds);
    if (!dest) return;
    var key = match.feedsSlot === "b" ? "b" : "a";
    var incoming = match.winner || null;
    if (dest[key] === incoming) return;
    dest[key] = incoming;
    if (dest.byeSide) {
      resolveStructuralBye(board, dest);
      return;
    }
    if (dest.winner) {
      dest.winner = null;
      dest.bye = false;
      pushForward(board, dest);
    }
  }

  function resolveStructuralBye(board, match) {
    if (!match.byeSide) return;
    var player = match.byeSide === "b" ? match.a : match.b;
    if (match.byeSide === "b") match.b = null;
    if (match.byeSide === "a") match.a = null;
    if (player) {
      match.bye = true;
      if (match.winner !== player) {
        match.winner = player;
        pushForward(board, match);
      }
      return;
    }
    if (match.winner || match.bye) {
      match.bye = false;
      match.winner = null;
      pushForward(board, match);
    }
  }

  function rankEntries(entries, matches) {
    var stats = {};
    var i;
    entries.forEach(function (entry) {
      stats[entry.id] = {
        id: entry.id,
        wins: 0,
        losses: 0,
        tiebreak: entry.tiebreak,
        h2h: 0,
      };
    });
    matches.forEach(function (match) {
      if (!match.winner || !stats[match.a] || !stats[match.b]) return;
      var loser = match.winner === match.a ? match.b : match.a;
      if (!stats[loser]) return;
      stats[match.winner].wins += 1;
      stats[loser].losses += 1;
    });
    var buckets = {};
    entries.forEach(function (entry) {
      var row = stats[entry.id];
      var key = String(row.wins);
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(row);
    });
    var winVals = Object.keys(buckets).map(Number).sort(function (a, b) {
      return b - a;
    });
    var ordered = [];
    winVals.forEach(function (wins) {
      var bucket = buckets[String(wins)];
      var inBucket = {};
      bucket.forEach(function (row) { inBucket[row.id] = true; });
      bucket.forEach(function (row) {
        matches.forEach(function (match) {
          if (!match.winner || !inBucket[match.a] || !inBucket[match.b]) return;
          if (match.winner === row.id) row.h2h += 1;
        });
      });
      bucket.sort(function (a, b) {
        if (a.h2h !== b.h2h) return b.h2h - a.h2h;
        if (a.tiebreak !== b.tiebreak) return a.tiebreak - b.tiebreak;
        if (a.id < b.id) return -1;
        if (a.id > b.id) return 1;
        return 0;
      });
      for (i = 0; i < bucket.length; i += 1) ordered.push(bucket[i]);
    });
    return ordered;
  }

  function groupMatches(board, groupId) {
    return board.matches.filter(function (match) {
      return match.stage === "group" && match.groupId === groupId;
    });
  }

  function groupComplete(board, groupId) {
    var matches = groupMatches(board, groupId);
    return matches.length > 0 && matches.every(function (match) { return !!match.winner; });
  }

  function refreshQualifiers(board) {
    if (board.mode !== "groups") return board;
    var rankedByGroup = {};
    board.groups.forEach(function (group) {
      var matches = groupMatches(board, group.id);
      if (!groupComplete(board, group.id)) {
        rankedByGroup[group.id] = null;
        return;
      }
      var members = board.entries.filter(function (entry) { return entry.groupId === group.id; });
      rankedByGroup[group.id] = rankEntries(members, matches).map(function (row) { return row.id; });
    });
    board.matches.forEach(function (match) {
      if (match.stage !== "ko" || match.round !== 1) return;
      [["sourceA", "a"], ["sourceB", "b"]].forEach(function (pair) {
        var source = match[pair[0]];
        var key = pair[1];
        if (!source) return;
        var ranked = rankedByGroup[source.groupId];
        var nextId = ranked ? ranked[source.place - 1] : null;
        if (match[key] === nextId) return;
        match[key] = nextId || null;
        if (match.winner && !match.byeSide) {
          match.winner = null;
          pushForward(board, match);
        }
      });
      if (match.byeSide) resolveStructuralBye(board, match);
    });
    return board;
  }

  function avoidSameGroup(slots) {
    var pairCount = Math.floor(slots.length / 2);
    function groupOf(slot) {
      return slot && slot.source ? slot.source.groupId : null;
    }
    var p;
    var q;
    for (p = 0; p < pairCount; p += 1) {
      var left = p * 2;
      var g1 = groupOf(slots[left]);
      var g2 = groupOf(slots[left + 1]);
      if (!g1 || g1 !== g2) continue;
      for (q = 0; q < pairCount; q += 1) {
        if (q === p) continue;
        var altIndex = q * 2 + 1;
        var alt = groupOf(slots[altIndex]);
        var other = groupOf(slots[q * 2]);
        if (alt && alt === g1) continue;
        if (other && other === g2) continue;
        var tmp = slots[left + 1];
        slots[left + 1] = slots[altIndex];
        slots[altIndex] = tmp;
        break;
      }
    }
  }

  function placeSeeds(seeds) {
    var size = nextPow2(Math.max(seeds.length, 2));
    var order = bracketOrder(size);
    var slots = [];
    var pos;
    for (pos = 0; pos < size; pos += 1) {
      var seedNum = order[pos];
      if (seedNum <= seeds.length) slots.push(seeds[seedNum - 1]);
      else slots.push({ entryId: null, source: null, placeholder: null });
    }
    avoidSameGroup(slots);
    return slots;
  }

  function blankMatch(id, stage, round, slot) {
    return {
      id: id,
      stage: stage,
      groupId: null,
      round: round,
      slot: slot,
      a: null,
      b: null,
      winner: null,
      bye: false,
      byeSide: null,
      placeholderA: null,
      placeholderB: null,
      sourceA: null,
      sourceB: null,
      feeds: null,
      feedsSlot: null,
    };
  }

  function buildKoMatches(slots, idFactory) {
    var size = slots.length;
    var rounds = [];
    var roundNo = 1;
    var count = size / 2;
    var r;
    var i;
    while (count >= 1) {
      var round = [];
      for (i = 0; i < count; i += 1) {
        round.push(blankMatch(idFactory(), "ko", roundNo, i));
      }
      rounds.push(round);
      count = Math.floor(count / 2);
      roundNo += 1;
    }
    var roundIndex;
    for (roundIndex = 0; roundIndex < rounds.length - 1; roundIndex += 1) {
      for (i = 0; i < rounds[roundIndex].length; i += 1) {
        rounds[roundIndex][i].feeds = rounds[roundIndex + 1][Math.floor(i / 2)].id;
        rounds[roundIndex][i].feedsSlot = i % 2 === 0 ? "a" : "b";
      }
    }
    var first = rounds[0];
    for (i = 0; i < first.length; i += 1) {
      var left = slots[i * 2] || { entryId: null, source: null, placeholder: null };
      var right = slots[i * 2 + 1] || { entryId: null, source: null, placeholder: null };
      first[i].a = left.entryId || null;
      first[i].b = right.entryId || null;
      first[i].placeholderA = left.placeholder || null;
      first[i].placeholderB = right.placeholder || null;
      first[i].sourceA = left.source || null;
      first[i].sourceB = right.source || null;
      if (!left.entryId && !left.source) first[i].byeSide = "a";
      else if (!right.entryId && !right.source) first[i].byeSide = "b";
    }
    var matches = [];
    rounds.forEach(function (round) {
      round.forEach(function (match) { matches.push(match); });
    });
    return matches;
  }

  function signupName(row) {
    return String(row.character_name || row.name || "").trim();
  }

  function signupClass(row) {
    return String(row.className || row["class"] || "").trim();
  }

  function createDraw(signups, rng) {
    var random = rng || Math.random;
    var people = (signups || []).filter(function (row) { return row && row.id; });
    if (people.length < 2) {
      throw new Error("Mindestens zwei freigegebene Teilnehmer.");
    }
    var ordered = shuffle(people, random);
    var seq = 0;
    function nextId(prefix) {
      seq += 1;
      return prefix + seq;
    }
    if (ordered.length <= KO_LIMIT) return buildDirectKo(ordered, random, nextId);
    return buildGroups(ordered, random, nextId);
  }

  function makeEntry(row, id, groupId, tiebreak) {
    return {
      id: id,
      signupId: String(row.id),
      name: signupName(row),
      className: signupClass(row),
      faction: String(row.faction || "").toLowerCase(),
      groupId: groupId,
      tiebreak: tiebreak,
    };
  }

  function buildDirectKo(ordered, rng, nextId) {
    var entries = ordered.map(function (row, index) {
      return makeEntry(row, nextId("e"), null, index);
    });
    var seeds = entries.map(function (entry) {
      return { entryId: entry.id, source: null, placeholder: null };
    });
    var board = {
      mode: "ko",
      entries: entries,
      groups: [],
      matches: buildKoMatches(placeSeeds(seeds), function () { return nextId("m"); }),
    };
    board.matches.forEach(function (match) {
      if (match.round === 1 && match.byeSide) resolveStructuralBye(board, match);
    });
    return board;
  }

  function buildGroups(ordered, rng, nextId) {
    var sizes = groupSizes(ordered.length);
    var groups = [];
    var entries = [];
    var cursor = 0;
    var g;
    for (g = 0; g < sizes.length; g += 1) {
      var group = { id: nextId("g"), label: groupLabel(g), sort: g };
      groups.push(group);
      var n;
      for (n = 0; n < sizes[g]; n += 1) {
        var tiebreak = Math.floor(rng() * 1000000);
        entries.push(makeEntry(ordered[cursor], nextId("e"), group.id, tiebreak));
        cursor += 1;
      }
    }
    var matches = [];
    groups.forEach(function (group) {
      var members = entries.filter(function (entry) { return entry.groupId === group.id; });
      var pairs = roundRobin(members.map(function (entry) { return entry.id; }));
      pairs.forEach(function (pair, index) {
        var match = blankMatch(nextId("m"), "group", 1, index);
        match.groupId = group.id;
        match.a = pair[0];
        match.b = pair[1];
        matches.push(match);
      });
    });
    var seeds = [];
    groups.forEach(function (group) {
      seeds.push({
        entryId: null,
        source: { groupId: group.id, place: 1 },
        placeholder: "Sieger Gruppe " + group.label,
      });
    });
    groups.forEach(function (group) {
      seeds.push({
        entryId: null,
        source: { groupId: group.id, place: 2 },
        placeholder: "Zweiter Gruppe " + group.label,
      });
    });
    var ko = buildKoMatches(placeSeeds(seeds), function () { return nextId("m"); });
    var board = {
      mode: "groups",
      entries: entries,
      groups: groups,
      matches: matches.concat(ko),
    };
    refreshQualifiers(board);
    return board;
  }

  function setWinner(board, matchId, winnerId) {
    var next = clone(board);
    var match = findMatch(next, matchId);
    if (!match || match.bye) return next;
    if (!match.a || !match.b) return next;
    if (winnerId !== match.a && winnerId !== match.b) return next;
    if (match.winner === winnerId) return next;
    match.winner = winnerId;
    pushForward(next, match);
    if (match.stage === "group") refreshQualifiers(next);
    return next;
  }

  function clearWinner(board, matchId) {
    var next = clone(board);
    var match = findMatch(next, matchId);
    if (!match || match.bye || !match.winner) return next;
    match.winner = null;
    pushForward(next, match);
    if (match.stage === "group") refreshQualifiers(next);
    return next;
  }

  function koRounds(board) {
    var rounds = [];
    board.matches.forEach(function (match) {
      if (match.stage !== "ko") return;
      if (!rounds[match.round - 1]) rounds[match.round - 1] = [];
      rounds[match.round - 1].push(match);
    });
    rounds.forEach(function (round) {
      round.sort(function (a, b) { return a.slot - b.slot; });
    });
    return rounds.filter(Boolean);
  }

  function toPayload(board) {
    return {
      mode: board.mode,
      groups: (board.groups || []).map(function (group) {
        return { ref: group.id, label: group.label, sort: group.sort };
      }),
      entries: board.entries.map(function (entry) {
        return {
          ref: entry.id,
          signupId: entry.signupId,
          groupRef: entry.groupId || null,
          tiebreak: entry.tiebreak,
        };
      }),
      matches: board.matches.map(function (match) {
        return {
          ref: match.id,
          stage: match.stage,
          groupRef: match.groupId || null,
          round: match.round,
          slot: match.slot,
          a: match.a || null,
          b: match.b || null,
          winner: match.winner || null,
          bye: match.bye === true,
          byeSide: match.byeSide || null,
          placeholderA: match.placeholderA || null,
          placeholderB: match.placeholderB || null,
          sourceA: match.sourceA ? { groupRef: match.sourceA.groupId, place: match.sourceA.place } : null,
          sourceB: match.sourceB ? { groupRef: match.sourceB.groupId, place: match.sourceB.place } : null,
          feeds: match.feeds || null,
          feedsSlot: match.feedsSlot || null,
        };
      }),
    };
  }

  root.TurnierBracket = {
    KO_LIMIT: KO_LIMIT,
    toPayload: toPayload,
    nextPow2: nextPow2,
    groupSizes: groupSizes,
    groupLabel: groupLabel,
    roundRobin: roundRobin,
    roundName: roundName,
    rankEntries: rankEntries,
    groupComplete: groupComplete,
    createDraw: createDraw,
    setWinner: setWinner,
    clearWinner: clearWinner,
    koRounds: koRounds,
    entryById: entryById,
    refreshQualifiers: refreshQualifiers,
  };
})(typeof window !== "undefined" ? window : globalThis);
