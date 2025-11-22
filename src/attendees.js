import fs from "fs";
import path from "path";

function loadAttendees(slug) {
  const p = path.resolve(`data/events/${slug}/attendees.json`);
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function summarizeLevels(list) {
  const total = list.length || 0;
  const group = { beginner: 0, intermediate: 0, advanced: 0 };
  for (const a of list) {
    const lvl = String(a.level || "").toLowerCase();
    if (lvl.includes("advanced")) group.advanced++;
    else if (lvl.includes("intermediate")) group.intermediate++;
    else group.beginner++;
  }
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
  return {
    total,
    beginner: { count: group.beginner, pct: pct(group.beginner) },
    intermediate: { count: group.intermediate, pct: pct(group.intermediate) },
    advanced: { count: group.advanced, pct: pct(group.advanced) }
  };
}

export function getAttendeeSnapshot(slug) {
  const list = loadAttendees(slug);
  const s = summarizeLevels(list);
  const lines = [];
  lines.push(`RSVPs: ${s.total}`);
  lines.push(`Beginners (incl. upper-beginner): ${s.beginner.count} (${s.beginner.pct}%)`);
  lines.push(`Intermediate: ${s.intermediate.count} (${s.intermediate.pct}%)`);
  lines.push(`Advanced: ${s.advanced.count} (${s.advanced.pct}%)`);
  lines.push(`We organize small groups and buddy intros so beginners feel comfortable.`);
  return lines.join("\n");
}
