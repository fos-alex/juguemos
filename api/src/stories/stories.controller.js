import { userOf } from '../auth/session.js'
import { familyOf } from '../families/require-family.js'

/** @typedef {import('./stories.service.js').StoriesService} StoriesService */

/**
 * Writes one event to the open stream. A reader who left gets nothing more,
 * and a full buffer waits for room or for the reader to leave, never forever.
 * @param {import('fastify').FastifyReply} reply
 * @param {import('./stories.service.js').StoryEvent | import('./stories.service.js').OptionEvent | { type: 'error' }} event
 */
const writeEvent = async (reply, event) => {
  const response = reply.raw
  if (response.destroyed) return
  if (response.write(`data: ${JSON.stringify(event)}\n\n`)) return
  await new Promise((resolve) => {
    const done = () => {
      response.off('drain', done)
      response.off('close', done)
      resolve(undefined)
    }
    response.on('drain', done)
    response.on('close', done)
  })
}

/**
 * Aborts when the reader leaves. The response closes when they do, or once
 * the stream ends. Not the request: its close already fired when the body
 * was read.
 * @param {import('fastify').FastifyReply} reply
 */
const leavingSignal = (reply) => {
  const controller = new AbortController()
  reply.raw.on('close', () => controller.abort())
  return controller.signal
}

/**
 * Opens the stream and sends every event to it, ending after the one named
 * by `last`. Whatever the service refuses with before the first event is a
 * regular response, so those failures keep their status and their body;
 * whatever happens after becomes one `error` event, since a server error is
 * never described and the failure line in the web does the talking.
 * A reader who left before the first event isn't a failure: nobody is there
 * to answer, so the stream just ends, with nothing logged.
 * @param {import('fastify').FastifyReply} reply
 * @param {AsyncGenerator<{ type: string }, void, void>} stream
 * @param {string} last the event type the stream ends with
 * @param {AbortSignal} signal aborts when the reader leaves
 */
const sendEvents = async (reply, stream, last, signal) => {
  let first
  try {
    first = await stream.next()
  } catch (error) {
    if (!signal.aborted) throw error
    reply.hijack()
    reply.raw.end()
    return
  }
  reply.hijack()
  reply.raw.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  })
  try {
    let next = first.done ? undefined : first.value
    while (next) {
      await writeEvent(reply, next)
      if (next.type === last) break
      const step = await stream.next()
      next = step.done ? undefined : step.value
    }
  } catch {
    await writeEvent(reply, { type: 'error' })
  }
  reply.raw.end()
}

/** Stories for the signed-in adult's family. @param {{ stories: StoriesService }} deps */
export function createStoriesController({ stories }) {
  return {
    /**
     * The two options, as server-sent events: one `option` as each lands,
     * then `done`. A model that answers nothing readable fails before the
     * stream starts, so the family gets a clean error instead of an empty
     * screen; a failure once it has started is one last `error` event, as
     * the story stream does.
     * @type {import('fastify').RouteHandlerMethod}
     */
    async options(request, reply) {
      const { exclude = [] } = /** @type {{ exclude?: string[] }} */ (request.query)
      const signal = leavingSignal(reply)
      const stream = await stories.optionsStream(familyOf(request), { exclude, userId: userOf(request).id, signal })
      await sendEvents(reply, stream, 'done', signal)
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async write(request) {
      const { templateId } = /** @type {{ templateId: string }} */ (request.body)
      return stories.write(familyOf(request), templateId, { userId: userOf(request).id })
    },

    /**
     * The chosen story, as server-sent events: the story behind an option the
     * family picked, a new one about an interest they tapped (JUG-140), or the
     * one they asked for in a voice note (JUG-156).
     * Unknown ids — a story nobody in this family picked — and a keyword that
     * is not one of the family's interests answer cleanly before the stream
     * starts; the rest answer with paragraphs and end with the whole story.
     * Whatever happens after the stream starts becomes one last event: a
     * server error is never described, so the failure line in the web does
     * the talking.
     * @type {import('fastify').RouteHandlerMethod}
     */
    async writeStream(request, reply) {
      const body = /** @type {{ id?: string, keyword?: string, request?: import('./requests.js').StoryRequest }} */ (
        request.body
      )
      const signal = leavingSignal(reply)
      const asked = { signal, userId: userOf(request).id }
      const stream = body.request
        ? await stories.writeRequestStream(familyOf(request), body.request, asked)
        : body.keyword
          ? await stories.writeKeywordStream(familyOf(request), body.keyword, asked)
          : await stories.writeStream(familyOf(request), /** @type {string} */ (body.id), asked)
      await sendEvents(reply, stream, 'story', signal)
    },

    /**
     * What story a voice note's words ask for (JUG-156), for the parent to see
     * before it is written.
     * @type {import('fastify').RouteHandlerMethod}
     */
    async understand(request) {
      const { text } = /** @type {{ text: string }} */ (request.body)
      return stories.understandRequest(familyOf(request), text)
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async list(request) {
      return stories.list(familyOf(request))
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async find(request) {
      const { id } = /** @type {{ id: string }} */ (request.params)
      return stories.find(familyOf(request), id)
    },

    /**
     * Turns a story the family has read into a series (JUG-59). It answers
     * with the series, whose only episode is that story.
     * @type {import('fastify').RouteHandlerMethod}
     */
    async makeSeries(request, reply) {
      const { id } = /** @type {{ id: string }} */ (request.params)
      return reply.code(201).send(await stories.makeSeries(familyOf(request), id))
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async listSeries(request) {
      return { series: await stories.seriesList(familyOf(request)) }
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async findSeries(request) {
      const { id } = /** @type {{ id: string }} */ (request.params)
      return stories.findSeries(familyOf(request), id)
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async removeSeries(request, reply) {
      const { id } = /** @type {{ id: string }} */ (request.params)
      await stories.removeSeries(familyOf(request), id)
      return reply.code(204).send()
    },

    /**
     * The next episode of a series, as the same server-sent events a story
     * arrives as. A series that is full, or that this family doesn't have,
     * answers cleanly before the stream starts.
     * @type {import('fastify').RouteHandlerMethod}
     */
    async writeEpisode(request, reply) {
      const { id } = /** @type {{ id: string }} */ (request.params)
      const signal = leavingSignal(reply)
      const stream = await stories.episodeStream(familyOf(request), id, { signal })
      await sendEvents(reply, stream, 'story', signal)
    },
  }
}