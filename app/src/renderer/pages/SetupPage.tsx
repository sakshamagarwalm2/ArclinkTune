import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FolderOpen, Check, Loader2, Sparkles } from 'lucide-react'

interface SetupPageProps {
  onComplete: () => void
}

export function SetupPage({ onComplete }: SetupPageProps) {
  const [modelsDir, setModelsDir] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const handleSetup = async () => {
    setIsLoading(true)
    try {
      const homeDir = await window.electronAPI.app.getHomeDir()
      const defaultDir = modelsDir || `${homeDir}/models`
      await window.electronAPI.system.setModelsDir(defaultDir)
      setIsComplete(true)
      setTimeout(onComplete, 1500)
    } catch (error) {
      console.error('Setup failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full gpu-gradient flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Welcome to ArclinkTune</CardTitle>
          <CardDescription>
            Let's set up your models directory to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Models Directory</label>
            <p className="text-xs text-muted-foreground">
              This is where your downloaded models will be stored
            </p>
            <div className="flex gap-2">
              <Input
                value={modelsDir}
                onChange={(e) => setModelsDir(e.target.value)}
                placeholder="Enter custom path or leave empty for default"
                className="flex-1"
              />
              <Button variant="outline">
                <FolderOpen className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Default: ~/models
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">What you'll be able to do:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Download and manage LLM models
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Fine-tune models with custom datasets
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Chat with your models
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Monitor GPU and system resources
              </li>
            </ul>
          </div>

          <Button
            onClick={handleSetup}
            disabled={isLoading}
            className="w-full gpu-gradient"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Setting up...
              </>
            ) : isComplete ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Setup Complete!
              </>
            ) : (
              <>
                Get Started
                <Sparkles className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
