// ============================================================
// desktop/screenCapture.ts – Screenshot capture module
// Uses Electron's desktopCapturer to grab screen content
// without activating or focusing the target application.
// ============================================================

import { desktopCapturer, screen, nativeImage, NativeImage } from 'electron'

export interface CaptureOptions {
  displayIndex?: number  // 0 = primary
  region?: { x: number; y: number; width: number; height: number }
}

export interface CaptureResult {
  imageBuffer: Buffer
  width: number
  height: number
  displayScaleFactor: number
}

export class ScreenCapture {
  /**
   * Capture the specified display as a PNG buffer.
   * Does NOT focus any window or change user's current context.
   */
  async capture(options: CaptureOptions = {}): Promise<CaptureResult> {
    const displays = screen.getAllDisplays()
    const targetDisplay = displays[options.displayIndex ?? 0] ?? displays[0]

    const { width, height } = targetDisplay.size
    const scaleFactor = targetDisplay.scaleFactor

    const captureWidth = Math.round(width * scaleFactor)
    const captureHeight = Math.round(height * scaleFactor)

    // Get all screen sources
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: captureWidth, height: captureHeight },
      fetchWindowIcons: false
    })

    // Find source matching the target display
    let source = sources.find((s) => s.display_id === String(targetDisplay.id))
    if (!source) {
      source = sources[options.displayIndex ?? 0] ?? sources[0]
    }

    if (!source) {
      throw new Error('No screen capture source found')
    }

    let thumbnail: NativeImage = source.thumbnail

    // If region specified, crop using NativeImage
    if (options.region) {
      const r = options.region
      thumbnail = thumbnail.crop({
        x: Math.round(r.x * scaleFactor),
        y: Math.round(r.y * scaleFactor),
        width: Math.round(r.width * scaleFactor),
        height: Math.round(r.height * scaleFactor)
      })
    }

    const imageBuffer = thumbnail.toPNG()
    const size = thumbnail.getSize()

    return {
      imageBuffer,
      width: size.width,
      height: size.height,
      displayScaleFactor: scaleFactor
    }
  }

  /**
   * Capture a specific window by part of its title.
   */
  async captureWindow(windowTitle: string): Promise<CaptureResult> {
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 1920, height: 1080 },
      fetchWindowIcons: false
    })

    const source = sources.find((s) =>
      s.name.toLowerCase().includes(windowTitle.toLowerCase())
    )

    if (!source) {
      throw new Error(`Window not found: ${windowTitle}`)
    }

    const imageBuffer = source.thumbnail.toPNG()
    const size = source.thumbnail.getSize()

    return {
      imageBuffer,
      width: size.width,
      height: size.height,
      displayScaleFactor: 1
    }
  }

  /**
   * Get list of available displays for the settings UI.
   */
  getDisplays(): Array<{ id: number; label: string; primary: boolean; resolution: string }> {
    return screen.getAllDisplays().map((d, i) => ({
      id: i,
      label: `Display ${i + 1}${d.id === screen.getPrimaryDisplay().id ? ' (Primary)' : ''}`,
      primary: d.id === screen.getPrimaryDisplay().id,
      resolution: `${d.size.width}×${d.size.height}`
    }))
  }
}
