import { buildEpisode } from "../episodeBuilder.js";
import { MOUNTAIN_DEW_RUN } from "./mountainDewRun/index.js";

/** Every long-form show in the repo, keyed by its preset id. */
export const SHOWS = {
  mountain_dew_run: MOUNTAIN_DEW_RUN,
};

export function listShows() {
  return Object.values(SHOWS).map((show) => ({
    id: show.id,
    title: show.title,
    scenes: show.scenes.map((s) => ({ id: s.id, title: s.title, duration: s.duration, room: s.room })),
    duration: show.scenes.reduce((sum, s) => sum + s.duration, 0),
  }));
}

/**
 * Welds a show's scenes into one runtime episode.
 * `onlyScene` builds a one-scene episode for fast iteration.
 */
export function buildShow(showId, { onlyScene = null } = {}) {
  const show = SHOWS[showId];
  if (!show) {
    throw new Error(`[shows] unknown show "${showId}". Known: ${Object.keys(SHOWS).join(", ")}`);
  }
  const scenes = onlyScene
    ? show.scenes.filter((s) => s.id === onlyScene || String(s.id) === String(onlyScene))
    : show.scenes;
  if (onlyScene && scenes.length === 0) {
    throw new Error(
      `[shows] show "${showId}" has no scene "${onlyScene}". Scenes: ${show.scenes
        .map((s) => s.id)
        .join(", ")}`
    );
  }
  return buildEpisode({
    id: onlyScene ? `${show.id}.${onlyScene}` : show.id,
    title: onlyScene ? `${show.title} — ${scenes[0].title}` : show.title,
    aspect: show.aspect || "16:9",
    scenes,
    requireCast: false,
  });
}

export function findScene(showId, sceneId) {
  return SHOWS[showId]?.scenes.find((s) => s.id === sceneId) || null;
}
