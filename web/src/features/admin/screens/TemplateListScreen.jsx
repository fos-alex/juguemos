import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { listTemplates, saveTemplate } from '../api'
import { AdminNav } from '../components/AdminNav'
import { adminFailure, categoryNames, fieldsOf, NEW, templateLine } from '../model'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { Body, Dots, Header, Screen, StatusLine } from '../../../shared/ui'
import '../admin.css'

/** @typedef {import('../types').ActivityTemplate} ActivityTemplate */

/**
 * The catalog admin: every activity template, on or off. A tap on a row edits
 * it, and the switch beside it takes it in or out of ¡Juguemos! No login yet.
 */
export function TemplateListScreen() {
  const [templates, setTemplates] = useState(/** @type {ActivityTemplate[] | null} */ (null))
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))
  const [switching, setSwitching] = useState(/** @type {string | null} */ (null))

  useDocumentTitle('Juegos · Admin · Ludi')

  useEffect(() => {
    listTemplates().then(setTemplates, (error) => setFailure(adminFailure(error)))
  }, [])

  /** @param {ActivityTemplate} template */
  const toggle = async (template) => {
    setSwitching(template.id)
    setFailure(null)
    try {
      const saved = await saveTemplate(template.id, { ...fieldsOf(template), active: !template.active })
      setTemplates((current) => current?.map((each) => (each.id === saved.id ? saved : each)) ?? null)
    } catch (error) {
      setFailure(adminFailure(error))
    }
    setSwitching(null)
  }

  const inUse = templates?.filter((template) => template.active).length ?? 0

  return (
    <Screen className="admin">
      <Header
        title="Juegos"
        trailing={
          <Link to="/admin/$id" params={{ id: NEW }} className="add-link">
            + nuevo juego
          </Link>
        }
      />
      <Body className="page-body">
        <AdminNav />
        {templates && (
          <StatusLine>
            {inUse} en uso de {templates.length}. Los apagados no salen en ¡Juguemos!
          </StatusLine>
        )}
        <StatusLine role="alert">{failure}</StatusLine>
        {!templates && !failure && <Dots tone="page" />}
        <ul className="admin-list">
          {templates?.map((template) => (
            <li key={template.id} className={`admin-row${template.active ? '' : ' is-off'}`}>
              <Link to="/admin/$id" params={{ id: template.id }} className="admin-row__main">
                <span className="admin-row__title">{template.title}</span>
                <span className="card-meta">{templateLine(template)}</span>
                <span className="card-meta">{categoryNames(template.categories)}</span>
              </Link>
              <button
                type="button"
                role="switch"
                aria-checked={template.active}
                aria-label={`${template.title}: ${template.active ? 'en uso' : 'apagado'}`}
                className="admin-switch"
                disabled={switching === template.id}
                onClick={() => void toggle(template)}
              >
                {template.active ? 'En uso' : 'Apagado'}
              </button>
            </li>
          ))}
        </ul>
      </Body>
    </Screen>
  )
}
