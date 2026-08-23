"""widen preferences.theme check for obsidianite themes

Revision ID: a1b2c3d4e5f6
Revises: 285b55b90f99
Create Date: 2026-07-04 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "285b55b90f99"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_OLD = "theme in ('deeptech','lightdesk')"
_NEW = "theme in ('deeptech','lightdesk','obsidianite','obsidianite-violet')"


def upgrade() -> None:
    # SQLite can't ALTER a CHECK constraint in place — batch mode recreates the table.
    with op.batch_alter_table("preferences", schema=None) as batch_op:
        batch_op.drop_constraint("ck_pref_theme", type_="check")
        batch_op.create_check_constraint("ck_pref_theme", _NEW)


def downgrade() -> None:
    with op.batch_alter_table("preferences", schema=None) as batch_op:
        batch_op.drop_constraint("ck_pref_theme", type_="check")
        batch_op.create_check_constraint("ck_pref_theme", _OLD)
