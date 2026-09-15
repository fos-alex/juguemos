// The admin, not yet moved into a feature, imports the API from here. Every
// other module lives in its feature.
export { ApiError, OfflineError } from '../shared/http'
export { createTemplate, deleteTemplate, listTemplates, loadTemplate, saveTemplate } from './admin'
