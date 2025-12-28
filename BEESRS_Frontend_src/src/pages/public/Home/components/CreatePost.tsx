import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Image as ImageIcon,
  Video,
  Smile,
  Calendar,
  BarChart3,
  Plus
} from 'lucide-react'

export function CreatePost() {
  const [postContent, setPostContent] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setSelectedFiles(prev => [...prev, ...files])
  }

  const handlePost = () => {
    if (postContent.trim()) {
      // Handle post creation logic here
      console.log('Creating post:', { content: postContent, files: selectedFiles })
      setPostContent('')
      setSelectedFiles([])
    }
  }

  return (
    <Card className="mb-6 bg-white border-gray-200">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold">D</span>
          </div>
          <div className="flex-1">
            <Input
              placeholder="What's happening?"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="border-0 bg-transparent text-lg placeholder-gray-500 focus:ring-0"
            />
            
            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="mt-3 flex gap-2">
                {selectedFiles.map((_file, index) => (
                  <div key={index} className="relative">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    </div>
                    <button
                      onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-4">
                <label className="text-gray-500 hover:text-blue-600 transition-colors cursor-pointer">
                  <ImageIcon className="w-5 h-5" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
                <button className="text-gray-500 hover:text-blue-600 transition-colors">
                  <Video className="w-5 h-5" />
                </button>
                <button className="text-gray-500 hover:text-blue-600 transition-colors">
                  <Smile className="w-5 h-5" />
                </button>
                <button className="text-gray-500 hover:text-blue-600 transition-colors">
                  <Calendar className="w-5 h-5" />
                </button>
                <button className="text-gray-500 hover:text-blue-600 transition-colors">
                  <BarChart3 className="w-5 h-5" />
                </button>
              </div>
              <Button 
                onClick={handlePost}
                disabled={!postContent.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4 mr-2" />
                Post
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

