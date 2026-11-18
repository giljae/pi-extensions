// Encode a folder of PNG or JPEG frames (f00000.png, f00001.png … in name order), plus an optional
// audio file, into an H.264 (and AAC) MP4 with AVFoundation, no ffmpeg. Pass "-" for no audio.
// Audio longer than the video is cut; the video sets the length. Needs the Xcode command-line tools.
//   swift video/encode.swift <framesDir> <audio.m4a|-> <out.mp4> [fps (60)] [bitrate (18000000)]
import AVFoundation
import CoreGraphics
import ImageIO

let a = CommandLine.arguments
guard a.count >= 4 else { print("usage: encode.swift framesDir audio.m4a out.mp4 [fps]"); exit(2) }
let dir = a[1], audioPath = a[2], out = a[3]
let fps = Int32(a.count > 4 ? a[4] : "60") ?? 60
let bitrate = Int(a.count > 5 ? a[5] : "18000000") ?? 18_000_000
let files = try FileManager.default.contentsOfDirectory(atPath: dir).filter { $0.hasPrefix("f") && ($0.hasSuffix(".png") || $0.hasSuffix(".jpg")) }.sorted()
guard !files.isEmpty else { print("no frames in \(dir)"); exit(1) }
// size comes from the first frame, rounded down to even numbers for H.264
guard let firstSrc = CGImageSourceCreateWithURL(URL(fileURLWithPath: dir + "/" + files[0]) as CFURL, nil),
      let firstImg = CGImageSourceCreateImageAtIndex(firstSrc, 0, nil) else { print("bad frame \(files[0])"); exit(1) }
let W = firstImg.width / 2 * 2, H = firstImg.height / 2 * 2

let tmp = URL(fileURLWithPath: out + ".video.mp4")
try? FileManager.default.removeItem(at: tmp)
let writer = try AVAssetWriter(outputURL: tmp, fileType: .mp4)
let settings: [String: Any] = [
  AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: W, AVVideoHeightKey: H,
  AVVideoCompressionPropertiesKey: [
    AVVideoAverageBitRateKey: bitrate, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
    AVVideoExpectedSourceFrameRateKey: Int(fps), AVVideoMaxKeyFrameIntervalKey: Int(fps) * 2
  ]
]
let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
  kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H
])
writer.add(input)
guard writer.startWriting() else { print("writer: \(String(describing: writer.error))"); exit(1) }
writer.startSession(atSourceTime: .zero)
let space = CGColorSpace(name: CGColorSpace.sRGB)!
for (i, f) in files.enumerated() {
  guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: dir + "/" + f) as CFURL, nil),
        let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { print("bad frame \(f)"); exit(1) }
  var pb: CVPixelBuffer?
  CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb)
  CVPixelBufferLockBaseAddress(pb!, [])
  let ctx = CGContext(data: CVPixelBufferGetBaseAddress(pb!), width: W, height: H, bitsPerComponent: 8,
                      bytesPerRow: CVPixelBufferGetBytesPerRow(pb!), space: space,
                      bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
  ctx.draw(img, in: CGRect(x: 0, y: 0, width: W, height: H))
  CVPixelBufferUnlockBaseAddress(pb!, [])
  while !input.isReadyForMoreMediaData { usleep(2000) }
  adaptor.append(pb!, withPresentationTime: CMTime(value: Int64(i), timescale: fps))
}
input.markAsFinished()
let sem = DispatchSemaphore(value: 0)
writer.finishWriting { sem.signal() }
sem.wait()
guard writer.status == .completed else { print("video: \(String(describing: writer.error))"); exit(1) }

// no audio: the video file is the result
if audioPath == "-" {
  try? FileManager.default.removeItem(at: URL(fileURLWithPath: out))
  try FileManager.default.moveItem(at: tmp, to: URL(fileURLWithPath: out))
  print("wrote \(out) · \(files.count) frames · no audio")
  exit(0)
}
// mux: copy the video track, add the audio track
let comp = AVMutableComposition()
let v = AVURLAsset(url: tmp), au = AVURLAsset(url: URL(fileURLWithPath: audioPath))
let dur = CMTime(value: Int64(files.count), timescale: fps)
let vt = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
try vt.insertTimeRange(CMTimeRange(start: .zero, duration: dur), of: v.tracks(withMediaType: .video)[0], at: .zero)
let at = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
try at.insertTimeRange(CMTimeRange(start: .zero, duration: CMTimeMinimum(dur, au.duration)), of: au.tracks(withMediaType: .audio)[0], at: .zero)
let outURL = URL(fileURLWithPath: out)
try? FileManager.default.removeItem(at: outURL)
let ex = AVAssetExportSession(asset: comp, presetName: AVAssetExportPresetPassthrough)!
ex.outputURL = outURL
ex.outputFileType = .mp4
ex.shouldOptimizeForNetworkUse = true
ex.exportAsynchronously { sem.signal() }
sem.wait()
try? FileManager.default.removeItem(at: tmp)
if ex.status == .completed { print("wrote \(out) · \(files.count) frames · \(CMTimeGetSeconds(dur)) s") }
else { print("mux: \(String(describing: ex.error))"); exit(1) }
