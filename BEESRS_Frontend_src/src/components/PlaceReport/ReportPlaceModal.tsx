import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { ReportPlace } from '@/services/userService'
import { useToast } from '@/components/ui/use-toast'
import { motion, AnimatePresence } from 'framer-motion'

interface ReportPlaceModalProps {
  open: boolean
  onClose: () => void
  placeId: string | null
  placeName?: string
}

const MIN_REASON_LENGTH = 10

export function ReportPlaceModal({
  open,
  onClose,
  placeId,
  placeName
}: ReportPlaceModalProps) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const { toast } = useToast()

  const canSubmit = useMemo(() => {
    return Boolean(placeId) && reason.trim().length >= MIN_REASON_LENGTH && !isSubmitting
  }, [placeId, reason, isSubmitting])

  useEffect(() => {
    if (!open) {
      setReason('')
      setIsConfirmed(false)
    }
  }, [open])

  const handleClose = () => {
    if (isSubmitting) return
    onClose()
  }

  const handleSubmit = async () => {
    if (!placeId || !canSubmit) return

    try {
      setIsSubmitting(true)
      await ReportPlace(placeId, reason.trim())
      setIsConfirmed(true)
      toast({
        title: 'Report submitted',
        description: 'Thank you for helping us keep the community safe.',
        variant: 'default'
      })
    } catch (error: any) {
      console.error('ReportPlace error:', error)
      toast({
        title: 'Failed to submit report',
        description: error?.response?.data?.message || error?.message || 'Please try again later.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Report place
          </DialogTitle>
          <DialogDescription>
            Tell us why this place should be reviewed. Our moderation team will investigate every report.
          </DialogDescription>
        </DialogHeader>

        {!isConfirmed ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900">
              Please be as specific as possible. Reports with clear reasons are resolved faster.
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Reason for reporting {placeName ? `"${placeName}"` : 'this place'}
              </label>
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={5}
                placeholder="Describe what is wrong with this place (incorrect info, offensive content, spam, etc.)"
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Minimum {MIN_REASON_LENGTH} characters • This report is anonymous to the place owner
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key="success-screen"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ 
                duration: 0.4,
                ease: [0.16, 1, 0.3, 1]
              }}
              className="flex flex-col items-center justify-center gap-3 py-6 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  delay: 0.1,
                  type: "spring",
                  stiffness: 200,
                  damping: 15
                }}
              >
                <CheckCircle className="w-12 h-12 text-green-500" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                <p className="text-lg font-semibold text-gray-900">Report received</p>
                <p className="text-sm text-gray-600 mt-1">
                  We will review this place shortly and take any necessary action.
                </p>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        )}

        <DialogFooter className="flex items-center justify-between gap-3 sm:justify-end">
          {!isConfirmed ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit report
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ReportPlaceModal


