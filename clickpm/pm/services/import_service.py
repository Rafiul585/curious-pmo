import csv
import io
from datetime import date

from pm.models.task_models import Task
from pm.models.workspace_models import Tag
from pm.models.user_models import User
from pm.models.project_models import Sprint


VALID_STATUSES = {'To-do', 'In Progress', 'Review', 'Done'}
VALID_PRIORITIES = {'Low', 'Medium', 'High', 'Critical'}

# Fields the caller can map CSV columns to
TASK_FIELDS = ['title', 'description', 'status', 'priority', 'assignee_email', 'due_date', 'tags']


def import_from_csv(file_obj, project_id: int, sprint_id: int, column_mapping: dict, user) -> dict:
    """
    Parse a CSV upload and bulk-create Task records.

    Args:
        file_obj:        Django InMemoryUploadedFile (or any file-like object)
        project_id:      int  — used only for tag scoping
        sprint_id:       int  — sprint all imported tasks are assigned to
        column_mapping:  dict  {csv_column_name: task_field_name}
                         e.g. {"Task Name": "title", "Due": "due_date"}
                         Unmapped / "skip" columns are ignored.
        user:            User instance (reporter)

    Returns:
        {"imported": n, "skipped": n, "errors": ["Row 3: …", …]}
    """
    try:
        sprint = Sprint.objects.get(id=sprint_id)
    except Sprint.DoesNotExist:
        return {'imported': 0, 'skipped': 0, 'errors': [f'Sprint {sprint_id} not found.']}

    # Decode bytes → text
    raw = file_obj.read()
    try:
        text = raw.decode('utf-8-sig')
    except UnicodeDecodeError:
        text = raw.decode('latin-1')

    reader = csv.DictReader(io.StringIO(text))

    imported = 0
    skipped = 0
    errors = []

    # Reverse-map: task_field → csv_column  (we need title at minimum)
    field_to_col = {v: k for k, v in column_mapping.items() if v and v != 'skip'}

    if 'title' not in field_to_col:
        return {'imported': 0, 'skipped': 0, 'errors': ['Column mapping must include a "title" column.']}

    for row_num, row in enumerate(reader, start=2):  # row 1 = header
        title_col = field_to_col['title']
        title = row.get(title_col, '').strip()
        if not title:
            skipped += 1
            continue

        kwargs = {
            'sprint': sprint,
            'title': title,
            'status': 'To-do',
            'priority': 'Medium',
            'reporter': user,
        }
        row_errors = []
        tag_names = []

        for field, col in field_to_col.items():
            if field == 'title':
                continue
            value = row.get(col, '').strip()
            if not value:
                continue

            if field == 'description':
                kwargs['description'] = value

            elif field == 'status':
                # Normalise common variants
                normalised = value.title().replace('_', ' ').replace('-', ' ')
                if normalised in VALID_STATUSES:
                    kwargs['status'] = normalised
                else:
                    row_errors.append(f'Row {row_num}: unknown status "{value}", defaulting to "To-do"')

            elif field == 'priority':
                normalised = value.capitalize()
                if normalised in VALID_PRIORITIES:
                    kwargs['priority'] = normalised
                else:
                    row_errors.append(f'Row {row_num}: unknown priority "{value}", defaulting to "Medium"')

            elif field == 'assignee_email':
                try:
                    assignee = User.objects.get(email__iexact=value)
                    kwargs['assignee'] = assignee
                except User.DoesNotExist:
                    row_errors.append(f'Row {row_num}: user "{value}" not found, assignee skipped')

            elif field == 'due_date':
                parsed = _parse_date(value)
                if parsed:
                    kwargs['due_date'] = parsed
                else:
                    row_errors.append(f'Row {row_num}: invalid date "{value}", due_date skipped')

            elif field == 'tags':
                tag_names = [t.strip() for t in value.split(',') if t.strip()]

        errors.extend(row_errors)

        try:
            task = Task.objects.create(**kwargs)
            if tag_names:
                for name in tag_names:
                    tag, _ = Tag.objects.get_or_create(
                        name__iexact=name,
                        defaults={'name': name, 'workspace': sprint.milestone.project.workspace},
                    )
                    task.tags.add(tag)
            imported += 1
        except Exception as exc:
            skipped += 1
            errors.append(f'Row {row_num}: {exc}')

    return {'imported': imported, 'skipped': skipped, 'errors': errors}


def _parse_date(value: str):
    """Try common date formats; return a date object or None."""
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y', '%m-%d-%Y'):
        try:
            return date.fromisoformat(value) if fmt == '%Y-%m-%d' else \
                   __import__('datetime').datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None
