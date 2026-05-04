'use client'

import { InteractiveButton } from '@/components/ui/interactive-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ShoppingCart, 
  Plus, 
  Trash2, 
  Download, 
  Upload,
  Save,
  X,
  Check,
  Play,
  Pause
} from 'lucide-react'

export default function ButtonDemo() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Interactive Button Demo</h1>
          <p className="text-muted-foreground">
            Reusable button dengan states: Idle (terang) → Keydown (sedang) → Press (gelap)
          </p>
        </div>

        {/* Basic Variants */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Variants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <InteractiveButton>
                <ShoppingCart />
                Add to Cart
              </InteractiveButton>
              
              <InteractiveButton>
                <Plus />
                New Item
              </InteractiveButton>
              
              <InteractiveButton>
                <Trash2 />
                Delete
              </InteractiveButton>
              
              <InteractiveButton disabled>
                Disabled Button
              </InteractiveButton>
            </div>
          </CardContent>
        </Card>

        {/* Different Sizes */}
        <Card>
          <CardHeader>
            <CardTitle>Different Sizes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <InteractiveButton className="py-1 px-2 text-sm">
                Small
              </InteractiveButton>
              
              <InteractiveButton className="py-2 px-4">
                Default
              </InteractiveButton>
              
              <InteractiveButton className="py-3 px-6 text-lg">
                Large
              </InteractiveButton>
              
              <InteractiveButton className="py-4 px-8 text-xl">
                Extra Large
              </InteractiveButton>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Action Buttons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InteractiveButton>
                <Download />
                Download
              </InteractiveButton>
              
              <InteractiveButton>
                <Upload />
                Upload
              </InteractiveButton>
              
              <InteractiveButton>
                <Save />
                Save
              </InteractiveButton>
              
              <InteractiveButton>
                <X />
                Cancel
              </InteractiveButton>
            </div>
          </CardContent>
        </Card>

        {/* Status Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Status Buttons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <InteractiveButton>
                <Check />
                Success
              </InteractiveButton>
              
              <InteractiveButton>
                <Play />
                Start
              </InteractiveButton>
              
              <InteractiveButton>
                <Pause />
                Pause
              </InteractiveButton>
            </div>
          </CardContent>
        </Card>

        {/* Custom Styled Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Custom Styled</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <InteractiveButton className="bg-green-500 hover:bg-green-600 border-green-500">
                <Check />
                Confirm
              </InteractiveButton>
              
              <InteractiveButton className="bg-red-500 hover:bg-red-600 border-red-500">
                <Trash2 />
                Delete
              </InteractiveButton>
              
              <InteractiveButton className="bg-purple-500 hover:bg-purple-600 border-purple-500">
                <Download />
                Export
              </InteractiveButton>
              
              <InteractiveButton className="bg-gray-500 hover:bg-gray-600 border-gray-500">
                <X />
                Close
              </InteractiveButton>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Badge variant="secondary">Mouse</Badge>
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Idle:</strong> Hover untuk melihat hover effect</li>
                  <li>• <strong>Press:</strong> Click dan tahan untuk warna gelap</li>
                  <li>• <strong>Release:</strong> Lepaskan untuk kembali ke idle</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Badge variant="secondary">Keyboard</Badge>
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Tab:</strong> Navigate ke button</li>
                  <li>• <strong>Keydown:</strong> Tekan Enter/Space untuk warna sedang</li>
                  <li>• <strong>Press:</strong> Space key down untuk warna gelap</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Code Usage:</h3>
              <pre className="text-sm bg-background p-3 rounded border overflow-x-auto">
{`import { InteractiveButton } from '@/components/ui/interactive-button'

<InteractiveButton>
  <ShoppingCart />
  Add to Cart
</InteractiveButton>

<InteractiveButton className="bg-green-500 border-green-500">
  <Check />
  Confirm
</InteractiveButton>`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
