import { useState } from 'react'
import { Field } from '../../../shared/ui'

/**
 * The password, with *mostrar* to check what was typed. `autoComplete` tells
 * the browser whether it is a new password or the saved one.
 * @param {{
 *   value: string,
 *   error?: string,
 *   help?: string,
 *   autoComplete: 'new-password' | 'current-password',
 *   onChange: (event: React.ChangeEvent<HTMLInputElement>) => void,
 * }} props
 */
export function PasswordField(props) {
  const [shown, setShown] = useState(false)
  return (
    <Field
      label="Contraseña"
      name="password"
      type={shown ? 'text' : 'password'}
      {...props}
      trailing={
        <button type="button" className="field__toggle" aria-pressed={shown} onClick={() => setShown((was) => !was)}>
          {shown ? 'ocultar' : 'mostrar'}
        </button>
      }
    />
  )
}
