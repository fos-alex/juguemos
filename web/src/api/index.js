// The screens import the API from here. The account is real; everything else
// re-exports the mock until its endpoint exists. Named exports win over `*`.
export * from './mock'
export { AccountError, createAccount, signIn, signOut } from './auth'
