const MIN_PASSWORD_LENGTH = 8

export function validateEmail(email: string | null): string | null {
  if (!email?.trim()) {
    return "Email is required."
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Please enter a valid email address."
  }

  return null
}

export function validatePassword(password: string | null): string | null {
  if (!password) {
    return "Password is required."
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }

  return null
}

export function validatePasswordConfirmation(
  password: string | null,
  confirmPassword: string | null
): string | null {
  const passwordError = validatePassword(password)
  if (passwordError) {
    return passwordError
  }

  if (password !== confirmPassword) {
    return "Passwords do not match."
  }

  return null
}
