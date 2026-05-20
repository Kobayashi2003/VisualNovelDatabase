/** Client-side mirror of the userserve auth rules, so the UI can give immediate
 *  feedback instead of round-tripping to the backend. Keep these in sync with
 *  `check_username` / `check_password` in backend/userserve/operations.py. */

export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 32
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

/** Returns an error message, or `null` if the username is valid. */
export function validateUsername(username: string): string | null {
  const trimmed = username.trim()
  if (!trimmed) return "Username cannot be empty."
  if (trimmed.length < USERNAME_MIN_LENGTH) return `Username must be at least ${USERNAME_MIN_LENGTH} characters.`
  if (trimmed.length > USERNAME_MAX_LENGTH) return `Username must be at most ${USERNAME_MAX_LENGTH} characters.`
  return null
}

/** Returns an error message, or `null` if the password is valid. */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
  if (password.length > PASSWORD_MAX_LENGTH) return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`
  return null
}
