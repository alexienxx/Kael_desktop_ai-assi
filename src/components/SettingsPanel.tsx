import { useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemeSettings, ThemePreset, BubbleStyle, SpacingMode, BackendConfig, ConnectionStatus } from '@/lib/types'
import { themePresets, accentGradients } from '@/lib/theme-config'
import { Palette, ChatCircle, FolderOpen, Plugs } from '@phosphor-icons/react'

interface SettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  themeSettings: ThemeSettings
  onThemeSettingsChange: (settings: ThemeSettings) => void
  backendConfig: BackendConfig | null
  onBackendConfigChange: (config: BackendConfig) => void
  connectionStatus: ConnectionStatus
  onTestConnection: () => Promise<void>
}

export function SettingsPanel({
  open,
  onOpenChange,
  themeSettings,
  onThemeSettingsChange,
  backendConfig,
  onBackendConfigChange,
  connectionStatus,
  onTestConnection
}: SettingsPanelProps) {
  const [localConfig, setLocalConfig] = useState<BackendConfig>(
    backendConfig || { baseUrl: '', timeout: 30000 }
  )
  const [testing, setTesting] = useState(false)
  const updateSetting = <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
    onThemeSettingsChange({ ...themeSettings, [key]: value })
  }

  const applyPreset = (preset: ThemePreset) => {
    onThemeSettingsChange({
      preset,
      ...themePresets[preset]
    })
  }

  const handleSaveConfig = () => {
    if (!localConfig.baseUrl) {
      return
    }
    onBackendConfigChange(localConfig)
  }

  const handleTestConnection = async () => {
    setTesting(true)
    try {
      await onTestConnection()
    } finally {
      setTesting(false)
    }
  }

  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500'
      case 'connecting':
        return 'bg-yellow-500 animate-pulse'
      case 'backend_starting':
        return 'bg-red-500 animate-pulse'
      case 'error':
        return 'bg-red-500'
      case 'disconnected':
        return 'bg-muted-foreground'
      default:
        return 'bg-muted-foreground'
    }
  }

  const getStatusText = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return 'Connected'
      case 'connecting':
        return 'Connecting...'
      case 'backend_starting':
        return 'Server in avvio...'
      case 'error':
        return 'Connection Error'
      case 'disconnected':
        return 'Disconnected'
      default:
        return status
    }
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] glass-strong overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">Settings</SheetTitle>
          <SheetDescription>
            Personalizza la tua esperienza con Arrakis
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="appearance" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="appearance" className="text-xs">
              <Palette className="h-3.5 w-3.5 mr-1.5" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="chat" className="text-xs">
              <ChatCircle className="h-3.5 w-3.5 mr-1.5" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="connection" className="text-xs">
              <Plugs className="h-3.5 w-3.5 mr-1.5" />
              Backend
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="space-y-6 mt-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Theme Preset</Label>
              <RadioGroup value={themeSettings.preset} onValueChange={(value) => applyPreset(value as ThemePreset)}>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-accent/20 transition-colors">
                    <RadioGroupItem value="aero-pastel" id="aero-pastel" />
                    <Label htmlFor="aero-pastel" className="flex-1 cursor-pointer">
                      <div className="font-medium">Aero Pastel</div>
                      <div className="text-xs text-muted-foreground">Lavender · Pink · Pale Blue</div>
                    </Label>
                    <div className="w-8 h-8 rounded-full" style={{ background: themePresets['aero-pastel'].accentGradient }} />
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-accent/20 transition-colors">
                    <RadioGroupItem value="pearl-frost" id="pearl-frost" />
                    <Label htmlFor="pearl-frost" className="flex-1 cursor-pointer">
                      <div className="font-medium">Pearl Frost</div>
                      <div className="text-xs text-muted-foreground">White · Periwinkle · Icy Blue</div>
                    </Label>
                    <div className="w-8 h-8 rounded-full" style={{ background: themePresets['pearl-frost'].accentGradient }} />
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-accent/20 transition-colors">
                    <RadioGroupItem value="rose-nebula" id="rose-nebula" />
                    <Label htmlFor="rose-nebula" className="flex-1 cursor-pointer">
                      <div className="font-medium">Rose Nebula</div>
                      <div className="text-xs text-muted-foreground">Blush Pink · Lilac · Light Violet</div>
                    </Label>
                    <div className="w-8 h-8 rounded-full" style={{ background: themePresets['rose-nebula'].accentGradient }} />
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Accent Gradient</Label>
              <div className="grid grid-cols-3 gap-2">
                {accentGradients.map((gradient) => (
                  <button
                    key={gradient.name}
                    onClick={() => updateSetting('accentGradient', gradient.value)}
                    className={`h-12 rounded-lg transition-all ${
                      themeSettings.accentGradient === gradient.value
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                        : 'hover:scale-105'
                    }`}
                    style={{ background: gradient.value }}
                    title={gradient.name}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Transparency: {Math.round(themeSettings.transparencyIntensity * 100)}%</Label>
              <Slider
                value={[themeSettings.transparencyIntensity]}
                onValueChange={([value]) => updateSetting('transparencyIntensity', value)}
                min={0}
                max={1}
                step={0.05}
                className="py-2"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Glow Intensity: {Math.round(themeSettings.glowIntensity * 100)}%</Label>
              <Slider
                value={[themeSettings.glowIntensity]}
                onValueChange={([value]) => updateSetting('glowIntensity', value)}
                min={0}
                max={1}
                step={0.05}
                className="py-2"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Border Radius</Label>
              <Slider
                value={[themeSettings.borderRadius]}
                onValueChange={([value]) => updateSetting('borderRadius', value)}
                min={0.5}
                max={2}
                step={0.125}
                className="py-2"
              />
              <div className="text-xs text-muted-foreground">{themeSettings.borderRadius}rem</div>
            </div>
          </TabsContent>

          <TabsContent value="chat" className="space-y-6 mt-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Bubble Style</Label>
              <RadioGroup value={themeSettings.bubbleStyle} onValueChange={(value) => updateSetting('bubbleStyle', value as BubbleStyle)}>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="rounded" id="rounded" />
                    <Label htmlFor="rounded" className="cursor-pointer">Rounded</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="soft" id="soft" />
                    <Label htmlFor="soft" className="cursor-pointer">Soft</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="squared" id="squared" />
                    <Label htmlFor="squared" className="cursor-pointer">Squared</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Spacing Mode</Label>
              <RadioGroup value={themeSettings.spacingMode} onValueChange={(value) => updateSetting('spacingMode', value as SpacingMode)}>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="compact" id="compact" />
                    <Label htmlFor="compact" className="cursor-pointer">Compact</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="comfortable" id="comfortable" />
                    <Label htmlFor="comfortable" className="cursor-pointer">Comfortable</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="spacious" id="spacious" />
                    <Label htmlFor="spacious" className="cursor-pointer">Spacious</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </TabsContent>

          <TabsContent value="connection" className="space-y-6 mt-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Connection Status</Label>
              <div className="p-4 rounded-lg glass-panel border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`h-2 w-2 rounded-full ${getStatusColor(connectionStatus)}`} />
                  <span className="text-sm font-medium">{getStatusText(connectionStatus)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {connectionStatus === 'connected'
                    ? 'Backend is connected and ready'
                    : connectionStatus === 'connecting'
                    ? 'Establishing connection to backend...'
                    : connectionStatus === 'backend_starting'
                    ? 'Sentinel detected — backend bootstrap in corso...'
                    : connectionStatus === 'error'
                    ? 'Failed to connect. Check your configuration.'
                    : 'Configure backend to connect'
                  }
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Backend Configuration</Label>
              <div className="p-4 rounded-lg glass-panel border border-border/50 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="baseUrl" className="text-xs">Base URL</Label>
                  <Input
                    id="baseUrl"
                    type="url"
                    placeholder="https://api.example.com"
                    value={localConfig.baseUrl}
                    onChange={(e) => setLocalConfig({ ...localConfig, baseUrl: e.target.value })}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey" className="text-xs">API Key (Optional)</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Enter API key"
                    value={localConfig.apiKey || ''}
                    onChange={(e) => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeout" className="text-xs">Timeout (seconds)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    min="5"
                    max="120"
                    value={localConfig.timeout / 1000}
                    onChange={(e) => setLocalConfig({ ...localConfig, timeout: parseInt(e.target.value) * 1000 })}
                    className="text-sm"
                  />
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={handleSaveConfig}
                  disabled={!localConfig.baseUrl}
                >
                  <Plugs className="h-4 w-4 mr-2" />
                  Save Configuration
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Developer Options</Label>
              <div className="p-4 rounded-lg glass-panel border border-border/50 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleTestConnection}
                  disabled={!backendConfig || testing}
                >
                  {testing ? 'Testing...' : 'Test Connection'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
