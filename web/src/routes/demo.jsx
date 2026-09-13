import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { signOut, WRONG_CODE } from '../api'
import { ACTIVITIES, EXAMPLE_FAMILY, MISREAD_PARSE, STORIES } from '../api/fixtures'
import { Body, Header, Screen } from '../components/Screen'
import { useGoBack } from '../hooks/useGoBack'
import { refreshTheme, toggleTheme, useTheme } from '../hooks/useTheme'
import { updateDemo, useDemo } from '../lib/demo'
import { write } from '../lib/store'

export const Route = createFileRoute('/demo')({
  component: DemoScreen,
})

/**
 * Review scaffolding, not a product screen: nothing in the app links here.
 * Each shortcut seeds the mock's local state and opens a screen by its
 * mockup id; the switches reach the states that are hard to reach by hand.
 */
function DemoScreen() {
  const navigate = useNavigate()
  const goBack = useGoBack('/')
  const demo = useDemo()
  const dark = useTheme()

  useEffect(() => {
    document.title = 'Demo · Juguemos'
  }, [])

  const [activity] = ACTIVITIES
  const story = STORIES[1]

  const signedIn = ({ verified = true, family = true } = {}) => {
    signOut()
    write('account', { name: 'Alex', email: 'alex@mail.com', provider: 'email', emailVerified: verified })
    if (family) write('family', structuredClone(EXAMPLE_FAMILY))
  }

  const withActivity = () => {
    signedIn()
    write('activities', { [activity.id]: structuredClone(activity) })
    write('lastActivityId', activity.id)
  }

  const withOptions = () => {
    signedIn()
    write('storyOptions', STORIES.slice(0, 3).map(({ id, title, teaser, minutes }) => ({ id, title, teaser, minutes })))
  }

  /** @type {{ id: string, name: string, open: () => void }[]} */
  const shortcuts = [
    { id: '2a', name: 'Entrada', open: () => (signOut(), navigate({ to: '/entrada' })) },
    { id: '2b', name: 'Crear cuenta', open: () => (signOut(), navigate({ to: '/cuenta' })) },
    { id: '2c', name: 'Verificar el email', open: () => (signedIn({ verified: false, family: false }), navigate({ to: '/verificar' })) },
    { id: '2d', name: 'Contame de tu familia', open: () => (signedIn({ family: false }), navigate({ to: '/familia/contanos' })) },
    {
      id: '2f',
      name: '¿Está bien así?',
      open: () => {
        signedIn({ family: false })
        write('parseResult', { family: structuredClone(EXAMPLE_FAMILY), flagged: [], note: null })
        void navigate({ to: '/familia/revisar' })
      },
    },
    {
      id: '2g',
      name: 'Entendió mal',
      open: () => {
        signedIn({ family: false })
        write('parseResult', structuredClone(MISREAD_PARSE))
        void navigate({ to: '/familia/revisar' })
      },
    },
    { id: '2h', name: 'Corregir, desde cero', open: () => (signedIn({ family: false }), navigate({ to: '/familia/corregir' })) },
    { id: '2i', name: 'Home, sin última idea', open: () => (signedIn(), navigate({ to: '/' })) },
    { id: '2j', name: 'Home, con la última idea', open: () => (withActivity(), navigate({ to: '/' })) },
    {
      id: demo.activityLayout === 'pasos' ? '2n' : '2m',
      name: 'Actividad',
      open: () => (withActivity(), navigate({ to: '/idea/$id', params: { id: activity.id } })),
    },
    {
      id: '2o',
      name: 'El reloj',
      open: () => {
        withActivity()
        write('timer', { activityId: activity.id, endsAt: Date.now() + activity.minutes * 60_000 })
        void navigate({ to: '/idea/$id/reloj', params: { id: activity.id } })
      },
    },
    { id: '2r', name: '¿Cuál leemos hoy?', open: () => (withOptions(), navigate({ to: '/cuentos' })) },
    { id: '2s', name: 'Escribiendo el cuento', open: () => (withOptions(), navigate({ to: '/cuento/$id', params: { id: story.id } })) },
    {
      id: '2t',
      name: 'Pantalla de lectura',
      open: () => {
        withOptions()
        write('stories', { [story.id]: structuredClone(story) })
        void navigate({ to: '/cuento/$id', params: { id: story.id } })
      },
    },
  ]

  return (
    <Screen className="demo">
      <Header onBack={goBack} title="Demo" />
      <Body className="demo__body">
        <p className="demo__note">
          Datos simulados, para revisar las pantallas contra los mockups. Esta página no es parte de la app. Cada atajo
          reemplaza lo guardado en este navegador.
        </p>

        <section className="demo__section">
          <h2 className="demo__heading">Estados</h2>
          <Switch
            label="La IA entiende mal a la familia (2g)"
            checked={demo.misread}
            onChange={(misread) => updateDemo({ misread })}
          />
          <Switch label="Sin conexión (2q)" checked={demo.offline} onChange={(offline) => updateDemo({ offline })} />
          <Switch label="Pensar lento, más de 6 s (2l)" checked={demo.slow} onChange={(slow) => updateDemo({ slow })} />
          <Switch
            label="Que falle el próximo pedido"
            checked={demo.failNext}
            onChange={(failNext) => updateDemo({ failNext })}
          />
          <Switch
            label="Actividad B, los pasos primero (2n)"
            checked={demo.activityLayout === 'pasos'}
            onChange={(steps) => updateDemo({ activityLayout: steps ? 'pasos' : 'porque' })}
          />
          <Switch label="Modo noche, hasta el próximo cambio (2u)" checked={dark} onChange={() => toggleTheme()} />
          <Switch
            label="Simular que es de noche (después de las 19)"
            checked={demo.night}
            onChange={(night) => {
              updateDemo({ night })
              refreshTheme()
            }}
          />
          <p className="demo__note">El código {WRONG_CODE} siempre falla en la verificación del email.</p>
        </section>

        <section className="demo__section">
          <h2 className="demo__heading">Ir a una pantalla</h2>
          <ul className="demo__list">
            {shortcuts.map((shortcut) => (
              <li key={shortcut.id}>
                <button type="button" className="demo__link" onClick={shortcut.open}>
                  <span className="demo__id">{shortcut.id}</span>
                  {shortcut.name}
                </button>
              </li>
            ))}
          </ul>
          <p className="demo__note">
            Se llega tocando: 2k (el menú en Home), 2l (¿Qué hacemos ahora?), 2p (Otra idea), 2q (Home con “Sin
            conexión”). 2e es de la 0.2 y no está construida.
          </p>
        </section>
      </Body>
    </Screen>
  )
}

/** @param {{ label: string, checked: boolean, onChange: (checked: boolean) => void }} props */
function Switch({ label, checked, onChange }) {
  return (
    <label className="demo__switch">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  )
}
