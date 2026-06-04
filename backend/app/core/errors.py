"""Structured error handling — all non-2xx responses use the contract shape {detail, code}.

API_CONTRACTS.md §0: `{ "detail": "string", "code": "string" }` with stable machine `code`
(email_exists, invalid_credentials, not_found, unauthorized, validation_error, ai_error, ...).
"""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class APIError(Exception):
    """Raise inside routers/deps to emit a contract-shaped error response."""

    def __init__(self, status_code: int, code: str, detail: str):
        self.status_code = status_code
        self.code = code
        self.detail = detail
        super().__init__(detail)

    # Factory helpers for the common cases (codes per API_CONTRACTS §0/§8) -----------------------
    @classmethod
    def unauthorized(cls, detail: str = "Not authenticated.") -> "APIError":
        return cls(401, "unauthorized", detail)

    @classmethod
    def not_found(cls, detail: str = "Resource not found.") -> "APIError":
        return cls(404, "not_found", detail)


# Map stray Starlette HTTPExceptions (status -> stable code) so they still match the contract shape.
_STATUS_CODE = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    409: "conflict",
    422: "validation_error",
    502: "ai_error",
}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(APIError)
    async def _api_error(_request: Request, exc: APIError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code, content={"detail": exc.detail, "code": exc.code}
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
        errs = exc.errors()
        detail = errs[0].get("msg", "Validation error.") if errs else "Validation error."
        return JSONResponse(
            status_code=422, content={"detail": detail, "code": "validation_error"}
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = _STATUS_CODE.get(exc.status_code, "error")
        return JSONResponse(
            status_code=exc.status_code, content={"detail": str(exc.detail), "code": code}
        )
