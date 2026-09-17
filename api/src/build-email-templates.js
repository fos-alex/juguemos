import { buildTemplates } from './email/build-templates.js'

// Compiles the email templates to the HTML the API sends:
// `npm run email:build -w api`. Commit the .mjml and the .html together.
await buildTemplates(console.log)
