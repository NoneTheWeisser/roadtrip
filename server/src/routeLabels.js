/**
 * Derive human-readable road / instruction labels from ORS directions GeoJSON.
 * Uses step `duration` totals; if they drift from `summary.duration`, scales proportionally.
 */

/**
 * @param {any} rawFeature ORS GeoJSON route feature
 * @returns {{ offsetStart: number, offsetEnd: number, name: string, instruction: string }[]}
 */
export function buildStepTimeline(rawFeature) {
  const segments = rawFeature?.properties?.segments
  if (!Array.isArray(segments)) {
    return []
  }

  /** @type {{ offsetStart: number, offsetEnd: number, name: string, instruction: string }[]} */
  const steps = []
  let t = 0

  for (const seg of segments) {
    for (const step of seg.steps || []) {
      const durRaw = Number(step?.duration)
      const d = Number.isFinite(durRaw) ? Math.max(0, Math.round(durRaw)) : 0
      const name = typeof step?.name === 'string' ? step.name.trim() : ''
      const instruction =
        typeof step?.instruction === 'string' ? step.instruction : ''
      steps.push({
        offsetStart: t,
        offsetEnd: t + d,
        name,
        instruction,
      })
      t += d
    }
  }

  return steps
}

/**
 * @param {{ offsetStart: number, offsetEnd: number, name: string, instruction: string }[]} steps
 * @param {number} offsetSeconds travel time from departure along route
 * @param {number} routeDurationSeconds ORS summary.duration
 * @returns {string | null}
 */
export function roadLabelAtOffset(steps, offsetSeconds, routeDurationSeconds) {
  if (!steps.length) {
    return null
  }

  const last = steps[steps.length - 1]
  const timelineEnd = Math.max(last.offsetEnd, 1)
  const ratio =
    routeDurationSeconds > 0 ? timelineEnd / routeDurationSeconds : 1
  const t = offsetSeconds * ratio

  let chosen = steps[0]
  for (const s of steps) {
    if (t + 1e-6 >= s.offsetStart) {
      chosen = s
    }
  }

  if (chosen.name) {
    return chosen.name
  }
  if (chosen.instruction) {
    const ins = chosen.instruction.trim()
    return ins.length > 90 ? `${ins.slice(0, 87)}…` : ins
  }
  return null
}

/**
 * Shorten ORS reverse-geocode labels for UI (e.g. city + state).
 * @param {string | null} label
 * @returns {string | null}
 */
export function simplifyPlaceLabel(label) {
  if (!label || typeof label !== 'string') {
    return null
  }
  const parts = label
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length >= 3) {
    return `${parts[0]}, ${parts[2]}`
  }
  if (parts.length >= 2) {
    return `${parts[0]}, ${parts[1]}`
  }
  return parts[0] || label
}
