// A launch grant stays within this tab. It is distinct from the backend credential.
const fragment = new URLSearchParams(window.location.hash.slice(1))
if (fragment.has('access')) {
  sessionStorage.setItem('arrakis-local-access', fragment.get('access')!)
  sessionStorage.setItem('arrakis-local-session', fragment.get('session') ?? '')
  history.replaceState(null, '', location.pathname)
}
const grant = sessionStorage.getItem('arrakis-local-access')
if (!grant || !/^[a-f0-9]{64}$/.test(grant)) {
  document.body.textContent = 'Open this desktop from its private local launch link.'
  throw new Error('Desktop launch grant required')
}
export const localConfig = { baseUrl: location.origin + '/bridge/' + grant, timeout: 600000 }
