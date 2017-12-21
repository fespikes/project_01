
class SupersetException(Exception):
    exception_code = 1

    def __init__(self, message=None, code=None):
        self.message = message
        self.code = code if code else self.exception_code

    def __repr__(self):
        return 'code: [{}] message: [{}]'.format(self.code, self.message)


class LoginException(SupersetException):
    exception_code = 2


class ErrorUrlException(SupersetException):
    exception_code = 3


class ParameterException(SupersetException):
    exception_code = 4


class PermissionException(SupersetException):
    exception_code = 5


class OfflineException(SupersetException):
    exception_code = 6


class PropertyException(SupersetException):
    exception_code = 7


class DatabaseException(SupersetException):
    exception_code = 8


class HDFSException(SupersetException):
    exception_code = 9


class GuardianException(SupersetException):
    exception_code = 10


class SupersetTimeoutException(SupersetException):
    pass


class NoDataException(SupersetException):
    pass


class SupersetTemplateException(SupersetException):
    pass

