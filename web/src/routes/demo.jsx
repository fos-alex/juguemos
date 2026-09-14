import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { loadFamily, signOut, storyOptions, suggestActivity, writeStory, WRONG_CODE } from '../api'
import { Body, Header, Screen } from '../components/Screen'
import { useGoBack } from '../hooks/useGoBack'
import { useTheme } from '../hooks/useTheme'
import { updateDemo, useDemo } from '../lib/demo'
import { failureText } from '../lib/format'
import { read, useStored, write } from '../lib/store'

export const Route = createFileRoute('/demo')({
  component: DemoScreen,
})

/**
 * Review scaffolding, not a product screen: nothing in the app links here.
 * The shortcuts open a screen by its mockup id using the signed-in account's
 * real data (the development seed's account has a family ready). Some only
 * change what this browser remembers, to reopen first-run screens the account
 * is already past. The switches reach states that are hard to reach by hand.
 */
function DemoScreen() {
  const navigate = useNavigate()
  const goBack = useGoBack('/')
  const demo = useDemo()
  const account = useStored('account')
  const { dark, toggle: toggleTheme } = useTheme()
  const [busy, setBusy] = useState(/** @type {string | null} */ (null))
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    document.title = 'Demo · Juguemos'
  }, [])

  /** This browser forgets the family, as on a first run; the account keeps it. */
  const forgetFamily = () => {
    write('family', null)
    write('parseResult', null)
  }

  /** The account's family, as if the model had read it back. @param {string[]} flagged */
  const review = async (flagged) => {
    const family = read('family') ?? (await loadFamily())
    if (!family) throw new Error('La cuenta todavía no tiene familia')
    forgetFamily()
    write('parseResult', { family, flagged, note: null })
    await navigate({ to: '/familia/revisar' })
  }

  const withActivity = async () => {
    await loadFamily()
    return suggestActivity()
  }

  /** @type {{ id: string, name: string, signedOut?: boolean, open: () => Promise<unknown> | unknown }[]} */
  const shortcuts = [
    { id: '2a', name: 'Entrada', signedOut: true, open: () => (signOut(), navigate({ to: '/entrada' })) },
    { id: '2b', name: 'Crear cuenta', signedOut: true, open: () => (signOut(), navigate({ to: '/cuenta' })) },
    { id: '2c', name: 'Verificar el email', open: () => (forgetFamily(), navigate({ to: '/verificar' })) },
    { id: '2d', name: 'Contame de tu familia', open: () => (forgetFamily(), navigate({ to: '/familia/contanos' })) },
    { id: '2f', name: '¿Está bien así?', open: () => review([]) },
    { id: '2g', name: 'Entendió mal', open: () => review(['toys']) },
    { id: '2h', name: 'Corregir, desde cero', open: () => (forgetFamily(), navigate({ to: '/familia/corregir' })) },
    {
      id: '2i',
      name: 'Home, sin último juego',
      open: async () => {
        await loadFamily()
        write('lastActivityId', null)
        await navigate({ to: '/' })
      },
    },
    {
      id: '2j',
      name: 'Home, con el último juego',
      open: async () => {
        await withActivity()
        await navigate({ to: '/' })
      },
    },
    {
      id: demo.activityLayout === 'pasos' ? '2n' : '2m',
      name: 'Actividad',
      open: async () => {
        const activity = await withActivity()
        await navigate({ to: '/idea/$id', params: { id: activity.id } })
      },
    },
    {
      id: '2o',
      name: 'El reloj',
      open: async () => {
        const activity = await withActivity()
        write('timer', { activityId: activity.id, endsAt: Date.now() + activity.minutes * 60_000 })
        await navigate({ to: '/idea/$id/reloj', params: { id: activity.id } })
      },
    },
    {
      id: '2r',
      name: '¿Cuál leemos hoy?',
      open: async () => {
        await loadFamily()
        write('storyOptions', null)
        await navigate({ to: '/cuentos' })
      },
    },
    {
      id: '2s',
      name: 'Escribiendo el cuento',
      open: async () => {
        await loadFamily()
        const [option] = await storyOptions()
        // Forget this browser's copy, so the screen asks for the story again.
        const { [option.id]: _opened, ...others } = read('stories') ?? {}
        write('stories', others)
        await navigate({ to: '/cuento/$id', params: { id: option.id } })
      },
    },
    {
      id: '2t',
      name: 'Pantalla de lectura',
      open: async () => {
        await loadFamily()
        const [option] = await storyOptions()
        await writeStory(option.id)
        await navigate({ to: '/cuento/$id', params: { id: option.id } })
      },
    },
  ]

  /** @param {typeof shortcuts[number]} shortcut */
  const open = async (shortcut) => {
    setBusy(shortcut.id)
    setFailure(null)
    try {
      await shortcut.open()
    } catch (error) {
      setFailure(failureText(error))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Screen className="demo">
      <Header onBack={goBack} title="Demo" />
      <Body className="demo__body">
        <p className="demo__note">
          Para revisar las pantallas contra los mockups, con los datos de la cuenta con la que entraste. Esta página no
          es parte de la app.
        </p>

        <section className="demo__section">
          <h2 className="demo__heading">Estados</h2>
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
            onChange={(night) => updateDemo({ night })}
          />
          <p className="demo__note">El código {WRONG_CODE} siempre falla en la verificación del email.</p>
        </section>

        <section className="demo__section">
          <h2 className="demo__heading">Ir a una pantalla</h2>
          {!account && (
            <p className="demo__note">
              Para los demás atajos, entrá con una cuenta que tenga familia: la de <code>npm run seed -w api</code> ya
              tiene una.
            </p>
          )}
          <ul className="demo__list">
            {shortcuts.map((shortcut) => (
              <li key={shortcut.id}>
                <button
                  type="button"
                  className="demo__link"
                  disabled={busy !== null || (!shortcut.signedOut && !account)}
                  onClick={() => void open(shortcut)}
                >
                  <span className="demo__id">{shortcut.id}</span>
                  {shortcut.name}
                </button>
              </li>
            ))}
          </ul>
          {failure && (
            <p className="status-line" role="alert">
              {failure}
            </p>
          )}
          <p className="demo__note">
            Se llega tocando: 2k (el menú en Home), 2l (¡Juguemos!), 2p (Otro juego), 2q (Home con “Sin
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
