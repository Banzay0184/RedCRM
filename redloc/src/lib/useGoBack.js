import { useNavigate } from 'react-router-dom'

// После «Сохранить» — на страницу назад. Если формы открыли прямой ссылкой (назад некуда)
// или адрес поменялся (новое название → новый slug), уходим на fallback.
export function useGoBack() {
  const navigate = useNavigate()
  return (fallback, { force = false } = {}) => {
    if (!force && window.history.state?.idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }
}
