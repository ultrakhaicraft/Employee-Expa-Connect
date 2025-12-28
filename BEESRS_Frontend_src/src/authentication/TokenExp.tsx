import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, LogIn, Clock, Shield, RefreshCw } from 'lucide-react'
import PageTransition from '@/components/Transition/PageTransition'

export default function TokenExp() {
  const navigate = useNavigate()

  useEffect(() => {
    // Clear any stored authentication data
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    sessionStorage.clear()
  }, [])

  const handleLoginRedirect = () => {
    navigate('/login')
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50 flex items-center justify-center p-4">
      <PageTransition delayMs={100} durationMs={600} variant="zoom">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-red-100 rounded-full w-20 h-20 flex items-center justify-center">
                <AlertTriangle className="h-10 w-10 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Session Expired
              </CardTitle>
              <p className="text-gray-600 mt-2">
                Your session has expired for security reasons
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Security Message */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Security Notice</h4>
                    <p className="text-sm text-blue-800">
                      For your security, your session automatically expires after a period of inactivity. 
                      Please log in again to continue.
                    </p>
                  </div>
                </div>
              </div>

              {/* Time Information */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-600" />
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Session Duration</h4>
                    <p className="text-sm text-gray-600">
                      Sessions expire after 24 hours or 30 minutes of inactivity
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button 
                  onClick={handleLoginRedirect}
                  className="w-full bg-foreground hover:bg-primary/90 text-white py-3 text-base font-medium"
                >
                  <LogIn className="h-5 w-5 mr-2" />
                  Sign In Again
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleRefresh}
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-500 py-3"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Refresh Page
                </Button>
              </div>

              {/* Additional Help */}
              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Having trouble? Contact support for assistance
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Background Decoration */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
          </div>
        </div>
      </PageTransition>
    </div>
  )
}