import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { continueWithGoogle, createAccount, signIn } from '../api'
import { GoogleButton, PrimaryButton } from '../components/Buttons'
import { Field } from '../components/Field'
import { Body, Footer, Header, Screen } from '../components/Screen'
import { useGoBack } from '../hooks/useGoBack'
import { failureText } from '../lib/format'
import { read } from '../lib/store'

export const Route = createFileRoute('/cuenta')({
  validateSearch: (search) => ({
    modo: search.modo === 'entrar' ? 'entrar' : undefined,
    campo: search.campo === 'email' ? 'email' : undefined,
  }),
  component: AccountScreen,
})

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * 2b. Three fields and that's the whole account. "Ya tengo cuenta" reuses the
 * same screen in sign-in mode (`?modo=entrar`), with no name field.
 * Account copy still needs a voice pass.
 */
function AccountScreen() {
  const { modo, campo } = Route.useSearch()
  const signingIn = modo === 'entrar'
  const navigate = useNavigate()
  const goBack = useGoBack('/entrada')

  // Coming back from 2c to fix the email: keep what was typed.
  const [pending] = useState(() => read('account'))
  const [name, setName] = useState(pending?.name ?? '')
  const [email, setEmail] = useState(pending?.email ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}))
  const [request, setRequest] = useState(/** @type {'idle' | 'email' | 'google'} */ ('idle'))
  const [failure, setFailure] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    document.title = `${signingIn ? 'Entrá a tu cuenta' : 'Creá tu cuenta'} · Juguemos`
  }, [signingIn])

  const validate = () => {
    /** @type {Record<string, string>} */
    const found = {}
    if (!signingIn && !name.trim()) found.name = 'Contanos cómo te llamás.'
    if (!EMAIL.test(email.trim())) found.email = 'Revisá el email: parece que le falta algo.'
    if (signingIn && !password) found.password = 'Escribí tu contraseña.'
    if (!signingIn && password.length < 8) found.password = 'Tiene que tener al menos 8 caracteres.'
    return found
  }

  /** @param {React.FormEvent<HTMLFormElement>} event */
  const submit = async (event) => {
    event.preventDefault()
    if (request !== 'idle') return
    const found = validate()
    setErrors(found)
    const first = Object.keys(found)[0]
    if (first) {
      const input = event.currentTarget.elements.namedItem(first)
      if (input instanceof HTMLInputElement) input.focus()
      return
    }
    setRequest('email')
    setFailure(null)
    try {
      if (signingIn) {
        await signIn({ email: email.trim(), password })
        void navigate({ to: '/', replace: true })
      } else {
        await createAccount({ name: name.trim(), email: email.trim(), password })
        void navigate({ to: '/verificar', replace: true })
      }
    } catch (error) {
      setFailure(failureText(error))
      setRequest('idle')
    }
  }

  const withGoogle = async () => {
    if (request !== 'idle') return
    setRequest('google')
    setFailure(null)
    try {
      await continueWithGoogle({ existing: signingIn })
      void navigate({ to: signingIn ? '/' : '/familia/contanos', replace: true })
    } catch (error) {
      setFailure(failureText(error))
      setRequest('idle')
    }
  }

  /** @param {string} field */
  const clearError = (field) => {
    if (errors[field]) setErrors(({ [field]: _cleared, ...rest }) => rest)
  }

  return (
    <Screen>
      <Header onBack={goBack} title={signingIn ? 'Entrá a tu cuenta' : 'Creá tu cuenta'} />
      <form className="screen-form" onSubmit={submit} noValidate>
        <Body className="form-body">
          {!signingIn && (
            <Field
              label="Cómo te llamás"
              name="name"
              value={name}
              error={errors.name}
              autoComplete="given-name"
              autoCapitalize="words"
              onChange={(event) => {
                setName(event.target.value)
                clearError('name')
              }}
            />
          )}
          <Field
            label="Email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus={campo === 'email'}
            value={email}
            error={errors.email}
            onChange={(event) => {
              setEmail(event.target.value)
              clearError('email')
            }}
          />
          <Field
            label="Contraseña"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete={signingIn ? 'current-password' : 'new-password'}
            value={password}
            error={errors.password}
            help={signingIn ? undefined : 'Mínimo 8 caracteres.'}
            onChange={(event) => {
              setPassword(event.target.value)
              clearError('password')
            }}
            trailing={
              <button
                type="button"
                className="field__toggle"
                aria-pressed={showPassword}
                onClick={() => setShowPassword((shown) => !shown)}
              >
                {showPassword ? 'ocultar' : 'mostrar'}
              </button>
            }
          />
          {failure && (
            <p className="status-line" role="alert">
              {failure}
            </p>
          )}
        </Body>
        <Footer>
          <PrimaryButton type="submit" busy={request === 'email'} busyLabel="Un momento">
            {signingIn ? 'Entrar' : 'Crear cuenta'}
          </PrimaryButton>
          <GoogleButton size="sm" busy={request === 'google'} onClick={withGoogle} />
        </Footer>
      </form>
    </Screen>
  )
}
