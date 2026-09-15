import { userOf } from '../auth/session.js'
import { familyOf } from '../families/require-family.js'

/** @typedef {import('./stories.service.js').StoriesService} StoriesService */

/**
 * Writes one event of the story to the open stream. A reader who left gets
 * nothing more, and a full buffer waits for room or for the reader to leave,
 * never forever.
 * @param {import('fastify').FastifyReply} reply
 * @param {import('./stories.service.js').StoryEvent | { type: 'error' }} event
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

/** Stories for the signed-in adult's family. @param {{ stories: StoriesService }} deps */
export function createStoriesController({ stories }) {
  return {
    /** @type {import('fastify').RouteHandlerMethod} */
    async options(request) {
      const { exclude = [] } = /** @type {{ exclude?: string[] }} */ (request.query)
      return stories.options(familyOf(request), { exclude, userId: userOf(request).id })
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async write(request) {
      const { templateId } = /** @type {{ templateId: string }} */ (request.body)
      return stories.write(familyOf(request), templateId, { userId: userOf(request).id })
    },

    /**
     * The chosen story, as server-sent events. Unknown ids — a story nobody
     * in this family picked — answer with a clean 404 before the stream
     * starts; the rest answer with paragraphs and end with the whole story.
     * Whatever happens after the stream starts becomes one last event: a
     * server error is never described, so the failure line in the web does
     * the talking.
     * @type {import('fastify').RouteHandlerMethod}
     */
    async writeStream(request, reply) {
      const { id } = /** @type {{ id: string }} */ (request.body)
      const controller = new AbortController()
      // The response closes when the reader leaves, or once the story is sent.
      // Not the request: its close already fired when the body was read.
      reply.raw.on('close', () => controller.abort())
      const stream = await stories.writeStream(familyOf(request), id, {
        signal: controller.signal,
        userId: userOf(request).id,
      })
      const first = await stream.next()
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
          if (next.type === 'story') break
          const step = await stream.next()
          next = step.done ? undefined : step.value
        }
      } catch {
        await writeEvent(reply, { type: 'error' })
      }
      reply.raw.end()
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
  }
}