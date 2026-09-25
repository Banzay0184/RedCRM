import {
  LuBath, LuBox, LuBriefcase, LuBuilding, LuBuilding2, LuCamera, LuCar, LuCircleParking, LuClapperboard, LuCoffee,
  LuDoorOpen, LuEllipsis, LuFactory, LuFilm, LuFrame, LuHeart, LuHouse, LuLamp, LuLandmark, LuMegaphone, LuMic,
  LuMountain, LuMusic, LuPalette, LuPlug, LuShirt, LuSmartphone, LuSnowflake, LuSofa, LuStore, LuSun, LuTreePine,
  LuUmbrella, LuVideo, LuWarehouse, LuWaves, LuWifi,
} from 'react-icons/lu'

// Ключ иконки хранится в БД (поле icon у справочников и зон)
export const ICONS = {
  sofa: LuSofa, building: LuBuilding2, city: LuBuilding, mountain: LuMountain, camera: LuCamera, home: LuHouse,
  briefcase: LuBriefcase, factory: LuFactory, car: LuCar, landmark: LuLandmark, dots: LuEllipsis, video: LuVideo,
  music: LuMusic, shirt: LuShirt, heart: LuHeart, megaphone: LuMegaphone, mic: LuMic, film: LuFilm, box: LuBox,
  smartphone: LuSmartphone, parking: LuCircleParking, wifi: LuWifi, snowflake: LuSnowflake, door: LuDoorOpen,
  plug: LuPlug, sun: LuSun, lamp: LuLamp, bath: LuBath, coffee: LuCoffee, tree: LuTreePine, warehouse: LuWarehouse,
  store: LuStore, palette: LuPalette, umbrella: LuUmbrella, waves: LuWaves, frame: LuFrame, clapper: LuClapperboard,
}

export const ICON_KEYS = Object.keys(ICONS)

export function DictIcon({ name, className }) {
  const Icon = ICONS[name] || LuFrame
  return <Icon className={className} />
}
