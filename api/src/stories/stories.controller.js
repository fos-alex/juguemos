/** @typedef {import('./stories.service.js').StoriesService} StoriesService */

/** The story leaves paragraph by paragraph; the reader never waits. */
const writeEvent = async (reply,/** @type {import('./stories.service.js').StoryEvent} */ event) => {
  const ok = reply.raw.write(`data: ${JSON.stringify(event)}\n\n`)
  if (!ok) await new Promise((resolve) => reply.raw.once('drain', resolve))
}

/** Stories for the signed-in adult's family. @param {{ stories: StoriesService }} deps */
export function createStoriesController({ stories }) {
  return {
    /** @type {import('fastify').RouteHandlerMethod} */
    async options(request) {
      const { exclude = [] } = /** @type {{ exclude?: string[] }} */ (request.query)
      return stories.options(/** @type {string} */ (request.familyId), { exclude })
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async write(request) {
      const { templateId } = /** @type {{ templateId: string }} */ (request.body)
      return stories.write(/** @type {string} */ (request.familyId), templateId)
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
      const stream = await stories.writeStream(/** @type {string} */ (request.familyId), id, {
        signal: controller.signal,
      })
      const first = await stream.next()
      request.raw.on('close', () => controller.abort())
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
      return stories.list(/** @type {string} */ (request.familyId))
    },

    /** @type {import('fastify').RouteHandlerMethod} */
    async find(request) {
      const { id } = /** @type {{ id: string }} */ (request.params)
      return stories.find(/** @type {string} */ (request.familyId), id)
    },
  }
}