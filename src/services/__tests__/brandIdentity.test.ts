import { describe, expect, it } from 'vitest'

import appHtml from '../../../index.html?raw'
import arrakisLogo from '../../assets/arrakis-logo.png'
import chatWindowSource from '../../components/ChatWindow.tsx?raw'
import sidebarSource from '../../components/Sidebar.tsx?raw'

describe('Arrakis desktop visible brand contract', () => {
  it('uses Arrakis for the document title and visible shell', () => {
    expect(appHtml).toMatch(/<title>Arrakis<\/title>/)
    expect(sidebarSource).toContain('>Arrakis</h1>')
    expect(sidebarSource).toContain('alt="Arrakis"')
    expect(chatWindowSource).toContain('parlare con Arrakis')
  })

  it('ships the gold A icon referenced by the page and shell', () => {
    expect(appHtml).toContain('href="/arrakis-logo.png"')
    expect(arrakisLogo).toMatch(/arrakis-logo.*\.png$/)
  })
})
