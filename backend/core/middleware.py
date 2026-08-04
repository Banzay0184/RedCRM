import threading

_thread_locals = threading.local()


def get_current_user():
    """Возвращает аутентифицированного пользователя текущего запроса.

    request.user резолвится DRF лениво внутри APIView.dispatch() (JWT-аутентификация
    происходит уже после того, как middleware отработал), поэтому здесь читаем
    атрибут request.user в момент вызова, а не кэшируем его заранее.
    """
    request = getattr(_thread_locals, "request", None)
    if request is None:
        return None
    user = getattr(request, "user", None)
    if user is not None and getattr(user, "is_authenticated", False):
        return user
    return None


class CurrentUserMiddleware:
    """Кладёт текущий request в thread-local, чтобы сигналы моделей знали, кто внёс изменение."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.request = request
        try:
            response = self.get_response(request)
        finally:
            _thread_locals.request = None
        return response
