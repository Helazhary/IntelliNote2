"""Pydantic wire schemas — the request/response shapes in docs/API_CONTRACTS.md §1-§7.

Single source of truth for the JSON contract. PATCH bodies use `model_fields_set` to distinguish
an omitted field from an explicit `null` (e.g. moving a folder/note to top-level/Unfiled).
"""
import re
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

# Enums (mirror API_CONTRACTS §1) -----------------------------------------------------------------
AIAction = Literal[
    "format", "enhance", "summarize", "explain", "simplify", "bullets", "action_items", "custom"
]
AIScope = Literal["selection", "document"]
Preset = Literal[
    "format_only", "clean_up", "enhance", "explain", "summarize", "study_mode", "meeting_mode"
]
Theme = Literal["deeptech", "lightdesk", "obsidianite", "obsidianite-violet"]
ExportFormat = Literal["md", "html", "txt"]

NOTEPILOT_DELAYS = (500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000)

# Dependency-free email check (contract requires bad email -> 422; DB stores lowercased).
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _normalize_email(value: str) -> str:
    value = value.strip().lower()
    if not _EMAIL_RE.match(value):
        raise ValueError("Enter a valid email address.")
    return value


# Entity response models -------------------------------------------------------------------------
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    created_at: str


class FolderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    parent_id: Optional[str]
    user_id: str
    created_at: str
    updated_at: str


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    content: str
    folder_id: Optional[str]
    user_id: str
    created_at: str
    updated_at: str


class NoteSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    folder_id: Optional[str]
    updated_at: str


class PreferencesOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user_id: str
    theme: Theme
    active_preset: Preset
    focuspro_enabled: bool
    notepilot_enabled: bool
    notepilot_delay_ms: int
    updated_at: str


# Auth (§3) --------------------------------------------------------------------------------------
class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)

    _norm_email = field_validator("email")(_normalize_email)


class LoginRequest(BaseModel):
    email: str
    password: str

    _norm_email = field_validator("email")(_normalize_email)


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserOut


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"


# Folders (§4) -----------------------------------------------------------------------------------
class FolderCreate(BaseModel):
    name: str = Field(min_length=1)
    parent_id: Optional[str] = None


class FolderUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)
    parent_id: Optional[str] = None

    @model_validator(mode="after")
    def _at_least_one(self) -> "FolderUpdate":
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update.")
        return self


class DeletePreview(BaseModel):
    folder_id: str
    note_count: int
    subfolder_count: int


# Notes (§5) -------------------------------------------------------------------------------------
class NoteCreate(BaseModel):
    title: str = ""
    content: str = ""
    folder_id: Optional[str] = None


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    folder_id: Optional[str] = None

    @model_validator(mode="after")
    def _at_least_one(self) -> "NoteUpdate":
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update.")
        return self


# Preferences (§6) -------------------------------------------------------------------------------
class PreferencesUpdate(BaseModel):
    theme: Optional[Theme] = None
    active_preset: Optional[Preset] = None
    focuspro_enabled: Optional[bool] = None
    notepilot_enabled: Optional[bool] = None
    notepilot_delay_ms: Optional[int] = None

    @field_validator("notepilot_delay_ms")
    @classmethod
    def _valid_delay(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v not in NOTEPILOT_DELAYS:
            raise ValueError("notepilot_delay_ms must be one of 500..5000 in 500ms steps.")
        return v

    @model_validator(mode="after")
    def _at_least_one(self) -> "PreferencesUpdate":
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update.")
        return self


# AI (§7) — wired in Phase 4b --------------------------------------------------------------------
class TransformRequest(BaseModel):
    note_id: str
    action: AIAction
    scope: AIScope
    text: str
    preset: Preset
    instruction: Optional[str] = None

    @model_validator(mode="after")
    def _custom_needs_instruction(self) -> "TransformRequest":
        if self.action == "custom" and not (self.instruction and self.instruction.strip()):
            raise ValueError("instruction is required when action is 'custom'.")
        return self


class TransformResponse(BaseModel):
    output: str
    action: AIAction
    scope: AIScope


class ReviseRequest(BaseModel):
    previous_output: str
    instruction: str
    preset: Preset


class ReviseResponse(BaseModel):
    output: str


class NotePilotRequest(BaseModel):
    note_id: str
    context: str


__all__ = [
    "AIAction",
    "AIScope",
    "Preset",
    "Theme",
    "ExportFormat",
    "UserOut",
    "FolderOut",
    "NoteOut",
    "NoteSummaryOut",
    "PreferencesOut",
    "RegisterRequest",
    "LoginRequest",
    "RefreshRequest",
    "TokenResponse",
    "AccessTokenResponse",
    "FolderCreate",
    "FolderUpdate",
    "DeletePreview",
    "NoteCreate",
    "NoteUpdate",
    "PreferencesUpdate",
    "TransformRequest",
    "TransformResponse",
    "ReviseRequest",
    "ReviseResponse",
    "NotePilotRequest",
]
