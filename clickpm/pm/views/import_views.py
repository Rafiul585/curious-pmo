import json

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from pm.services.import_service import import_from_csv, TASK_FIELDS


class ImportViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    @action(detail=False, methods=['POST'], url_path='csv')
    def csv_import(self, request):
        """
        POST /api/import/csv/
        Multipart form fields:
          file        — the CSV file
          project_id  — int
          sprint_id   — int
          mapping     — JSON string: {csv_col_name: task_field}
        Returns:
          {"imported": n, "skipped": n, "errors": [...]}
        """
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'detail': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        project_id = request.data.get('project_id')
        sprint_id = request.data.get('sprint_id')
        mapping_raw = request.data.get('mapping', '{}')

        if not project_id or not sprint_id:
            return Response(
                {'detail': 'project_id and sprint_id are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            column_mapping = json.loads(mapping_raw)
        except (json.JSONDecodeError, TypeError):
            return Response({'detail': 'mapping must be a valid JSON object.'}, status=status.HTTP_400_BAD_REQUEST)

        result = import_from_csv(
            file_obj=file_obj,
            project_id=int(project_id),
            sprint_id=int(sprint_id),
            column_mapping=column_mapping,
            user=request.user,
        )
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=False, methods=['GET'], url_path='fields')
    def task_fields(self, request):
        """GET /api/import/fields/ — list of mappable task field names."""
        return Response({'fields': TASK_FIELDS})
