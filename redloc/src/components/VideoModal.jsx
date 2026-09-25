import { Modal } from './ui'

export function videoEmbed(video) {
  if (video.youtube_id) return `https://www.youtube-nocookie.com/embed/${video.youtube_id}?autoplay=1&rel=0`
  return null
}

export default function VideoModal({ video, onClose }) {
  if (!video) return null
  const embed = videoEmbed(video)
  return (
    <Modal open onClose={onClose} title={video.title || video.location_title || 'Video'} wide>
      <div className="aspect-video overflow-hidden rounded-xl bg-black">
        {embed ? (
          <iframe src={embed} title={video.title || 'video'} className="h-full w-full" allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
        ) : (
          <video src={video.file_url} poster={video.poster_url || undefined} controls autoPlay playsInline className="h-full w-full" />
        )}
      </div>
    </Modal>
  )
}
