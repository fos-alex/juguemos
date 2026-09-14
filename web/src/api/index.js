// The screens import the API from here, and only from here. Everything is
// real except what needs a service Juguemos doesn't have yet: email
// verification (no email sender), which stays in ./mock.
export { ApiError, OfflineError } from './http'
export { AccountError, createAccount, ensureSession, signIn, signOut } from './auth'
export { loadFamily, saveFamily } from './family'
export { NothingFitsError, suggestActivity } from './activities'
export { storyOptions, writeStory, savedStories, savedStory } from './stories'
export { createTemplate, deleteTemplate, listTemplates, loadTemplate, saveTemplate } from './admin'
export { resendCode, verifyEmail, WrongCodeError } from './mock'
