import { LuPlay, LuVideo } from 'react-icons/lu'
import { formatDuration, cx } from '../lib/format'

export default function VideoTile({ video, onClick, className, caption }) {
  return (
    <button onClick={onClick} className={cx('group block w-full text-left', className)}>
      <div className="relative aspect-video overflow-hidden rounded-xl bg-ink">
        {video.poster_url ? (
          <img src={video.poster_url} alt="" loading="lazy" className="h-full w-full object-cover opacity-90 transition group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center text-white/30"><LuVideo className="h-10 w-10" /></div>
        )}
        <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand text-white shadow-lg transition group-hover:scale-110">
          <LuPlay className="ml-0.5 h-5 w-5 fill-white" />
        </span>
        {video.duration ? (
          <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
            {formatDuration(video.duration)}
          </span>
        ) : null}
        {video.youtube_id && (
          <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">YouTube</span>
        )}
      </div>
      {caption && <div className="mt-2 line-clamp-1 text-sm font-medium">{caption}</div>}
    </button>
  )
}
