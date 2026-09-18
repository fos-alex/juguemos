import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { listTemplates, saveTemplate } from '../api'
import { AdminNav } from '../components/AdminNav'
import { adminFailure, categoryNames, fieldsOf, NEW, RATINGS, reactionsLine, templateLine } from '../model'
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle'
import { Body, Dots, Header, Screen, StatusLine } from '../../../shared/ui'
import '../admin.css'

/** @typedef {import('../types').ActivityTemplate} ActivityTemplate */
/** @typedef {import('../types').ActivityTemplateFields} ActivityTemplateFields */

/**
 * The catalog admin: every activity template, on or off, with its rating now
 * (JUG-192). A tap on a row edits it. Beside it, its puntaje inicial, which
 * saves as soon as it changes, and the switch that takes it in or out of
 * ¡Juguemos! No login yet.
 */
export function TemplateListScreen() {
  const [templates, setTemplates] = useState(/** @type {ActivityTemplate[] | null} */ (null))
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))
  // The template whose rating or switch is saving.
  const [saving, setSaving] = useState(/** @type {string | null} */ (null))

  useDocumentTitle('Juegos · Admin · Ludi')

  useEffect(() => {
    listTemplates().then(setTemplates, (error) => setFailure(adminFailure(error)))
  }, [])

  /** @param {ActivityTemplate} template @param {Partial<ActivityTemplateFields>} change */
  const save = async (template, change) => {
    setSaving(template.id)
    setFailure(null)
    try {
      const saved = await saveTemplate(template.id, { ...fieldsOf(template), ...change })
      setTemplates((current) => current?.map((each) => (each.id === saved.id ? saved : each)) ?? null)
    } catch (error) {
      setFailure(adminFailure(error))
    }
    setSaving(null)
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
            {inUse} en uso de {templates.length}. Los apagados no salen en ¡Juguemos! El puntaje inicial vale para todas las
            familias, y cada reacción lo mueve desde ahí.
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
                <span className="card-meta">Puntaje ahora {reactionsLine(template.reactions)}</span>
              </Link>
              <div className="admin-row__controls">
                <div className="field__control admin-rating">
                  <select
                    className="field__input"
                    aria-label={`${template.title}: puntaje inicial`}
                    value={String(template.rating)}
                    disabled={saving === template.id}
                    onChange={(event) => void save(template, { rating: Number(event.target.value) })}
                  >
                    {RATINGS.map(([rating, name]) => (
                      <option key={rating} value={rating}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={template.active}
                  aria-label={`${template.title}: ${template.active ? 'en uso' : 'apagado'}`}
                  className="admin-switch"
                  disabled={saving === template.id}
                  onClick={() => void save(template, { active: !template.active })}
                >
                  {template.active ? 'En uso' : 'Apagado'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Body>
    </Screen>
  )
}
